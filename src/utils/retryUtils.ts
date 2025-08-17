import { AppError, type RetryConfig, DEFAULT_RETRY_CONFIG } from '../types/error'

/**
 * 指数バックオフによるリトライ機能のユーティリティ
 */

/**
 * 遅延を生成（指数バックオフ + ジッター）
 */
function calculateDelay(
  attempt: number, 
  config: RetryConfig
): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.exponentialBase, attempt)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay)
  
  if (config.jitter) {
    // 遅延の10%のランダムジッターを追加
    const jitterAmount = cappedDelay * 0.1
    const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount
    return Math.max(0, cappedDelay + randomJitter)
  }
  
  return cappedDelay
}

/**
 * 非同期関数をリトライ機能付きで実行
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: Record<string, any>
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
        console.warn(`Operation not retryable: ${error.code}`)
        break
      }
      
      // 遅延を計算して待機
      const delay = calculateDelay(attempt, retryConfig)
      
      console.warn(
        `Operation failed, retrying in ${Math.round(delay)}ms ` +
        `(attempt ${attempt + 1}/${retryConfig.maxRetries})`,
        { 
          error: lastError.message, 
          context,
          attempt: attempt + 1,
          maxRetries: retryConfig.maxRetries
        }
      )
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // 最終的にエラーを投げる
  throw lastError
}

/**
 * Firebase操作専用のリトライヘルパー
 */
export async function withFirebaseRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, any>
): Promise<T> {
  return withRetry(
    operation,
    {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponentialBase: 2,
      jitter: true
    },
    { ...context, operation: operationName, service: 'firebase' }
  )
}

/**
 * ネットワーク操作専用のリトライヘルパー
 */
export async function withNetworkRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, any>
): Promise<T> {
  return withRetry(
    operation,
    {
      maxRetries: 5,
      baseDelay: 500,
      maxDelay: 30000,
      exponentialBase: 1.5,
      jitter: true
    },
    { ...context, operation: operationName, service: 'network' }
  )
}

/**
 * リトライ可能なエラーかどうかを判定
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.retryable
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Firebase関連のリトライ可能エラー
    const retryableFirebaseErrors = [
      'unavailable',
      'deadline-exceeded',
      'aborted',
      'resource-exhausted',
      'internal',
      'network-request-failed'
    ]
    
    return retryableFirebaseErrors.some(errorType => message.includes(errorType))
  }
  
  return false
}

/**
 * エラーの重要度を判定
 */
export function getErrorSeverity(error: unknown): 'low' | 'medium' | 'high' | 'critical' {
  if (error instanceof AppError) {
    return error.severity
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // 重要度の高いエラー
    if (message.includes('permission-denied') || message.includes('unauthorized')) {
      return 'high'
    }
    
    // 中程度のエラー
    if (message.includes('not-found') || message.includes('already-exists')) {
      return 'medium'
    }
    
    // 軽度のエラー
    return 'low'
  }
  
  return 'medium'
}

/**
 * Promiseのタイムアウト機能
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AppError({
        code: 'firestore/deadline-exceeded',
        severity: 'medium',
        category: 'system',
        userMessage: '処理時間が上限を超えました',
        technicalMessage: timeoutMessage,
        retryable: true
      }))
    }, timeoutMs)
  })
  
  return Promise.race([promise, timeoutPromise])
}

/**
 * 複数の非同期操作を並列実行（一部失敗を許容）
 */
export async function withPartialRetry<T>(
  operations: (() => Promise<T>)[],
  config?: Partial<RetryConfig>
): Promise<{ successes: T[]; failures: Error[] }> {
  const results = await Promise.allSettled(
    operations.map(op => withRetry(op, config))
  )
  
  const successes: T[] = []
  const failures: Error[] = []
  
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      successes.push(result.value)
    } else {
      failures.push(result.reason)
    }
  })
  
  return { successes, failures }
}

/**
 * サーキットブレーカーパターンの簡易実装
 */
export class CircuitBreaker<T> {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private readonly operation: () => Promise<T>,
    private readonly config: {
      failureThreshold: number
      recoveryTimeMs: number
      successThreshold: number
    } = {
      failureThreshold: 5,
      recoveryTimeMs: 60000, // 1分
      successThreshold: 2
    }
  ) {}
  
  async execute(): Promise<T> {
    const now = Date.now()
    
    // オープン状態：復旧時間が経過していればハーフオープンに移行
    if (this.state === 'open') {
      if (now - this.lastFailureTime >= this.config.recoveryTimeMs) {
        this.state = 'half-open'
        this.failures = 0
      } else {
        throw new AppError({
          code: 'app/service-unavailable',
          severity: 'medium',
          category: 'system',
          userMessage: 'サービスが一時的に利用できません',
          technicalMessage: 'Circuit breaker is open',
          retryable: false
        })
      }
    }
    
    try {
      const result = await this.operation()
      
      // 成功時の処理
      if (this.state === 'half-open') {
        this.failures = 0
        if (this.failures === 0) {
          this.state = 'closed'
        }
      }
      
      return result
    } catch (error) {
      // 失敗時の処理
      this.failures++
      this.lastFailureTime = now
      
      if (this.failures >= this.config.failureThreshold) {
        this.state = 'open'
      }
      
      throw error
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
  
  reset() {
    this.state = 'closed'
    this.failures = 0
    this.lastFailureTime = 0
  }
}