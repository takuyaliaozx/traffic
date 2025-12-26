import { Modal, Button, Input, Select, message } from 'antd'
import { useState } from 'react'
import { FileTextOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons'

const { TextArea } = Input

interface ReportModalProps {
  open: boolean
  onClose: () => void
  data: any
}

function ReportModal({ open, onClose, data }: ReportModalProps) {
  const [generating, setGenerating] = useState(false)
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'security'>('summary')
  const [notes, setNotes] = useState('')
  const [reportGenerated, setReportGenerated] = useState(false)
  const [reportContent, setReportContent] = useState('')

  const generateReport = async () => {
    setGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const now = new Date()
    let content = `
========================================================
                NetScout X 网络监控报告                    
========================================================

报告类型: ${reportType === 'summary' ? '概要报告' : reportType === 'detailed' ? '详细报告' : '安全报告'}
生成时间: ${now.toLocaleString()}
报告编号: RPT-${Date.now()}

--------------------------------------------------------

【系统概览】

  主机名称: ${data.systemInfo?.hostname || '未知'}
  操作系统: ${data.systemInfo?.os || '未知'}
  IP 地址: ${data.systemInfo?.ip || '未知'}
  运行时间: ${data.systemInfo?.uptime || '未知'}
  CPU: ${data.systemInfo?.cpuBrand || '未知'} (${data.systemInfo?.cpuCores || 0} 核心)

--------------------------------------------------------

【性能指标】

  CPU 使用率: ${data.systemData?.cpu?.toFixed(2) || 0}%
  内存使用率: ${data.systemData?.mem?.toFixed(2) || 0}%
  下载速度: ${data.systemData?.rxSpeed?.toFixed(2) || 0} MB/s
  上传速度: ${data.systemData?.txSpeed?.toFixed(2) || 0} MB/s

--------------------------------------------------------

【网络质量】

  网络延迟: ${data.systemData?.latency?.toFixed(2) || 0} ms
  丢包率: ${data.systemData?.packetLoss?.toFixed(2) || 0}%
  网络状态: ${data.systemData?.latency < 50 && data.systemData?.packetLoss < 1 ? '优秀' : data.systemData?.latency < 100 ? '良好' : '一般'}

--------------------------------------------------------

【网络配置】

  本机 IP: ${data.networkDetails?.localIP || '未知'}
  MAC 地址: ${data.networkDetails?.localMAC || '未知'}
  默认网关: ${data.networkDetails?.gateway || '未知'}
  子网掩码: ${data.networkDetails?.subnetMask || '未知'}
  DNS 服务器: ${data.networkDetails?.dnsServers?.join(', ') || '未知'}
  DHCP 服务器: ${data.networkDetails?.dhcpServer || '未知'}

--------------------------------------------------------

【端口扫描结果】

  开放端口数量: ${data.portData?.length || 0}
`
    if (data.portData?.length > 0) {
      content += '\n  端口列表:\n'
      data.portData.forEach((port: any) => {
        content += `    - ${port.port}/${port.protocol}: ${port.service} (${port.state})\n`
      })
    }

    if (reportType === 'security') {
      content += `
--------------------------------------------------------

【安全评估】

  风险等级: ${data.portData?.length > 10 ? '中等' : '低'}
  建议措施:
    - 定期检查开放端口
    - 关闭不必要的服务
    - 保持系统更新
`
    }

    if (notes) {
      content += `
--------------------------------------------------------

【备注】

${notes}
`
    }

    content += `
--------------------------------------------------------

报告生成完毕
由 NetScout X 自动生成
`

    setReportContent(content)
    setReportGenerated(true)
    setGenerating(false)
  }

  const downloadReport = () => {
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `netscout-report-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    message.success('报告已下载')
  }

  const printReport = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`<pre style="font-family: monospace; white-space: pre-wrap;">${reportContent}</pre>`)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleClose = () => {
    setReportGenerated(false)
    setReportContent('')
    setNotes('')
    onClose()
  }

  return (
    <Modal
      title="创建报告"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={reportGenerated ? 720 : 480}
      styles={{ body: { padding: '24px' } }}
    >
      {!reportGenerated ? (
        <>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#888', marginBottom: '8px' }}>报告类型</div>
            <Select value={reportType} onChange={setReportType} style={{ width: '100%' }} options={[
              { value: 'summary', label: '概要报告 - 包含基本系统和网络信息' },
              { value: 'detailed', label: '详细报告 - 包含所有监控数据' },
              { value: 'security', label: '安全报告 - 包含安全评估和建议' },
            ]} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#888', marginBottom: '8px' }}>备注 (可选)</div>
            <TextArea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="添加备注信息..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button onClick={handleClose}>取消</Button>
            <Button type="primary" icon={<FileTextOutlined />} loading={generating} onClick={generateReport}
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', border: 'none' }}>
              生成报告
            </Button>
          </div>
        </>
      ) : (
        <>
          <div style={{ 
            background: '#0f1229', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '20px',
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            <pre style={{ color: '#e0e0e0', fontSize: '12px', fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap' }}>
              {reportContent}
            </pre>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button onClick={handleClose}>关闭</Button>
            <Button icon={<PrinterOutlined />} onClick={printReport}>打印</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={downloadReport}
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', border: 'none' }}>
              下载报告
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}

export default ReportModal