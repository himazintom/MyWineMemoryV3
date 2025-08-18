import { useState } from 'react'
import { useAppUpdate } from '../../hooks/useAppUpdate'
import Button from '../common/Button'

export default function UpdateNotification() {
  const {
    available,
    downloaded,
    installing,
    info,
    progress,
    error,
    downloadUpdate,
    applyUpdate,
    postponeUpdate,
    ignoreUpdate
  } = useAppUpdate()

  const [isVisible, setIsVisible] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

  if (!available || !isVisible) {
    return null
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadUpdate()
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleApply = async () => {
    try {
      await applyUpdate()
    } catch (err) {
      console.error('Apply failed:', err)
    }
  }

  const handlePostpone = async () => {
    setIsVisible(false)
    await postponeUpdate()
  }

  const handleIgnore = async () => {
    setIsVisible(false)
    await ignoreUpdate()
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div className="update-notification">
      <div className="notification-content">
        {/* ヘッダー */}
        <div className="notification-header">
          <div className="update-icon">
            {installing ? '⚙️' : downloaded ? '✅' : '🔄'}
          </div>
          <div className="update-title">
            <h3>
              {installing ? 'アップデートを適用中...' :
               downloaded ? 'アップデートの準備完了' :
               '新しいバージョンが利用可能です'}
            </h3>
            {info && (
              <span className="version-info">
                バージョン {info.version}
              </span>
            )}
          </div>
          {!installing && (
            <button
              className="close-button"
              onClick={() => setIsVisible(false)}
              aria-label="通知を閉じる"
            >
              ×
            </button>
          )}
        </div>

        {/* 進行状況 */}
        {(isDownloading || installing) && (
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">
              {installing ? 'インストール中...' : 'ダウンロード中...'} {progress.toFixed(0)}%
            </span>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="error-section">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
          </div>
        )}

        {/* 更新内容 */}
        {info && !installing && (
          <div className="update-details">
            {info.features.length > 0 && (
              <div className="detail-section">
                <h4>✨ 新機能</h4>
                <ul>
                  {info.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {info.fixes.length > 0 && (
              <div className="detail-section">
                <h4>🔧 修正・改善</h4>
                <ul>
                  {info.fixes.map((fix, index) => (
                    <li key={index}>{fix}</li>
                  ))}
                </ul>
              </div>
            )}

            {info.breaking && (
              <div className="breaking-changes">
                <span className="breaking-icon">⚠️</span>
                <span>このアップデートには重要な変更が含まれています</span>
              </div>
            )}

            {info.size && (
              <div className="download-size">
                ダウンロードサイズ: {formatFileSize(info.size)}
              </div>
            )}
          </div>
        )}

        {/* アクションボタン */}
        {!installing && (
          <div className="action-buttons">
            {downloaded ? (
              <>
                <Button
                  onClick={handleApply}
                  variant="primary"
                  className="apply-button"
                >
                  今すぐ再起動して適用
                </Button>
                <Button
                  onClick={handlePostpone}
                  variant="secondary"
                  size="sm"
                >
                  後で適用
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleDownload}
                  variant="primary"
                  isLoading={isDownloading}
                  disabled={isDownloading}
                  className="download-button"
                >
                  {isDownloading ? 'ダウンロード中...' : 'ダウンロード'}
                </Button>
                <Button
                  onClick={handlePostpone}
                  variant="secondary"
                  size="sm"
                  disabled={isDownloading}
                >
                  後で
                </Button>
                {!info?.mandatory && (
                  <Button
                    onClick={handleIgnore}
                    variant="text"
                    size="sm"
                    disabled={isDownloading}
                  >
                    このバージョンをスキップ
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {info?.mandatory && (
          <div className="mandatory-notice">
            <span className="mandatory-icon">🚨</span>
            <span>このアップデートは必須です。アプリを引き続き使用するには更新してください。</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .update-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 400px;
          max-width: calc(100vw - 40px);
          background: var(--surface);
          border-radius: 1rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          border: 1px solid var(--border);
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }

        .notification-content {
          padding: 1.5rem;
        }

        .notification-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .update-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .update-title {
          flex: 1;
        }

        .update-title h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .version-info {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: var(--surface-hover);
          color: var(--text-primary);
        }

        .progress-section {
          margin-bottom: 1rem;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: var(--border);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--primary-light));
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .error-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--error-light);
          color: var(--error);
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .update-details {
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }

        .detail-section {
          margin-bottom: 1rem;
        }

        .detail-section h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .detail-section ul {
          margin: 0;
          padding-left: 1.25rem;
          color: var(--text-secondary);
        }

        .detail-section li {
          margin-bottom: 0.25rem;
        }

        .breaking-changes {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--warning-light);
          color: var(--warning);
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .download-size {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .apply-button, .download-button {
          flex: 1;
          min-width: 140px;
        }

        .mandatory-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--error-light);
          color: var(--error);
          border-radius: 0.5rem;
          margin-top: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 640px) {
          .update-notification {
            top: 10px;
            right: 10px;
            left: 10px;
            width: auto;
            max-width: none;
          }

          .notification-content {
            padding: 1rem;
          }

          .action-buttons {
            flex-direction: column;
          }

          .apply-button, .download-button {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  )
}