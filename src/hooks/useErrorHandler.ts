import { useCallback } from 'react'
import { useError } from '../contexts/ErrorContext'
import { AppError } from '../types/error'
import type { ErrorCode, ErrorSeverity, ErrorCategory } from '../types/error'

/**
 * エラーハンドリング用のカスタムフック
 */
export function useErrorHandler() {
  const { handleError, retryOperation, addError } = useError()

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

  /**
   * 非同期操作のラッパー（エラーハンドリング付き）
   */
  const withErrorHandling = useCallback(<T>(
    operation: () => Promise<T>,
    options?: {
      context?: Record<string, any>
      retry?: boolean
      errorMessage?: string
    }
  ) => {
    const wrappedOperation = async (): Promise<T> => {
      try {
        return await operation()
      } catch (error) {
        const appError = handleError(error, options?.context)
        
        // カスタムエラーメッセージがある場合は上書き
        if (options?.errorMessage) {
          const customError = new AppError({
            ...appError,
            userMessage: options.errorMessage
          })
          addError(customError)
          throw customError
        }
        
        throw appError
      }
    }

    // リトライが有効な場合
    if (options?.retry) {
      return retryOperation(wrappedOperation)
    }

    return wrappedOperation()
  }, [handleError, retryOperation, addError])

  /**
   * リトライ付き非同期操作
   */
  const withRetry = useCallback(<T>(
    operation: () => Promise<T>,
    options?: {
      maxRetries?: number
      baseDelay?: number
      context?: Record<string, any>
    }
  ) => {
    const retryConfig = options ? {
      maxRetries: options.maxRetries,
      baseDelay: options.baseDelay
    } : undefined

    return retryOperation(async () => {
      try {
        return await operation()
      } catch (error) {
        handleError(error, options?.context)
        throw error
      }
    }, retryConfig)
  }, [retryOperation, handleError])

  return {
    // 基本エラーハンドリング
    handleError,
    handleAuthError,
    handleFirestoreError,
    handleStorageError,
    handleNetworkError,
    handleValidationError,
    handlePermissionError,
    handleNotFoundError,
    createError,
    
    // 非同期操作ヘルパー
    withErrorHandling,
    withRetry,
    retryOperation
  }
}

/**
 * 特定のサービス用エラーハンドラー
 */
export function useServiceErrorHandler(serviceName: string) {
  const errorHandler = useErrorHandler()

  const createServiceError = useCallback((
    code: ErrorCode,
    severity: ErrorSeverity,
    userMessage: string,
    technicalMessage?: string,
    context?: Record<string, any>
  ) => {
    return errorHandler.createError({
      code,
      severity,
      category: 'system',
      userMessage,
      technicalMessage,
      context: {
        ...context,
        service: serviceName
      }
    })
  }, [errorHandler, serviceName])

  const wrapServiceCall = useCallback(<T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: {
      retry?: boolean
      userMessage?: string
    }
  ) => {
    return errorHandler.withErrorHandling(operation, {
      context: {
        service: serviceName,
        operation: operationName
      },
      retry: options?.retry,
      errorMessage: options?.userMessage
    })
  }, [errorHandler, serviceName])

  return {
    ...errorHandler,
    createServiceError,
    wrapServiceCall
  }
}