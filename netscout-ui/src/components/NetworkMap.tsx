import { useState, useEffect } from 'react'
import { Card, Button, Tag, Spin, Typography, Tooltip, Collapse } from 'antd'
import { ReloadOutlined, GlobalOutlined, EnvironmentOutlined, CopyOutlined, LinkOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts'
import { message } from 'antd'

const { Text } = Typography

interface MapDataItem {
  name: string
  value: [number, number, number]
  ip: string
  country: string
  country_code: string
  region: string
  city: string
  org: string
  isp: string
  asn: string
  connections: number
  processes: string[]
  ports: number[]
}

interface CountryStat {
  country: string
  connections: number
  ips: number
  cities: string[]
}

interface OrgStat {
  org: string
  connections: number
  ips: number
}

function NetworkMap() {
  const [loading, setLoading] = useState(false)
  const [mapData, setMapData] = useState<MapDataItem[]>([])
  const [localLocation, setLocalLocation] = useState<[number, number]>([116.4074, 39.9042])
  const [localLocationName, setLocalLocationName] = useState<string>('获取中...')
  const [chartReady, setChartReady] = useState(false)
  const [mapLoadError, setMapLoadError] = useState(false)
  const [countryStats, setCountryStats] = useState<CountryStat[]>([])
  const [orgStats, setOrgStats] = useState<OrgStat[]>([])
  const [totalConnections, setTotalConnections] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板')
    })
  }

  const fetchMapData = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8080/api/connections')
      if (response.ok) {
        const data = await response.json()
        setMapData(data.mapData || [])
        setCountryStats(data.countryStats || [])
        setOrgStats(data.orgStats || [])
        setTotalConnections(data.totalConnections || 0)
        setLastUpdate(new Date().toLocaleTimeString('zh-CN'))
        
        if (data.currentLocation) {
          if (data.currentLocation.geo?.value?.length === 2) {
            setLocalLocation(data.currentLocation.geo.value)
          }
          if (data.currentLocation.name) {
            setLocalLocationName(data.currentLocation.name)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch map data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMap = async () => {
    setChartReady(false)
    setMapLoadError(false)
    try {
      const res = await fetch('/world.zh.json')
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      echarts.registerMap('world', data)
      await new Promise(resolve => setTimeout(resolve, 100))
      setChartReady(true)
    } catch (error) {
      console.error('Failed to load map:', error)
      setMapLoadError(true)
      setChartReady(false)
    }
  }

  useEffect(() => { loadMap() }, [])

  useEffect(() => {
    fetchMapData()
    const interval = setInterval(fetchMapData, 30000)
    return () => clearInterval(interval)
  }, [])

  const validMapData = mapData.filter((item) => item.value[0] !== 0 || item.value[1] !== 0)
  const connectionLines = validMapData.map((item) => ({ coords: [localLocation, [item.value[0], item.value[1]]] }))
  const uniqueCountries = new Set(mapData.filter(i => i.country !== 'Unknown').map(item => item.country)).size

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(20, 25, 45, 0.95)',
      borderColor: 'rgba(99, 102, 241, 0.6)',
      borderWidth: 1,
      padding: 16,
      textStyle: { color: '#fff', fontSize: 13 },
      formatter: (params: any) => {
        if (params.componentSubType === 'effectScatter') {
          if (params.seriesName === 'local') {
            return `<div style="font-weight:600;color:#22c55e;margin-bottom:8px;">当前位置</div>
                    <div style="color:#fff;">${localLocationName}</div>`
          }
          const data = params.data as MapDataItem
          if (data?.ip) {
            const location = [
              data.country !== 'Unknown' ? data.country : null,
              data.region && data.region !== 'Unknown' && data.region !== 'N/A' ? data.region : null,
              data.city && data.city !== 'Unknown' && data.city !== 'N/A' ? data.city : null
            ].filter(Boolean).join(' ')
            
            return `<div style="font-weight:600;color:#a855f7;margin-bottom:8px;">${location || data.ip}</div>
                    <div style="margin-bottom:4px;"><span style="color:#888;">IP:</span> <span style="color:#fff;">${data.ip}</span></div>
                    <div style="margin-bottom:4px;"><span style="color:#888;">国家:</span> <span style="color:#fff;">${data.country || 'Unknown'}</span></div>
                    <div style="margin-bottom:4px;"><span style="color:#888;">地区:</span> <span style="color:#fff;">${data.region || 'N/A'}</span></div>
                    <div style="margin-bottom:4px;"><span style="color:#888;">城市:</span> <span style="color:#fff;">${data.city || 'N/A'}</span></div>
                    <div style="margin-bottom:4px;"><span style="color:#888;">运营商:</span> <span style="color:#fff;">${data.org || 'Unknown'}</span></div>
                    <div style="margin-bottom:4px;"><span style="color:#06b6d4;">连接数:</span> <span style="color:#06b6d4;font-weight:600;">${data.connections}</span></div>
                    ${data.processes?.length ? `<div style="color:#888;">进程: <span style="color:#10b981;">${data.processes.join(', ')}</span></div>` : ''}`
          }
        }
        return ''
      }
    },
    geo: {
      map: 'world',
      roam: true,
      zoom: 1.5,
      center: [20, 20],
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      aspectScale: 0.75,
      itemStyle: {
        areaColor: 'rgba(30, 40, 70, 0.4)',
        borderColor: 'rgba(100, 130, 200, 0.3)',
        borderWidth: 0.5
      },
      emphasis: {
        itemStyle: {
          areaColor: 'rgba(50, 70, 120, 0.5)'
        },
        label: { show: false }
      },
      silent: false
    },
    series: [
      {
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 2,
        effect: { show: true, period: 4, trailLength: 0.2, color: 'rgba(168, 85, 247, 0.8)', symbolSize: 3 },
        lineStyle: { color: 'rgba(168, 85, 247, 0.4)', width: 1, curveness: 0.3 },
        data: connectionLines
      },
      {
        name: 'local',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 4,
        rippleEffect: { brushType: 'fill', scale: 3, period: 3 },
        symbolSize: 14,
        itemStyle: { color: '#22c55e', shadowBlur: 20, shadowColor: 'rgba(34, 197, 94, 0.8)' },
        data: [{ name: 'local', value: [...localLocation, 1] }] as any
      } as any,
      {
        name: 'remote',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        rippleEffect: { brushType: 'fill', scale: 2.5, period: 4 },
        symbolSize: (val: any) => Math.min(12, 6 + val[2]),
        itemStyle: { color: '#a855f7', shadowBlur: 15, shadowColor: 'rgba(168, 85, 247, 0.6)' },
        data: validMapData
      }
    ]
  }

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(37, 43, 74, 0.6) 0%, rgba(37, 43, 74, 0.3) 100%)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  }

  if (!chartReady && !mapLoadError) {
    return (
      <Card 
        title={<span style={{ color: '#fff' }}>网络连接地图</span>} 
        style={{ background: 'transparent', border: 'none' }} 
        bodyStyle={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}
      >
        <Spin size="large" />
      </Card>
    )
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <GlobalOutlined style={{ color: '#a855f7' }} />
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>网络连接地图</span>
          <Tag color="purple" icon={<LinkOutlined />}>{mapData.length} 个连接</Tag>
        </div>
      }
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdate && <Text style={{ color: '#666', fontSize: '12px' }}>更新: {lastUpdate}</Text>}
          <Button icon={<ReloadOutlined spin={loading} />} onClick={fetchMapData} loading={loading} size="small">刷新</Button>
        </div>
      }
      bordered={false}
      style={{ background: 'transparent', border: 'none' }}
      headStyle={{ border: 'none', padding: '0 0 16px 0' }}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ ...cardStyle, padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EnvironmentOutlined style={{ color: '#22c55e' }} />
          <Text style={{ color: '#888' }}>当前位置:</Text>
          <Text style={{ color: '#fff', fontWeight: 500 }}>{localLocationName}</Text>
          <Tooltip title="点击复制">
            <CopyOutlined style={{ color: '#666', cursor: 'pointer' }} onClick={() => copyToClipboard(localLocationName)} />
          </Tooltip>
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: 'hidden', marginBottom: '16px' }}>
        {chartReady ? (
          <ReactECharts 
            option={option} 
            style={{ height: '550px', width: '100%' }} 
            opts={{ renderer: 'canvas' }} 
          />
        ) : (
          <div style={{ height: '550px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>地图加载失败</Text>
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, padding: '16px' }}>
        <div style={{ display: 'flex', gap: '48px', marginBottom: '16px' }}>
          <div>
            <Text style={{ color: '#666', fontSize: '12px', display: 'block' }}>目标国家</Text>
            <Text style={{ color: '#fff', fontSize: '24px', fontWeight: 700 }}>{uniqueCountries}</Text>
          </div>
          <div>
            <Text style={{ color: '#666', fontSize: '12px', display: 'block' }}>总连接数</Text>
            <Text style={{ color: '#fff', fontSize: '24px', fontWeight: 700 }}>{totalConnections}</Text>
          </div>
          <div>
            <Text style={{ color: '#666', fontSize: '12px', display: 'block' }}>独立 IP</Text>
            <Text style={{ color: '#fff', fontSize: '24px', fontWeight: 700 }}>{mapData.length}</Text>
          </div>
        </div>

        <Collapse 
          ghost 
          items={[
            {
              key: 'countries',
              label: <Text style={{ color: '#a855f7' }}>按国家/地区分布 ({countryStats.length})</Text>,
              children: (
                <div>
                  {countryStats.map((stat, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <Text style={{ color: '#fff' }}>{stat.country}</Text>
                        {stat.cities.length > 0 && (
                          <Text style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
                            ({stat.cities.slice(0, 3).join(', ')}{stat.cities.length > 3 ? '...' : ''})
                          </Text>
                        )}
                      </div>
                      <div>
                        <Tag color="purple">{stat.connections} 连接</Tag>
                        <Tag color="blue">{stat.ips} IP</Tag>
                      </div>
                    </div>
                  ))}
                  {countryStats.length === 0 && <Text style={{ color: '#666' }}>暂无数据</Text>}
                </div>
              )
            },
            {
              key: 'orgs',
              label: <Text style={{ color: '#22c55e' }}>按运营商/CDN分布 ({orgStats.length})</Text>,
              children: (
                <div>
                  {orgStats.map((stat, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <Text style={{ color: '#fff', flex: 1 }}>{stat.org}</Text>
                      <div>
                        <Tag color="green">{stat.connections} 连接</Tag>
                        <Tag color="cyan">{stat.ips} IP</Tag>
                      </div>
                    </div>
                  ))}
                  {orgStats.length === 0 && <Text style={{ color: '#666' }}>暂无数据</Text>}
                </div>
              )
            },
            {
              key: 'details',
              label: <Text style={{ color: '#06b6d4' }}>详细连接列表 ({mapData.length})</Text>,
              children: (
                <div>
                  {mapData.map((item, i) => (
                    <div key={i} style={{ padding: '12px', marginBottom: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Text style={{ color: '#fff', fontWeight: 500 }}>{item.ip}</Text>
                          <CopyOutlined style={{ color: '#666', cursor: 'pointer', fontSize: '12px' }} onClick={() => copyToClipboard(item.ip)} />
                        </div>
                        <Tag color="purple">{item.connections} 连接</Tag>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '12px' }}>
                        <Text style={{ color: '#666' }}>国家: <span style={{ color: '#aaa' }}>{item.country || 'Unknown'}</span></Text>
                        <Text style={{ color: '#666' }}>地区: <span style={{ color: '#aaa' }}>{item.region || 'N/A'}</span></Text>
                        <Text style={{ color: '#666' }}>城市: <span style={{ color: '#aaa' }}>{item.city || 'N/A'}</span></Text>
                        <Text style={{ color: '#666' }}>运营商: <span style={{ color: '#aaa' }}>{item.org || 'Unknown'}</span></Text>
                      </div>
                      {item.processes?.length > 0 && (
                        <Text style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          进程: <span style={{ color: '#10b981' }}>{item.processes.join(', ')}</span>
                        </Text>
                      )}
                    </div>
                  ))}
                  {mapData.length === 0 && <Text style={{ color: '#666' }}>暂无连接数据</Text>}
                </div>
              )
            }
          ]}
        />
      </div>
    </Card>
  )
}

export default NetworkMap