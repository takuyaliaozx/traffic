/**
 * NetScout X - 版本检测服务模块
 * 针对特定服务的增强版本检测
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import net from 'net'
import http from 'http'

const execPromise = promisify(exec)

// 配置
const CONFIG = {
  socketTimeout: 3000,
  httpTimeout: 3000,
  maxBufferSize: 1024 * 64  // 64KB
}

// ==================== 协议特定检测器 ====================

/**
 * 检测 MySQL 版本
 * @param {string} host - 主机地址
 * @param {number} port - 端口号
 * @returns {Promise<string|null>} - 版本信息
 */
export async function detectMySQLVersion(host, port = 3306) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let buffer = Buffer.alloc(0)

    socket.setTimeout(CONFIG.socketTimeout)

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data])

      try {
        // MySQL 握手包解析
        // 前4字节: 包长度, 第5字节: 包序号
        // 第6字节开始: 协议版本，后续为服务器版本字符串（\0 结尾）
        if (buffer.length > 10) {
          const offset = 5
          const versionBytes = []
          
          for (let i = offset; i < buffer.length && i < offset + 50; i++) {
            if (buffer[i] === 0) break
            versionBytes.push(buffer[i])
          }

          const version = Buffer.from(versionBytes).toString('utf8')
          if (version?.length > 0) {
            socket.destroy()
            resolve(`MySQL ${version}`)
            return
          }
        }
      } catch {
        // 解析失败，继续接收数据
      }
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(null)
    })

    socket.on('error', () => {
      socket.destroy()
      resolve(null)
    })

    socket.on('close', () => resolve(null))

    try {
      socket.connect(port, host)
    } catch {
      resolve(null)
    }
  })
}

/**
 * 检测 Redis 版本
 * @param {string} host - 主机地址
 * @param {number} port - 端口号
 * @returns {Promise<string|null>} - 版本信息
 */
export async function detectRedisVersion(host, port = 6379) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let buffer = ''

    socket.setTimeout(CONFIG.socketTimeout)

    socket.on('data', (data) => {
      buffer += data.toString()

      // 解析 Redis INFO 响应
      if (buffer.includes('redis_version:')) {
        const match = buffer.match(/redis_version:([^\r\n]+)/)
        if (match) {
          socket.destroy()
          resolve(`Redis ${match[1]}`)
          return
        }
      }

      // 防止缓冲区过大
      if (buffer.length > CONFIG.maxBufferSize) {
        socket.destroy()
        resolve(null)
      }
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(null)
    })

    socket.on('error', () => {
      socket.destroy()
      resolve(null)
    })

    socket.on('connect', () => {
      socket.write('INFO\r\n')
    })

    try {
      socket.connect(port, host)
    } catch {
      resolve(null)
    }
  })
}

/**
 * 检测 HTTP 服务版本
 * @param {string} host - 主机地址
 * @param {number} port - 端口号
 * @returns {Promise<string|null>} - 版本信息
 */
export async function detectHTTPVersion(host, port = 80) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port,
      path: '/',
      method: 'HEAD',  // 使用 HEAD 减少响应大小
      timeout: CONFIG.httpTimeout,
      headers: {
        'User-Agent': 'NetScout-X/1.0',
        'Accept': '*/*'
      }
    }

    const req = http.request(options, (res) => {
      const server = res.headers['server']
      const poweredBy = res.headers['x-powered-by']
      
      let version = null
      if (server) {
        version = server
      } else if (poweredBy) {
        version = poweredBy
      }

      req.destroy()
      resolve(version)
    })

    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })

    req.on('error', () => {
      req.destroy()
      resolve(null)
    })

    req.end()
  })
}

/**
 * 检测 MongoDB 版本
 * @param {string} host - 主机地址
 * @param {number} port - 端口号
 * @returns {Promise<string|null>} - 版本信息
 */
export async function detectMongoDBVersion(host, port = 27017) {
  return new Promise((resolve) => {
    const socket = new net.Socket()

    socket.setTimeout(CONFIG.socketTimeout)

    // MongoDB ismaster 命令
    const ismaster = Buffer.from([
      0x3f, 0x00, 0x00, 0x00, // 消息长度
      0x01, 0x00, 0x00, 0x00, // 请求ID
      0x00, 0x00, 0x00, 0x00, // 响应ID
      0xd4, 0x07, 0x00, 0x00, // opCode: OP_QUERY
      0x00, 0x00, 0x00, 0x00, // flags
      0x61, 0x64, 0x6d, 0x69, 0x6e, 0x2e, 0x24, 0x63, 0x6d, 0x64, 0x00, // admin.$cmd
      0x00, 0x00, 0x00, 0x00, // numberToSkip
      0x01, 0x00, 0x00, 0x00, // numberToReturn
      // BSON: { isMaster: 1 }
      0x13, 0x00, 0x00, 0x00,
      0x10, 0x69, 0x73, 0x4d, 0x61, 0x73, 0x74, 0x65, 0x72, 0x00,
      0x01, 0x00, 0x00, 0x00,
      0x00
    ])

    let buffer = Buffer.alloc(0)

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data])

      // 尝试提取版本信息
      const str = buffer.toString('utf8', 0, Math.min(buffer.length, 1000))
      const versionMatch = str.match(/version"?\s*:\s*"?([0-9.]+)/i)
      
      if (versionMatch) {
        socket.destroy()
        resolve(`MongoDB ${versionMatch[1]}`)
        return
      }
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(null)
    })

    socket.on('error', () => {
      socket.destroy()
      resolve(null)
    })

    socket.on('connect', () => {
      socket.write(ismaster)
    })

    try {
      socket.connect(port, host)
    } catch {
      resolve(null)
    }
  })
}

/**
 * 检测 PostgreSQL 版本
 * @param {string} host - 主机地址
 * @param {number} port - 端口号
 * @returns {Promise<string|null>} - 版本信息
 */
export async function detectPostgreSQLVersion(host, port = 5432) {
  return new Promise((resolve) => {
    const socket = new net.Socket()

    socket.setTimeout(CONFIG.socketTimeout)

    // PostgreSQL 启动消息
    const startup = Buffer.alloc(8)
    startup.writeInt32BE(8, 0)          // 消息长度
    startup.writeInt16BE(1234, 4)       // 取消请求码
    startup.writeInt16BE(5679, 6)       // 取消请求码

    let buffer = Buffer.alloc(0)

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data])

      // PostgreSQL 错误响应通常包含版本信息
      const str = buffer.toString('utf8')
      
      // 查找版本模式
      const patterns = [
        /PostgreSQL\s+([0-9.]+)/i,
        /server version\s+([0-9.]+)/i
      ]

      for (const pattern of patterns) {
        const match = str.match(pattern)
        if (match) {
          socket.destroy()
          resolve(`PostgreSQL ${match[1]}`)
          return
        }
      }
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(null)
    })

    socket.on('error', () => {
      socket.destroy()
      resolve(null)
    })

    socket.on('connect', () => {
      socket.write(startup)
    })

    try {
      socket.connect(port, host)
    } catch {
      resolve(null)
    }
  })
}

/**
 * 检测 SSH 版本
 * @param {string} host - 主机地址
 * @param {number} port - 端口号
 * @returns {Promise<string|null>} - 版本信息
 */
export async function detectSSHVersion(host, port = 22) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let buffer = ''

    socket.setTimeout(CONFIG.socketTimeout)

    socket.on('data', (data) => {
      buffer += data.toString()

      // SSH 横幅格式: SSH-2.0-OpenSSH_8.0
      const match = buffer.match(/SSH-[\d.]+-([\w\s._-]+)/i)
      if (match) {
        socket.destroy()
        resolve(`SSH ${match[1].trim()}`)
        return
      }
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(null)
    })

    socket.on('error', () => {
      socket.destroy()
      resolve(null)
    })

    try {
      socket.connect(port, host)
    } catch {
      resolve(null)
    }
  })
}

// ==================== 统一检测入口 ====================

/**
 * 增强版本检测 - 针对特定端口使用专门的检测方法
 * @param {string} host - 主机地址
 * @param {number} port - 端口号
 * @param {string} service - 服务类型
 * @returns {Promise<string|null>} - 版本信息
 */
export async function enhancedVersionDetection(host, port, service) {
  const serviceLower = (service || '').toLowerCase()

  try {
    // SSH
    if (port === 22 || serviceLower.includes('ssh')) {
      const version = await detectSSHVersion(host, port)
      if (version) {
        console.log(`  ✓ SSH 版本: ${version}`)
        return version
      }
    }

    // MySQL
    if (port === 3306 || serviceLower.includes('mysql')) {
      const version = await detectMySQLVersion(host, port)
      if (version) {
        console.log(`  ✓ MySQL 版本: ${version}`)
        return version
      }
    }

    // HTTP 服务
    const httpPorts = [80, 8080, 8000, 8888, 3000, 5000, 8008, 8088]
    if (httpPorts.includes(port) || serviceLower.includes('http')) {
      const version = await detectHTTPVersion(host, port)
      if (version) {
        console.log(`  ✓ HTTP 版本: ${version}`)
        return version
      }
    }

    // Redis
    if (port === 6379 || serviceLower.includes('redis')) {
      const version = await detectRedisVersion(host, port)
      if (version) {
        console.log(`  ✓ Redis 版本: ${version}`)
        return version
      }
    }

    // MongoDB
    if (port === 27017 || serviceLower.includes('mongo')) {
      const version = await detectMongoDBVersion(host, port)
      if (version) {
        console.log(`  ✓ MongoDB 版本: ${version}`)
        return version
      }
    }

    // PostgreSQL
    if (port === 5432 || serviceLower.includes('postgres')) {
      const version = await detectPostgreSQLVersion(host, port)
      if (version) {
        console.log(`  ✓ PostgreSQL 版本: ${version}`)
        return version
      }
    }
  } catch (error) {
    console.log(`  ⚠️ 增强检测失败: ${error.message}`)
  }

  return null
}

/**
 * 批量版本检测
 * @param {Array<{host: string, port: number, service: string}>} targets - 目标列表
 * @returns {Promise<Map<string, string>>} - 版本信息映射
 */
export async function batchVersionDetection(targets) {
  const results = new Map()

  await Promise.all(
    targets.map(async (target) => {
      const key = `${target.host}:${target.port}`
      const version = await enhancedVersionDetection(target.host, target.port, target.service)
      if (version) {
        results.set(key, version)
      }
    })
  )

  return results
}
