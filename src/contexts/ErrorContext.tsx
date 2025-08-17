import { createContext, useContext, useReducer, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { AppError, ErrorStats, RetryConfig } from '../types/error'
import { DEFAULT_RETRY_CONFIG } from '../types/error'
import errorHandler from '../services/errorHandler'

/**
 * エラーコンテキストの状態
 */
interface ErrorState {
  errors: AppError[]
  stats: ErrorStats
  isLoading: boolean
  retryConfig: RetryConfig
}

/**
 * エラーアクション
 */
type ErrorAction =
  | { type: 'ADD_ERROR'; payload: AppError }
  | { type: 'CLEAR_ERROR'; payload: string } // エラーID
  | { type: 'CLEAR_ALL_ERRORS' }
  | { type: 'UPDATE_STATS'; payload: Partial<ErrorStats> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_RETRY_CONFIG'; payload: Partial<RetryConfig> }

/**
 * エラーコンテキストの値
 */
interface ErrorContextValue {
  state: ErrorState
  addError: (error: AppError) => void
  clearError: (errorId: string) => void
  clearAllErrors: () => void
  updateStats: (stats: Partial<ErrorStats>) => void
  setLoading: (loading: boolean) => void
  updateRetryConfig: (config: Partial<RetryConfig>) => void
  retryOperation: <T>(operation: () => Promise<T>, config?: Partial<RetryConfig>) => Promise<T>
  handleError: (error: unknown, context?: Record<string, any>) => AppError
}

/**
 * 初期状態
 */
const initialState: ErrorState = {
  errors: [],
  stats: {
    totalErrors: 0,
    errorsByCategory: {
      authentication: 0,
      database: 0,
      storage: 0,
      network: 0,
      validation: 0,
      permission: 0,
      system: 0,
      user: 0
    },
    errorsBySeverity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    errorsByCode: {} as Record<string, number>
  },
  isLoading: false,
  retryConfig: DEFAULT_RETRY_CONFIG
}

/**
 * エラーリデューサー
 */
function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'ADD_ERROR': {
      const error = action.payload
      const newErrors = [...state.errors, error]
      
      // 統計を更新
      const newStats: ErrorStats = {
        ...state.stats,
        totalErrors: state.stats.totalErrors + 1,
        errorsByCategory: {
          ...state.stats.errorsByCategory,
          [error.category]: state.stats.errorsByCategory[error.category] + 1
        },
        errorsBySeverity: {
          ...state.stats.errorsBySeverity,
          [error.severity]: state.stats.errorsBySeverity[error.severity] + 1
        },
        errorsByCode: {
          ...state.stats.errorsByCode,
          [error.code]: (state.stats.errorsByCode[error.code] || 0) + 1
        },
        lastError: error,
        lastErrorTime: error.timestamp
      }

      return {
        ...state,
        errors: newErrors,
        stats: newStats
      }
    }

    case 'CLEAR_ERROR': {
      const errorId = action.payload
      const newErrors = state.errors.filter(error => 
        error.timestamp.getTime().toString() !== errorId
      )
      
      return {
        ...state,
        errors: newErrors
      }
    }

    case 'CLEAR_ALL_ERRORS':
      return {
        ...state,
        errors: []
      }

    case 'UPDATE_STATS':
      return {
        ...state,
        stats: {
          ...state.stats,
          ...action.payload
        }
      }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }

    case 'UPDATE_RETRY_CONFIG':
      return {
        ...state,
        retryConfig: {
          ...state.retryConfig,
          ...action.payload
        }
      }

    default:
      return state
  }
}

/**
 * エラーコンテキスト
 */
const ErrorContext = createContext<ErrorContextValue | undefined>(undefined)

/**
 * エラープロバイダーのプロパティ
 */
interface ErrorProviderProps {
  children: ReactNode
}

/**
 * エラープロバイダー
 */
export function ErrorProvider({ children }: ErrorProviderProps) {
  const [state, dispatch] = useReducer(errorReducer, initialState)

  /**
   * エラーを追加
   */
  const addError = useCallback((error: AppError) => {
    dispatch({ type: 'ADD_ERROR', payload: error })
    
    // エラーをコンソールに出力
    console.error('AppError:', error.toJSON())
    
    // 重要なエラーの場合は外部レポーティングサービスに送信
    if (error.shouldReport) {
      // TODO: Sentry等の外部サービス連携
      console.warn('Error should be reported to external service:', error.code)
    }
  }, [])

  /**
   * エラーをクリア
   */
  const clearError = useCallback((errorId: string) => {
    dispatch({ type: 'CLEAR_ERROR', payload: errorId })
  }, [])

  /**
   * すべてのエラーをクリア
   */
  const clearAllErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' })
  }, [])

  /**
   * 統計を更新
   */
  const updateStats = useCallback((stats: Partial<ErrorStats>) => {
    dispatch({ type: 'UPDATE_STATS', payload: stats })
  }, [])

  /**
   * ローディング状態を設定
   */
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }, [])

  /**
   * リトライ設定を更新
   */
  const updateRetryConfig = useCallback((config: Partial<RetryConfig>) => {
    dispatch({ type: 'UPDATE_RETRY_CONFIG', payload: config })
  }, [])

  /**
   * 指数バックオフによるリトライ機能
   */
  const retryOperation = useCallback((
    operation: () => Promise<any>,
    config: Partial<RetryConfig> = {}
  ): Promise<any> => {
    return errorHandler.retryOperation(operation, { ...state.retryConfig, ...config })
  }, [state.retryConfig])

  /**
   * 汎用エラーハンドリング
   */
  const handleError = useCallback((error: unknown, context?: Record<string, any>): AppError => {
    const appError = errorHandler.handleError(error, context)
    addError(appError)
    return appError
  }, [addError])

  const value: ErrorContextValue = {
    state,
    addError,
    clearError,
    clearAllErrors,
    updateStats,
    setLoading,
    updateRetryConfig,
    retryOperation,
    handleError
  }

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  )
}

/**
 * エラーコンテキストを使用するカスタムフック
 */
export function useError() {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

