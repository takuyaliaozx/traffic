import { useEffect, useState } from 'react'
import { Layout, Menu, ConfigProvider, theme, Typography, Input, Button, Select, Space } from 'antd'
import {
  DashboardOutlined,
  LineChartOutlined,
  GlobalOutlined,
  BugOutlined,
  SearchOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { io, Socket } from 'socket.io-client'
import PortTable from './components/PortTable'
import NetworkMap from './components/NetworkMap'
import NetworkInfo from './components/NetworkInfo'
import BandwidthQuality from './components/BandwidthQuality'
import SystemOverview from './components/SystemOverview'
import VPNStatus from './components/VPNStatus'
import './App.css'

const { Header, Sider, Content } = Layout
const { Title, Text: AntText } = Typography

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [selectedKey, setSelectedKey] = useState('1')
  const [userInfo, setUserInfo] = useState({ username: 'User', email: 'user@local' })
  const [systemData, setSystemData] = useState({
    cpu: 0,
    mem: 0,
    rxSpeed: 0,
    txSpeed: 0,
    latency: 0,
    packetLoss: 0,
  })
  const [networkDetails, setNetworkDetails] = useState<{
    localIP: string
    localMAC: string
    gateway: string
    dnsServers: string[]
    dhcpServer: string
    subnetMask: string
    interfaceName: string
  } | undefined>(undefined)

  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const [startTime, setStartTime] = useState(formatDateTime(new Date()))

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleMenuClick = (key: string) => {
    setSelectedKey(key)
    const sectionMap: { [key: string]: string } = {
      '1': 'scan-section',
      '2': 'monitor-section',
      '3': 'map-section',
      'ports': 'ports-section'
    }
    scrollToSection(sectionMap[key])
  }

  useEffect(() => {
    const newSocket = io('http://localhost:8080')
    setSocket(newSocket)

    fetch('http://localhost:8080/api/user-info')
      .then(r => r.json())
      .then(data => {
        setUserInfo({
          username: data.username || 'User',
          email: data.email || `${data.username}@local`
        })
      })
      .catch(() => {})

    newSocket.on('connect', () => {
      console.log('已连接到服务器')
    })

    newSocket.on('network-details', (data: any) => {
      setNetworkDetails(data)
    })

    newSocket.on('system-update', (data: any) => {
      const parseValueWithUnit = (value: string | number): number => {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
          const cleaned = value.replace(/[a-zA-Z%\s]/g, '')
          return parseFloat(cleaned) || 0
        }
        return 0
      }

      setSystemData({
        cpu: parseFloat(data.stats.cpuLoad) || 0,
        mem: parseFloat(data.stats.memPercent) || 0,
        rxSpeed: parseFloat(data.speed.rx_speed_mb) || 0,
        txSpeed: parseFloat(data.speed.tx_speed_mb) || 0,
        latency: parseValueWithUnit(data.quality.latency),
        packetLoss: parseValueWithUnit(data.quality.packetLoss),
      })
    })

    newSocket.on('disconnect', () => {
      console.log('已断开连接')
    })

    return () => {
      newSocket.disconnect()
    }
  }, [])

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          colorBgContainer: '#1a1f3a',
          colorBgElevated: '#252b4a',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider 
          width={280} 
          style={{ 
            background: '#0a0e1f',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #1a1f3a'
          }}
        >
          <div style={{ 
            padding: '24px 20px', 
            display: 'flex', 
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🔷
            </div>
            <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 600 }}>
              NetScout X
            </Title>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <Input
              placeholder="搜索功能"
              prefix={<SearchOutlined style={{ color: '#666' }} />}
              style={{
                background: '#1a1f3a',
                border: '1px solid #252b4a',
                borderRadius: '8px',
                color: '#fff'
              }}
              size="large"
            />
          </div>

          <div style={{ padding: '0 20px 8px' }}>
            <div style={{
              padding: '10px 14px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
              borderRadius: '8px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
              }} />
              <AntText style={{ color: '#22c55e', fontSize: '13px', fontWeight: 500 }}>服务器已连接</AntText>
            </div>
          </div>

          <div style={{ padding: '0 20px', marginBottom: '8px' }}>
            <AntText style={{ color: '#a855f7', fontSize: '12px', fontWeight: 600 }}>快捷导航</AntText>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              onClick={({ key }) => handleMenuClick(key)}
              style={{ background: 'transparent', border: 'none', padding: 0 }}
              items={[
                {
                  key: '1',
                  icon: <DashboardOutlined style={{ fontSize: '16px' }} />,
                  label: <span style={{ fontSize: '14px' }}>概览</span>,
                  style: { borderRadius: '8px', margin: '4px 0', height: '40px', display: 'flex', alignItems: 'center', paddingLeft: '12px' }
                },
                {
                  key: 'ports',
                  icon: <BugOutlined style={{ fontSize: '16px' }} />,
                  label: <span style={{ fontSize: '14px' }}>端口</span>,
                  style: { borderRadius: '8px', margin: '4px 0', height: '40px', display: 'flex', alignItems: 'center', paddingLeft: '12px' }
                },
                {
                  key: '2',
                  icon: <LineChartOutlined style={{ fontSize: '16px' }} />,
                  label: <span style={{ fontSize: '14px' }}>流量</span>,
                  style: { borderRadius: '8px', margin: '4px 0', height: '40px', display: 'flex', alignItems: 'center', paddingLeft: '12px' }
                },
                {
                  key: '3',
                  icon: <GlobalOutlined style={{ fontSize: '16px' }} />,
                  label: <span style={{ fontSize: '14px' }}>地图</span>,
                  style: { borderRadius: '8px', margin: '4px 0', height: '40px', display: 'flex', alignItems: 'center', paddingLeft: '12px' }
                },
              ]}
            />
          </div>

          <div style={{ padding: '16px 20px', marginTop: 'auto' }}>
            <div style={{
              padding: '14px 16px',
              background: '#1a1f3a',
              borderRadius: '10px',
              marginBottom: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.3s',
              border: '1px solid transparent'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <QuestionCircleOutlined style={{ color: '#888', fontSize: '18px' }} />
                <span style={{ color: '#ddd', fontSize: '14px', fontWeight: 500 }}>帮助与反馈</span>
              </div>
              <span style={{ color: '#666', fontSize: '18px' }}>›</span>
            </div>

            <div style={{
              padding: '14px 16px',
              background: '#1a1f3a',
              borderRadius: '10px',
              marginBottom: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.3s',
              border: '1px solid transparent'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <SettingOutlined style={{ color: '#888', fontSize: '18px' }} />
                <span style={{ color: '#ddd', fontSize: '14px', fontWeight: 500 }}>设置</span>
              </div>
              <span style={{ color: '#666', fontSize: '18px' }}>›</span>
            </div>

            <div style={{
              padding: '14px 16px',
              background: '#1a1f3a',
              borderRadius: '10px',
              marginBottom: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.3s',
              border: '1px solid transparent'
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 600,
                fontSize: '16px',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
              }}>
                {userInfo.username.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{userInfo.username}</div>
                <div style={{ color: '#888', fontSize: '13px' }}>{userInfo.email}</div>
              </div>
              <span style={{ color: '#666', fontSize: '18px' }}>›</span>
            </div>
          </div>
        </Sider>
        <Layout>
          <Header style={{ 
            background: '#0a0e1f', 
            padding: '24px 48px 8px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            height: 'auto',
            minHeight: '80px'
          }}>
            <div style={{ flexShrink: 0, minWidth: 0 }}>
              <Title level={3} style={{ color: '#fff', margin: 0, marginBottom: '4px', lineHeight: 1.2 }}>
                嗨，{userInfo.username}!
              </Title>
              <div style={{ color: '#888', fontSize: '14px' }}>
                轻松监控你的网络
              </div>
            </div>
            <Space size="middle" style={{ flexShrink: 0 }}>
              <Button 
                type="primary"
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  border: 'none',
                  height: '36px',
                  padding: '0 24px',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                导出数据 →
              </Button>
              <Button 
                style={{
                  background: '#a855f7',
                  border: 'none',
                  color: '#fff',
                  height: '36px',
                  padding: '0 24px',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                创建报告
              </Button>
            </Space>
          </Header>
          <Content style={{ 
            padding: '0px 48px 24px', 
            background: '#0a0e1f',
            overflowY: 'auto',
            height: 'calc(100vh - 120px)'
          }}>
            <div style={{ marginBottom: '12px', padding: '0' }}>
              <Space size="large">
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  background: '#0f1229',
                  borderRadius: '8px',
                  border: '1px solid #252b4a',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    padding: '8px 16px',
                    background: '#1a1f3a',
                    borderRight: '1px solid #252b4a'
                  }}>
                    <AntText style={{ color: '#888', fontSize: '13px' }}>主机</AntText>
                  </div>
                  <Select
                    defaultValue="本机"
                    style={{ width: 160 }}
                    bordered={false}
                    options={[
                      { value: '本机', label: '本机' },
                    ]}
                  />
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  background: '#0f1229',
                  borderRadius: '8px',
                  border: '1px solid #252b4a',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    padding: '8px 16px',
                    background: '#1a1f3a',
                    borderRight: '1px solid #252b4a',
                    whiteSpace: 'nowrap'
                  }}>
                    <AntText style={{ color: '#888', fontSize: '13px' }}>开始时间</AntText>
                  </div>
                  <div style={{ padding: '0 16px' }}>
                    <AntText style={{ color: '#fff', fontSize: '13px' }}>{startTime}</AntText>
                  </div>
                </div>
              </Space>
            </div>

            <div className="dashboard-container">
              <div id="scan-section" style={{ marginBottom: '0px' }}>
                <Title level={3} style={{ color: '#a855f7', fontWeight: 600, margin: '8px 0 16px 0' }}>
                  扫描
                </Title>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <SystemOverview />
                  <div id="ports-section">
                    <PortTable />
                  </div>
                </div>
              </div>

              <div id="monitor-section" style={{ marginBottom: '32px' }}>
                <Title level={3} style={{ color: '#a855f7', fontWeight: 600, margin: '0 0 16px 0' }}>
                  监视
                </Title>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ minHeight: '320px' }}>
                    <NetworkInfo networkDetails={networkDetails} />
                  </div>
                  <VPNStatus />
                  <div style={{ minHeight: '520px' }}>
                    <BandwidthQuality systemData={systemData} />
                  </div>
                  <div id="map-section" style={{ minHeight: '550px' }}>
                    <NetworkMap />
                  </div>
                </div>
              </div>
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

export default App