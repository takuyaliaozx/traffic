import { Card, Row, Col, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { DesktopOutlined } from '@ant-design/icons'

const { Text } = Typography

function SystemOverview() {
  const [systemInfo, setSystemInfo] = useState({
    ip: '加载中...',
    hostname: '加载中...',
    os: '加载中...',
    uptime: '加载中...',
    cpuCores: 0,
    cpuFrequency: '加载中...',
    cpuUsage: '0 %',
    cpuBrand: '加载中...'
  })

  useEffect(() => {
    fetch('http://localhost:8080/api/system-info')
      .then(res => res.json())
      .then(data => setSystemInfo(data))
      .catch(err => console.error('获取系统信息失败:', err))
  }, [])

  const InfoItem = ({ label, value }: { label: string; value: string | number }) => (
    <Col span={8}>
      <div style={{ marginBottom: '16px' }}>
        <Text style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '4px' }}>{label}</Text>
        <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{value}</Text>
      </div>
    </Col>
  )

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(37, 43, 74, 0.6) 0%, rgba(37, 43, 74, 0.3) 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  }

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DesktopOutlined style={{ color: '#a855f7' }} />
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>概览</span>
        </div>
      }
      bordered={false}
      style={{ background: 'transparent', border: 'none' }}
      headStyle={{ border: 'none', padding: '0 0 16px 0' }}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ ...cardStyle, padding: '24px' }}>
        <Row gutter={[16, 8]}>
          <InfoItem label="IP地址" value={systemInfo.ip} />
          <InfoItem label="主机名" value={systemInfo.hostname} />
          <InfoItem label="操作系统" value={systemInfo.os} />
          <InfoItem label="运行时间" value={systemInfo.uptime} />
          <InfoItem label="CPU核数" value={systemInfo.cpuCores} />
          <InfoItem label="CPU频率" value={systemInfo.cpuFrequency} />
          <InfoItem label="CPU使用率" value={systemInfo.cpuUsage} />
          <InfoItem label="CPU品牌" value={systemInfo.cpuBrand} />
        </Row>
      </div>
    </Card>
  )
}

export default SystemOverview