import { useOffline } from '../../hooks/useOffline'

interface OfflineIndicatorProps {
  className?: string
  showDetails?: boolean
}

export default function OfflineIndicator({ 
  className = '',
  showDetails = false 
}: OfflineIndicatorProps) {
  const { 
    isOnline, 
    hasOfflineData, 
    isSyncing, 
    lastSyncTime,
    sync,
    syncResult 
  } = useOffline()

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return '未同期'
    
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}日前`
    if (hours > 0) return `${hours}時間前`
    if (minutes > 0) return `${minutes}分前`
    return 'たった今'
  }

  return (
    <div className={`offline-indicator ${className}`}>
      {/* オンライン状態表示 */}
      <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
        <div className="status-icon">
          {isOnline ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="currentColor" />
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="8" cy="8" r="1" fill="white" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path 
                d="M2 2l12 12M8 3C4.5 3 1.5 5.5 1.5 8.5M8 13c3.5 0 6.5-2.5 6.5-5.5" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
        <span className="status-text">
          {isOnline ? 'オンライン' : 'オフライン'}
        </span>
      </div>

      {/* 同期状態 */}
      {(hasOfflineData || isSyncing) && (
        <div className="sync-status">
          {isSyncing ? (
            <div className="syncing">
              <div className="sync-spinner" />
              <span>同期中...</span>
            </div>
          ) : hasOfflineData ? (
            <button onClick={sync} className="sync-button" disabled={!isOnline}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path 
                  d="M12 4L7 9l-3-3" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              同期が必要
            </button>
          ) : null}
        </div>
      )}

      {/* 詳細情報 */}
      {showDetails && (
        <div className="sync-details">
          <div className="detail-item">
            <span className="detail-label">最終同期:</span>
            <span className="detail-value">{formatLastSync(lastSyncTime)}</span>
          </div>
          
          {syncResult && (
            <div className="sync-result">
              <div className="result-stats">
                <span className="stat success">成功: {syncResult.success}</span>
                {syncResult.failed > 0 && (
                  <span className="stat failed">失敗: {syncResult.failed}</span>
                )}
                {syncResult.conflicts > 0 && (
                  <span className="stat conflict">競合: {syncResult.conflicts}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .offline-indicator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 1rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .status-badge.online {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .status-badge.offline {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .status-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sync-status {
          display: flex;
          align-items: center;
        }

        .syncing {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--primary);
          font-weight: 500;
        }

        .sync-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .sync-button {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sync-button:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.2);
        }

        .sync-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sync-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--surface);
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          min-width: 200px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
        }

        .detail-label {
          color: var(--text-secondary);
        }

        .detail-value {
          color: var(--text-primary);
          font-weight: 500;
        }

        .sync-result {
          padding-top: 0.5rem;
          border-top: 1px solid var(--border);
        }

        .result-stats {
          display: flex;
          gap: 0.75rem;
        }

        .stat {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .stat.success {
          color: #22c55e;
        }

        .stat.failed {
          color: #ef4444;
        }

        .stat.conflict {
          color: #f59e0b;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .offline-indicator {
            font-size: 0.75rem;
            gap: 0.5rem;
          }

          .status-badge {
            padding: 0.25rem 0.5rem;
          }

          .sync-button {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }

          .sync-details {
            min-width: 150px;
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  )
}