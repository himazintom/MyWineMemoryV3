import { useCallback, useState } from 'react'
import { useError } from '../contexts/ErrorContext'
import { AppError } from '../types/error'
import type { ErrorCode, ErrorSeverity, ErrorCategory } from '../types/error'

interface UseErrorHandlerOptions {
  autoHideDuration?: number
}

/**
 * エラーハンドリング用のカスタムフック
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { handleError: contextHandleError, addError } = useError()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { autoHideDuration } = options

  // 汎用エラーハンドラー
  const handleError = useCallback((error: unknown, context?: Record<string, any>) => {
    let errorMessage = 'エラーが発生しました'
    
    if (error instanceof AppError) {
      errorMessage = error.userMessage || error.technicalMessage || error.message
    } else if (typeof error === 'object' && error !== null && 'userMessage' in error) {
      const appError = error as AppError
      errorMessage = appError.userMessage || appError.technicalMessage || appError.message
    } else if (error instanceof Error) {
      errorMessage = error.message
      
      // ネットワークエラーの特定
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。'
      }
    } else if (typeof error === 'object' && error !== null && 'code' in error) {
      // Firebase エラーの処理
      const firebaseError = error as { code: string; message: string }
      switch (firebaseError.code) {
        case 'permission-denied':
          errorMessage = 'アクセス権限がありません'
          break
        default:
          errorMessage = firebaseError.message
      }
    }
    
    setError(errorMessage)
    contextHandleError(error, context)
    
    // 自動クリア
    if (autoHideDuration) {
      setTimeout(() => {
        setError(null)
      }, autoHideDuration)
    }
    
    return errorMessage
  }, [contextHandleError, autoHideDuration])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 非同期操作実行
  const executeAsync = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true)
    try {
      const result = await operation()
      setError(null)
      return result
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [handleError])

  // リトライ機能
  const retry = useCallback(async <T>(
    operation: () => Promise<T>, 
    maxAttempts: number = 3
  ): Promise<T> => {
    setIsLoading(true)
    let lastError: unknown
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation()
        setError(null)
        return result
      } catch (err) {
        lastError = err
        if (attempt === maxAttempts) {
          handleError(err)
          throw err
        }
        // 少し待ってからリトライ
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
    
    setIsLoading(false)
    throw lastError
  }, [handleError])

  /**
   * Firebase Auth エラーのハンドリング
   */
  const handleAuthError = useCallback((error: unknown, context?: Record<string, any>) => {
    return handleError(error, { ...context, source: 'authentication' })
  }, [handleError])

  /**
   * Firestore エラーのハンドリング
   */
  const handleFirestoreError = useCallback((error: unknown, context?: Record<string, any>) => {
    return handleError(error, { ...context, source: 'firestore' })
  }, [handleError])

  /**
   * Storage エラーのハンドリング
   */
  const handleStorageError = useCallback((error: unknown, context?: Record<string, any>) => {
    return handleError(error, { ...context, source: 'storage' })
  }, [handleError])

  /**
   * ネットワークエラーのハンドリング
   */
  const handleNetworkError = useCallback((error: unknown, context?: Record<string, any>) => {
    const appError = new AppError({
      code: 'app/network-error',
      severity: 'medium',
      category: 'network',
      userMessage: 'ネットワークエラーが発生しました。接続を確認してください。',
      technicalMessage: error instanceof Error ? error.message : String(error),
      originalError: error instanceof Error ? error : undefined,
      context: { ...context, source: 'network' },
      retryable: true
    })
    
    addError(appError)
    return appError
  }, [addError])

  /**
   * バリデーションエラーのハンドリング
   */
  const handleValidationError = useCallback((
    message: string, 
    field?: string, 
    context?: Record<string, any>
  ) => {
    const appError = new AppError({
      code: 'app/validation-error',
      severity: 'low',
      category: 'validation',
      userMessage: message,
      technicalMessage: `Validation failed for field: ${field || 'unknown'}`,
      context: { ...context, field, source: 'validation' },
      retryable: false,
      shouldReport: false
    })
    
    addError(appError)
    return appError
  }, [addError])

  /**
   * 権限エラーのハンドリング
   */
  const handlePermissionError = useCallback((
    action: string,
    resource?: string,
    context?: Record<string, any>
  ) => {
    const appError = new AppError({
      code: 'app/insufficient-permissions',
      severity: 'medium',
      category: 'permission',
      userMessage: 'この操作を実行する権限がありません',
      technicalMessage: `Permission denied for action: ${action} on resource: ${resource || 'unknown'}`,
      context: { ...context, action, resource, source: 'permission' },
      retryable: false
    })
    
    addError(appError)
    return appError
  }, [addError])

  /**
   * データ不存在エラーのハンドリング
   */
  const handleNotFoundError = useCallback((
    resource: string,
    id?: string,
    context?: Record<string, any>
  ) => {
    const appError = new AppError({
      code: 'app/data-not-found',
      severity: 'low',
      category: 'user',
      userMessage: `${resource}が見つかりません`,
      technicalMessage: `Resource not found: ${resource}${id ? ` with id: ${id}` : ''}`,
      context: { ...context, resource, id, source: 'not-found' },
      retryable: false,
      shouldReport: false
    })
    
    addError(appError)
    return appError
  }, [addError])

  /**
   * カスタムエラーの作成と追加
   */
  const createError = useCallback((options: {
    code: ErrorCode
    severity: ErrorSeverity
    category: ErrorCategory
    userMessage: string
    technicalMessage?: string
    context?: Record<string, any>
    retryable?: boolean
    shouldReport?: boolean
  }) => {
    const appError = new AppError(options)
    addError(appError)
    return appError
  }, [addError])

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeAsync,
    retry,
    handleAuthError,
    handleFirestoreError,
    handleStorageError,
    handleNetworkError,
    handleValidationError,
    handlePermissionError,
    handleNotFoundError,
    createError
  }
}