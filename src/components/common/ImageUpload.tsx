import { useState, useRef, useCallback } from 'react'
import Button from './Button'
import LoadingSpinner from './LoadingSpinner'
import ErrorMessage from './ErrorMessage'
import { useAuth } from '../../contexts/AuthContext'
import { useError } from '../../contexts/ErrorContext'
import imageUploadService from '../../services/imageUploadService'

/**
 * 画像アップロード結果
 */
export interface ImageUploadResult {
  url: string
  path: string
  size: number
  format: string
  width: number
  height: number
}

/**
 * 画像アップロードコンポーネントのプロパティ
 */
interface ImageUploadProps {
  /** アップロードカテゴリ */
  category: 'wine' | 'tasting' | 'drawing' | 'profile'
  /** 複数ファイル対応 */
  multiple?: boolean
  /** 最大ファイル数 */
  maxFiles?: number
  /** 追加パス */
  additionalPath?: string
  /** アップロード完了時のコールバック */
  onUpload?: (results: ImageUploadResult[]) => void
  /** アップロード中の状態変更コールバック */
  onUploadStateChange?: (isUploading: boolean) => void
  /** 既存の画像URL（プレビュー表示用） */
  existingImages?: string[]
  /** カスタムスタイル */
  className?: string
  /** 無効化 */
  disabled?: boolean
  /** ドラッグ&ドロップ対応 */
  enableDragDrop?: boolean
}

export default function ImageUpload({
  category,
  multiple = false,
  maxFiles = 4,
  additionalPath,
  onUpload,
  onUploadStateChange,
  existingImages = [],
  className = '',
  disabled = false,
  enableDragDrop = true
}: ImageUploadProps) {
  const { userProfile } = useAuth()
  const { handleError } = useError()
  
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>(existingImages)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  /**
   * ファイル選択ハンドラー
   */
  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    if (!userProfile) {
      setError('ログインが必要です')
      return
    }

    const fileArray = Array.from(files)
    
    // ファイル数制限チェック
    if (multiple) {
      const totalFiles = existingImages.length + fileArray.length
      if (totalFiles > maxFiles) {
        setError(`最大${maxFiles}枚までアップロードできます`)
        return
      }
    } else if (fileArray.length > 1) {
      setError('一度に1枚のみアップロードできます')
      return
    }

    try {
      setIsUploading(true)
      setError(null)
      setUploadProgress(0)
      onUploadStateChange?.(true)

      // プレビュー作成
      const newPreviewUrls = fileArray.map(file => URL.createObjectURL(file))
      setPreviewUrls(prev => [...prev, ...newPreviewUrls])

      let results: ImageUploadResult[]

      if (multiple && fileArray.length > 1) {
        // 複数アップロード
        results = await imageUploadService.uploadMultipleImages(
          fileArray,
          category,
          userProfile.uid,
          additionalPath
        )
      } else {
        // 単一アップロード
        const result = await imageUploadService.uploadImage(
          fileArray[0],
          category,
          userProfile.uid,
          additionalPath
        )
        results = [result]
      }

      setUploadProgress(100)
      onUpload?.(results)

      // プレビューURLを実際のURLに更新
      const realUrls = results.map(r => r.url)
      setPreviewUrls(prev => {
        const filtered = prev.filter(url => !url.startsWith('blob:'))
        return [...filtered, ...realUrls]
      })

      // Blob URLをクリーンアップ
      newPreviewUrls.forEach(url => URL.revokeObjectURL(url))

    } catch (err) {
      const appError = handleError(err, { 
        category, 
        fileCount: fileArray.length,
        operation: 'imageUpload' 
      })
      setError(appError.userMessage)
      
      // プレビューを元に戻す
      setPreviewUrls(existingImages)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      onUploadStateChange?.(false)
      
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [userProfile, category, additionalPath, maxFiles, multiple, existingImages, onUpload, onUploadStateChange, handleError])

  /**
   * ファイル入力変更ハンドラー
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect])

  /**
   * ドラッグ&ドロップハンドラー
   */
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)

    if (disabled || !enableDragDrop) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect, disabled, enableDragDrop])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled && enableDragDrop) {
      setIsDragOver(true)
    }
  }, [disabled, enableDragDrop])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    // ドロップゾーンを完全に離れた場合のみ状態をリセット
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  /**
   * ファイル選択ボタンクリック
   */
  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  /**
   * 画像削除
   */
  const handleImageRemove = useCallback((index: number) => {
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }, [])

  /**
   * アップロード可能なファイル数を計算
   */
  const remainingSlots = multiple ? maxFiles - previewUrls.length : (previewUrls.length > 0 ? 0 : 1)

  return (
    <div className={`image-upload ${className}`}>
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)}
        />
      )}

      {/* プレビュー画像 */}
      {previewUrls.length > 0 && (
        <div className="image-preview-grid">
          {previewUrls.map((url, index) => (
            <div key={index} className="image-preview-item">
              <img 
                src={url} 
                alt={`Preview ${index + 1}`}
                className="preview-image"
                loading="lazy"
              />
              <button
                type="button"
                className="remove-image-button"
                onClick={() => handleImageRemove(index)}
                disabled={isUploading}
                aria-label={`画像 ${index + 1} を削除`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ドロップゾーン */}
      {remainingSlots > 0 && (
        <div
          ref={dropZoneRef}
          className={`upload-dropzone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isUploading ? (
            <div className="upload-progress">
              <LoadingSpinner size="large" />
              <p>アップロード中...</p>
              {uploadProgress > 0 && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="upload-content">
              <div className="upload-icon">📷</div>
              <p className="upload-text">
                {enableDragDrop ? 'ここに画像をドラッグ&ドロップするか、' : ''}
                <button
                  type="button"
                  className="upload-link"
                  onClick={handleButtonClick}
                  disabled={disabled}
                >
                  ファイルを選択
                </button>
              </p>
              <p className="upload-hint">
                {multiple 
                  ? `JPEG、PNG、WebP形式（最大${maxFiles}枚、各2MB以下）`
                  : 'JPEG、PNG、WebP形式（2MB以下）'
                }
              </p>
              {remainingSlots < maxFiles && (
                <p className="remaining-slots">
                  あと{remainingSlots}枚追加できます
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ファイル入力（非表示） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        style={{ display: 'none' }}
      />

      {/* 追加アップロードボタン（複数対応時） */}
      {multiple && previewUrls.length > 0 && remainingSlots > 0 && !isUploading && (
        <Button
          variant="secondary"
          onClick={handleButtonClick}
          disabled={disabled}
          className="add-more-button"
        >
          画像を追加 ({remainingSlots}枚まで)
        </Button>
      )}
    </div>
  )
}