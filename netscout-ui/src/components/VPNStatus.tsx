import { useState, useEffect } from 'react'
import { Card, Row, Col, Typography, Tag, Spin, Button, Tooltip, message } from 'antd'
import { 
  GlobalOutlined, 
  SafetyCertificateOutlined, 
  CloudServerOutlined,
  ReloadOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DesktopOutlined,
  ApartmentOutlined
} from '@ant-design/icons'

const { Text } = Typography

interface IPInfo {
  ip: string
  country: string
  country_code: string
  region: string
  city: string
  zip?: string
  lat: number
  lon: number
  timezone?: string
  org?: string
  isp?: string
  asn?: string
}

interface VPNSoftware {
  processName: string
  displayName: string
  type: string
  pid: number
}

interface NetworkStatus {
  isVPN: boolean
  vpnType: string
  vpnSoftware: VPNSoftware[]
  proxy: {
    enabled: boolean
    port: number | null
    type: string | null
  }
  tunInterface: {
    detected: boolean
    name: string | null
    ip: string | null
  }
  systemProxy: {
    enabled: boolean
    server: string | null
  }
  proxyIP: IPInfo | null
  directIP: IPInfo | null
  localIP: string | null
  localMAC: string | null
  localInterface: string | null
}

function VPNStatus() {
  const [status, setStatus] = useState<NetworkStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8080/api/vpn-status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        setLastUpdate(new Date().toLocaleTimeString('zh-CN'))
      }
    } catch (error) {
      console.error('Failed to fetch VPN status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(`${label} 已复制`)
    })
  }

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(37, 43, 74, 0.6) 0%, rgba(37, 43, 74, 0.3) 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  }

  const InfoItem = ({ label, value, copyable = false, color }: { 
    label: string
    value: string | undefined | null
    copyable?: boolean
    color?: string
  }) => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)'
    }}>
      <Text style={{ color: '#888', fontSize: '13px' }}>{label}</Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '65%' }}>
        <Text 
          ellipsis 
          style={{ color: color || '#fff', fontSize: '13px', fontFamily: 'monospace' }} 
          title={value || 'N/A'}
        >
          {value || 'N/A'}
        </Text>
        {copyable && value && (
          <Tooltip title="复制">
            <CopyOutlined 
              style={{ color: '#666', cursor: 'pointer', fontSize: '12px' }}
              onClick={() => copyToClipboard(value, label)}
            />
          </Tooltip>
        )}
      </div>
    </div>
  )

  if (loading && !status) {
    return (
      <Card 
        title={<span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>VPN 与位置信息</span>}
        bordered={false}
        style={{ background: 'transparent', border: 'none' }}
        bodyStyle={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}
      >
        <Spin size="large" />
      </Card>
    )
  }

  const isProxied = status?.isVPN && status?.proxyIP && status?.directIP && 
                    status.proxyIP.ip !== status.directIP.ip

  const proxyIPInfo = status?.proxyIP ?? null
  const directIPInfo = status?.directIP ?? null

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SafetyCertificateOutlined style={{ color: '#a855f7' }} />
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>VPN 与位置信息</span>
          {status?.isVPN ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              {status.vpnType === 'TUN' ? 'TUN 模式' : 
               status.vpnType === 'Proxy' ? '代理模式' : 
               status.vpnType === 'VPN' ? 'VPN 已连接' : '已连接'}
            </Tag>
          ) : (
            <Tag color="default" icon={<CloseCircleOutlined />}>直连</Tag>
          )}
        </div>
      }
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdate && <Text style={{ color: '#666', fontSize: '12px' }}>更新: {lastUpdate}</Text>}
          <Button 
            icon={<ReloadOutlined spin={loading} />} 
            onClick={fetchStatus} 
            loading={loading}
            size="small"
          >
            刷新
          </Button>
        </div>
      }
      bordered={false}
      style={{ background: 'transparent', border: 'none' }}
      headStyle={{ border: 'none', padding: '0 0 16px 0' }}
      bodyStyle={{ padding: 0 }}
    >
      <Row gutter={16}>
        <Col span={isProxied ? 6 : 8}>
          <div style={{ ...cardStyle, padding: '20px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <GlobalOutlined style={{ color: '#22c55e', fontSize: '18px' }} />
              <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                {isProxied ? '代理出口' : '公网 IP'}
              </Text>
              {isProxied && <Tag color="green" style={{ fontSize: '10px', marginLeft: 'auto' }}>Proxy</Tag>}
            </div>
            <InfoItem label="IP 地址" value={proxyIPInfo?.ip || directIPInfo?.ip} copyable />
            <InfoItem label="国家" value={proxyIPInfo?.country || directIPInfo?.country} />
            <InfoItem label="地区" value={proxyIPInfo?.region || directIPInfo?.region} />
            <InfoItem label="城市" value={proxyIPInfo?.city || directIPInfo?.city} />
            <InfoItem label="邮编" value={proxyIPInfo?.zip || directIPInfo?.zip} />
            <InfoItem label="时区" value={proxyIPInfo?.timezone || directIPInfo?.timezone} />
            <InfoItem label="坐标" value={proxyIPInfo?.lat ? `${proxyIPInfo.lat.toFixed(4)}, ${proxyIPInfo.lon.toFixed(4)}` : (directIPInfo?.lat ? `${directIPInfo.lat.toFixed(4)}, ${directIPInfo.lon.toFixed(4)}` : null)} />
          </div>
        </Col>

        {isProxied && (
          <Col span={6}>
            <div style={{ ...cardStyle, padding: '20px', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <DesktopOutlined style={{ color: '#f59e0b', fontSize: '18px' }} />
                <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>直连出口</Text>
                <Tag color="orange" style={{ fontSize: '10px', marginLeft: 'auto' }}>Direct</Tag>
              </div>
              <InfoItem label="IP 地址" value={directIPInfo?.ip} copyable />
              <InfoItem label="国家" value={directIPInfo?.country} />
              <InfoItem label="地区" value={directIPInfo?.region} />
              <InfoItem label="城市" value={directIPInfo?.city} />
              <InfoItem label="邮编" value={directIPInfo?.zip} />
              <InfoItem label="时区" value={directIPInfo?.timezone} />
              <InfoItem label="坐标" value={directIPInfo?.lat ? `${directIPInfo.lat.toFixed(4)}, ${directIPInfo.lon.toFixed(4)}` : null} />
            </div>
          </Col>
        )}

        <Col span={isProxied ? 6 : 8}>
          <div style={{ ...cardStyle, padding: '20px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <CloudServerOutlined style={{ color: '#a855f7', fontSize: '18px' }} />
              <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>网络运营商</Text>
            </div>
            <InfoItem label="ISP" value={proxyIPInfo?.isp || directIPInfo?.isp} />
            <InfoItem label="组织" value={proxyIPInfo?.org || directIPInfo?.org} />
            <InfoItem label="ASN" value={proxyIPInfo?.asn || directIPInfo?.asn} />
            <InfoItem label="本机 IP" value={status?.localIP} copyable />
            <InfoItem label="本机 MAC" value={status?.localMAC} copyable />
            <InfoItem label="物理接口" value={status?.localInterface} />
          </div>
        </Col>

        <Col span={isProxied ? 6 : 8}>
          <div style={{ ...cardStyle, padding: '20px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ApartmentOutlined style={{ color: status?.isVPN ? '#22c55e' : '#666', fontSize: '18px' }} />
              <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>连接状态</Text>
            </div>
            <InfoItem label="VPN/代理" value={status?.isVPN ? '已启用' : '未启用'} color={status?.isVPN ? '#22c55e' : '#888'} />
            <InfoItem label="连接模式" value={status?.vpnType || 'None'} />
            {status?.vpnSoftware && status.vpnSoftware.length > 0 && (
              <InfoItem label="代理软件" value={status.vpnSoftware.map(s => s.displayName).join(', ')} color="#a855f7" />
            )}
            {status?.proxy.enabled && (
              <InfoItem label="代理端口" value={`${status.proxy.port} (${status.proxy.type})`} />
            )}
            {status?.tunInterface.detected && (
              <InfoItem label="TUN 网卡" value={status.tunInterface.name || 'Active'} color="#06b6d4" />
            )}
            {status?.systemProxy.enabled && (
              <InfoItem label="系统代理" value={status.systemProxy.server} />
            )}
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: status?.isVPN ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
              borderRadius: '8px',
              border: `1px solid ${status?.isVPN ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)'}`
            }}>
              <Text style={{ color: status?.isVPN ? '#22c55e' : '#888', fontSize: '12px' }}>
                {status?.isVPN 
                  ? isProxied 
                    ? `流量通过 ${proxyIPInfo?.country || '代理'} 转发`
                    : `已启用 ${status.vpnType} 模式`
                  : '当前直连互联网'
                }
              </Text>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  )
}

export default VPNStatus