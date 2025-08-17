import React, { useState, useRef, useCallback } from 'react'
import { imageService, type ImageUploadOptions, type ImageUploadResult } from '../services/imageService'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './common/LoadingSpinner'
import ErrorMessage from './common/ErrorMessage'

interface ImageUploadProps {
  recordId?: string
  maxImages?: number
  onUploadComplete?: (results: ImageUploadResult[]) => void
  onUploadError?: (error: string) => void
  disabled?: boolean
  allowDrawing?: boolean
  className?: string
}

interface PreviewImage {
  file: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'completed' | 'error'
  result?: ImageUploadResult
  error?: string
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  recordId,
  maxImages = 4,
  onUploadComplete,
  onUploadError,
  disabled = false,
  allowDrawing = true,
  className = ''
}) => {
  const { currentUser, userProfile } = useAuth()
  const [previews, setPreviews] = useState<PreviewImage[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // プレミアムユーザーの場合は最大画像数を増やす
  const actualMaxImages = userProfile?.subscription?.plan === 'premium' ? maxImages : 1

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || !currentUser) return

    const fileArray = Array.from(files)
    const remainingSlots = actualMaxImages - previews.length

    if (fileArray.length > remainingSlots) {
      onUploadError?.(
        userProfile?.subscription?.plan === 'premium' 
          ? `最大${actualMaxImages}枚まで選択できます`
          : `無料プランでは1枚まで選択できます。プレミアムプランにアップグレードすると${maxImages}枚まで選択できます。`
      )
      return
    }

    const newPreviews: PreviewImage[] = []

    fileArray.forEach(file => {
      const validation = imageService.validateImageFile(file)
      if (!validation.isValid) {
        onUploadError?.(validation.error || '無効なファイルです')
        return
      }

      const previewUrl = imageService.createPreviewUrl(file)
      newPreviews.push({
        file,
        previewUrl,
        status: 'pending'
      })
    })

    setPreviews(prev => [...prev, ...newPreviews])
  }, [previews.length, actualMaxImages, currentUser, userProfile, onUploadError, maxImages])

  const handleUpload = useCallback(async () => {
    if (!currentUser || !recordId) return

    const pendingPreviews = previews.filter(p => p.status === 'pending')
    if (pendingPreviews.length === 0) return

    setIsUploading(true)

    try {
      // 全ての保留中の画像を並列でアップロード
      const uploadPromises = pendingPreviews.map(async (preview) => {
        // 状態を更新（アップロード中）
        setPreviews(prev => prev.map(p => 
          p.previewUrl === preview.previewUrl 
            ? { ...p, status: 'uploading' }
            : p
        ))

        try {
          const options: ImageUploadOptions = {
            quality: 0.8,
            maxWidth: 1920,
            maxHeight: 1080,
            format: 'webp'
          }

          const result = await imageService.uploadTastingImage(
            preview.file,
            currentUser.uid,
            recordId,
            options
          )

          // 状態を更新（完了）
          setPreviews(prev => prev.map(p => 
            p.previewUrl === preview.previewUrl 
              ? { ...p, status: 'completed', result }
              : p
          ))

          return result
        } catch (error) {
          // 状態を更新（エラー）
          const errorMessage = error instanceof Error ? error.message : 'アップロードに失敗しました'
          setPreviews(prev => prev.map(p => 
            p.previewUrl === preview.previewUrl 
              ? { ...p, status: 'error', error: errorMessage }
              : p
          ))
          throw error
        }
      })

      const results = await Promise.allSettled(uploadPromises)
      
      // 成功した結果のみを取得
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<ImageUploadResult> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value)

      if (successfulResults.length > 0) {
        onUploadComplete?.(successfulResults)
      }

      // エラーがあった場合は最初のエラーを表示
      const firstError = results.find(result => result.status === 'rejected')
      if (firstError && firstError.status === 'rejected') {
        onUploadError?.(firstError.reason?.message || 'アップロードに失敗しました')
      }

    } catch (error) {
      console.error('Upload failed:', error)
      onUploadError?.(error instanceof Error ? error.message : 'アップロードに失敗しました')
    } finally {
      setIsUploading(false)
    }
  }, [currentUser, recordId, previews, onUploadComplete, onUploadError])

  const handleRemovePreview = useCallback((previewUrl: string) => {
    setPreviews(prev => {
      const updated = prev.filter(p => p.previewUrl !== previewUrl)
      // プレビューURLをクリーンアップ
      imageService.revokePreviewUrl(previewUrl)
      return updated
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }, [handleFileSelect])

  const handleSelectClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // コンポーネントのクリーンアップ時にプレビューURLを削除
  React.useEffect(() => {
    return () => {
      previews.forEach(preview => {
        imageService.revokePreviewUrl(preview.previewUrl)
      })
    }
  }, [])

  const canUpload = previews.some(p => p.status === 'pending') && !isUploading && !disabled

  return (
    <div className={`image-upload ${className}`}>
      {/* ファイル選択エリア */}
      <div
        className={`upload-area ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelectClick}
      >
        <div className="upload-content">
          <div className="upload-icon">📷</div>
          <p className="upload-text">
            画像をドラッグ&ドロップまたはクリックして選択
          </p>
          <p className="upload-limit">
            {userProfile?.subscription?.plan === 'premium' 
              ? `最大${actualMaxImages}枚まで（WebP、JPEG、PNG、GIF対応）`
              : '無料プランは1枚まで（プレミアムで最大4枚）'
            }
          </p>
        </div>
      </div>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={actualMaxImages > 1}
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* プレビューエリア */}
      {previews.length > 0 && (
        <div className="preview-area">
          <h4>選択された画像</h4>
          <div className="preview-grid">
            {previews.map((preview, index) => (
              <div key={preview.previewUrl} className={`preview-item ${preview.status}`}>
                <div className="preview-image">
                  <img src={preview.previewUrl} alt={`プレビュー ${index + 1}`} />
                  
                  {/* ステータスオーバーレイ */}
                  {preview.status === 'uploading' && (
                    <div className="preview-overlay">
                      <LoadingSpinner size="small" />
                      <span>アップロード中...</span>
                    </div>
                  )}
                  
                  {preview.status === 'completed' && (
                    <div className="preview-overlay success">
                      <span>✓ 完了</span>
                    </div>
                  )}
                  
                  {preview.status === 'error' && (
                    <div className="preview-overlay error">
                      <span>⚠ エラー</span>
                    </div>
                  )}
                </div>
                
                {/* ファイル情報 */}
                <div className="preview-info">
                  <p className="file-name">{preview.file.name}</p>
                  <p className="file-size">
                    {imageService.formatFileSize(preview.file.size)}
                  </p>
                  {preview.error && (
                    <ErrorMessage message={preview.error} />
                  )}
                </div>
                
                {/* 削除ボタン */}
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => handleRemovePreview(preview.previewUrl)}
                  disabled={preview.status === 'uploading'}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アップロードボタン */}
      {canUpload && (
        <div className="upload-actions">
          <button
            type="button"
            className="upload-button"
            onClick={handleUpload}
            disabled={!canUpload}
          >
            {isUploading ? (
              <>
                <LoadingSpinner size="small" />
                アップロード中...
              </>
            ) : (
              '画像をアップロード'
            )}
          </button>
        </div>
      )}

      {/* 手描きキャンバスボタン（オプション） */}
      {allowDrawing && !disabled && (
        <div className="drawing-section">
          <button
            type="button"
            className="drawing-button"
            onClick={() => {
              // 手描きキャンバスモーダルを開く処理
              // 実装は別のコンポーネントで行う
            }}
          >
            ✏️ 手描きで追加
          </button>
        </div>
      )}
    </div>
  )
}