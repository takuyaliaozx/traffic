/**
 * NetScout X - 工具函数模块
 * 提取公共函数，避免代码重复
 */

/**
 * 判断是否为私有 IP 地址
 * @param {string} ip - IP 地址
 * @returns {boolean} - 是否为私有 IP
 */
export function isPrivateIP(ip) {
  if (!ip || ip === '*' || ip === '0.0.0.0' || ip === '127.0.0.1' || ip === '::1' || ip === '::') {
    return true
  }

  // 10.0.0.0/8
  if (ip.startsWith('10.')) return true

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (ip.startsWith('172.')) {
    const secondOctet = parseInt(ip.split('.')[1])
    if (secondOctet >= 16 && secondOctet <= 31) return true
  }

  // 192.168.0.0/16
  if (ip.startsWith('192.168.')) return true

  // 169.254.0.0/16 (链路本地地址)
  if (ip.startsWith('169.254.')) return true

  // IPv6 本地地址
  if (ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true

  return false
}

/**
 * 常见端口到服务的映射表
 */
export const PORT_SERVICE_MAP = {
  // 文件传输
  20: 'FTP-Data',
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  69: 'TFTP',
  
  // 邮件服务
  25: 'SMTP',
  110: 'POP3',
  143: 'IMAP',
  465: 'SMTPS',
  587: 'SMTP-Submission',
  993: 'IMAPS',
  995: 'POP3S',
  
  // DNS & 网络
  53: 'DNS',
  67: 'DHCP-Server',
  68: 'DHCP-Client',
  123: 'NTP',
  161: 'SNMP',
  514: 'Syslog',
  
  // Web 服务
  80: 'HTTP',
  443: 'HTTPS',
  8000: 'HTTP-Alt',
  8008: 'HTTP-Alt',
  8080: 'HTTP-Proxy',
  8088: 'HTTP-Alt',
  8443: 'HTTPS-Alt',
  8888: 'HTTP-Alt',
  
  // Windows 服务
  135: 'MS-RPC',
  137: 'NetBIOS-NS',
  138: 'NetBIOS-DGM',
  139: 'NetBIOS-SSN',
  445: 'SMB',
  1900: 'UPnP/SSDP',
  3389: 'RDP',
  5357: 'WSDAPI',
  
  // 目录服务
  389: 'LDAP',
  636: 'LDAPS',
  
  // 数据库
  1433: 'MS-SQL',
  1521: 'Oracle-DB',
  3306: 'MySQL',
  5432: 'PostgreSQL',
  5984: 'CouchDB',
  6379: 'Redis',
  9042: 'Cassandra-CQL',
  11211: 'Memcached',
  27017: 'MongoDB',
  27018: 'MongoDB-Shard',
  27019: 'MongoDB-Config',
  
  // 消息队列
  5672: 'RabbitMQ-AMQP',
  9092: 'Kafka',
  15672: 'RabbitMQ-Web',
  
  // 容器与编排
  2375: 'Docker',
  2376: 'Docker-TLS',
  6443: 'Kubernetes-API',
  
  // 搜索与监控
  9000: 'SonarQube',
  9090: 'Prometheus',
  9200: 'Elasticsearch-HTTP',
  9300: 'Elasticsearch-Transport',
  
  // 虚拟化
  902: 'VMware-Auth',
  912: 'VMware-Auth',
  5900: 'VNC',
  
  // 开发相关
  3000: 'Node.js-Dev',
  4000: 'Dev-Server',
  5000: 'Flask/UPnP',
  
  // 其他
  873: 'Rsync',
  1723: 'PPTP',
  2049: 'NFS',
  2082: 'cPanel',
  2083: 'cPanel-SSL',
  2181: 'ZooKeeper',
  4369: 'Erlang-EPMD',
  7000: 'Cassandra-Internode',
  7001: 'WebLogic',
  50000: 'SAP',
  50070: 'Hadoop-NameNode'
}

/**
 * 根据端口获取服务名
 * @param {number} port - 端口号
 * @returns {string|null} - 服务名称
 */
export function getServiceByPort(port) {
  if (PORT_SERVICE_MAP[port]) {
    return PORT_SERVICE_MAP[port]
  }

  // 根据端口范围推断服务类型
  if (port >= 0 && port <= 1023) {
    return `系统服务 (${port})`
  } else if (port >= 1024 && port <= 49151) {
    return `注册服务 (${port})`
  } else if (port >= 49152 && port <= 65535) {
    return `动态端口 (${port})`
  }

  return null
}

/**
 * 格式化字节大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} - 格式化后的字符串
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * 格式化时间戳
 * @param {Date|number|string} timestamp - 时间戳
 * @returns {string} - 格式化后的时间字符串
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 安全的 JSON 解析
 * @param {string} str - JSON 字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} - 解析后的对象或默认值
 */
export function safeJSONParse(str, defaultValue = null) {
  try {
    return JSON.parse(str)
  } catch {
    return defaultValue
  }
}

/**
 * 延迟执行
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 带超时的 Promise
 * @param {Promise} promise - 原始 Promise
 * @param {number} timeout - 超时毫秒数
 * @param {string} errorMessage - 超时错误信息
 * @returns {Promise}
 */
export function withTimeout(promise, timeout, errorMessage = '操作超时') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeout)
    )
  ])
}

/**
 * 重试执行函数
 * @param {Function} fn - 要执行的函数
 * @param {number} retries - 重试次数
 * @param {number} delayMs - 重试间隔
 * @returns {Promise}
 */
export async function retry(fn, retries = 3, delayMs = 1000) {
  let lastError
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i < retries - 1) {
        await delay(delayMs)
      }
    }
  }
  throw lastError
}

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} wait - 节流间隔
 * @returns {Function}
 */
export function throttle(fn, wait) {
  let lastTime = 0
  let timeout = null

  return function (...args) {
    const now = Date.now()
    const remaining = wait - (now - lastTime)

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      lastTime = now
      fn.apply(this, args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastTime = Date.now()
        timeout = null
        fn.apply(this, args)
      }, remaining)
    }
  }
}

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} wait - 防抖间隔
 * @returns {Function}
 */
export function debounce(fn, wait) {
  let timeout = null

  return function (...args) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      fn.apply(this, args)
    }, wait)
  }
}
