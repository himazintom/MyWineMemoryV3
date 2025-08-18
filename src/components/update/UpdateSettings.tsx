import { useState, useEffect } from 'react'
import Button from '../common/Button'
import { useAppUpdate } from '../../hooks/useAppUpdate'

interface UpdateSettings {
  autoDownload: boolean
  checkInterval: number // 分
  notifications: boolean
  preRelease: boolean
}

export default function UpdateSettings() {
  const [settings, setSettings] = useState<UpdateSettings>({
    autoDownload: true,
    checkInterval: 30,
    notifications: true,
    preRelease: false
  })

  const [isLoading, setIsLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const { checkForUpdates, available, info } = useAppUpdate()

  // 設定の読み込み
  useEffect(() => {
    const savedSettings = localStorage.getItem('updateSettings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.error('Failed to parse update settings:', error)
      }
    }

    const lastCheckTime = localStorage.getItem('lastUpdateCheck')
    if (lastCheckTime) {
      setLastCheck(new Date(parseInt(lastCheckTime)))
    }
  }, [])

  // 設定の保存
  const saveSettings = (newSettings: UpdateSettings) => {
    setSettings(newSettings)
    localStorage.setItem('updateSettings', JSON.stringify(newSettings))
  }

  // 手動更新チェック
  const handleManualCheck = async () => {
    setIsLoading(true)
    try {
      await checkForUpdates()
      const now = new Date()
      setLastCheck(now)
      localStorage.setItem('lastUpdateCheck', now.getTime().toString())
    } catch (error) {
      console.error('Manual check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // チェック間隔の選択肢
  const intervalOptions = [
    { value: 15, label: '15分' },
    { value: 30, label: '30分' },
    { value: 60, label: '1時間' },
    { value: 180, label: '3時間' },
    { value: 360, label: '6時間' },
    { value: 720, label: '12時間' },
    { value: 1440, label: '24時間' }
  ]

  const formatLastCheck = (date: Date | null) => {
    if (!date) return '未チェック'
    
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}時間前`
    } else if (minutes > 0) {
      return `${minutes}分前`
    } else {
      return 'たった今'
    }
  }

  return (
    <div className="update-settings">
      <div className="settings-header">
        <h3>アップデート設定</h3>
        <p>アプリの自動更新に関する設定を管理できます</p>
      </div>

      {/* 現在の状態 */}
      <div className="current-status">
        <div className="status-item">
          <span className="status-label">現在のバージョン:</span>
          <span className="status-value">1.0.0</span>
        </div>
        <div className="status-item">
          <span className="status-label">最終チェック:</span>
          <span className="status-value">{formatLastCheck(lastCheck)}</span>
        </div>
        {available && info && (
          <div className="status-item update-available">
            <span className="status-label">利用可能な更新:</span>
            <span className="status-value">バージョン {info.version}</span>
          </div>
        )}
      </div>

      {/* 設定オプション */}
      <div className="settings-options">
        <div className="setting-group">
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">自動ダウンロード</label>
              <span className="setting-description">
                新しいバージョンを自動的にダウンロードします
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.autoDownload}
                onChange={(e) => saveSettings({
                  ...settings,
                  autoDownload: e.target.checked
                })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">更新通知</label>
              <span className="setting-description">
                新しいバージョンが利用可能な時に通知します
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => saveSettings({
                  ...settings,
                  notifications: e.target.checked
                })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">プレリリース版</label>
              <span className="setting-description">
                ベータ版やテスト版の更新も受け取ります
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.preRelease}
                onChange={(e) => saveSettings({
                  ...settings,
                  preRelease: e.target.checked
                })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">チェック間隔</label>
              <span className="setting-description">
                アップデートを確認する頻度を設定します
              </span>
            </div>
            <select
              className="interval-select"
              value={settings.checkInterval}
              onChange={(e) => saveSettings({
                ...settings,
                checkInterval: Number(e.target.value)
              })}
            >
              {intervalOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="settings-actions">
        <Button
          onClick={handleManualCheck}
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading}
        >
          今すぐチェック
        </Button>
        
        <Button
          onClick={() => {
            // 設定をデフォルトに戻す
            const defaultSettings: UpdateSettings = {
              autoDownload: true,
              checkInterval: 30,
              notifications: true,
              preRelease: false
            }
            saveSettings(defaultSettings)
          }}
          variant="secondary"
        >
          デフォルトに戻す
        </Button>
      </div>

      <style jsx>{`
        .update-settings {
          background: var(--surface);
          border-radius: 1rem;
          padding: 2rem;
          margin: 1rem 0;
        }

        .settings-header {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .settings-header h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.25rem;
        }

        .settings-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .current-status {
          background: var(--background);
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
        }

        .status-item:not(:last-child) {
          border-bottom: 1px solid var(--border);
        }

        .status-label {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .status-value {
          color: var(--text-primary);
          font-weight: 500;
        }

        .status-item.update-available .status-value {
          color: var(--primary);
          font-weight: 600;
        }

        .settings-options {
          margin-bottom: 2rem;
        }

        .setting-group {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .setting-info {
          flex: 1;
        }

        .setting-label {
          display: block;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .setting-description {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .toggle-switch {
          position: relative;
          width: 50px;
          height: 28px;
          cursor: pointer;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--border);
          border-radius: 14px;
          transition: 0.3s;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 4px;
          bottom: 4px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
        }

        .toggle-switch input:checked + .toggle-slider {
          background: var(--primary);
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(22px);
        }

        .interval-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          background: var(--background);
          color: var(--text-primary);
          font-size: 0.875rem;
          min-width: 120px;
        }

        .interval-select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
        }

        .settings-actions {
          display: flex;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }

        @media (max-width: 640px) {
          .update-settings {
            padding: 1rem;
          }

          .setting-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .settings-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}