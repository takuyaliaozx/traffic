import { Modal, Button, Space, Radio, message } from 'antd'
import { useState } from 'react'
import { DownloadOutlined, FileTextOutlined, FileExcelOutlined } from '@ant-design/icons'

interface ExportModalProps {
  open: boolean
  onClose: () => void
  data: any
}

function ExportModal({ open, onClose, data }: ExportModalProps) {
  const [format, setFormat] = useState<'json' | 'csv' | 'txt'>('json')
  const [exporting, setExporting] = useState(false)

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportAsJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `netscout-export-${Date.now()}.json`)
  }

  const exportAsCSV = () => {
    const lines = ['类型,名称,值']
    if (data.systemInfo) {
      Object.entries(data.systemInfo).forEach(([key, value]) => {
        lines.push(`系统信息,${key},"${value}"`)
      })
    }
    if (data.systemData) {
      Object.entries(data.systemData).forEach(([key, value]) => {
        lines.push(`实时数据,${key},"${value}"`)
      })
    }
    if (data.networkDetails) {
      Object.entries(data.networkDetails).forEach(([key, value]) => {
        lines.push(`网络详情,${key},"${Array.isArray(value) ? value.join('; ') : value}"`)
      })
    }
    if (data.portData?.length) {
      data.portData.forEach((port: any) => {
        lines.push(`端口,${port.port},"${port.service} - ${port.state}"`)
      })
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `netscout-export-${Date.now()}.csv`)
  }

  const exportAsTXT = () => {
    let content = '========== NetScout X 数据导出 ==========\n'
    content += `导出时间: ${new Date().toLocaleString()}\n\n`
    
    if (data.systemInfo) {
      content += '---------- 系统信息 ----------\n'
      Object.entries(data.systemInfo).forEach(([key, value]) => {
        content += `${key}: ${value}\n`
      })
      content += '\n'
    }
    
    if (data.systemData) {
      content += '---------- 实时数据 ----------\n'
      content += `CPU使用率: ${data.systemData.cpu?.toFixed(2)}%\n`
      content += `内存使用率: ${data.systemData.mem?.toFixed(2)}%\n`
      content += `下载速度: ${data.systemData.rxSpeed?.toFixed(2)} MB/s\n`
      content += `上传速度: ${data.systemData.txSpeed?.toFixed(2)} MB/s\n`
      content += `网络延迟: ${data.systemData.latency?.toFixed(2)} ms\n`
      content += `丢包率: ${data.systemData.packetLoss?.toFixed(2)}%\n\n`
    }
    
    if (data.networkDetails) {
      content += '---------- 网络详情 ----------\n'
      content += `本机IP: ${data.networkDetails.localIP}\n`
      content += `MAC地址: ${data.networkDetails.localMAC}\n`
      content += `网关: ${data.networkDetails.gateway}\n`
      content += `DNS: ${data.networkDetails.dnsServers?.join(', ')}\n\n`
    }
    
    if (data.portData?.length) {
      content += '---------- 开放端口 ----------\n'
      data.portData.forEach((port: any) => {
        content += `端口 ${port.port} (${port.protocol}): ${port.service} - ${port.state}\n`
      })
    }
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, `netscout-export-${Date.now()}.txt`)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      if (format === 'json') exportAsJSON()
      else if (format === 'csv') exportAsCSV()
      else exportAsTXT()
      message.success('导出成功')
      onClose()
    } catch (error) {
      message.error('导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Modal
      title="导出数据"
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: '#888', marginBottom: '12px' }}>选择导出格式</div>
        <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)} style={{ width: '100%' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio.Button value="json" style={{ width: '100%', height: '60px', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
              <FileTextOutlined style={{ fontSize: '20px', marginRight: '12px' }} />
              <div>
                <div style={{ fontWeight: 500 }}>JSON 格式</div>
                <div style={{ fontSize: '12px', color: '#888' }}>完整的结构化数据，适合程序处理</div>
              </div>
            </Radio.Button>
            <Radio.Button value="csv" style={{ width: '100%', height: '60px', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
              <FileExcelOutlined style={{ fontSize: '20px', marginRight: '12px' }} />
              <div>
                <div style={{ fontWeight: 500 }}>CSV 格式</div>
                <div style={{ fontSize: '12px', color: '#888' }}>表格格式，可用Excel打开</div>
              </div>
            </Radio.Button>
            <Radio.Button value="txt" style={{ width: '100%', height: '60px', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
              <FileTextOutlined style={{ fontSize: '20px', marginRight: '12px' }} />
              <div>
                <div style={{ fontWeight: 500 }}>TXT 格式</div>
                <div style={{ fontSize: '12px', color: '#888' }}>纯文本格式，便于阅读</div>
              </div>
            </Radio.Button>
          </Space>
        </Radio.Group>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
          导出
        </Button>
      </div>
    </Modal>
  )
}

export default ExportModal