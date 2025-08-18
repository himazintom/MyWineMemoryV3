import { useCallback, useEffect } from 'react'
import { useAuth } from './useAuth'
import sentryService from '../services/sentryService'
import * as Sentry from '@sentry/react'

/**
 * エラー報告とユーザー追跡のためのカスタムフック
 */
export function useErrorReporting() {
  const { currentUser: user } = useAuth()

  // ユーザー情報の設定
  useEffect(() => {
    if (user) {
      sentryService.setUser({
        id: user.uid,
        email: user.email || undefined,
        username: user.displayName || undefined
      })
      
      // ユーザーコンテキストの設定
      sentryService.setContext('user_profile', {
        loginMethod: user.providerData[0]?.providerId || 'unknown',
        emailVerified: user.emailVerified,
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      })
    } else {
      sentryService.clearUser()
    }
  }, [user])

  // エラーを手動で報告
  const reportError = useCallback((error: Error, context?: Record<string, any>) => {
    sentryService.captureError(error, {
      ...context,
      userId: user?.uid,
      timestamp: new Date().toISOString()
    })
  }, [user])

  // メッセージを送信
  const reportMessage = useCallback((
    message: string, 
    level: 'info' | 'warning' | 'error' = 'info',
    context?: Record<string, any>
  ) => {
    sentryService.captureMessage(message, level, {
      ...context,
      userId: user?.uid,
      timestamp: new Date().toISOString()
    })
  }, [user])

  // 機能使用状況を追跡
  const trackFeatureUsage = useCallback((feature: string, metadata?: Record<string, any>) => {
    sentryService.trackFeatureUsage(feature, user?.uid, metadata)
  }, [user])

  // ブレッドクラムを追加
  const addBreadcrumb = useCallback((
    message: string,
    category: string,
    level: 'info' | 'warning' | 'error' = 'info',
    data?: any
  ) => {
    sentryService.addBreadcrumb(message, category, level, {
      ...data,
      userId: user?.uid
    })
  }, [user])

  // パフォーマンストランザクション開始
  const startTransaction = useCallback((name: string, description?: string) => {
    return sentryService.startTransaction(name, description)
  }, [])

  // エラー境界用のHOC
  const ErrorBoundary = Sentry.withErrorBoundary

  // プロファイラー用のHOC  
  const Profiler = Sentry.withProfiler

  return {
    reportError,
    reportMessage,
    trackFeatureUsage,
    addBreadcrumb,
    startTransaction,
    ErrorBoundary,
    Profiler
  }
}