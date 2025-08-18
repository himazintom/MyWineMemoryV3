import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { NotificationSettings } from '../../components/NotificationSettings'
import { ModelSelector } from '../../components/admin/ModelSelector'
import Button from '../../components/common/Button'
import ErrorMessage from '../../components/common/ErrorMessage'

interface SettingsTab {
  id: 'appearance' | 'notifications' | 'privacy' | 'ai'
  label: string
  icon: string
}

const SETTINGS_TABS: SettingsTab[] = [
  { id: 'appearance', label: '外観', icon: '🎨' },
  { id: 'notifications', label: '通知', icon: '🔔' },
  { id: 'ai', label: 'AI設定', icon: '🤖' },
  { id: 'privacy', label: 'プライバシー', icon: '🔒' }
]

export default function SettingsPage() {
  const { userProfile, isGuestMode, updateUserProfile, error, clearError } = useAuth()
  const [activeTab, setActiveTab] = useState<string>('notifications')
  const [isUpdating, setIsUpdating] = useState(false)
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'auto',
    language: 'ja'
  })
  const [privacySettings, setPrivacySettings] = useState({
    publicProfile: userProfile?.preferences?.privacy?.publicProfile ?? true,
    showRealPrice: userProfile?.preferences?.privacy?.showPrices ?? false
  })

  const handlePrivacyUpdate = async () => {
    if (!userProfile || isGuestMode) return

    try {
      setIsUpdating(true)
      clearError()
      
      await updateUserProfile({
        preferences: {
          theme: userProfile.preferences?.theme ?? 'auto',
          language: userProfile.preferences?.language ?? 'ja',
          notifications: userProfile.preferences?.notifications ?? {
            push: true,
            email: false,
            streakReminder: true,
            quizReminder: true,
            heartRecovery: true
          },
          privacy: {
            publicProfile: privacySettings.publicProfile,
            publicRecords: userProfile.preferences?.privacy?.publicRecords ?? true,
            showPrices: privacySettings.showRealPrice
          }
        }
      })
      
    } catch (err) {
      console.error('Privacy settings update failed:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'appearance':
        return (
          <div className="tab-content">
            <div className="section-header">
              <h2>🎨 外観設定</h2>
              <p>テーマや言語設定を管理します</p>
            </div>

            <div className="appearance-settings">
              <div className="setting-group">
                <div className="setting-item">
                  <label htmlFor="theme">テーマ</label>
                  <select 
                    id="theme" 
                    value={appearanceSettings.theme}
                    onChange={(e) => setAppearanceSettings(prev => ({ ...prev, theme: e.target.value }))}
                  >
                    <option value="light">ライト</option>
                    <option value="dark">ダーク</option>
                    <option value="auto">システムに合わせる</option>
                  </select>
                </div>
                
                <div className="setting-item">
                  <label htmlFor="language">言語</label>
                  <select 
                    id="language" 
                    value={appearanceSettings.language}
                    onChange={(e) => setAppearanceSettings(prev => ({ ...prev, language: e.target.value }))}
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="tab-content">
            <NotificationSettings />
          </div>
        )

      case 'ai':
        return (
          <div className="tab-content">
            <div className="section-header">
              <h2>🤖 AI設定</h2>
              <p>AIモデルの選択と設定を管理します</p>
            </div>
            <ModelSelector showOnlyFree={true} />
          </div>
        )

      case 'privacy':
        return (
          <div className="tab-content">
            <div className="section-header">
              <h2>🔒 プライバシー設定</h2>
              <p>データの公開範囲と表示設定を管理します</p>
            </div>

            {error && <ErrorMessage message={error} />}

            <div className="privacy-settings">
              <div className="setting-group">
                <label className="setting-item">
                  <div className="setting-info">
                    <span className="setting-name">プロフィールを公開</span>
                    <span className="setting-description">
                      他のユーザーがあなたのプロフィールとテイスティング記録を閲覧できます
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacySettings.publicProfile}
                    onChange={(e) => setPrivacySettings(prev => ({ ...prev, publicProfile: e.target.checked }))}
                    disabled={isUpdating || isGuestMode}
                  />
                </label>

                <label className="setting-item">
                  <div className="setting-info">
                    <span className="setting-name">価格情報を表示</span>
                    <span className="setting-description">
                      テイスティング記録でワインの価格を他のユーザーに表示します
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacySettings.showRealPrice}
                    onChange={(e) => setPrivacySettings(prev => ({ ...prev, showRealPrice: e.target.checked }))}
                    disabled={isUpdating || isGuestMode}
                  />
                </label>
              </div>

              {!isGuestMode && (
                <div className="settings-actions">
                  <Button
                    variant="primary"
                    onClick={handlePrivacyUpdate}
                    disabled={isUpdating}
                    isLoading={isUpdating}
                  >
                    設定を保存
                  </Button>
                </div>
              )}

              {isGuestMode && (
                <div className="guest-notice">
                  <p>ゲストモードではプライバシー設定が制限されています。</p>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>設定</h1>
      </div>

      <div className="settings-container">
        {/* タブナビゲーション */}
        <div className="settings-tabs">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* タブコンテンツ */}
        <div className="settings-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}