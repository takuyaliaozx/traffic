import { Modal, Switch, Slider, Button, Divider, message } from 'antd'
import { useState, useEffect } from 'react'
import { 
  SyncOutlined, 
  BellOutlined, 
  ScanOutlined, 
  DatabaseOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons'

interface Settings {
  refreshInterval: number
  theme: 'dark' | 'light'
  notifications: boolean
  autoScan: boolean
}

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  settings: Settings
  onSave: (settings: Settings) => void
}

function SettingsModal({ open, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = () => {
    onSave(localSettings)
    onClose()
  }

  const handleReset = () => {
    setLocalSettings({
      refreshInterval: 2000,
      theme: 'dark',
      notifications: true,
      autoScan: true
    })
    message.info('已重置为默认设置')
  }

  const handleClearCache = () => {
    localStorage.clear()
    message.success('缓存已清除')
  }

  return (
    <Modal
      title="设置"
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      styles={{ body: { padding: '24px' } }}
    >
      <div style={{ marginBottom: '24px' }}>
        <SettingItem
          icon={<SyncOutlined />}
          title="数据刷新间隔"
          description="设置实时数据的刷新频率"
        >
          <div style={{ width: '200px' }}>
            <Slider
              min={1000}
              max={10000}
              step={500}
              value={localSettings.refreshInterval}
              onChange={(value) => setLocalSettings({ ...localSettings, refreshInterval: value })}
              marks={{ 1000: '1秒', 5000: '5秒', 10000: '10秒' }}
            />
          </div>
        </SettingItem>

        <Divider style={{ margin: '16px 0' }} />

        <SettingItem
          icon={<BellOutlined />}
          title="系统通知"
          description="接收网络状态变化通知"
        >
          <Switch
            checked={localSettings.notifications}
            onChange={(checked) => setLocalSettings({ ...localSettings, notifications: checked })}
          />
        </SettingItem>

        <Divider style={{ margin: '16px 0' }} />

        <SettingItem
          icon={<ScanOutlined />}
          title="启动时自动扫描"
          description="程序启动时自动扫描端口"
        >
          <Switch
            checked={localSettings.autoScan}
            onChange={(checked) => setLocalSettings({ ...localSettings, autoScan: checked })}
          />
        </SettingItem>

        <Divider style={{ margin: '16px 0' }} />

        <SettingItem
          icon={<DatabaseOutlined />}
          title="清除缓存"
          description="清除本地存储的临时数据"
        >
          <Button onClick={handleClearCache} size="small">清除</Button>
        </SettingItem>

        <Divider style={{ margin: '16px 0' }} />

        <SettingItem
          icon={<InfoCircleOutlined />}
          title="关于"
          description="NetScout X v1.0.0"
        >
          <span style={{ color: '#888', fontSize: '13px' }}>Node.js + React</span>
        </SettingItem>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleReset}>恢复默认</Button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave}
            style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', border: 'none' }}>
            保存设置
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function SettingItem({ icon, title, description, children }: { 
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode 
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ color: '#a855f7', fontSize: '18px', marginTop: '2px' }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>{title}</div>
          <div style={{ color: '#888', fontSize: '13px' }}>{description}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

export default SettingsModal