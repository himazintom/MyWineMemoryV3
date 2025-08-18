import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import ErrorMessage from '../common/ErrorMessage'
import privacyService from '../../services/privacyService'
import type { PrivacySettings as PrivacySettingsType } from '../../services/privacyService'

interface PrivacySettingsProps {
  className?: string
}

export default function PrivacySettings({ className = '' }: PrivacySettingsProps) {
  const { currentUser: user } = useAuth()
  const [settings, setSettings] = useState<PrivacySettingsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 設定の読み込み
  useEffect(() => {
    if (user) {
      loadPrivacySettings()
    }
  }, [user])

  const loadPrivacySettings = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)
      const userSettings = await privacyService.getPrivacySettings(user.uid)
      setSettings(userSettings)
    } catch (err) {
      console.error('Failed to load privacy settings:', err)
      setError('プライバシー設定の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettingChange = (key: keyof PrivacySettingsType, value: boolean) => {
    if (!settings) return

    setSettings({
      ...settings,
      [key]: value
    })
  }

  const saveSettings = async () => {
    if (!user || !settings) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      await privacyService.updatePrivacySettings(user.uid, settings)
      
      setSuccessMessage('プライバシー設定を保存しました')
      
      // 成功メッセージを3秒後に消す
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Failed to save privacy settings:', err)
      setError('プライバシー設定の保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error && !settings) {
    return <ErrorMessage message={error} onRetry={loadPrivacySettings} />
  }

  if (!settings) {
    return (
      <div className="no-settings">
        <h3>設定を読み込めませんでした</h3>
        <Button onClick={loadPrivacySettings} variant="primary">
          再試行
        </Button>
      </div>
    )
  }

  return (
    <div className={`privacy-settings ${className}`}>
      <div className="settings-header">
        <h2>プライバシー設定</h2>
        <p>あなたのデータの公開範囲と共有設定を管理できます</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <span className="success-icon">✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      <div className="settings-sections">
        {/* 公開設定 */}
        <div className="settings-section">
          <h3>🌐 公開設定</h3>
          <p className="section-description">
            他のユーザーに表示される情報を設定します
          </p>

          <div className="setting-items">
            <div className="setting-item">
              <div className="setting-info">
                <h4>プロフィールを公開</h4>
                <p>あなたのプロフィール情報を他のユーザーに表示します</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showProfile}
                  onChange={(e) => handleSettingChange('showProfile', e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>テイスティング記録を公開</h4>
                <p>あなたのワイン記録を他のユーザーに表示します</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.recordsPublic}
                  onChange={(e) => handleSettingChange('recordsPublic', e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>統計情報を公開</h4>
                <p>あなたのテイスティング統計を他のユーザーに表示します</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showStatistics}
                  onChange={(e) => handleSettingChange('showStatistics', e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>コレクションを公開</h4>
                <p>あなたのワインコレクションを他のユーザーに表示します</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showCollection}
                  onChange={(e) => handleSettingChange('showCollection', e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* 価格情報設定 */}
        <div className="settings-section">
          <h3>💰 価格情報設定</h3>
          <p className="section-description">
            ワインの価格情報の表示設定です
          </p>

          <div className="setting-items">
            <div className="setting-item">
              <div className="setting-info">
                <h4>価格情報を表示</h4>
                <p>公開記録にワインの価格情報を含めます</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showPrices}
                  onChange={(e) => handleSettingChange('showPrices', e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* 個人情報設定 */}
        <div className="settings-section">
          <h3>🔒 個人情報設定</h3>
          <p className="section-description">
            個人的なメモや情報の表示設定です
          </p>

          <div className="setting-items">
            <div className="setting-item">
              <div className="setting-info">
                <h4>個人メモを表示</h4>
                <p>公開記録に個人的なメモやコメントを含めます</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showPersonalNotes}
                  onChange={(e) => handleSettingChange('showPersonalNotes', e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* データ共有設定 */}
        <div className="settings-section">
          <h3>📊 データ共有設定</h3>
          <p className="section-description">
            匿名化されたデータの活用について
          </p>

          <div className="setting-items">
            <div className="setting-item">
              <div className="setting-info">
                <h4>匿名データの共有を許可</h4>
                <p>サービス改善のため、匿名化されたデータの活用を許可します</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.allowDataSharing}
                  onChange={(e) => handleSettingChange('allowDataSharing', e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="data-sharing-notice">
            <div className="notice-icon">ℹ️</div>
            <div className="notice-content">
              <h5>匿名データ共有について</h5>
              <p>
                この設定を有効にすると、個人を特定できない形で統計的なデータが
                サービスの品質向上や新機能開発に活用される場合があります。
                個人情報は一切含まれません。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="settings-actions">
        <Button
          onClick={saveSettings}
          variant="primary"
          isLoading={isSaving}
          disabled={isSaving}
          className="save-button"
        >
          {isSaving ? '保存中...' : '設定を保存'}
        </Button>

        <Button
          onClick={loadPrivacySettings}
          variant="secondary"
          disabled={isSaving}
        >
          リセット
        </Button>
      </div>

      <style jsx>{`
        .privacy-settings {
          background: var(--surface);
          border-radius: 1rem;
          padding: 2rem;
          margin: 2rem 0;
        }

        .settings-header {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .settings-header h2 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.5rem;
        }

        .settings-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .error-message, .success-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }

        .error-message {
          background: var(--error-light);
          color: var(--error);
          border: 1px solid var(--error);
        }

        .success-message {
          background: var(--success-light);
          color: var(--success);
          border: 1px solid var(--success);
        }

        .settings-sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .settings-section {
          background: var(--background);
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .settings-section h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.125rem;
        }

        .section-description {
          margin: 0 0 1.5rem 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .setting-items {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: var(--surface);
          border-radius: 0.5rem;
        }

        .setting-info {
          flex: 1;
        }

        .setting-info h4 {
          margin: 0 0 0.25rem 0;
          color: var(--text-primary);
          font-size: 0.95rem;
          font-weight: 500;
        }

        .setting-info p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .toggle-switch {
          position: relative;
          width: 50px;
          height: 28px;
          cursor: pointer;
          flex-shrink: 0;
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

        .data-sharing-notice {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: var(--info-light);
          border-radius: 0.5rem;
          margin-top: 1rem;
          border: 1px solid var(--info);
        }

        .notice-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .notice-content h5 {
          margin: 0 0 0.5rem 0;
          color: var(--info);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .notice-content p {
          margin: 0;
          color: var(--info);
          font-size: 0.8rem;
          line-height: 1.5;
        }

        .settings-actions {
          display: flex;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }

        .save-button {
          min-width: 140px;
        }

        .no-settings {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--text-secondary);
        }

        .no-settings h3 {
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .privacy-settings {
            padding: 1rem;
          }

          .setting-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .settings-actions {
            flex-direction: column;
          }

          .save-button {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  )
}