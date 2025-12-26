import { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Typography, Input, Pagination } from 'antd'
import { ReloadOutlined, CheckCircleOutlined, SearchOutlined, LinkOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

interface PortInfo {
  key: string
  port: number
  protocol: string
  state: string
  service: string
  version: string
  pid?: string
}

interface PortTableProps {
  onDataChange?: (data: PortInfo[]) => void
}

function PortTable({ onDataChange }: PortTableProps) {
  const [loading, setLoading] = useState(false)
  const [ports, setPorts] = useState<PortInfo[]>([])
  const [filteredPorts, setFilteredPorts] = useState<PortInfo[]>([])
  const [scanInfo, setScanInfo] = useState({ total: 0, open: 0, target: '' })
  const [lastScanTime, setLastScanTime] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const fetchPorts = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8080/api/ports')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.tableData) {
          setPorts(data.tableData)
          setFilteredPorts(data.tableData)
          setScanInfo({ total: data.totalScanned, open: data.openPorts, target: data.target })
          setLastScanTime(new Date().toLocaleTimeString('zh-CN'))
          onDataChange?.(data.tableData)
        }
      }
    } catch (error) {
      console.error('Failed to fetch ports:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPorts() }, [])

  useEffect(() => {
    if (searchText) {
      const filtered = ports.filter(p => 
        p.port.toString().includes(searchText) ||
        p.service.toLowerCase().includes(searchText.toLowerCase()) ||
        p.version.toLowerCase().includes(searchText.toLowerCase())
      )
      setFilteredPorts(filtered)
      setCurrentPage(1)
    } else {
      setFilteredPorts(ports)
    }
  }, [searchText, ports])

  const columns: ColumnsType<PortInfo> = [
    { 
      title: '端口', 
      dataIndex: 'port', 
      key: 'port', 
      width: 100,
      sorter: (a, b) => a.port - b.port,
      render: (port: number) => <Text style={{ color: '#a855f7', fontWeight: 600 }}>{port}</Text>
    },
    { 
      title: '协议', 
      dataIndex: 'protocol', 
      key: 'protocol', 
      width: 80,
      render: (protocol: string) => <Tag color="blue">{protocol}</Tag>
    },
    { 
      title: '状态', 
      dataIndex: 'state', 
      key: 'state', 
      width: 100,
      render: (state: string) => (
        <Tag color="green" icon={<CheckCircleOutlined />} style={{ borderRadius: '12px' }}>
          {state === 'open' ? '开启' : state}
        </Tag>
      )
    },
    { 
      title: '服务', 
      dataIndex: 'service', 
      key: 'service', 
      width: 150,
      render: (service: string) => (
        <Tag style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#a855f7' }}>
          {service}
        </Tag>
      )
    },
    { 
      title: '版本信息', 
      dataIndex: 'version', 
      key: 'version',
      ellipsis: true,
      render: (version: string) => <Text style={{ color: '#aaa' }}>{version || '未检测到版本'}</Text>
    },
  ]

  const paginatedData = filteredPorts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LinkOutlined style={{ color: '#a855f7' }} />
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>开放端口</span>
          <Tag color="green">{scanInfo.open} 个开放</Tag>
        </div>
      }
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastScanTime && <Text style={{ color: '#666', fontSize: '12px' }}>上次扫描: {lastScanTime}</Text>}
          <Button icon={<ReloadOutlined spin={loading} />} onClick={fetchPorts} loading={loading} size="small">刷新</Button>
        </div>
      }
      bordered={false}
      style={{ background: 'transparent', border: 'none' }}
      headStyle={{ border: 'none', padding: '0 0 16px 0' }}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(37, 43, 74, 0.6) 0%, rgba(37, 43, 74, 0.3) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '16px'
      }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Input
            placeholder=" 搜索端口、服务或版本..."
            prefix={<SearchOutlined style={{ color: '#666' }} />}
            style={{ width: '300px', border: '1px solid rgba(255,255,255,0.1)' }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </div>

        <Table
          columns={columns}
          dataSource={paginatedData}
          loading={loading}
          pagination={false}
          size="middle"
          style={{ background: 'transparent' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <Text style={{ color: '#666', fontSize: '12px' }}>扫描目标: {scanInfo.target}</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Text style={{ color: '#666', fontSize: '12px' }}>共 {filteredPorts.length} 个端口</Text>
            <Pagination
              current={currentPage}
              total={filteredPorts.length}
              pageSize={pageSize}
              onChange={setCurrentPage}
              size="small"
              showSizeChanger={false}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

export default PortTable