import { useState } from 'react'
import { useOffline } from '../../hooks/useOffline'
import Button from '../common/Button'
import type { TastingRecord } from '../../types'

interface ConflictResolverProps {
  conflictRecord: TastingRecord & { conflictData?: TastingRecord }
  onResolve?: () => void
  onCancel?: () => void
}

export default function ConflictResolver({ 
  conflictRecord, 
  onResolve,
  onCancel 
}: ConflictResolverProps) {
  const [isResolving, setIsResolving] = useState(false)
  const { resolveConflict } = useOffline()

  const handleResolve = async (useLocal: boolean) => {
    if (!conflictRecord.id) return

    setIsResolving(true)
    try {
      await resolveConflict(conflictRecord.id, useLocal)
      onResolve?.()
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    } finally {
      setIsResolving(false)
    }
  }

  const localData = conflictRecord
  const serverData = conflictRecord.conflictData

  if (!serverData) return null

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ja-JP')
  }

  const compareFields = (field: keyof TastingRecord) => {
    const localValue = localData[field]
    const serverValue = serverData[field]
    
    if (localValue === serverValue) return null
    
    return { local: localValue, server: serverValue }
  }

  const differences = [
    { field: 'wineName', label: 'ワイン名' },
    { field: 'producer', label: '生産者' },
    { field: 'country', label: '国' },
    { field: 'region', label: '地域' },
    { field: 'rating', label: '評価' },
    { field: 'price', label: '価格' },
    { field: 'notes', label: 'メモ' }
  ].map(({ field, label }) => ({
    field,
    label,
    diff: compareFields(field as keyof TastingRecord)
  })).filter(item => item.diff !== null)

  return (
    <div className="conflict-resolver">
      <div className="conflict-header">
        <h3>データの競合が発生しました</h3>
        <p>
          同じ記録がローカルとサーバーで異なる内容になっています。
          どちらのデータを保持するか選択してください。
        </p>
      </div>

      <div className="conflict-comparison">
        <div className="comparison-header">
          <div className="column-header local">
            <h4>📱 ローカルデータ</h4>
            <span className="timestamp">
              更新: {formatDate(localData.updatedAt)}
            </span>
          </div>
          <div className="column-header server">
            <h4>☁️ サーバーデータ</h4>
            <span className="timestamp">
              更新: {formatDate(serverData.updatedAt)}
            </span>
          </div>
        </div>

        <div className="differences-list">
          {differences.map(({ field, label, diff }) => (
            <div key={field} className="difference-row">
              <div className="field-label">{label}</div>
              <div className="values-comparison">
                <div className="value-cell local">
                  <div className="value-content">
                    {String(diff?.local || '')}
                  </div>
                </div>
                <div className="value-cell server">
                  <div className="value-content">
                    {String(diff?.server || '')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="conflict-actions">
        <div className="action-buttons">
          <Button
            onClick={() => handleResolve(true)}
            variant="primary"
            isLoading={isResolving}
            disabled={isResolving}
            className="resolve-button local-button"
          >
            📱 ローカルデータを使用
          </Button>
          
          <Button
            onClick={() => handleResolve(false)}
            variant="secondary"
            isLoading={isResolving}
            disabled={isResolving}
            className="resolve-button server-button"
          >
            ☁️ サーバーデータを使用
          </Button>
        </div>

        <div className="action-note">
          <p>
            <strong>ローカルデータ:</strong> オフライン中に編集した内容を保持します
          </p>
          <p>
            <strong>サーバーデータ:</strong> 他のデバイスや最新の同期内容を保持します
          </p>
        </div>

        {onCancel && (
          <div className="cancel-action">
            <Button
              onClick={onCancel}
              variant="text"
              disabled={isResolving}
            >
              後で決める
            </Button>
          </div>
        )}
      </div>

      <style jsx>{`
        .conflict-resolver {
          background: var(--surface);
          border-radius: 1rem;
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .conflict-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .conflict-header h3 {
          font-size: 1.5rem;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .conflict-header p {
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .conflict-comparison {
          background: var(--background);
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .comparison-header {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .column-header {
          text-align: center;
        }

        .column-header h4 {
          font-size: 1.125rem;
          margin-bottom: 0.25rem;
        }

        .column-header.local h4 {
          color: #3b82f6;
        }

        .column-header.server h4 {
          color: #10b981;
        }

        .timestamp {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .differences-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .difference-row {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .field-label {
          min-width: 100px;
          font-weight: 600;
          color: var(--text-primary);
          padding-top: 0.75rem;
        }

        .values-comparison {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .value-cell {
          padding: 0.75rem;
          border-radius: 0.5rem;
          border: 2px solid transparent;
          background: var(--surface);
        }

        .value-cell.local {
          border-color: rgba(59, 130, 246, 0.2);
          background: rgba(59, 130, 246, 0.05);
        }

        .value-cell.server {
          border-color: rgba(16, 185, 129, 0.2);
          background: rgba(16, 185, 129, 0.05);
        }

        .value-content {
          font-size: 0.875rem;
          color: var(--text-primary);
          word-break: break-word;
          min-height: 1.25rem;
        }

        .conflict-actions {
          text-align: center;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .resolve-button {
          min-width: 200px;
        }

        .local-button {
          background: #3b82f6;
          border-color: #3b82f6;
        }

        .local-button:hover:not(:disabled) {
          background: #2563eb;
          border-color: #2563eb;
        }

        .server-button {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .server-button:hover:not(:disabled) {
          background: #059669;
          border-color: #059669;
        }

        .action-note {
          text-align: left;
          max-width: 500px;
          margin: 0 auto 1rem;
        }

        .action-note p {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .cancel-action {
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }

        @media (max-width: 768px) {
          .conflict-resolver {
            padding: 1.5rem;
          }

          .comparison-header {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .values-comparison {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .difference-row {
            flex-direction: column;
            gap: 0.5rem;
          }

          .field-label {
            min-width: auto;
            padding-top: 0;
          }

          .action-buttons {
            flex-direction: column;
            gap: 0.75rem;
          }

          .resolve-button {
            min-width: auto;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}