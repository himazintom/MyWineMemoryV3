import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { analyticsService } from '../services/analyticsService'
import { useLocation } from 'react-router-dom'

// アナリティクス自動追跡フック
export const useAnalytics = () => {
  const { currentUser } = useAuth()
  const location = useLocation()
  const sessionStartedRef = useRef(false)
  const lastPageRef = useRef<string>('')

  // セッション開始
  useEffect(() => {
    if (currentUser && !sessionStartedRef.current) {
      analyticsService.startSession(currentUser.uid)
      sessionStartedRef.current = true

      // ページ離脱時にセッション終了
      const handleBeforeUnload = () => {
        analyticsService.endSession(currentUser.uid)
      }

      window.addEventListener('beforeunload', handleBeforeUnload)
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
        if (currentUser) {
          analyticsService.endSession(currentUser.uid)
        }
      }
    }
  }, [currentUser])

  // ページビュー追跡
  useEffect(() => {
    if (currentUser && location.pathname !== lastPageRef.current) {
      const pageName = getPageName(location.pathname)
      analyticsService.trackPageView(currentUser.uid, pageName)
      lastPageRef.current = location.pathname
    }
  }, [currentUser, location.pathname])

  const getPageName = (pathname: string): string => {
    const routes: Record<string, string> = {
      '/': 'ホーム',
      '/wines': 'ワイン一覧',
      '/add-wine': 'ワイン追加',
      '/records': 'テイスティング記録',
      '/add-record': 'テイスティング記録追加',
      '/quiz': 'クイズ選択',
      '/quiz-game': 'クイズゲーム',
      '/stats': '統計',
      '/profile': 'プロフィール',
      '/settings': '設定',
      '/analytics': '分析ダッシュボード',
      '/login': 'ログイン',
      '/register': '新規登録'
    }

    // 動的ルートの処理
    if (pathname.startsWith('/wine/')) return 'ワイン詳細'
    if (pathname.startsWith('/record/')) return 'テイスティング記録詳細'
    if (pathname.startsWith('/quiz/')) return 'クイズ詳細'

    return routes[pathname] || pathname
  }

  const trackFeature = (featureName: string, metadata?: Record<string, any>) => {
    if (currentUser) {
      analyticsService.trackFeatureUsage(currentUser.uid, featureName, metadata)
    }
  }

  const trackActivity = (action: 'record_created' | 'record_updated' | 'quiz_completed', target?: string, metadata?: Record<string, any>) => {
    if (currentUser) {
      analyticsService.trackActivity(currentUser.uid, action, target, metadata)
    }
  }

  return {
    trackFeature,
    trackActivity
  }
}

// 特定機能用のフック
export const useFeatureAnalytics = (featureName: string) => {
  const { trackFeature } = useAnalytics()

  const trackFeatureClick = (action: string, metadata?: Record<string, any>) => {
    trackFeature(`${featureName}_${action}`, {
      feature: featureName,
      action,
      ...metadata
    })
  }

  const trackFeatureView = (metadata?: Record<string, any>) => {
    trackFeature(`${featureName}_view`, {
      feature: featureName,
      action: 'view',
      ...metadata
    })
  }

  const trackFeatureInteraction = (interaction: string, metadata?: Record<string, any>) => {
    trackFeature(`${featureName}_${interaction}`, {
      feature: featureName,
      interaction,
      ...metadata
    })
  }

  return {
    trackFeatureClick,
    trackFeatureView,
    trackFeatureInteraction
  }
}