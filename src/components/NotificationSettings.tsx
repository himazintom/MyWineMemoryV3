import React, { useState, useEffect } from 'react'
import { notificationService, type NotificationPreferences } from '../services/notificationService'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './common/LoadingSpinner'
import ErrorMessage from './common/ErrorMessage'

interface NotificationSettingsProps {
  className?: string
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  className = ''
}) => {
  const { currentUser } = useAuth()
  const [settings, setSettings] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default')

  useEffect(() => {
    loadSettings()
    checkPermissionStatus()
  }, [currentUser])

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const currentSettings = await notificationService.getNotificationSettings()
      setSettings(currentSettings)
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const checkPermissionStatus = () => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    }
  }

  const handleRequestPermission = async () => {
    try {
      const granted = await notificationService.requestPermission()
      if (granted) {
        setPermissionStatus('granted')
        
        // 許可が得られたらFCMトークンを登録
        if (currentUser) {
          await notificationService.initialize(currentUser.uid)
        }
      } else {
        setPermissionStatus('denied')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '通知許可のリクエストに失敗しました')
    }
  }

  const handleSettingChange = (key: keyof NotificationPreferences, value: boolean | string) => {
    if (!settings) return
    
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
  }

  const handleSave = async () => {
    if (!settings || !currentUser) return

    try {
      setSaving(true)
      setError(null)
      
      await notificationService.saveNotificationSettings(settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return { text: '通知が有効です', color: 'var(--success)' }
      case 'denied':
        return { text: '通知が無効です', color: 'var(--error)' }
      default:
        return { text: '通知許可が必要です', color: 'var(--warning)' }
    }
  }

  const formatTime = (time: string) => {
    return time.replace(':', ' : ')
  }

  if (loading) {
    return (
      <div className={`notification-settings ${className}`}>
        <LoadingSpinner />
        <p>設定を読み込み中...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className={`notification-settings ${className}`}>
        <ErrorMessage message="設定の読み込みに失敗しました" />
      </div>
    )
  }

  const statusInfo = getPermissionStatusText()

  return (
    <div className={`notification-settings ${className}`}>
      <div className="settings-header">
        <h3>プッシュ通知設定</h3>
        <div className="permission-status">
          <span style={{ color: statusInfo.color }}>
            {statusInfo.text}
          </span>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* 通知許可セクション */}
      {permissionStatus !== 'granted' && (
        <div className="permission-request">
          <div className="permission-info">
            <h4>📱 通知を有効にする</h4>
            <p>
              ストリーク継続やハート回復のタイミングを逃さないように、
              ブラウザ通知を有効にすることをおすすめします。
            </p>
          </div>
          <button 
            className="permission-button"
            onClick={handleRequestPermission}
            disabled={permissionStatus === 'denied'}
          >
            {permissionStatus === 'denied' 
              ? 'ブラウザ設定で通知を有効にしてください'
              : '通知を有効にする'
            }
          </button>
        </div>
      )}

      {/* 通知種類設定 */}
      <div className="notification-types">
        <h4>通知の種類</h4>
        
        <label className="setting-item">
          <div className="setting-info">
            <span className="setting-name">🔥 ストリーク継続リマインダー</span>
            <span className="setting-description">
              23時間経過後にストリーク継続をお知らせします
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.streakReminder}
            onChange={(e) => handleSettingChange('streakReminder', e.target.checked)}
            disabled={saving}
          />
        </label>

        <label className="setting-item">
          <div className="setting-info">
            <span className="setting-name">🧠 クイズリマインダー</span>
            <span className="setting-description">
              毎日のクイズ学習をお知らせします
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.quizReminder}
            onChange={(e) => handleSettingChange('quizReminder', e.target.checked)}
            disabled={saving}
          />
        </label>

        <label className="setting-item">
          <div className="setting-info">
            <span className="setting-name">❤️ ハート回復通知</span>
            <span className="setting-description">
              ハートが回復したときにお知らせします
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.heartRecovery}
            onChange={(e) => handleSettingChange('heartRecovery', e.target.checked)}
            disabled={saving}
          />
        </label>

        <label className="setting-item">
          <div className="setting-info">
            <span className="setting-name">🏅 バッジ獲得通知</span>
            <span className="setting-description">
              新しいバッジを獲得したときにお知らせします
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.badgeAchievement}
            onChange={(e) => handleSettingChange('badgeAchievement', e.target.checked)}
            disabled={saving}
          />
        </label>
      </div>

      {/* 静寂時間設定 */}
      <div className="quiet-hours">
        <h4>🌙 静寂時間</h4>
        <p className="quiet-hours-description">
          この時間帯は通知を送信しません
        </p>
        
        <div className="time-range">
          <div className="time-input">
            <label>開始時刻</label>
            <input
              type="time"
              value={settings.quietHoursStart}
              onChange={(e) => handleSettingChange('quietHoursStart', e.target.value)}
              disabled={saving}
            />
          </div>
          
          <span className="time-separator">〜</span>
          
          <div className="time-input">
            <label>終了時刻</label>
            <input
              type="time"
              value={settings.quietHoursEnd}
              onChange={(e) => handleSettingChange('quietHoursEnd', e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
        
        <p className="time-display">
          静寂時間: {formatTime(settings.quietHoursStart)} 〜 {formatTime(settings.quietHoursEnd)}
        </p>
      </div>

      {/* 保存ボタン */}
      <div className="settings-actions">
        <button
          className="save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <LoadingSpinner size="small" />
              保存中...
            </>
          ) : (
            '設定を保存'
          )}
        </button>
      </div>

      {/* 通知のテスト */}
      {permissionStatus === 'granted' && (
        <div className="test-notification">
          <h4>🔔 通知テスト</h4>
          <button
            className="test-button"
            onClick={() => notificationService.showLocalNotification(
              'テスト通知',
              { body: 'MyWineMemoryからの通知が正常に動作しています' }
            )}
          >
            テスト通知を送信
          </button>
        </div>
      )}
    </div>
  )
}