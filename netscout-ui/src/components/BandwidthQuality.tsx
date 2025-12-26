import { Card, Row, Col, Typography, Progress } from 'antd'
import {
  ThunderboltOutlined,
  DatabaseOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  DisconnectOutlined,
} from '@ant-design/icons'

const { Text } = Typography

interface SystemData {
  cpu: number
  mem: number
  rxSpeed: number
  txSpeed: number
  latency: number
  packetLoss: number
}

interface BandwidthQualityProps {
  systemData: SystemData
}

function BandwidthQuality({ systemData }: BandwidthQualityProps) {
  const getQualityRating = () => {
    const { latency, packetLoss } = systemData
    if (packetLoss > 5 || latency > 200) return { label: '较差', score: 30, color: '#ef4444' }
    if (packetLoss > 1 || latency > 100) return { label: '一般', score: 60, color: '#f59e0b' }
    if (latency > 50) return { label: '良好', score: 80, color: '#22c55e' }
    return { label: '优秀', score: 95, color: '#22c55e' }
  }

  const qualityRating = getQualityRating()

  const metrics = [
    { label: 'CPU 使用率', value: systemData.cpu, unit: '%', icon: <ThunderboltOutlined />, color: systemData.cpu > 80 ? '#ef4444' : '#22c55e', showProgress: true },
    { label: '内存使用率', value: systemData.mem, unit: '%', icon: <DatabaseOutlined />, color: systemData.mem > 80 ? '#ef4444' : '#22c55e', showProgress: true },
    { label: '下载速度', value: systemData.rxSpeed, unit: 'MB/s', icon: <ArrowDownOutlined />, color: '#22c55e', showProgress: false },
    { label: '上传速度', value: systemData.txSpeed, unit: 'MB/s', icon: <ArrowUpOutlined />, color: '#a855f7', showProgress: false },
    { label: '网络延迟', value: systemData.latency, unit: 'ms', icon: <ClockCircleOutlined />, color: systemData.latency > 100 ? '#ef4444' : '#22c55e', showProgress: false },
    { label: '丢包率', value: systemData.packetLoss, unit: '%', icon: <DisconnectOutlined />, color: systemData.packetLoss > 1 ? '#ef4444' : '#22c55e', showProgress: false },
  ]

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(37, 43, 74, 0.6) 0%, rgba(37, 43, 74, 0.3) 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  }

  const cardHeight = 140

  return (
    <Card 
      title={<span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>带宽与网络质量</span>}
      bordered={false}
      style={{ background: 'transparent', border: 'none' }}
      headStyle={{ border: 'none', padding: '0 0 16px 0' }}
      bodyStyle={{ padding: 0 }}
    >
      <Row gutter={16}>
        <Col span={6}>
          <div style={{
            ...cardStyle,
            padding: '20px',
            height: cardHeight * 2 + 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Text style={{ color: '#aaa', fontSize: '14px' }}>网络质量评分</Text>
            
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '8px 0' 
            }}>
              <div style={{ width: '120px' }}> 
                <Progress
                  type="circle"
                  percent={qualityRating.score}
                  strokeColor={qualityRating.color}
                  trailColor="rgba(255,255,255,0.1)"
                  strokeWidth={8}
                  size={120} 
                  format={() => (
                    <span style={{ color: qualityRating.color, fontSize: '24px', fontWeight: 700 }}> 
                      {qualityRating.label}
                    </span>
                  )}
                />
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              gap: '16px', 
              padding: '12px 10px', 
              background: 'rgba(26, 31, 58, 0.8)', 
              borderRadius: '8px',
              width: '100%'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#666', fontSize: '12px' }}>延迟</div>
                <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>
                  {systemData.latency.toFixed(0)}<span style={{ fontSize: '11px', color: '#888' }}> ms</span>
                </div>
              </div>
              <div style={{ width: '1px', background: '#333' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#666', fontSize: '12px' }}>丢包</div>
                <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>
                  {systemData.packetLoss.toFixed(2)}<span style={{ fontSize: '11px', color: '#888' }}> %</span>
                </div>
              </div>
            </div>
          </div>
        </Col>

        <Col span={18}>
          <Row gutter={[16, 16]}>
            {metrics.map((metric, index) => (
              <Col span={8} key={index}>
                <div style={{
                  ...cardStyle,
                  padding: '16px 16px', 
                  height: cardHeight,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.3s',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37, 43, 74, 0.8) 0%, rgba(37, 43, 74, 0.5) 100%)'
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37, 43, 74, 0.6) 0%, rgba(37, 43, 74, 0.3) 100%)'
                }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#aaa', fontSize: '13px', whiteSpace: 'nowrap' }}>{metric.label}</Text>
                    <span style={{ color: metric.color, fontSize: '16px' }}>{metric.icon}</span>
                  </div>
                  <div style={{ color: '#fff', fontSize: '26px', fontWeight: 700, lineHeight: 1.2, display: 'flex', alignItems: 'baseline' }}>
                    {metric.value.toFixed(2)}
                    <span style={{ fontSize: '12px', color: '#888', fontWeight: 400, marginLeft: '4px' }}>{metric.unit}</span>
                  </div>
                  {metric.showProgress ? (
                    <Progress
                      percent={Math.min(100, metric.value)}
                      showInfo={false}
                      strokeColor={metric.color}
                      trailColor="rgba(255,255,255,0.1)"
                      size="small"
                      strokeLinecap="round"
                    />
                  ) : (
                    <div style={{ height: '8px' }} />
                  )}
                </div>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
    </Card>
  )
}

export default BandwidthQuality