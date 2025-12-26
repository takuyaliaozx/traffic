import { Card, Typography, message } from 'antd'

const { Text } = Typography

interface NetworkDetails {
  localIP: string
  localMAC: string
  gateway: string
  gatewayMAC?: string
  dnsServers: string[]
  dhcpServer: string
  subnetMask: string
  interfaceName: string
}

interface NetworkInfoProps {
  networkDetails?: NetworkDetails
}

function NetworkInfo({ networkDetails }: NetworkInfoProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(`${label} 已复制`)
    }).catch(() => {
      message.error('复制失败')
    })
  }

  if (!networkDetails) {
    return (
      <Card 
        title={<span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>流量</span>}
        bordered={false}
        style={{ height: '100%', background: '#1a1f3a', border: '1px solid #252b4a', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ padding: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Text type="secondary">加载中...</Text>
      </Card>
    )
  }

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div 
      style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '12px 16px',
        background: 'transparent',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background 0.2s'
      }}
      onClick={() => copyToClipboard(value, label)}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#252b4a' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      title="点击复制"
    >
      <Text style={{ color: '#888', fontSize: '13px' }}>{label}</Text>
      <Text style={{ color: '#fff', fontSize: '13px', fontFamily: 'monospace' }}>{value}</Text>
    </div>
  )

  return (
    <Card 
      title={<span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>流量</span>}
      bordered={false}
      style={{ height: '100%', background: '#1a1f3a', border: '1px solid #252b4a', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1, alignContent: 'start' }}>
        <InfoRow label="源IP" value={networkDetails.localIP} />
        <InfoRow label="目的地IP" value={networkDetails.gateway} />
        <InfoRow label="源MAC" value={networkDetails.localMAC} />
        <InfoRow label="目的地MAC" value={networkDetails.gatewayMAC || '未知'} />
        <InfoRow label="DHCP服务器" value={networkDetails.dhcpServer} />
        <InfoRow label="子网掩码" value={networkDetails.subnetMask} />
        <InfoRow label="网关地址" value={networkDetails.gateway} />
        <InfoRow label="DNS服务器" value={networkDetails.dnsServers[0] || '8.8.8.8'} />
        <InfoRow label="报文类型" value="DHCP ACK" />
      </div>
    </Card>
  )
}

export default NetworkInfo