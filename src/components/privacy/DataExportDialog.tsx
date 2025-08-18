import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import privacyService from '../../services/privacyService'
import type { UserDataExport } from '../../services/privacyService'

interface DataExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function DataExportDialog({ isOpen, onClose }: DataExportDialogProps) {
  const { currentUser: user } = useAuth()
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [exportData, setExportData] = useState<UserDataExport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'format' | 'exporting' | 'completed'>('format')

  const handleExport = async () => {
    if (!user) return

    try {
      setIsExporting(true)
      setError(null)
      setCurrentStep('exporting')

      const data = await privacyService.exportUserData(user.uid, exportFormat)
      setExportData(data)
      setCurrentStep('completed')
    } catch (err) {
      console.error('Export failed:', err)
      setError('データのエクスポートに失敗しました')
      setCurrentStep('format')
    } finally {
      setIsExporting(false)
    }
  }

  const downloadExportedData = () => {
    if (!exportData) return

    let content: string
    let filename: string
    let mimeType: string

    if (exportFormat === 'json') {
      content = JSON.stringify(exportData, null, 2)
      filename = `wine-memory-export-${new Date().toISOString().split('T')[0]}.json`
      mimeType = 'application/json'
    } else {
      // CSV フォーマットの場合
      const csvContent = [
        'tastingDate,wineName,producer,vintage,region,country,type,rating,price,notes',
        ...exportData.tastingRecords.map(record => [
          record.tastingDate?.toISOString().split('T')[0] || '',
          `"${record.wineName || ''}"`,
          `"${record.producer || ''}"`,
          record.vintage || '',
          `"${record.region || ''}"`,
          `"${record.country || ''}"`,
          `"${record.type || ''}"`,
          record.rating || '',
          record.price || '',
          `"${(record.notes || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n')
      
      content = csvContent
      filename = `wine-memory-export-${new Date().toISOString().split('T')[0]}.csv`
      mimeType = 'text/csv'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const resetDialog = () => {
    setCurrentStep('format')
    setExportData(null)
    setError(null)
    setIsExporting(false)
  }

  const handleClose = () => {
    resetDialog()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>データエクスポート</h2>
          <button className="close-button" onClick={handleClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="dialog-body">
          {currentStep === 'format' && (
            <div className="format-selection">
              <div className="step-info">
                <h3>エクスポート形式を選択</h3>
                <p>あなたのテイスティング記録とプロフィール情報をエクスポートできます</p>
              </div>

              <div className="format-options">
                <div className="format-option">
                  <label className="format-label">
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                    />
                    <div className="format-info">
                      <h4>JSON形式</h4>
                      <p>
                        完全なデータ構造を保持した形式です。
                        プロフィール、設定、統計情報なども含まれます。
                      </p>
                      <div className="format-features">
                        <span className="feature">✓ 完全なデータ</span>
                        <span className="feature">✓ 他のアプリに移行可能</span>
                        <span className="feature">✓ バックアップ用途</span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="format-option">
                  <label className="format-label">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                    />
                    <div className="format-info">
                      <h4>CSV形式</h4>
                      <p>
                        表計算ソフトで開ける形式です。
                        テイスティング記録のみが含まれます。
                      </p>
                      <div className="format-features">
                        <span className="feature">✓ Excel等で開ける</span>
                        <span className="feature">✓ データ分析しやすい</span>
                        <span className="feature">✓ 軽量</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="gdpr-notice">
                <div className="notice-icon">📋</div>
                <div className="notice-content">
                  <h5>GDPR対応について</h5>
                  <p>
                    この機能はGDPR（EU一般データ保護規則）に基づく
                    データポータビリティの権利に対応しています。
                    エクスポートされたデータは完全にあなたのものです。
                  </p>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {currentStep === 'exporting' && (
            <div className="exporting-state">
              <LoadingSpinner />
              <h3>データをエクスポート中...</h3>
              <p>しばらくお待ちください</p>
            </div>
          )}

          {currentStep === 'completed' && exportData && (
            <div className="export-completed">
              <div className="success-icon">✅</div>
              <h3>エクスポート完了</h3>
              <p>データの準備が完了しました</p>

              <div className="export-summary">
                <h4>エクスポート内容</h4>
                <div className="summary-items">
                  <div className="summary-item">
                    <span className="label">テイスティング記録:</span>
                    <span className="value">{exportData.tastingRecords.length}件</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">エクスポート日時:</span>
                    <span className="value">{exportData.exportDate.toLocaleString()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">形式:</span>
                    <span className="value">{exportData.format.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="privacy-reminder">
                <div className="reminder-icon">🔒</div>
                <div className="reminder-content">
                  <h5>プライバシーに関する注意</h5>
                  <p>
                    エクスポートされたファイルには個人情報が含まれています。
                    安全な場所に保存し、第三者との共有にはご注意ください。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="dialog-actions">
          {currentStep === 'format' && (
            <>
              <Button onClick={handleClose} variant="secondary">
                キャンセル
              </Button>
              <Button
                onClick={handleExport}
                variant="primary"
                isLoading={isExporting}
                disabled={isExporting}
              >
                エクスポート開始
              </Button>
            </>
          )}

          {currentStep === 'completed' && (
            <>
              <Button onClick={resetDialog} variant="secondary">
                別の形式でエクスポート
              </Button>
              <Button onClick={downloadExportedData} variant="primary">
                ダウンロード
              </Button>
            </>
          )}
        </div>

        <style jsx>{`
          .dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .dialog-content {
            background: var(--surface);
            border-radius: 1rem;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          }

          .dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem 2rem;
            border-bottom: 1px solid var(--border);
          }

          .dialog-header h2 {
            margin: 0;
            color: var(--text-primary);
            font-size: 1.25rem;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
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

          .dialog-body {
            padding: 2rem;
          }

          .step-info {
            margin-bottom: 2rem;
          }

          .step-info h3 {
            margin: 0 0 0.5rem 0;
            color: var(--text-primary);
            font-size: 1.125rem;
          }

          .step-info p {
            margin: 0;
            color: var(--text-secondary);
            line-height: 1.5;
          }

          .format-options {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .format-option {
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            transition: all 0.2s;
          }

          .format-option:has(input:checked) {
            border-color: var(--primary);
            background: var(--primary-light);
          }

          .format-label {
            display: flex;
            gap: 1rem;
            padding: 1.5rem;
            cursor: pointer;
            align-items: flex-start;
          }

          .format-label input {
            margin-top: 0.25rem;
            flex-shrink: 0;
          }

          .format-info h4 {
            margin: 0 0 0.5rem 0;
            color: var(--text-primary);
            font-size: 1rem;
          }

          .format-info p {
            margin: 0 0 1rem 0;
            color: var(--text-secondary);
            font-size: 0.875rem;
            line-height: 1.5;
          }

          .format-features {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .feature {
            font-size: 0.75rem;
            color: var(--primary);
            background: var(--primary-light);
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-weight: 500;
          }

          .gdpr-notice, .privacy-reminder {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            background: var(--info-light);
            border-radius: 0.5rem;
            border: 1px solid var(--info);
            margin-bottom: 1rem;
          }

          .notice-icon, .reminder-icon {
            font-size: 1.25rem;
            flex-shrink: 0;
          }

          .notice-content h5, .reminder-content h5 {
            margin: 0 0 0.5rem 0;
            color: var(--info);
            font-size: 0.875rem;
            font-weight: 600;
          }

          .notice-content p, .reminder-content p {
            margin: 0;
            color: var(--info);
            font-size: 0.8rem;
            line-height: 1.5;
          }

          .error-message {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem;
            background: var(--error-light);
            color: var(--error);
            border-radius: 0.5rem;
            border: 1px solid var(--error);
            font-size: 0.875rem;
          }

          .exporting-state {
            text-align: center;
            padding: 2rem 1rem;
          }

          .exporting-state h3 {
            margin: 1rem 0 0.5rem 0;
            color: var(--text-primary);
          }

          .exporting-state p {
            margin: 0;
            color: var(--text-secondary);
          }

          .export-completed {
            text-align: center;
          }

          .success-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }

          .export-completed h3 {
            margin: 0 0 0.5rem 0;
            color: var(--text-primary);
          }

          .export-completed > p {
            margin: 0 0 2rem 0;
            color: var(--text-secondary);
          }

          .export-summary {
            background: var(--background);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            text-align: left;
          }

          .export-summary h4 {
            margin: 0 0 1rem 0;
            color: var(--text-primary);
            font-size: 1rem;
          }

          .summary-items {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .label {
            color: var(--text-secondary);
            font-size: 0.875rem;
          }

          .value {
            color: var(--text-primary);
            font-weight: 500;
            font-size: 0.875rem;
          }

          .dialog-actions {
            display: flex;
            gap: 1rem;
            padding: 1.5rem 2rem;
            border-top: 1px solid var(--border);
            justify-content: flex-end;
          }

          @media (max-width: 640px) {
            .dialog-overlay {
              padding: 0.5rem;
            }

            .dialog-header, .dialog-body, .dialog-actions {
              padding-left: 1rem;
              padding-right: 1rem;
            }

            .format-label {
              flex-direction: column;
              gap: 0.75rem;
            }

            .dialog-actions {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </div>
  )
}