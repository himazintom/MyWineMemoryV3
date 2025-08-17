import { AppError, type RetryConfig, DEFAULT_RETRY_CONFIG } from '../types/error'

/**
 * エラーハンドリングとリトライ機能を提供するサービス
 */
class ErrorHandlerService {
  private static instance: ErrorHandlerService

  private constructor() {}

  public static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService()
    }
    return ErrorHandlerService.instance
  }

  /**
   * 指数バックオフによるリトライ機能
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // 最後の試行の場合はエラーを投げる
        if (attempt === retryConfig.maxRetries) {
          break
        }

        // AppErrorでリトライ不可の場合は即座に終了
        if (error instanceof AppError && !error.retryable) {
          break
        }

        // 遅延計算（指数バックオフ + ジッター）
        const exponentialDelay = retryConfig.baseDelay * Math.pow(retryConfig.exponentialBase, attempt)
        const delay = Math.min(exponentialDelay, retryConfig.maxDelay)
        const finalDelay = retryConfig.jitter 
          ? delay + Math.random() * delay * 0.1 // 10%のジッター
          : delay

        console.warn(`Operation failed, retrying in ${finalDelay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, finalDelay))
      }
    }

    throw lastError
  }

  /**
   * 汎用エラーハンドリング
   */
  handleError(error: unknown, context?: Record<string, any>): AppError {
    let appError: AppError

    if (error instanceof AppError) {
      appError = error
    } else if (error instanceof Error) {
      // Firebase エラーの分類
      if (error.message.includes('auth/')) {
        const code = error.message.match(/auth\/[\w-]+/)?.[0] as any
        appError = new AppError({
          code: code || 'auth/network-request-failed',
          severity: 'medium',
          category: 'authentication',
          userMessage: this.getFirebaseAuthErrorMessage(code),
          technicalMessage: error.message,
          originalError: error,
          context
        })
      } else if (error.message.includes('firestore/') || error.message.includes('FirebaseError')) {
        const code = error.message.match(/firestore\/[\w-]+/)?.[0] as any
        appError = new AppError({
          code: code || 'firestore/internal',
          severity: 'medium',
          category: 'database',
          userMessage: this.getFirestoreErrorMessage(code),
          technicalMessage: error.message,
          originalError: error,
          context
        })
      } else if (error.message.includes('storage/')) {
        const code = error.message.match(/storage\/[\w-]+/)?.[0] as any
        appError = new AppError({
          code: code || 'storage/unknown',
          severity: 'medium',
          category: 'storage',
          userMessage: this.getStorageErrorMessage(code),
          technicalMessage: error.message,
          originalError: error,
          context
        })
      } else {
        appError = new AppError({
          code: 'app/unknown-error',
          severity: 'medium',
          category: 'system',
          userMessage: '予期しないエラーが発生しました',
          technicalMessage: error.message,
          originalError: error,
          context
        })
      }
    } else {
      appError = new AppError({
        code: 'app/unknown-error',
        severity: 'low',
        category: 'system',
        userMessage: '予期しないエラーが発生しました',
        technicalMessage: String(error),
        context
      })
    }

    return appError
  }

  /**
   * Firebase Authentication エラーメッセージ変換
   */
  private getFirebaseAuthErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      'auth/user-not-found': 'ユーザーが見つかりません',
      'auth/wrong-password': 'パスワードが正しくありません',
      'auth/email-already-in-use': 'このメールアドレスは既に使用されています',
      'auth/weak-password': 'パスワードが弱すぎます',
      'auth/invalid-email': 'メールアドレスの形式が正しくありません',
      'auth/too-many-requests': 'リクエストが多すぎます。しばらく時間をおいてお試しください',
      'auth/network-request-failed': 'ネットワークエラーが発生しました',
      'auth/popup-closed-by-user': 'ログインがキャンセルされました',
      'auth/cancelled-popup-request': 'ログインがキャンセルされました'
    }
    return messages[code] || 'ログインエラーが発生しました'
  }

  /**
   * Firestore エラーメッセージ変換
   */
  private getFirestoreErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      'firestore/permission-denied': 'アクセス権限がありません',
      'firestore/not-found': 'データが見つかりません',
      'firestore/already-exists': 'データが既に存在します',
      'firestore/resource-exhausted': 'リソースが不足しています',
      'firestore/failed-precondition': '操作の前提条件が満たされていません',
      'firestore/aborted': '操作が中断されました',
      'firestore/out-of-range': '範囲外の値が指定されました',
      'firestore/unimplemented': 'この機能は実装されていません',
      'firestore/internal': '内部エラーが発生しました',
      'firestore/unavailable': 'サービスが利用できません',
      'firestore/data-loss': 'データの損失が発生しました',
      'firestore/unauthenticated': '認証が必要です',
      'firestore/deadline-exceeded': '処理時間が上限を超えました',
      'firestore/invalid-argument': '無効な引数が指定されました'
    }
    return messages[code] || 'データベースエラーが発生しました'
  }

  /**
   * Storage エラーメッセージ変換
   */
  private getStorageErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      'storage/unknown': 'ストレージで不明なエラーが発生しました',
      'storage/object-not-found': 'ファイルが見つかりません',
      'storage/bucket-not-found': 'バケットが見つかりません',
      'storage/project-not-found': 'プロジェクトが見つかりません',
      'storage/quota-exceeded': 'ストレージ容量を超過しました',
      'storage/unauthenticated': '認証が必要です',
      'storage/unauthorized': 'アクセス権限がありません',
      'storage/retry-limit-exceeded': 'リトライ回数の上限に達しました',
      'storage/invalid-checksum': 'ファイルの整合性チェックに失敗しました',
      'storage/canceled': 'アップロードがキャンセルされました',
      'storage/invalid-event-name': '無効なイベント名です',
      'storage/invalid-url': '無効なURLです',
      'storage/invalid-argument': '無効な引数が指定されました',
      'storage/no-default-bucket': 'デフォルトバケットが設定されていません',
      'storage/cannot-slice-blob': 'ファイルの分割に失敗しました',
      'storage/server-file-wrong-size': 'サーバー上のファイルサイズが異なります'
    }
    return messages[code] || 'ファイルストレージエラーが発生しました'
  }
}

// シングルトンインスタンスをエクスポート
export const errorHandler = ErrorHandlerService.getInstance()
export default errorHandler