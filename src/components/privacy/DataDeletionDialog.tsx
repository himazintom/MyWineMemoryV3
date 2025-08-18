import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import privacyService from '../../services/privacyService'
import type { DataDeletionOptions } from '../../services/privacyService'

interface DataDeletionDialogProps {
  isOpen: boolean
  onClose: () => void
  onDeleted?: () => void
}

export default function DataDeletionDialog({ 
  isOpen, 
  onClose, 
  onDeleted 
}: DataDeletionDialogProps) {
  const { currentUser: user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentStep, setCurrentStep] = useState<'options' | 'confirmation' | 'deleting' | 'completed'>('options')
  const [deletionOptions, setDeletionOptions] = useState<DataDeletionOptions>({
    deleteTastingRecords: false,
    deleteProfile: false,
    deletePreferences: false,
    deleteStatistics: false,
    anonymizeData: false
  })
  const [confirmationText, setConfirmationText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleOptionChange = (key: keyof DataDeletionOptions, value: boolean) => {
    setDeletionOptions(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const canProceed = () => {
    return Object.values(deletionOptions).some(value => value)
  }

  const proceedToConfirmation = () => {
    if (canProceed()) {
      setCurrentStep('confirmation')
      setError(null)
    }
  }

  const handleDeletion = async () => {
    if (!user || confirmationText !== '削除を実行') return

    try {
      setIsDeleting(true)
      setError(null)
      setCurrentStep('deleting')

      await privacyService.deleteUserData(user.uid, deletionOptions)
      
      setCurrentStep('completed')
      
      // 削除完了後にコールバックを呼び出し
      if (onDeleted) {
        setTimeout(() => {
          onDeleted()
        }, 2000)
      }
    } catch (err) {
      console.error('Deletion failed:', err)
      setError('データの削除に失敗しました')
      setCurrentStep('confirmation')
    } finally {
      setIsDeleting(false)
    }
  }

  const resetDialog = () => {
    setCurrentStep('options')
    setDeletionOptions({
      deleteTastingRecords: false,
      deleteProfile: false,
      deletePreferences: false,
      deleteStatistics: false,
      anonymizeData: false
    })
    setConfirmationText('')
    setError(null)
    setIsDeleting(false)
  }

  const handleClose = () => {
    if (currentStep !== 'deleting') {
      resetDialog()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="dialog-overlay" onClick={currentStep !== 'deleting' ? handleClose : undefined}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>データ削除</h2>
          {currentStep !== 'deleting' && (
            <button className="close-button" onClick={handleClose} aria-label="閉じる">
              ×
            </button>
          )}
        </div>

        <div className="dialog-body">
          {currentStep === 'options' && (
            <div className="deletion-options">
              <div className="warning-message">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h3>重要な注意事項</h3>
                  <p>
                    この操作は取り消すことができません。削除されたデータは復旧できません。
                    必要に応じて事前にデータをエクスポートしてください。
                  </p>
                </div>
              </div>

              <div className="options-section">
                <h3>削除するデータを選択</h3>
                <p>削除したいデータの種類を選択してください</p>

                <div className="option-items">
                  <div className="option-item">
                    <label className="option-label">
                      <input
                        type="checkbox"
                        checked={deletionOptions.deleteTastingRecords}
                        onChange={(e) => handleOptionChange('deleteTastingRecords', e.target.checked)}
                      />
                      <div className="option-info">
                        <h4>🍷 テイスティング記録</h4>
                        <p>すべてのワインテイスティング記録と評価データ</p>
                      </div>
                    </label>
                  </div>

                  <div className="option-item">
                    <label className="option-label">
                      <input
                        type="checkbox"
                        checked={deletionOptions.deleteProfile}
                        onChange={(e) => handleOptionChange('deleteProfile', e.target.checked)}
                      />
                      <div className="option-info">
                        <h4>👤 プロフィール情報</h4>
                        <p>ユーザー名、アバター、個人情報など</p>
                      </div>
                    </label>
                  </div>

                  <div className="option-item">
                    <label className="option-label">
                      <input
                        type="checkbox"
                        checked={deletionOptions.deletePreferences}
                        onChange={(e) => handleOptionChange('deletePreferences', e.target.checked)}
                      />
                      <div className="option-info">
                        <h4>⚙️ 設定・環境設定</h4>
                        <p>アプリの設定、通知設定、表示設定など</p>
                      </div>
                    </label>
                  </div>

                  <div className="option-item">
                    <label className="option-label">
                      <input
                        type="checkbox"
                        checked={deletionOptions.deleteStatistics}
                        onChange={(e) => handleOptionChange('deleteStatistics', e.target.checked)}
                      />
                      <div className="option-info">
                        <h4>📊 統計データ</h4>
                        <p>集計された統計情報とキャッシュデータ</p>
                      </div>
                    </label>
                  </div>

                  <div className="anonymize-option">
                    <label className="option-label">
                      <input
                        type="checkbox"
                        checked={deletionOptions.anonymizeData}
                        onChange={(e) => handleOptionChange('anonymizeData', e.target.checked)}
                      />
                      <div className="option-info">
                        <h4>🔒 データの匿名化</h4>
                        <p>
                          完全削除の代わりに、個人を特定できない形でデータを匿名化します。
                          統計分析には貢献しますが、あなたとは紐づけられません。
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {!canProceed() && (
                <div className="no-selection-message">
                  <span className="info-icon">ℹ️</span>
                  <span>削除するデータを少なくとも1つ選択してください</span>
                </div>
              )}
            </div>
          )}

          {currentStep === 'confirmation' && (
            <div className="confirmation-step">
              <div className="danger-warning">
                <div className="danger-icon">🚨</div>
                <div className="danger-content">
                  <h3>最終確認</h3>
                  <p>以下のデータが削除されます。この操作は取り消せません。</p>
                </div>
              </div>

              <div className="deletion-summary">
                <h4>削除対象データ:</h4>
                <ul>
                  {deletionOptions.deleteTastingRecords && <li>テイスティング記録</li>}
                  {deletionOptions.deleteProfile && <li>プロフィール情報</li>}
                  {deletionOptions.deletePreferences && <li>設定・環境設定</li>}
                  {deletionOptions.deleteStatistics && <li>統計データ</li>}
                </ul>
                {deletionOptions.anonymizeData && (
                  <p className="anonymize-note">
                    ※ データは匿名化され、個人を特定できない形で保持されます
                  </p>
                )}
              </div>

              <div className="confirmation-input">
                <label htmlFor="confirmText">
                  削除を実行するには「<strong>削除を実行</strong>」と入力してください:
                </label>
                <input
                  id="confirmText"
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="削除を実行"
                  className="confirm-input"
                />
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {currentStep === 'deleting' && (
            <div className="deleting-state">
              <LoadingSpinner />
              <h3>データを削除中...</h3>
              <p>しばらくお待ちください</p>
            </div>
          )}

          {currentStep === 'completed' && (
            <div className="deletion-completed">
              <div className="success-icon">✅</div>
              <h3>削除完了</h3>
              <p>選択されたデータの削除が完了しました</p>
              
              <div className="completion-notice">
                <div className="notice-icon">ℹ️</div>
                <div className="notice-content">
                  <p>
                    削除されたデータは復旧できません。
                    アプリを再度ご利用になる場合は、新しいアカウントを作成してください。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="dialog-actions">
          {currentStep === 'options' && (
            <>
              <Button onClick={handleClose} variant="secondary">
                キャンセル
              </Button>
              <Button
                onClick={proceedToConfirmation}
                variant="danger"
                disabled={!canProceed()}
              >
                続行
              </Button>
            </>
          )}

          {currentStep === 'confirmation' && (
            <>
              <Button onClick={() => setCurrentStep('options')} variant="secondary">
                戻る
              </Button>
              <Button
                onClick={handleDeletion}
                variant="danger"
                isLoading={isDeleting}
                disabled={isDeleting || confirmationText !== '削除を実行'}
              >
                削除を実行
              </Button>
            </>
          )}

          {currentStep === 'completed' && (
            <Button onClick={handleClose} variant="primary">
              閉じる
            </Button>
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

          .warning-message, .danger-warning {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 2rem;
            border: 1px solid var(--warning);
            background: var(--warning-light);
          }

          .danger-warning {
            border-color: var(--error);
            background: var(--error-light);
          }

          .warning-icon, .danger-icon {
            font-size: 1.5rem;
            flex-shrink: 0;
          }

          .warning-content h3, .danger-content h3 {
            margin: 0 0 0.5rem 0;
            color: var(--warning);
            font-size: 1rem;
          }

          .danger-content h3 {
            color: var(--error);
          }

          .warning-content p, .danger-content p {
            margin: 0;
            color: var(--warning);
            font-size: 0.875rem;
            line-height: 1.5;
          }

          .danger-content p {
            color: var(--error);
          }

          .options-section h3 {
            margin: 0 0 0.5rem 0;
            color: var(--text-primary);
            font-size: 1.125rem;
          }

          .options-section > p {
            margin: 0 0 1.5rem 0;
            color: var(--text-secondary);
            font-size: 0.875rem;
          }

          .option-items {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .option-item, .anonymize-option {
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            transition: all 0.2s;
          }

          .option-item:has(input:checked) {
            border-color: var(--error);
            background: var(--error-light);
          }

          .anonymize-option:has(input:checked) {
            border-color: var(--primary);
            background: var(--primary-light);
          }

          .option-label {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            cursor: pointer;
            align-items: flex-start;
          }

          .option-label input {
            margin-top: 0.25rem;
            flex-shrink: 0;
          }

          .option-info h4 {
            margin: 0 0 0.25rem 0;
            color: var(--text-primary);
            font-size: 0.95rem;
            font-weight: 500;
          }

          .option-info p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 0.875rem;
            line-height: 1.4;
          }

          .no-selection-message {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem;
            background: var(--info-light);
            color: var(--info);
            border-radius: 0.5rem;
            border: 1px solid var(--info);
            font-size: 0.875rem;
            margin-top: 1rem;
          }

          .deletion-summary {
            background: var(--background);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .deletion-summary h4 {
            margin: 0 0 1rem 0;
            color: var(--text-primary);
            font-size: 1rem;
          }

          .deletion-summary ul {
            margin: 0 0 1rem 0;
            padding-left: 1.5rem;
            color: var(--text-secondary);
          }

          .deletion-summary li {
            margin-bottom: 0.5rem;
          }

          .anonymize-note {
            margin: 0;
            color: var(--primary);
            font-size: 0.875rem;
            font-style: italic;
          }

          .confirmation-input {
            margin-bottom: 1rem;
          }

          .confirmation-input label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
            font-size: 0.875rem;
          }

          .confirm-input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            background: var(--background);
            color: var(--text-primary);
            font-size: 0.875rem;
          }

          .confirm-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
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

          .deleting-state {
            text-align: center;
            padding: 2rem 1rem;
          }

          .deleting-state h3 {
            margin: 1rem 0 0.5rem 0;
            color: var(--text-primary);
          }

          .deleting-state p {
            margin: 0;
            color: var(--text-secondary);
          }

          .deletion-completed {
            text-align: center;
          }

          .success-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }

          .deletion-completed h3 {
            margin: 0 0 0.5rem 0;
            color: var(--text-primary);
          }

          .deletion-completed > p {
            margin: 0 0 2rem 0;
            color: var(--text-secondary);
          }

          .completion-notice {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            background: var(--info-light);
            border-radius: 0.5rem;
            border: 1px solid var(--info);
            text-align: left;
          }

          .notice-icon {
            font-size: 1.25rem;
            flex-shrink: 0;
            color: var(--info);
          }

          .notice-content p {
            margin: 0;
            color: var(--info);
            font-size: 0.875rem;
            line-height: 1.5;
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

            .option-label {
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