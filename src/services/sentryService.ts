import * as Sentry from '@sentry/react'
import { createBrowserRouter } from 'react-router-dom'
import { useEffect } from 'react'
import { 
  useLocation, 
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes 
} from 'react-router-dom'

/**
 * Sentryエラートラッキングサービス
 */
class SentryService {
  private isInitialized = false

  /**
   * Sentryの初期化
   */
  initialize(): void {
    if (this.isInitialized) {
      console.warn('Sentry is already initialized')
      return
    }

    try {
      const dsn = import.meta.env.VITE_SENTRY_DSN
      const environment = import.meta.env.VITE_ENVIRONMENT || 'development'
      const release = import.meta.env.VITE_APP_VERSION || '1.0.0'

      if (!dsn) {
        console.warn('Sentry DSN not found. Error tracking will be disabled.')
        return
      }

      Sentry.init({
        dsn,
        environment,
        release: `my-wine-memory@${release}`,
        
        // パフォーマンス監視
        integrations: [
          // ルーティング監視
          Sentry.reactRouterV6BrowserTracingIntegration({
            useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes,
          }),
          
          // リプレイ機能（エラー時のユーザー操作記録）
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
            maskAllInputs: true, // 個人情報保護
          }),
        ],

        // パフォーマンス監視設定
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        
        // セッションリプレイ設定
        replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
        replaysOnErrorSampleRate: 1.0,

        // プロファイリング設定
        profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

        // エラーフィルタリング
        beforeSend(event, hint) {
          return SentryService.filterError(event, hint)
        },

        // ユーザー情報の設定
        initialScope: {
          tags: {
            component: 'my-wine-memory'
          }
        },

        // 開発環境での設定
        debug: environment === 'development',
        
        // 無視するエラー
        ignoreErrors: [
          // ネットワークエラー
          'Network Error',
          'NetworkError',
          'fetch',
          
          // ブラウザ拡張機能
          'top.GLOBALS',
          'originalCreateNotification',
          'canvas.contentDocument',
          'MyApp_RemoveAllHighlights',
          
          // Safari特有のエラー
          'Non-Error promise rejection captured',
          
          // Chrome拡張機能
          'ResizeObserver loop limit exceeded',
          
          // その他の無害なエラー
          'ChunkLoadError',
          'Loading chunk'
        ],

        // URLs to ignore
        denyUrls: [
          // Chrome拡張機能
          /extensions\//i,
          /^chrome:\/\//i,
          /^chrome-extension:\/\//i,
          
          // Firefox拡張機能
          /^moz-extension:\/\//i,
          
          // Safari拡張機能
          /^safari-extension:\/\//i,
        ],
      })

      this.isInitialized = true
      console.log('Sentry initialized successfully')
      
    } catch (error) {
      console.error('Failed to initialize Sentry:', error)
    }
  }

  /**
   * エラーフィルタリング
   */
  private static filterError(event: Sentry.ErrorEvent, hint: Sentry.EventHint): Sentry.ErrorEvent | null {
    const error = hint.originalException

    // Firebase認証エラーは詳細をマスク
    if (error && error.toString().includes('auth/')) {
      event.fingerprint = ['firebase-auth-error']
      if (event.exception?.values?.[0]) {
        event.exception.values[0].value = 'Firebase Authentication Error (masked for privacy)'
      }
    }

    // Stripe関連エラーは詳細をマスク
    if (error && error.toString().includes('stripe')) {
      event.fingerprint = ['stripe-error']
      if (event.exception?.values?.[0]) {
        event.exception.values[0].value = 'Stripe Error (masked for privacy)'
      }
    }

    // 個人情報を含む可能性があるデータをマスク
    if (event.extra) {
      event.extra = SentryService.maskSensitiveData(event.extra)
    }

    return event
  }

  /**
   * 機密データのマスキング
   */
  private static maskSensitiveData(data: any): any {
    const sensitiveKeys = ['password', 'token', 'email', 'phone', 'address', 'creditCard']
    
    if (typeof data === 'object' && data !== null) {
      const masked = { ...data }
      
      for (const key in masked) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          masked[key] = '[MASKED]'
        } else if (typeof masked[key] === 'object') {
          masked[key] = SentryService.maskSensitiveData(masked[key])
        }
      }
      
      return masked
    }
    
    return data
  }

  /**
   * ユーザー情報の設定
   */
  setUser(user: { id: string; email?: string; username?: string }): void {
    if (!this.isInitialized) return

    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    })
  }

  /**
   * ユーザー情報をクリア
   */
  clearUser(): void {
    if (!this.isInitialized) return
    Sentry.setUser(null)
  }

  /**
   * カスタムタグの設定
   */
  setTag(key: string, value: string): void {
    if (!this.isInitialized) return
    Sentry.setTag(key, value)
  }

  /**
   * カスタムコンテキストの設定
   */
  setContext(key: string, context: Record<string, any>): void {
    if (!this.isInitialized) return
    Sentry.setContext(key, context)
  }

  /**
   * エラーの手動報告
   */
  captureError(error: Error, context?: Record<string, any>): void {
    if (!this.isInitialized) return

    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setTag(key, context[key])
        })
      }
      Sentry.captureException(error)
    })
  }

  /**
   * カスタムメッセージの送信
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): void {
    if (!this.isInitialized) return

    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setTag(key, context[key])
        })
      }
      Sentry.captureMessage(message, level)
    })
  }

  /**
   * パフォーマンストランザクション開始
   */
  startTransaction(name: string, description?: string) {
    if (!this.isInitialized) return undefined

    return Sentry.startSpan({
      name,
      op: description || 'custom',
      attributes: {
        component: 'my-wine-memory'
      }
    }, () => {})
  }

  /**
   * ブレッドクラムの追加
   */
  addBreadcrumb(message: string, category: string, level: Sentry.SeverityLevel = 'info', data?: any): void {
    if (!this.isInitialized) return

    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data: data ? SentryService.maskSensitiveData(data) : undefined,
      timestamp: Date.now() / 1000,
    })
  }

  /**
   * 機能使用状況の追跡
   */
  trackFeatureUsage(feature: string, userId?: string, metadata?: Record<string, any>): void {
    if (!this.isInitialized) return

    this.addBreadcrumb(
      `Feature used: ${feature}`,
      'user-action',
      'info',
      {
        feature,
        userId,
        ...metadata
      }
    )
  }

  /**
   * エラー境界でのエラーハンドリング
   */
  static createErrorBoundary() {
    return Sentry.withErrorBoundary
  }

  /**
   * プロファイラーでのパフォーマンス監視
   */
  static createProfiler() {
    return Sentry.withProfiler
  }

  /**
   * ルーターの作成（Sentry統合付き）
   */
  static createSentryRouter(routes: any[]) {
    return createBrowserRouter(routes)
  }
}

export default new SentryService()