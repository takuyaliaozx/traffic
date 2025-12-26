/**
 * NetScout X - 端口扫描服务模块
 * 使用 nmap 进行端口扫描和服务检测
 */

import nmap from 'node-nmap'

// 配置 nmap 路径（Windows 环境）
const NMAP_PATH = process.env.NMAP_PATH || 'D:\\Nmap\\nmap.exe'
nmap.nmapLocation = NMAP_PATH

// ==================== 端口服务映射 ====================

const SERVICE_MAP = {
  'ftp-data': 'FTP Data',
  'ftp': 'FTP',
  'ssh': 'SSH',
  'telnet': 'Telnet',
  'smtp': 'SMTP',
  'domain': 'DNS',
  'http': 'HTTP',
  'pop3': 'POP3',
  'imap': 'IMAP',
  'https': 'HTTPS',
  'microsoft-ds': 'SMB',
  'smtps': 'SMTPS',
  'imaps': 'IMAPS',
  'pop3s': 'POP3S',
  'ms-sql-s': 'MS SQL Server',
  'ms-wbt-server': 'RDP',
  'msrpc': 'MS-RPC',
  'mysql': 'MySQL',
  'postgresql': 'PostgreSQL',
  'vnc': 'VNC',
  'redis': 'Redis',
  'http-proxy': 'HTTP Proxy',
  'http-alt': 'HTTP Alt',
  'mongodb': 'MongoDB',
  'elasticsearch': 'Elasticsearch',
  'kafka': 'Kafka',
  'unknown': 'Unknown'
}

const PORT_SERVICES = {
  20: 'FTP-DATA',
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  135: 'MS-RPC',
  139: 'NetBIOS-SSN',
  143: 'IMAP',
  443: 'HTTPS',
  445: 'SMB',
  465: 'SMTPS',
  587: 'SMTP',
  902: 'VMware-Auth',
  912: 'VMware-Auth',
  993: 'IMAPS',
  995: 'POP3S',
  1433: 'MSSQL',
  1521: 'Oracle',
  3000: 'Node.js/Grafana',
  3306: 'MySQL',
  3389: 'RDP',
  5357: 'WSDAPI',
  5432: 'PostgreSQL',
  5900: 'VNC',
  6379: 'Redis',
  8080: 'HTTP-Alt',
  8443: 'HTTPS-Alt',
  27017: 'MongoDB',
  5000: 'Flask/UPnP',
  9200: 'Elasticsearch',
  9092: 'Kafka'
}

// ==================== 常用端口列表 ====================

const COMMON_PORTS = [
  21,    // FTP
  22,    // SSH
  23,    // Telnet
  25,    // SMTP
  53,    // DNS
  80,    // HTTP
  110,   // POP3
  139,   // NetBIOS-SSN
  143,   // IMAP
  443,   // HTTPS
  445,   // SMB
  902,   // VMware
  912,   // VMware
  3000,  // Node.js/Grafana
  3306,  // MySQL
  3389,  // RDP
  5357,  // WSDAPI
  5432,  // PostgreSQL
  6379,  // Redis
  8080,  // HTTP-Alt
  27017  // MongoDB
]

const EXTENDED_PORTS = [
  20, 21, 22, 23, 25, 53, 80, 110, 143, 443, 445,
  587, 993, 995, 1433, 1521, 3306, 3389, 5432,
  5900, 6379, 8080, 8443, 27017, 5000, 9200, 9092
]

// ==================== 核心扫描函数 ====================

/**
 * 使用 nmap 扫描端口
 * @param {string} host - 目标主机地址
 * @param {number[]} ports - 端口列表
 * @returns {Promise<Array>} - 扫描结果
 */
export async function scanPorts(host, ports) {
  return new Promise((resolve, reject) => {
    const portRange = ports.join(',')
    console.log(`🔍 Nmap 扫描: ${host}, 端口: ${portRange}`)

    // 使用服务版本检测
    // -sV: 服务版本检测
    // --version-intensity 7: 提高版本检测强度
    // --version-all: 尝试所有版本检测探针
    const nmapScan = new nmap.OsAndPortScan(
      host, 
      `-p ${portRange} -sV --version-intensity 7 --version-all`
    )

    // 设置超时
    const timeout = setTimeout(() => {
      console.error('⚠️ Nmap 扫描超时')
      reject(new Error('扫描超时'))
    }, 120000) // 2 分钟超时

    nmapScan.on('complete', (data) => {
      clearTimeout(timeout)
      
      try {
        const results = []
        const scannedPorts = new Set()

        // 处理扫描结果
        if (data?.length > 0) {
          for (const item of data) {
            if (item.openPorts?.length > 0) {
              for (const portInfo of item.openPorts) {
                const port = parseInt(portInfo.port)
                scannedPorts.add(port)

                // 构建版本信息
                let versionInfo = ''
                if (portInfo.product) {
                  versionInfo = portInfo.product
                  if (portInfo.version) versionInfo += ` ${portInfo.version}`
                  if (portInfo.extrainfo) versionInfo += ` (${portInfo.extrainfo})`
                } else if (portInfo.version) {
                  versionInfo = portInfo.version
                }

                results.push({
                  host: item.ip || host,
                  port,
                  protocol: (portInfo.protocol || 'tcp').toUpperCase(),
                  status: 'open',
                  state: '开启',
                  service: portInfo.service || getServiceName(port),
                  serviceName: formatServiceName(portInfo.service || getServiceName(port)),
                  version: versionInfo,
                  product: portInfo.product || '',
                  extraInfo: portInfo.extrainfo || '',
                  method: 'nmap',
                  timestamp: new Date().toISOString()
                })
              }
            }
          }
        }

        // 添加未扫描到的端口（关闭状态）
        for (const port of ports) {
          if (!scannedPorts.has(port)) {
            results.push({
              host,
              port,
              protocol: 'TCP',
              status: 'closed',
              state: '关闭',
              service: getServiceName(port),
              serviceName: formatServiceName(getServiceName(port)),
              version: '',
              product: '',
              extraInfo: '',
              method: 'nmap',
              timestamp: new Date().toISOString()
            })
          }
        }

        // 按端口号排序
        results.sort((a, b) => a.port - b.port)

        console.log(`✓ Nmap 完成: ${host}, 开放端口: ${scannedPorts.size}`)
        resolve(results)
      } catch (error) {
        console.error('解析 Nmap 结果失败:', error)
        reject(error)
      }
    })

    nmapScan.on('error', (error) => {
      clearTimeout(timeout)
      console.error('Nmap 扫描错误:', error)
      reject(error)
    })

    nmapScan.startScan()
  })
}

/**
 * 扫描常用端口
 * @param {string} host - 目标主机地址
 * @returns {Promise<Array>} - 扫描结果
 */
export async function scanCommonPorts(host) {
  return scanPorts(host, COMMON_PORTS)
}

/**
 * 扫描扩展端口列表
 * @param {string} host - 目标主机地址
 * @returns {Promise<Array>} - 扫描结果
 */
export async function scanAllCommonPorts(host) {
  return scanPorts(host, EXTENDED_PORTS)
}

// ==================== 辅助函数 ====================

/**
 * 格式化服务名称
 * @param {string} service - 原始服务名称
 * @returns {string} - 格式化后的服务名称
 */
function formatServiceName(service) {
  if (!service) return 'Unknown'
  const lower = service.toLowerCase()
  return SERVICE_MAP[lower] || service.toUpperCase()
}

/**
 * 根据端口号获取服务名称
 * @param {number} port - 端口号
 * @returns {string} - 服务名称
 */
export function getServiceName(port) {
  return PORT_SERVICES[port] || 'Unknown'
}

/**
 * 获取常用端口列表
 * @returns {number[]} - 端口列表
 */
export function getCommonPorts() {
  return [...COMMON_PORTS]
}

/**
 * 获取扩展端口列表
 * @returns {number[]} - 端口列表
 */
export function getExtendedPorts() {
  return [...EXTENDED_PORTS]
}
