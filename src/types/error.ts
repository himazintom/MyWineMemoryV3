/**
 * エラーハンドリング関連の型定義
 */

export type ErrorCode = 
  // Firebase Authentication エラー
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/email-already-in-use'
  | 'auth/weak-password'
  | 'auth/invalid-email'
  | 'auth/too-many-requests'
  | 'auth/network-request-failed'
  | 'auth/popup-closed-by-user'
  | 'auth/cancelled-popup-request'
  
  // Firestore エラー
  | 'firestore/permission-denied'
  | 'firestore/not-found'
  | 'firestore/already-exists'
  | 'firestore/resource-exhausted'
  | 'firestore/failed-precondition'
  | 'firestore/aborted'
  | 'firestore/out-of-range'
  | 'firestore/unimplemented'
  | 'firestore/internal'
  | 'firestore/unavailable'
  | 'firestore/data-loss'
  | 'firestore/unauthenticated'
  | 'firestore/deadline-exceeded'
  | 'firestore/invalid-argument'

  // Storage エラー
  | 'storage/unknown'
  | 'storage/object-not-found'
  | 'storage/bucket-not-found'
  | 'storage/project-not-found'
  | 'storage/quota-exceeded'
  | 'storage/unauthenticated'
  | 'storage/unauthorized'
  | 'storage/retry-limit-exceeded'
  | 'storage/invalid-checksum'
  | 'storage/canceled'
  | 'storage/invalid-event-name'
  | 'storage/invalid-url'
  | 'storage/invalid-argument'
  | 'storage/no-default-bucket'
  | 'storage/cannot-slice-blob'
  | 'storage/server-file-wrong-size'

  // アプリケーション固有エラー
  | 'app/network-error'
  | 'app/unknown-error'
  | 'app/validation-error'
  | 'app/service-unavailable'
  | 'app/rate-limit-exceeded'
  | 'app/insufficient-permissions'
  | 'app/data-not-found'
  | 'app/operation-failed'
  | 'app/invalid-configuration'
  | 'app/feature-disabled'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ErrorCategory = 
  | 'authentication'
  | 'database'
  | 'storage'
  | 'network'
  | 'validation'
  | 'permission'
  | 'system'
  | 'user'

/**
 * 包括的なアプリケーションエラークラス
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly severity: ErrorSeverity
  public readonly category: ErrorCategory
  public readonly userMessage: string
  public readonly technicalMessage: string
  public readonly timestamp: Date
  public readonly userId?: string
  public readonly context?: Record<string, any>
  public readonly originalError?: Error
  public readonly retryable: boolean
  public readonly shouldReport: boolean

  constructor(options: {
    code: ErrorCode
    severity: ErrorSeverity
    category: ErrorCategory
    userMessage: string
    technicalMessage?: string
    userId?: string
    context?: Record<string, any>
    originalError?: Error
    retryable?: boolean
    shouldReport?: boolean
  }) {
    super(options.technicalMessage || options.userMessage)
    
    this.name = 'AppError'
    this.code = options.code
    this.severity = options.severity
    this.category = options.category
    this.userMessage = options.userMessage
    this.technicalMessage = options.technicalMessage || options.userMessage
    this.timestamp = new Date()
    this.userId = options.userId
    this.context = options.context
    this.originalError = options.originalError
    this.retryable = options.retryable ?? this.isRetryableByDefault()
    this.shouldReport = options.shouldReport ?? this.shouldReportByDefault()

    // スタックトレースを維持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  /**
   * デフォルトでリトライ可能かどうかを判定
   */
  private isRetryableByDefault(): boolean {
    const retryableCodes: ErrorCode[] = [
      'auth/network-request-failed',
      'firestore/unavailable',
      'firestore/deadline-exceeded',
      'firestore/aborted',
      'storage/retry-limit-exceeded',
      'app/network-error',
      'app/service-unavailable'
    ]
    return retryableCodes.includes(this.code)
  }

  /**
   * デフォルトでレポート対象かどうかを判定
   */
  private shouldReportByDefault(): boolean {
    const noReportCodes: ErrorCode[] = [
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      'firestore/not-found',
      'storage/object-not-found',
      'app/validation-error',
      'app/data-not-found'
    ]
    return !noReportCodes.includes(this.code) && this.severity !== 'low'
  }

  /**
   * エラーを JSON 形式でシリアライズ
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
      category: this.category,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      timestamp: this.timestamp.toISOString(),
      userId: this.userId,
      context: this.context,
      retryable: this.retryable,
      shouldReport: this.shouldReport,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    }
  }

  /**
   * エラーの短縮表示
   */
  toString(): string {
    return `${this.name} [${this.code}]: ${this.userMessage}`
  }
}

/**
 * エラー統計情報
 */
export interface ErrorStats {
  totalErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  errorsByCode: Record<ErrorCode, number>
  lastError?: AppError
  lastErrorTime?: Date
}

/**
 * リトライ設定
 */
export interface RetryConfig {
  maxRetries: number
  baseDelay: number // ミリ秒
  maxDelay: number // ミリ秒
  exponentialBase: number // 指数バックオフの基数
  jitter: boolean // ランダムジッターを追加するか
}

/**
 * デフォルトリトライ設定
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBase: 2,
  jitter: true
}