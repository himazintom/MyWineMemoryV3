import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import firebaseService from './firebase'
import { AppError } from '../types/error'
import { withFirebaseRetry } from '../utils/retryUtils'

/**
 * 画像アップロード設定
 */
interface ImageUploadConfig {
  maxWidth: number
  maxHeight: number
  quality: number
  format: 'webp' | 'jpeg' | 'png'
  maxSizeBytes: number
}

/**
 * 画像アップロード結果
 */
interface ImageUploadResult {
  url: string
  path: string
  size: number
  format: string
  width: number
  height: number
}

/**
 * 画像処理とアップロード管理サービス
 */
class ImageUploadService {
  private static instance: ImageUploadService

  // 設定プリセット
  private readonly configs = {
    wine: {
      maxWidth: 800,
      maxHeight: 600,
      quality: 0.8,
      format: 'webp' as const,
      maxSizeBytes: 2 * 1024 * 1024 // 2MB
    },
    tasting: {
      maxWidth: 1200,
      maxHeight: 900,
      quality: 0.85,
      format: 'webp' as const,
      maxSizeBytes: 3 * 1024 * 1024 // 3MB
    },
    drawing: {
      maxWidth: 1000,
      maxHeight: 800,
      quality: 0.9,
      format: 'png' as const,
      maxSizeBytes: 5 * 1024 * 1024 // 5MB
    },
    profile: {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.8,
      format: 'webp' as const,
      maxSizeBytes: 1 * 1024 * 1024 // 1MB
    }
  }

  private constructor() {}

  public static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService()
    }
    return ImageUploadService.instance
  }

  /**
   * 画像ファイルのバリデーション
   */
  private validateImageFile(file: File, config: ImageUploadConfig): void {
    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      throw new AppError({
        code: 'app/validation-error',
        severity: 'low',
        category: 'validation',
        userMessage: 'JPEG、PNG、WebP形式の画像ファイルのみアップロード可能です',
        technicalMessage: `Invalid file type: ${file.type}`,
        context: { fileType: file.type, allowedTypes }
      })
    }

    // ファイルサイズチェック
    if (file.size > config.maxSizeBytes) {
      throw new AppError({
        code: 'app/validation-error',
        severity: 'low',
        category: 'validation',
        userMessage: `ファイルサイズが上限（${Math.round(config.maxSizeBytes / 1024 / 1024)}MB）を超えています`,
        technicalMessage: `File size ${file.size} exceeds limit ${config.maxSizeBytes}`,
        context: { fileSize: file.size, maxSize: config.maxSizeBytes }
      })
    }
  }

  /**
   * 画像のリサイズと圧縮
   */
  private async processImage(
    file: File, 
    config: ImageUploadConfig
  ): Promise<{ blob: Blob; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new AppError({
          code: 'app/operation-failed',
          severity: 'medium',
          category: 'system',
          userMessage: '画像処理に失敗しました',
          technicalMessage: 'Canvas context not available'
        }))
        return
      }

      img.onload = () => {
        try {
          // アスペクト比を保持してリサイズ
          const { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            config.maxWidth,
            config.maxHeight
          )

          canvas.width = width
          canvas.height = height

          // 高品質でリサイズ
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)

          // WebP/JPEG対応チェック
          const format = this.getSupportedFormat(config.format)
          const mimeType = format === 'webp' ? 'image/webp' : 
                          format === 'png' ? 'image/png' : 'image/jpeg'

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, width, height })
              } else {
                reject(new AppError({
                  code: 'app/operation-failed',
                  severity: 'medium',
                  category: 'system',
                  userMessage: '画像の圧縮に失敗しました',
                  technicalMessage: 'Failed to create blob from canvas'
                }))
              }
            },
            mimeType,
            config.quality
          )
        } catch (error) {
          reject(new AppError({
            code: 'app/operation-failed',
            severity: 'medium',
            category: 'system',
            userMessage: '画像処理中にエラーが発生しました',
            technicalMessage: error instanceof Error ? error.message : String(error),
            originalError: error instanceof Error ? error : undefined
          }))
        }
      }

      img.onerror = () => {
        reject(new AppError({
          code: 'app/validation-error',
          severity: 'low',
          category: 'validation',
          userMessage: '画像ファイルが読み込めません',
          technicalMessage: 'Failed to load image'
        }))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * 適切な画像サイズを計算
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight

    let width = originalWidth
    let height = originalHeight

    // 最大幅を超える場合
    if (width > maxWidth) {
      width = maxWidth
      height = width / aspectRatio
    }

    // 最大高さを超える場合
    if (height > maxHeight) {
      height = maxHeight
      width = height * aspectRatio
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    }
  }

  /**
   * ブラウザでサポートされている形式を取得
   */
  private getSupportedFormat(preferredFormat: string): string {
    const canvas = document.createElement('canvas')
    
    // WebP対応チェック
    if (preferredFormat === 'webp') {
      const webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp')
      if (webpSupported) return 'webp'
      return 'jpeg' // フォールバック
    }

    return preferredFormat
  }

  /**
   * Firebase Storageにアップロード
   */
  private async uploadToStorage(
    blob: Blob,
    path: string,
    metadata?: Record<string, string>
  ): Promise<{ url: string; size: number }> {
    const storage = firebaseService.getStorage()
    const storageRef = ref(storage, path)

    const uploadMetadata = {
      contentType: blob.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    }

    const snapshot = await uploadBytes(storageRef, blob, uploadMetadata)
    const url = await getDownloadURL(snapshot.ref)

    return {
      url,
      size: snapshot.metadata.size || blob.size
    }
  }

  /**
   * 画像アップロード（メイン関数）
   */
  async uploadImage(
    file: File,
    category: keyof typeof this.configs,
    userId: string,
    additionalPath?: string
  ): Promise<ImageUploadResult> {
    try {
      const config = this.configs[category]
      
      // バリデーション
      this.validateImageFile(file, config)

      // 画像処理
      const { blob, width, height } = await this.processImage(file, config)

      // アップロードパス生成
      const timestamp = Date.now()
      const extension = this.getExtensionFromFormat(config.format)
      const filename = `${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`
      const path = additionalPath 
        ? `${category}/${userId}/${additionalPath}/${filename}`
        : `${category}/${userId}/${filename}`

      // Firebase Storageにアップロード（リトライ付き）
      const { url, size } = await withFirebaseRetry(
        () => this.uploadToStorage(blob, path, {
          originalName: file.name,
          category,
          userId,
          width: width.toString(),
          height: height.toString()
        }),
        'uploadImage'
      )

      return {
        url,
        path,
        size,
        format: config.format,
        width,
        height
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      throw new AppError({
        code: 'storage/unknown',
        severity: 'high',
        category: 'storage',
        userMessage: '画像のアップロードに失敗しました',
        technicalMessage: error instanceof Error ? error.message : String(error),
        originalError: error instanceof Error ? error : undefined,
        context: { category, userId, fileName: file.name },
        retryable: true
      })
    }
  }

  /**
   * 複数画像の一括アップロード
   */
  async uploadMultipleImages(
    files: File[],
    category: keyof typeof this.configs,
    userId: string,
    additionalPath?: string
  ): Promise<ImageUploadResult[]> {
    // 無料プランの制限チェック（例: ワイン画像は最大4枚）
    if (category === 'wine' && files.length > 4) {
      throw new AppError({
        code: 'app/rate-limit-exceeded',
        severity: 'medium',
        category: 'user',
        userMessage: 'ワイン画像は最大4枚までアップロードできます',
        technicalMessage: `Too many files: ${files.length}, max: 4`,
        context: { fileCount: files.length, maxFiles: 4 }
      })
    }

    const results: ImageUploadResult[] = []
    const errors: Error[] = []

    // 並列アップロード（最大3つ同時）
    const batchSize = 3
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      
      const batchResults = await Promise.allSettled(
        batch.map(file => this.uploadImage(file, category, userId, additionalPath))
      )

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          errors.push(result.reason)
          console.error(`Failed to upload file ${i + index}:`, result.reason)
        }
      })
    }

    // 一部失敗した場合の処理
    if (errors.length > 0 && results.length === 0) {
      throw new AppError({
        code: 'storage/unknown',
        severity: 'high',
        category: 'storage',
        userMessage: 'すべての画像のアップロードに失敗しました',
        technicalMessage: `All uploads failed: ${errors.length} errors`,
        context: { totalFiles: files.length, errorCount: errors.length }
      })
    } else if (errors.length > 0) {
      console.warn(`Partial upload failure: ${errors.length}/${files.length} failed`)
    }

    return results
  }

  /**
   * 画像の削除
   */
  async deleteImage(path: string): Promise<void> {
    try {
      const storage = firebaseService.getStorage()
      const storageRef = ref(storage, path)
      
      await withFirebaseRetry(
        () => deleteObject(storageRef),
        'deleteImage'
      )
    } catch (error) {
      // ファイルが存在しない場合はエラーにしない
      if (error instanceof Error && error.message.includes('object-not-found')) {
        console.warn(`Image not found for deletion: ${path}`)
        return
      }

      throw new AppError({
        code: 'storage/unknown',
        severity: 'medium',
        category: 'storage',
        userMessage: '画像の削除に失敗しました',
        technicalMessage: error instanceof Error ? error.message : String(error),
        originalError: error instanceof Error ? error : undefined,
        context: { path },
        retryable: true
      })
    }
  }

  /**
   * フォーマットから拡張子を取得
   */
  private getExtensionFromFormat(format: string): string {
    switch (format) {
      case 'webp': return 'webp'
      case 'png': return 'png'
      case 'jpeg': return 'jpg'
      default: return 'jpg'
    }
  }

  /**
   * 画像URLのプリロード
   */
  async preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to preload image'))
      img.src = url
    })
  }

  /**
   * 画像の有効性チェック
   */
  async validateImageUrl(url: string): Promise<boolean> {
    try {
      await this.preloadImage(url)
      return true
    } catch {
      return false
    }
  }
}

// シングルトンインスタンスをエクスポート
export const imageUploadService = ImageUploadService.getInstance()
export default imageUploadService