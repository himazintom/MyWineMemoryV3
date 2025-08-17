import firebaseService from './firebase'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

export interface ImageUploadOptions {
  quality?: number // 0.1-1.0, WebP圧縮品質
  maxWidth?: number // 最大幅（px）
  maxHeight?: number // 最大高さ（px）
  format?: 'webp' | 'jpeg' | 'png' // 出力形式
}

export interface ImageUploadResult {
  url: string
  path: string
  size: number
  format: string
}

export class ImageService {
  private static instance: ImageService
  
  static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService()
    }
    return ImageService.instance
  }

  /**
   * 画像をWebP形式に変換し、圧縮・リサイズを行う
   */
  async convertToWebP(
    file: File, 
    options: ImageUploadOptions = {}
  ): Promise<Blob> {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'webp'
    } = options

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          // アスペクト比を保持しながらリサイズ
          const { width, height } = this.calculateDimensions(
            img.width, 
            img.height, 
            maxWidth, 
            maxHeight
          )

          canvas.width = width
          canvas.height = height

          if (!ctx) {
            throw new Error('Canvas context not available')
          }

          // 背景を白に設定（透明度のある画像対応）
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)

          // 画像を描画
          ctx.drawImage(img, 0, 0, width, height)

          // WebP/JPEG/PNGとして出力
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to convert image'))
              }
            },
            `image/${format}`,
            quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      // ファイルをData URLとして読み込み
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string
        }
      }
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      reader.readAsDataURL(file)
    })
  }

  /**
   * アスペクト比を保持しながら最適なサイズを計算
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = originalWidth
    let height = originalHeight

    // 最大幅を超える場合
    if (width > maxWidth) {
      height = (height * maxWidth) / width
      width = maxWidth
    }

    // 最大高さを超える場合
    if (height > maxHeight) {
      width = (width * maxHeight) / height
      height = maxHeight
    }

    return { width: Math.round(width), height: Math.round(height) }
  }

  /**
   * ファイルサイズをバイト単位で取得
   */
  getFileSize(file: File | Blob): number {
    return file.size
  }

  /**
   * ファイルサイズを人間が読める形式で表示
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Firebase Storageに画像をアップロード
   */
  async uploadToStorage(
    blob: Blob,
    path: string,
    metadata?: { [key: string]: string }
  ): Promise<ImageUploadResult> {
    try {
      const storage = firebaseService.getStorage()
      const storageRef = ref(storage, path)
      
      // メタデータを設定
      const uploadMetadata = {
        contentType: blob.type,
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      }

      // アップロード実行
      const snapshot = await uploadBytes(storageRef, blob, uploadMetadata)
      
      // ダウンロードURLを取得
      const url = await getDownloadURL(snapshot.ref)

      return {
        url,
        path,
        size: blob.size,
        format: blob.type
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      throw new Error('画像のアップロードに失敗しました')
    }
  }

  /**
   * テイスティング記録用画像のアップロード
   */
  async uploadTastingImage(
    file: File,
    userId: string,
    recordId: string,
    options?: ImageUploadOptions
  ): Promise<ImageUploadResult> {
    // 画像を変換・最適化
    const convertedBlob = await this.convertToWebP(file, options)
    
    // ファイル名を生成（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = options?.format || 'webp'
    const fileName = `${timestamp}_${randomString}.${extension}`
    
    // Storage パスを生成
    const path = `tastingRecords/${userId}/${recordId}/${fileName}`
    
    // メタデータを設定
    const metadata = {
      recordId,
      originalName: file.name,
      originalSize: file.size.toString(),
      convertedSize: convertedBlob.size.toString()
    }

    return this.uploadToStorage(convertedBlob, path, metadata)
  }

  /**
   * 手描きキャンバス画像のアップロード
   */
  async uploadDrawingImage(
    canvas: HTMLCanvasElement,
    userId: string,
    recordId: string,
    options?: ImageUploadOptions
  ): Promise<ImageUploadResult> {
    return new Promise(async (resolve, reject) => {
      const quality = options?.quality || 0.9
      
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert canvas to blob'))
            return
          }

          try {
            // ファイル名を生成
            const timestamp = Date.now()
            const fileName = `drawing_${timestamp}.png`
            
            // Storage パスを生成
            const path = `drawings/${userId}/${recordId}/${fileName}`
            
            // メタデータを設定
            const metadata = {
              recordId,
              type: 'hand_drawing',
              canvasSize: `${canvas.width}x${canvas.height}`
            }

            const result = await this.uploadToStorage(blob, path, metadata)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        },
        'image/png',
        quality
      )
    })
  }

  /**
   * プロフィール画像のアップロード
   */
  async uploadProfileImage(
    file: File,
    userId: string,
    options?: ImageUploadOptions
  ): Promise<ImageUploadResult> {
    // プロフィール画像は正方形にクロップ
    const profileOptions = {
      ...options,
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.85
    }
    
    const convertedBlob = await this.convertToWebP(file, profileOptions)
    
    // ファイル名を生成
    const timestamp = Date.now()
    const fileName = `profile_${timestamp}.webp`
    
    // Storage パスを生成
    const path = `users/${userId}/profile/${fileName}`
    
    // メタデータを設定
    const metadata = {
      type: 'profile_image',
      originalName: file.name
    }

    return this.uploadToStorage(convertedBlob, path, metadata)
  }

  /**
   * 画像の削除
   */
  async deleteImage(path: string): Promise<void> {
    try {
      const storage = firebaseService.getStorage()
      const storageRef = ref(storage, path)
      await deleteObject(storageRef)
    } catch (error) {
      console.error('Failed to delete image:', error)
      throw new Error('画像の削除に失敗しました')
    }
  }

  /**
   * 複数画像の一括削除
   */
  async deleteMultipleImages(paths: string[]): Promise<void> {
    const deletePromises = paths.map(path => this.deleteImage(path))
    await Promise.all(deletePromises)
  }

  /**
   * ファイル形式の検証
   */
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    // サポートされている形式
    const supportedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif'
    ]

    if (!supportedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'サポートされていない画像形式です。JPEG、PNG、WebP、GIFファイルをご利用ください。'
      }
    }

    // ファイルサイズ制限（20MB）
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `ファイルサイズが大きすぎます。${this.formatFileSize(maxSize)}以下のファイルをご利用ください。`
      }
    }

    return { isValid: true }
  }

  /**
   * 画像のプレビューURL生成
   */
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file)
  }

  /**
   * プレビューURLのクリーンアップ
   */
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url)
  }
}

// シングルトンインスタンスをエクスポート
export const imageService = ImageService.getInstance()