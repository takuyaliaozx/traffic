import { Modal, Collapse, Input, Button, message } from 'antd'
import { useState } from 'react'
import { QuestionCircleOutlined, BugOutlined, MailOutlined } from '@ant-design/icons'

const { TextArea } = Input

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

function HelpModal({ open, onClose }: HelpModalProps) {
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'question'>('suggestion')
  const [submitting, setSubmitting] = useState(false)

  const faqItems = [
    {
      key: '1',
      label: '如何开始端口扫描？',
      children: '在概览页面，点击端口扫描卡片上的"重新扫描"按钮即可开始扫描本机开放的端口。扫描需要一定时间，请耐心等待。'
    },
    {
      key: '2',
      label: '为什么网络速度显示为 0？',
      children: '网络速度是实时计算的，如果当前没有网络传输活动，速度会显示为 0。你可以尝试打开网页或下载文件来观察速度变化。'
    },
    {
      key: '3',
      label: '如何导出监控数据？',
      children: '点击页面右上角的"导出数据"按钮，选择需要的格式（JSON、CSV 或 TXT），即可下载当前的监控数据。'
    },
    {
      key: '4',
      label: '地图上的连接点代表什么？',
      children: '地图上显示的是你的电脑当前与外部服务器的网络连接。蓝色点是你的位置，紫色点是远程服务器的位置，连接线表示网络连接。'
    },
    {
      key: '5',
      label: '需要管理员权限吗？',
      children: '基本功能不需要管理员权限。但某些高级功能（如深度端口扫描）可能需要管理员权限才能获取完整信息。'
    },
  ]

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      message.warning('请输入反馈内容')
      return
    }
    
    setSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('Feedback submitted:', { type: feedbackType, content: feedbackText })
    
    message.success('感谢你的反馈！')
    setFeedbackText('')
    setSubmitting(false)
  }

  return (
    <Modal
      title="帮助与反馈"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      styles={{ body: { padding: '24px' } }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <QuestionCircleOutlined style={{ color: '#a855f7', fontSize: '18px' }} />
          <span style={{ fontSize: '16px', fontWeight: 600 }}>常见问题</span>
        </div>
        <Collapse items={faqItems} bordered={false} style={{ background: '#1a1f3a' }} />
      </div>

      <div style={{ marginBottom: '24px', padding: '16px', background: '#1a1f3a', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <BugOutlined style={{ color: '#a855f7', fontSize: '18px' }} />
          <span style={{ fontSize: '16px', fontWeight: 600 }}>提交反馈</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {[
            { type: 'bug', label: '报告问题' },
            { type: 'suggestion', label: '功能建议' },
            { type: 'question', label: '其他问题' },
          ].map(item => (
            <Button
              key={item.type}
              type={feedbackType === item.type ? 'primary' : 'default'}
              onClick={() => setFeedbackType(item.type as any)}
              style={feedbackType === item.type ? { background: '#a855f7', border: 'none' } : {}}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <TextArea
          rows={4}
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="请描述你遇到的问题或建议..."
          style={{ marginBottom: '12px' }}
        />

        <Button type="primary" loading={submitting} onClick={handleSubmitFeedback}
          style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', border: 'none' }}>
          提交反馈
        </Button>
      </div>

      <div style={{ padding: '16px', background: '#1a1f3a', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <MailOutlined style={{ color: '#a855f7' }} />
          <span style={{ fontWeight: 500 }}>联系我们</span>
        </div>
        <div style={{ color: '#888', fontSize: '13px' }}>
          邮箱: support@netscout.example.com<br />
          版本: NetScout X v1.0.0
        </div>
      </div>
    </Modal>
  )
}

export default HelpModal