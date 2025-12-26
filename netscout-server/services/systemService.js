/**
 * NetScout X - 系统服务模块
 * 负责获取系统信息、网络状态和连接数据
 */

import si from 'systeminformation'
import ping from 'ping'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import { isPrivateIP, withTimeout } from './utils.js'

const execPromise = promisify(exec)

// ==================== 配置常量 ====================

const CONFIG = {
  commandTimeout: 5000,      // 命令执行超时
  pingTimeout: 3000,         // Ping 超时
  pingTargets: ['8.8.8.8', '1.1.1.1', '114.114.114.114'],
  maxConnections: 50,        // 最大返回连接数
  cacheUpdateInterval: 1000  // 缓存更新最小间隔
}

// ==================== 状态缓存 ====================

// 网络速度计算状态
const netState = {
  lastStats: { rx_bytes: 0, tx_bytes: 0, timestamp: 0 },
  initialized: false
}

// Ping 结果缓存
const pingCache = {
  latency: 0,
  packetLoss: 0,
  timestamp: 0
}

// ==================== 系统信息获取 ====================

/**
 * 获取动态系统数据（CPU 和内存使用率）
 */
export async function getDynamicStats() {
  try {
    const [load, mem] = await Promise.all([
      si.currentLoad(),
      si.mem()
    ])

    return {
      cpuLoad: load.currentLoad.toFixed(2),
      memPercent: ((mem.active / mem.total) * 100).toFixed(2)
    }
  } catch (error) {
    console.error('获取系统状态失败:', error.message)
    return { cpuLoad: '0.00', memPercent: '0.00' }
  }
}

/**
 * 获取系统基本信息
 */
export async function getSystemInfo() {
  try {
    const [cpu, osInfo, system] = await Promise.all([
      si.cpu(),
      si.osInfo(),
      si.system()
    ])

    return {
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        speed: cpu.speed
      },
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch
      },
      system: {
        manufacturer: system.manufacturer,
        model: system.model
      }
    }
  } catch (error) {
    console.error('获取系统信息失败:', error.message)
    return null
  }
}

// ==================== 网络速度计算 ====================

/**
 * Windows: 使用 PowerShell 获取网络统计
 */
async function getNetworkStatsWindows() {
  try {
    const powershellPath = `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    const command = `"${powershellPath}" -Command "Get-NetAdapterStatistics | Where-Object {$_.ReceivedBytes -gt 0} | Select-Object -First 1 | ConvertTo-Json"`

    const { stdout } = await execPromise(command, {
      windowsHide: true,
      timeout: CONFIG.commandTimeout,
      encoding: 'utf8',
      shell: true
    })

    if (!stdout?.trim()) return null

    const stats = JSON.parse(stdout)
    return {
      rx_bytes: parseInt(stats.ReceivedBytes) || 0,
      tx_bytes: parseInt(stats.SentBytes) || 0
    }
  } catch (error) {
    console.error('PowerShell 网络统计失败:', error.message)
    return null
  }
}

/**
 * 跨平台: 使用 systeminformation 获取网络统计
 */
async function getNetworkStatsFromSI() {
  try {
    const stats = await si.networkStats()
    if (stats?.length > 0) {
      const active = stats.find(s => s.rx_bytes > 0 || s.tx_bytes > 0) || stats[0]
      return {
        rx_bytes: active.rx_bytes || 0,
        tx_bytes: active.tx_bytes || 0
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * 获取网络速度（实时计算）
 */
export async function getNetworkSpeed() {
  try {
    const now = Date.now()

    // 获取当前网络统计
    let currentStats = null
    if (process.platform === 'win32') {
      currentStats = await getNetworkStatsWindows()
    }
    if (!currentStats) {
      currentStats = await getNetworkStatsFromSI()
    }

    // 无法获取统计信息
    if (!currentStats) {
      return { rx_speed_mb: '0.00', tx_speed_mb: '0.00' }
    }

    // 首次调用，初始化基准值
    if (!netState.initialized) {
      netState.lastStats = { ...currentStats, timestamp: now }
      netState.initialized = true
      console.log('📊 网络监控已初始化')
      return { rx_speed_mb: '0.00', tx_speed_mb: '0.00' }
    }

    // 计算时间差
    const timeDiff = (now - netState.lastStats.timestamp) / 1000
    if (timeDiff < 0.5) {
      return { rx_speed_mb: '0.00', tx_speed_mb: '0.00' }
    }

    // 计算速度
    const rxDiff = currentStats.rx_bytes - netState.lastStats.rx_bytes
    const txDiff = currentStats.tx_bytes - netState.lastStats.tx_bytes

    const rxSpeedMB = Math.max(0, rxDiff / timeDiff / 1024 / 1024).toFixed(2)
    const txSpeedMB = Math.max(0, txDiff / timeDiff / 1024 / 1024).toFixed(2)

    // 更新缓存
    netState.lastStats = { ...currentStats, timestamp: now }

    return { rx_speed_mb: rxSpeedMB, tx_speed_mb: txSpeedMB }
  } catch (error) {
    console.error('获取网络速度失败:', error.message)
    return { rx_speed_mb: '0.00', tx_speed_mb: '0.00' }
  }
}

// ==================== 网络连接获取 ====================

/**
 * 使用 netstat 获取网络连接（无需管理员权限）
 */
async function getConnectionsWithNetstat() {
  try {
    const netstatPath = process.platform === 'win32' 
      ? 'C:\\Windows\\System32\\netstat.exe'
      : 'netstat'

    const { stdout } = await execPromise(`"${netstatPath}" -an`, {
      timeout: CONFIG.commandTimeout,
      encoding: 'utf8',
      shell: true
    })

    const connections = []
    const lines = stdout.split('\n')

    for (const line of lines) {
      // 匹配 TCP/UDP 连接
      const match = line.trim().match(/^(TCP|UDP)\s+(\S+):(\d+)\s+(\S+):(\d+)\s+(\S+)/)
      
      if (match) {
        const [, protocol, localAddr, localPort, remoteAddr, remotePort, state] = match
        
        // 只保留已建立的外网连接
        if (state === 'ESTABLISHED' && !isPrivateIP(remoteAddr)) {
          connections.push({
            protocol,
            localAddress: localAddr,
            localPort: parseInt(localPort),
            peerAddress: remoteAddr,
            peerPort: parseInt(remotePort),
            state,
            process: 'System'
          })
        }
      }
    }

    return connections
  } catch (error) {
    console.error('netstat 获取连接失败:', error.message)
    return []
  }
}

/**
 * 获取网络连接列表
 */
export async function getNetworkConnections() {
  try {
    console.log('🔍 开始获取网络连接...')

    let connections = []

    // 优先使用 systeminformation
    try {
      connections = await withTimeout(
        si.networkConnections(),
        3000,
        '获取网络连接超时'
      )
      
      if (connections?.length > 0) {
        console.log(`✓ systeminformation: ${connections.length} 个连接`)
      }
    } catch {
      console.log('⚠️ systeminformation 失败，使用 netstat...')
    }

    // 回退到 netstat
    if (!connections?.length) {
      connections = await getConnectionsWithNetstat()
      console.log(`✓ netstat: ${connections.length} 个外网连接`)
    }

    if (!connections.length) {
      console.log('⚠️ 未获取到网络连接')
      return []
    }

    // 过滤和格式化
    const filtered = connections
      .filter(conn => conn.state !== 'NONE' && conn.state !== 'LISTENING')
      .slice(0, CONFIG.maxConnections)
      .map(conn => ({
        protocol: conn.protocol || 'TCP',
        localAddress: conn.localAddress || '0.0.0.0',
        localPort: conn.localPort || 0,
        peerAddress: conn.peerAddress || '-',
        peerPort: conn.peerPort || 0,
        state: conn.state || 'UNKNOWN',
        process: conn.process || 'System'
      }))

    console.log(`📊 返回 ${filtered.length} 个连接`)
    return filtered
  } catch (error) {
    console.error('获取网络连接失败:', error.message)
    return []
  }
}

// ==================== 网络详细信息 ====================

/**
 * 获取网络详细信息（IP、MAC、网关、DNS等）
 */
export async function getNetworkDetails() {
  const defaultInfo = {
    localIP: '未知',
    localMAC: '未知',
    gateway: '未知',
    dnsServers: ['8.8.8.8'],
    dhcpServer: '未知',
    subnetMask: '未知',
    interfaceName: '未知'
  }

  try {
    const interfaces = os.networkInterfaces()
    const networkInfo = { ...defaultInfo }

    // 查找主要网络接口
    for (const [name, addresses] of Object.entries(interfaces)) {
      for (const addr of addresses) {
        if (addr.family === 'IPv4' && !addr.internal) {
          networkInfo.localIP = addr.address
          networkInfo.localMAC = addr.mac
          networkInfo.subnetMask = addr.netmask
          networkInfo.interfaceName = name
          break
        }
      }
      if (networkInfo.localIP !== '未知') break
    }

    // Windows: 获取网关和 DNS
    if (process.platform === 'win32') {
      const powershellPath = `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`

      try {
        // 获取网关
        const { stdout: gatewayOut } = await execPromise(
          `"${powershellPath}" -Command "Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1 -ExpandProperty NextHop"`,
          { windowsHide: true, timeout: 3000, encoding: 'utf8', shell: true }
        )
        if (gatewayOut?.trim()) {
          networkInfo.gateway = gatewayOut.trim()
          networkInfo.dhcpServer = gatewayOut.trim()
        }

        // 获取 DNS
        const { stdout: dnsOut } = await execPromise(
          `"${powershellPath}" -Command "Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object {$_.ServerAddresses} | Select-Object -First 1 -ExpandProperty ServerAddresses"`,
          { windowsHide: true, timeout: 3000, encoding: 'utf8', shell: true }
        )
        if (dnsOut?.trim()) {
          networkInfo.dnsServers = dnsOut.trim().split('\n').map(s => s.trim()).filter(Boolean)
        }
      } catch (error) {
        console.error('获取网关/DNS 失败:', error.message)
      }
    }

    return networkInfo
  } catch (error) {
    console.error('获取网络详细信息失败:', error.message)
    return defaultInfo
  }
}

// ==================== 网络质量检测 ====================

/**
 * 使用原生 ping 命令获取网络质量
 */
async function pingNative(host) {
  try {
    let command
    if (process.platform === 'win32') {
      const pingPath = `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\ping.exe`
      const powershellPath = `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
      command = `"${powershellPath}" -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '${pingPath}' -n 4 ${host} | Out-String"`
    } else {
      command = `ping -c 4 ${host}`
    }

    const { stdout } = await execPromise(command, {
      timeout: CONFIG.pingTimeout + 2000,
      encoding: 'utf8',
      shell: true,
      windowsHide: true
    })

    let latency = 0
    let packetLoss = 0

    if (process.platform === 'win32') {
      // Windows 解析
      const lossMatch = stdout.match(/[（(](\d+)%\s*(?:丢失|loss)[)）]/i) ||
                        stdout.match(/(?:丢失|Lost)\s*=\s*\d+\s*[（(](\d+)%/i)
      if (lossMatch) packetLoss = parseFloat(lossMatch[1])

      const latencyMatch = stdout.match(/(?:平均|Average)\s*=\s*(\d+)ms/i) ||
                          stdout.match(/(?:时间|time)[<=](\d+)ms/i)
      if (latencyMatch) latency = parseFloat(latencyMatch[1])
    } else {
      // Linux/Mac 解析
      const lossMatch = stdout.match(/(\d+(?:\.\d+)?)% packet loss/)
      if (lossMatch) packetLoss = parseFloat(lossMatch[1])

      const latencyMatch = stdout.match(/avg[^=]*=\s*(\d+(?:\.\d+)?)/)
      if (latencyMatch) latency = parseFloat(latencyMatch[1])
    }

    return { latency, packetLoss, success: true }
  } catch (error) {
    console.error(`Ping ${host} 失败:`, error.message)
    return { latency: 0, packetLoss: 100, success: false }
  }
}

/**
 * 获取网络质量（延迟和丢包率）
 */
export async function getNetworkQuality() {
  try {
    // 并行 ping 多个目标
    const results = await Promise.all(
      CONFIG.pingTargets.map(host => pingNative(host))
    )

    const validResults = results.filter(r => r.success)

    if (validResults.length > 0) {
      const avgLatency = validResults.reduce((sum, r) => sum + r.latency, 0) / validResults.length
      const avgPacketLoss = validResults.reduce((sum, r) => sum + r.packetLoss, 0) / validResults.length

      // 更新缓存
      pingCache.latency = avgLatency
      pingCache.packetLoss = avgPacketLoss
      pingCache.timestamp = Date.now()

      return {
        latency: avgLatency.toFixed(2),
        packetLoss: avgPacketLoss.toFixed(2)
      }
    }

    // 原生命令失败，尝试 ping 库
    const pingResults = await Promise.all(
      CONFIG.pingTargets.map(host =>
        ping.promise.probe(host, { timeout: 2, min_reply: 3 })
      )
    )

    const validPingResults = pingResults.filter(r => r.alive)

    if (validPingResults.length > 0) {
      const avgLatency = validPingResults.reduce((sum, r) => {
        const time = typeof r.time === 'string' ? parseFloat(r.time) : r.time
        return sum + (isNaN(time) ? 0 : time)
      }, 0) / validPingResults.length

      const packetLoss = ((CONFIG.pingTargets.length - validPingResults.length) / CONFIG.pingTargets.length) * 100

      pingCache.latency = avgLatency
      pingCache.packetLoss = packetLoss
      pingCache.timestamp = Date.now()

      return {
        latency: avgLatency.toFixed(2),
        packetLoss: packetLoss.toFixed(2)
      }
    }

    // 返回缓存数据
    console.warn('⚠️ Ping 测试失败，使用缓存数据')
    return {
      latency: pingCache.latency.toFixed(2),
      packetLoss: pingCache.packetLoss.toFixed(2)
    }
  } catch (error) {
    console.error('获取网络质量失败:', error.message)
    return {
      latency: pingCache.latency.toFixed(2),
      packetLoss: pingCache.packetLoss.toFixed(2)
    }
  }
}
