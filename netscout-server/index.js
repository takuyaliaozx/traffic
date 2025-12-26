const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const si = require('systeminformation')
const dns = require('dns')
const net = require('net')
const geoip = require('geoip-lite')
const ping = require('ping')
const { exec } = require('child_process')
const os = require('os')
const fs = require('fs')
const path = require('path')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

app.use(cors())
app.use(express.json())

const PORT = 8080

const ipLocationCache = new Map()
const IP_CACHE_DURATION = 10 * 60 * 1000

// ==================== 代理检测模块 ====================

// 从 Windows 注册表读取系统代理设置
function getWindowsSystemProxy() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(null)
      return
    }
    
    exec('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable', (err1, stdout1) => {
      const enabled = stdout1 && stdout1.includes('0x1')
      
      if (!enabled) {
        resolve({ enabled: false, server: null, port: null })
        return
      }
      
      exec('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer', (err2, stdout2) => {
        if (err2 || !stdout2) {
          resolve({ enabled: true, server: null, port: null })
          return
        }
        
        const match = stdout2.match(/ProxyServer\s+REG_SZ\s+(.+)/)
        if (match) {
          const proxyStr = match[1].trim()
          const portMatch = proxyStr.match(/:(\d+)/)
          resolve({
            enabled: true,
            server: proxyStr,
            port: portMatch ? parseInt(portMatch[1]) : null
          })
        } else {
          resolve({ enabled: true, server: null, port: null })
        }
      })
    })
  })
}

// 从 macOS/Linux 获取系统代理
function getUnixSystemProxy() {
  return new Promise((resolve) => {
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy
    const allProxy = process.env.ALL_PROXY || process.env.all_proxy
    
    const proxy = httpProxy || httpsProxy || allProxy
    if (proxy) {
      const match = proxy.match(/:(\d+)/)
      resolve({
        enabled: true,
        server: proxy,
        port: match ? parseInt(match[1]) : null
      })
    } else {
      resolve({ enabled: false, server: null, port: null })
    }
  })
}

// 检测端口是否开放
function checkPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(800)
    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.on('error', () => {
      resolve(false)
    })
    socket.connect(port, host)
  })
}

// 检测 VPN/代理软件配置
async function detectVPNSoftwareConfig() {
  const configs = []
  const homeDir = os.homedir()
  
  // Clash 配置路径
  const clashPaths = [
    path.join(homeDir, '.config', 'clash', 'config.yaml'),
    path.join(homeDir, 'AppData', 'Roaming', 'clash', 'config.yaml'),
    path.join(homeDir, 'AppData', 'Local', 'Clash for Windows', 'config.yaml'),
    path.join(homeDir, '.config', 'clash-verge', 'config.yaml'),
  ]
  
  for (const configPath of clashPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8')
        const mixedMatch = content.match(/mixed-port:\s*(\d+)/)
        const httpMatch = content.match(/^port:\s*(\d+)/m)
        const socksMatch = content.match(/socks-port:\s*(\d+)/)
        
        if (mixedMatch || httpMatch || socksMatch) {
          configs.push({
            software: 'Clash',
            httpPort: mixedMatch ? parseInt(mixedMatch[1]) : (httpMatch ? parseInt(httpMatch[1]) : null),
            socksPort: socksMatch ? parseInt(socksMatch[1]) : null,
            configPath: configPath
          })
        }
      }
    } catch (e) {}
  }
  
  // V2Ray 配置路径
  const v2rayPaths = [
    path.join(homeDir, '.config', 'v2ray', 'config.json'),
    path.join(homeDir, 'AppData', 'Roaming', 'v2rayN', 'guiNConfig.json'),
    '/etc/v2ray/config.json',
  ]
  
  for (const configPath of v2rayPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8')
        const json = JSON.parse(content)
        
        // 查找 inbound 端口
        if (json.inbounds) {
          for (const inbound of json.inbounds) {
            if (inbound.protocol === 'http' || inbound.protocol === 'socks') {
              configs.push({
                software: 'V2Ray',
                httpPort: inbound.protocol === 'http' ? inbound.port : null,
                socksPort: inbound.protocol === 'socks' ? inbound.port : null,
                configPath: configPath
              })
            }
          }
        }
      }
    } catch (e) {}
  }
  
  return configs
}

// 扫描常见代理端口
async function scanCommonProxyPorts() {
  const commonPorts = [
    { port: 7890, name: 'Clash (mixed)' },
    { port: 7897, name: 'Clash Verge' },
    { port: 7891, name: 'Clash (http)' },
    { port: 1080, name: 'SOCKS5' },
    { port: 1081, name: 'HTTP Proxy' },
    { port: 10808, name: 'V2Ray (SOCKS)' },
    { port: 10809, name: 'V2Ray (HTTP)' },
    { port: 9910, name: 'Shadowsocks' },
    { port: 8889, name: 'HTTP Proxy' },
    { port: 8888, name: 'HTTP Proxy' },
    { port: 33210, name: 'NekoRay' },
    { port: 2080, name: 'Trojan' },
    { port: 41534, name: 'Clash (dynamic)' },
  ]
  
  const openPorts = []
  
  for (const p of commonPorts) {
    if (await checkPortOpen(p.port)) {
      openPorts.push(p)
    }
  }
  
  return openPorts
}

// 检测 TUN/TAP 虚拟网卡
async function detectTUNInterfaces() {
  try {
    const interfaces = await si.networkInterfaces()
    const tunInterfaces = interfaces.filter(iface => {
      const name = (iface.iface || '').toLowerCase()
      const desc = (iface.ifaceName || iface.iface || '').toLowerCase()
      return name.includes('tun') || name.includes('tap') || 
             name.includes('utun') || name.includes('clash') ||
             name.includes('wg') || name.includes('wireguard') ||
             desc.includes('tap-windows') || desc.includes('wintun')
    })
    
    return tunInterfaces.map(iface => ({
      name: iface.iface,
      ip4: iface.ip4,
      ip6: iface.ip6,
      mac: iface.mac,
      type: iface.type,
      active: iface.operstate === 'up' || iface.ip4 !== ''
    }))
  } catch (e) {
    return []
  }
}

// 检测运行中的 VPN 进程
async function detectVPNProcesses() {
  try {
    const processes = await si.processes()
    
    const vpnPatterns = [
      { pattern: 'clash', name: 'Clash', type: 'Proxy' },
      { pattern: 'verge', name: 'Clash Verge', type: 'Proxy' },
      { pattern: 'v2ray', name: 'V2Ray', type: 'Proxy' },
      { pattern: 'xray', name: 'Xray', type: 'Proxy' },
      { pattern: 'shadowsocks', name: 'Shadowsocks', type: 'Proxy' },
      { pattern: 'ss-local', name: 'Shadowsocks', type: 'Proxy' },
      { pattern: 'trojan', name: 'Trojan', type: 'Proxy' },
      { pattern: 'sing-box', name: 'Sing-Box', type: 'Proxy' },
      { pattern: 'nekoray', name: 'NekoRay', type: 'Proxy' },
      { pattern: 'nekobox', name: 'NekoBox', type: 'Proxy' },
      { pattern: 'wireguard', name: 'WireGuard', type: 'VPN' },
      { pattern: 'openvpn', name: 'OpenVPN', type: 'VPN' },
      { pattern: 'nordvpn', name: 'NordVPN', type: 'VPN' },
      { pattern: 'expressvpn', name: 'ExpressVPN', type: 'VPN' },
      { pattern: 'surfshark', name: 'Surfshark', type: 'VPN' },
      { pattern: 'protonvpn', name: 'ProtonVPN', type: 'VPN' },
      { pattern: 'mullvad', name: 'Mullvad', type: 'VPN' },
      { pattern: 'tunnelbear', name: 'TunnelBear', type: 'VPN' },
      { pattern: 'windscribe', name: 'Windscribe', type: 'VPN' },
      { pattern: 'cyberghost', name: 'CyberGhost', type: 'VPN' },
      { pattern: 'privateinternetaccess', name: 'PIA', type: 'VPN' },
      { pattern: 'pia', name: 'PIA', type: 'VPN' },
      { pattern: 'astrill', name: 'Astrill', type: 'VPN' },
      { pattern: 'quantumult', name: 'Quantumult', type: 'Proxy' },
      { pattern: 'surge', name: 'Surge', type: 'Proxy' },
      { pattern: 'shadowrocket', name: 'Shadowrocket', type: 'Proxy' },
    ]
    
    const found = []
    const seen = new Set()
    
    processes.list.forEach(p => {
      const name = (p.name || '').toLowerCase()
      const cmd = (p.command || '').toLowerCase()
      
      for (const vpn of vpnPatterns) {
        if ((name.includes(vpn.pattern) || cmd.includes(vpn.pattern)) && !seen.has(vpn.name)) {
          seen.add(vpn.name)
          found.push({
            processName: p.name,
            displayName: vpn.name,
            type: vpn.type,
            pid: p.pid
          })
        }
      }
    })
    
    return found
  } catch (e) {
    return []
  }
}

// 通过代理端口获取 IP
function getIPViaProxy(port, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: port,
      path: 'http://ip-api.com/json/?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query',
      method: 'GET',
      headers: {
        'Host': 'ip-api.com',
        'User-Agent': 'Mozilla/5.0 NetScout/2.0'
      },
      timeout: timeout
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.status === 'success') {
            resolve(json)
          } else {
            reject(new Error('API error'))
          }
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
    req.end()
  })
}

// 直接获取 IP（不走代理）
function getIPDirect(timeout = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get('http://ip-api.com/json/?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query', {
      timeout,
      headers: { 'User-Agent': 'Mozilla/5.0 NetScout/2.0' }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.status === 'success') {
            resolve(json)
          } else {
            reject(new Error('API error'))
          }
        } catch (e) {
          reject(e)
        }
      })
    })
    
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
  })
}

// 格式化 IP 信息
function formatIPInfo(json) {
  return {
    ip: json.query,
    country: json.country || 'Unknown',
    country_code: json.countryCode || 'Unknown',
    region: json.regionName || json.region || 'Unknown',
    city: json.city || 'Unknown',
    zip: json.zip,
    lat: json.lat || 0,
    lon: json.lon || 0,
    timezone: json.timezone,
    org: json.org,
    isp: json.isp,
    asn: json.as
  }
}

// ==================== 主要 API 函数 ====================

// 综合获取网络状态
async function getComprehensiveNetworkStatus() {
  const result = {
    // VPN/代理状态
    isVPN: false,
    vpnType: 'None', // None, Proxy, VPN, TUN
    
    // 检测到的软件
    vpnSoftware: [],
    
    // 代理信息
    proxy: {
      enabled: false,
      port: null,
      type: null // HTTP, SOCKS, Mixed
    },
    
    // TUN 网卡信息
    tunInterface: {
      detected: false,
      name: null,
      ip: null
    },
    
    // 系统代理设置
    systemProxy: {
      enabled: false,
      server: null
    },
    
    // IP 信息 - 代理出口
    proxyIP: null,
    
    // IP 信息 - 直连（真实）
    directIP: null,
    
    // 本机信息
    localIP: null,
    localMAC: null,
    localInterface: null
  }

  try {
    // 1. 检测 VPN 进程
    const vpnProcesses = await detectVPNProcesses()
    result.vpnSoftware = vpnProcesses
    
    if (vpnProcesses.length > 0) {
      result.isVPN = true
      result.vpnType = vpnProcesses[0].type
    }
    
    // 2. 检测 TUN 网卡
    const tunInterfaces = await detectTUNInterfaces()
    const activeTun = tunInterfaces.find(t => t.active)
    
    if (activeTun) {
      result.isVPN = true
      result.vpnType = 'TUN'
      result.tunInterface = {
        detected: true,
        name: activeTun.name,
        ip: activeTun.ip4
      }
    }
    
    // 3. 检测系统代理
    const systemProxy = process.platform === 'win32' 
      ? await getWindowsSystemProxy()
      : await getUnixSystemProxy()
    
    result.systemProxy = {
      enabled: systemProxy?.enabled || false,
      server: systemProxy?.server || null
    }
    
    // 4. 检测代理端口
    let activeProxyPort = null
    
    // 优先使用系统代理端口
    if (systemProxy?.port && await checkPortOpen(systemProxy.port)) {
      activeProxyPort = systemProxy.port
      result.proxy = {
        enabled: true,
        port: systemProxy.port,
        type: 'System'
      }
    }
    
    // 如果没有系统代理，扫描常见端口
    if (!activeProxyPort) {
      const openPorts = await scanCommonProxyPorts()
      if (openPorts.length > 0) {
        activeProxyPort = openPorts[0].port
        result.proxy = {
          enabled: true,
          port: openPorts[0].port,
          type: openPorts[0].name
        }
      }
    }
    
    if (activeProxyPort) {
      result.isVPN = true
      if (result.vpnType === 'None') {
        result.vpnType = 'Proxy'
      }
    }
    
    // 5. 获取代理 IP
    if (activeProxyPort) {
      try {
        const proxyIPData = await getIPViaProxy(activeProxyPort)
        result.proxyIP = formatIPInfo(proxyIPData)
        console.log(`[Proxy] IP: ${result.proxyIP.ip} (${result.proxyIP.country} ${result.proxyIP.city})`)
      } catch (e) {
        console.log(`[Proxy] Failed to get IP: ${e.message}`)
      }
    }
    
    // 6. 获取直连 IP（真实 IP）
    try {
      const directIPData = await getIPDirect()
      result.directIP = formatIPInfo(directIPData)
      console.log(`[Direct] IP: ${result.directIP.ip} (${result.directIP.country} ${result.directIP.city})`)
    } catch (e) {
      console.log(`[Direct] Failed to get IP: ${e.message}`)
    }
    
    // 7. 获取本机网络信息
    const networkInterfaces = await si.networkInterfaces()
    const activeInterface = networkInterfaces.find(iface => 
      iface.ip4 && !iface.internal && iface.ip4 !== '127.0.0.1' && 
      !iface.iface.toLowerCase().includes('vmware') && 
      !iface.iface.toLowerCase().includes('virtualbox') &&
      !iface.iface.toLowerCase().includes('veth')
    )
    
    if (activeInterface) {
      result.localIP = activeInterface.ip4
      result.localMAC = activeInterface.mac
      result.localInterface = activeInterface.iface
    }
    
  } catch (error) {
    console.log('[ERR] Network status error:', error.message)
  }

  return result
}

// 获取单个 IP 的位置信息
async function getIPLocationMultiSource(ip) {
  if (!ip || ip === '0.0.0.0' || ip === '127.0.0.1' || 
      ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return null
  }

  const cached = ipLocationCache.get(ip)
  if (cached && (Date.now() - cached.time) < IP_CACHE_DURATION) {
    return cached.data
  }

  const geo = geoip.lookup(ip)
  let result = {
    ip: ip,
    country: geo?.country || 'Unknown',
    country_code: geo?.country || 'Unknown',
    region: geo?.region || 'Unknown',
    city: geo?.city || 'Unknown',
    lat: geo?.ll?.[0] || 0,
    lon: geo?.ll?.[1] || 0,
    org: 'Unknown',
    isp: 'Unknown',
    asn: 'Unknown'
  }

  try {
    const req = await new Promise((resolve, reject) => {
      http.get(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as`, {
        timeout: 3000
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (json.status === 'success') {
              resolve(json)
            } else {
              reject(new Error('API error'))
            }
          } catch (e) { reject(e) }
        })
      }).on('error', reject)
    })
    
    result = {
      ip: ip,
      country: req.country,
      country_code: req.countryCode,
      region: req.regionName,
      city: req.city,
      lat: req.lat,
      lon: req.lon,
      timezone: req.timezone,
      org: req.org,
      isp: req.isp,
      asn: req.as
    }
  } catch (e) {}

  ipLocationCache.set(ip, { data: result, time: Date.now() })
  return result
}

// 获取用户信息
async function getUserInfo() {
  try {
    const userInfo = os.userInfo()
    return {
      username: userInfo.username,
      hostname: os.hostname(),
      homedir: userInfo.homedir,
      shell: userInfo.shell || 'N/A'
    }
  } catch (error) {
    return { username: 'User', hostname: 'localhost' }
  }
}

// 获取系统信息
async function getSystemInfo() {
  try {
    const [cpu, mem, osInfo, time, networkInterfaces, users] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.time(),
      si.networkInterfaces(),
      si.users()
    ])

    const uptimeSeconds = time.uptime
    const days = Math.floor(uptimeSeconds / 86400)
    const hours = Math.floor((uptimeSeconds % 86400) / 3600)
    const minutes = Math.floor((uptimeSeconds % 3600) / 60)
    const uptimeStr = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`

    const activeInterface = networkInterfaces.find(iface => 
      iface.ip4 && !iface.internal && iface.ip4 !== '127.0.0.1'
    )

    const currentLoad = await si.currentLoad()
    const userInfo = await getUserInfo()

    return {
      ip: activeInterface?.ip4 || 'N/A',
      hostname: osInfo.hostname,
      os: `${osInfo.distro} ${osInfo.release}`,
      uptime: uptimeStr,
      cpuCores: cpu.cores,
      cpuFrequency: `${(cpu.speed / 1000).toFixed(2)} GHz`,
      cpuUsage: `${currentLoad.currentLoad.toFixed(1)} %`,
      cpuBrand: cpu.brand,
      username: userInfo.username,
      userEmail: users[0]?.user ? `${users[0].user}@${osInfo.hostname}` : `${userInfo.username}@local`
    }
  } catch (error) {
    return {
      ip: 'Error', hostname: 'Error', os: 'Error', uptime: 'Error',
      cpuCores: 0, cpuFrequency: 'Error', cpuUsage: '0 %', cpuBrand: 'Error',
      username: 'User', userEmail: 'user@local'
    }
  }
}

// 获取网络详情
async function getNetworkDetails() {
  try {
    const [networkInterfaces, defaultGateway] = await Promise.all([
      si.networkInterfaces(),
      si.networkGatewayDefault()
    ])

    const activeInterface = networkInterfaces.find(iface => 
      iface.ip4 && !iface.internal && iface.ip4 !== '127.0.0.1'
    )

    if (!activeInterface) return null

    const dnsServers = dns.getServers()

    return {
      localIP: activeInterface.ip4,
      localMAC: activeInterface.mac,
      gateway: defaultGateway || 'N/A',
      gatewayMAC: 'N/A',
      dnsServers: dnsServers.length > 0 ? dnsServers : ['8.8.8.8'],
      dhcpServer: activeInterface.dhcp ? 'DHCP' : 'Static',
      subnetMask: activeInterface.ip4subnet || '255.255.255.0',
      interfaceName: activeInterface.iface
    }
  } catch (error) {
    return null
  }
}

// 系统状态
let lastRxBytes = 0
let lastTxBytes = 0
let lastTimestamp = Date.now()

async function getSystemStats() {
  try {
    const [currentLoad, mem, networkStats] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats()
    ])

    const now = Date.now()
    const timeDiff = (now - lastTimestamp) / 1000

    let totalRx = 0, totalTx = 0
    networkStats.forEach(iface => {
      if (!iface.iface.includes('Loopback')) {
        totalRx += iface.rx_bytes || 0
        totalTx += iface.tx_bytes || 0
      }
    })

    let rxSpeed = 0, txSpeed = 0
    if (lastRxBytes > 0 && timeDiff > 0) {
      rxSpeed = (totalRx - lastRxBytes) / timeDiff / 1024 / 1024
      txSpeed = (totalTx - lastTxBytes) / timeDiff / 1024 / 1024
    }

    lastRxBytes = totalRx
    lastTxBytes = totalTx
    lastTimestamp = now

    let latency = 0, packetLoss = 0
    try {
      const pingResult = await ping.promise.probe('8.8.8.8', { timeout: 2 })
      if (pingResult.alive) {
        latency = parseFloat(pingResult.time) || 0
        packetLoss = parseFloat(pingResult.packetLoss) || 0
      }
    } catch {}

    return {
      stats: {
        cpuLoad: currentLoad.currentLoad.toFixed(2),
        memPercent: ((mem.used / mem.total) * 100).toFixed(2)
      },
      speed: {
        rx_speed_mb: Math.max(0, rxSpeed).toFixed(4),
        tx_speed_mb: Math.max(0, txSpeed).toFixed(4)
      },
      quality: {
        latency: latency.toFixed(2),
        packetLoss: packetLoss.toFixed(2)
      }
    }
  } catch (error) {
    return {
      stats: { cpuLoad: '0', memPercent: '0' },
      speed: { rx_speed_mb: '0', tx_speed_mb: '0' },
      quality: { latency: '0', packetLoss: '0' }
    }
  }
}

// 端口扫描
const EXTENDED_PORT_SERVICES = {
  20: 'FTP-DATA', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
  53: 'DNS', 80: 'HTTP', 110: 'POP3', 135: 'MS-RPC', 139: 'NetBIOS-SSN',
  143: 'IMAP', 443: 'HTTPS', 445: 'SMB', 993: 'IMAPS', 995: 'POP3S',
  1433: 'MSSQL', 1521: 'Oracle', 3306: 'MySQL', 3389: 'RDP',
  5432: 'PostgreSQL', 5900: 'VNC', 6379: 'Redis', 7680: 'WUDO',
  8080: 'HTTP-Proxy', 8443: 'HTTPS-Alt', 27017: 'MongoDB',
  902: 'VMware-Auth', 5357: 'WSDAPI'
}

function getServiceByPort(port) {
  return EXTENDED_PORT_SERVICES[port] || null
}

function getServiceByProcess(processName) {
  if (!processName) return null
  const name = processName.toLowerCase()
  
  const map = {
    'nginx': 'Nginx', 'apache': 'Apache', 'node': 'Node.js',
    'python': 'Python', 'java': 'Java', 'mysqld': 'MySQL',
    'postgres': 'PostgreSQL', 'redis': 'Redis', 'mongod': 'MongoDB',
    'clash': 'Clash', 'v2ray': 'V2Ray', 'vmware': 'VMware',
    'chrome': 'Chrome', 'firefox': 'Firefox', 'edge': 'Edge',
    'code': 'VS Code', 'svchost': 'Windows Service'
  }

  for (const [key, value] of Object.entries(map)) {
    if (name.includes(key)) return value
  }
  return null
}

async function scanPortsReal() {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' 
      ? `netstat -ano | findstr LISTENING`
      : `netstat -tlnp 2>/dev/null || ss -tlnp`
    
    exec(cmd, { timeout: 30000 }, async (error, stdout) => {
      const results = []
      const seenPorts = new Set()
      
      if (!error && stdout) {
        const lines = stdout.split('\n')
        
        for (const line of lines) {
          if (process.platform === 'win32') {
            const match = line.match(/TCP\s+[\d.]+:(\d+)\s+[\d.]+:\d+\s+LISTENING\s+(\d+)/)
            if (match) {
              const port = parseInt(match[1])
              const pid = match[2]
              
              if (!seenPorts.has(port) && port > 0) {
                seenPorts.add(port)
                
                let processName = ''
                let serviceName = getServiceByPort(port)
                
                try {
                  const tasklistOutput = await new Promise((res) => {
                    exec(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, (err, out) => {
                      res(err ? '' : out)
                    })
                  })
                  const taskMatch = tasklistOutput.match(/"([^"]+)"/)
                  if (taskMatch) {
                    processName = taskMatch[1]
                    if (!serviceName) {
                      serviceName = getServiceByProcess(processName) || 'Unknown'
                    }
                  }
                } catch {}
                
                results.push({
                  key: `port-${port}`,
                  port: port,
                  protocol: 'TCP',
                  state: 'open',
                  service: serviceName || 'Unknown',
                  version: processName,
                  pid: pid
                })
              }
            }
          }
        }
      }
      
      results.sort((a, b) => a.port - b.port)
      
      resolve({
        success: true,
        tableData: results,
        openPorts: results.length,
        totalScanned: seenPorts.size,
        target: '127.0.0.1'
      })
    })
  })
}

// 网络连接
async function getNetworkConnections() {
  try {
    const [connections, processes, networkStatus] = await Promise.all([
      si.networkConnections(),
      si.processes(),
      getComprehensiveNetworkStatus()
    ])
    
    const processMap = new Map()
    processes.list.forEach(p => {
      processMap.set(p.pid, p.name)
    })

    // 使用代理 IP 作为当前位置（如果有）
    const currentIP = networkStatus.proxyIP || networkStatus.directIP
    const currentLocation = currentIP ? {
      name: `${currentIP.country_code} ${currentIP.region} ${currentIP.city}`.trim(),
      geo: { value: [currentIP.lon, currentIP.lat] },
      ip: currentIP.ip,
      country: currentIP.country,
      country_code: currentIP.country_code,
      region: currentIP.region,
      city: currentIP.city,
      org: currentIP.org
    } : {
      name: 'Unknown',
      geo: { value: [116.4074, 39.9042] },
      ip: '0.0.0.0'
    }

    const ipGroups = {}
    
    for (const conn of connections) {
      if (conn.peerAddress && 
          conn.peerAddress !== '0.0.0.0' && 
          conn.peerAddress !== '127.0.0.1' &&
          conn.peerAddress !== '*' &&
          conn.peerAddress !== '::' &&
          conn.peerAddress !== '::1' &&
          !conn.peerAddress.startsWith('192.168.') &&
          !conn.peerAddress.startsWith('10.') &&
          !conn.peerAddress.startsWith('fe80:')) {
        
        const ip = conn.peerAddress
        if (!ipGroups[ip]) {
          ipGroups[ip] = { ip, connections: 0, processes: [], ports: [] }
        }
        ipGroups[ip].connections++
        
        const processName = conn.process || processMap.get(conn.pid)
        if (processName && !ipGroups[ip].processes.includes(processName)) {
          ipGroups[ip].processes.push(processName)
        }
        if (conn.peerPort && !ipGroups[ip].ports.includes(conn.peerPort)) {
          ipGroups[ip].ports.push(conn.peerPort)
        }
      }
    }

    const mapData = []
    const countryStats = {}
    const orgStats = {}
    
    const ips = Object.values(ipGroups).sort((a, b) => b.connections - a.connections).slice(0, 100)
    
    for (const ipInfo of ips) {
      const location = await getIPLocationMultiSource(ipInfo.ip)
      
      if (location) {
        const country = location.country || 'Unknown'
        const org = location.org || 'Unknown'
        
        if (!countryStats[country]) {
          countryStats[country] = { count: 0, ips: [], cities: new Set() }
        }
        countryStats[country].count += ipInfo.connections
        countryStats[country].ips.push(ipInfo.ip)
        if (location.city) countryStats[country].cities.add(location.city)
        
        if (!orgStats[org]) {
          orgStats[org] = { count: 0, ips: [] }
        }
        orgStats[org].count += ipInfo.connections
        orgStats[org].ips.push(ipInfo.ip)
        
        mapData.push({
          name: `${location.country} ${location.city || ''}`.trim(),
          value: [location.lon || 0, location.lat || 0, ipInfo.connections],
          ip: ipInfo.ip,
          country: location.country,
          country_code: location.country_code,
          region: location.region,
          city: location.city,
          org: location.org,
          isp: location.isp,
          asn: location.asn,
          connections: ipInfo.connections,
          processes: ipInfo.processes,
          ports: ipInfo.ports
        })
      }
    }

    const countryList = Object.entries(countryStats)
      .map(([country, data]) => ({
        country,
        connections: data.count,
        ips: data.ips.length,
        cities: Array.from(data.cities)
      }))
      .sort((a, b) => b.connections - a.connections)

    const orgList = Object.entries(orgStats)
      .map(([org, data]) => ({
        org,
        connections: data.count,
        ips: data.ips.length
      }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 30)

    return {
      mapData,
      currentLocation,
      totalConnections: connections.length,
      countryStats: countryList,
      orgStats: orgList,
      uniqueIPs: Object.keys(ipGroups).length
    }
  } catch (error) {
    console.log('[ERR] Connections error:', error.message)
    return { 
      mapData: [], currentLocation: null, totalConnections: 0,
      countryStats: [], orgStats: [], uniqueIPs: 0
    }
  }
}

// ==================== API 路由 ====================

app.get('/api/system-info', async (req, res) => {
  const info = await getSystemInfo()
  res.json(info)
})

app.get('/api/user-info', async (req, res) => {
  const info = await getUserInfo()
  const systemInfo = await getSystemInfo()
  res.json({ ...info, email: systemInfo.userEmail })
})

app.get('/api/ports', async (req, res) => {
  const result = await scanPortsReal()
  res.json(result)
})

app.get('/api/connections', async (req, res) => {
  const result = await getNetworkConnections()
  res.json(result)
})

app.get('/api/vpn-status', async (req, res) => {
  const status = await getComprehensiveNetworkStatus()
  res.json(status)
})

app.get('/api/current-location', async (req, res) => {
  const status = await getComprehensiveNetworkStatus()
  res.json(status.proxyIP || status.directIP || { error: 'Failed to get location' })
})

// WebSocket
io.on('connection', async (socket) => {
  console.log('[WS] Client connected:', socket.id)

  const networkDetails = await getNetworkDetails()
  if (networkDetails) {
    socket.emit('network-details', networkDetails)
  }

  const statsInterval = setInterval(async () => {
    const stats = await getSystemStats()
    socket.emit('system-update', stats)
  }, 2000)

  socket.on('disconnect', () => {
    console.log('[WS] Client disconnected:', socket.id)
    clearInterval(statsInterval)
  })
})

// 启动服务器
server.listen(PORT, async () => {
  console.log(`[SERVER] NetScout X started on http://localhost:${PORT}`)
  console.log('[INIT] Detecting network status...')
  
  const status = await getComprehensiveNetworkStatus()
  
  console.log(`[INIT] VPN/Proxy: ${status.isVPN ? 'YES' : 'NO'} (${status.vpnType})`)
  
  if (status.vpnSoftware.length > 0) {
    console.log(`[INIT] Software: ${status.vpnSoftware.map(s => s.displayName).join(', ')}`)
  }
  
  if (status.proxy.enabled) {
    console.log(`[INIT] Proxy port: ${status.proxy.port} (${status.proxy.type})`)
  }
  
  if (status.tunInterface.detected) {
    console.log(`[INIT] TUN interface: ${status.tunInterface.name}`)
  }
  
  if (status.proxyIP) {
    console.log(`[INIT] Proxy IP: ${status.proxyIP.ip} (${status.proxyIP.country} ${status.proxyIP.city})`)
  }
  
  if (status.directIP) {
    console.log(`[INIT] Direct IP: ${status.directIP.ip} (${status.directIP.country} ${status.directIP.city})`)
  }
})