import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import statisticsService from '../services/statisticsService'
import type { StatisticsData } from '../services/statisticsService'

interface UseStatisticsOptions {
  autoRefresh?: boolean
  refreshInterval?: number // ミリ秒
  forceRefresh?: boolean
}

interface UseStatisticsReturn {
  statistics: StatisticsData | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  clearCache: () => void
  lastUpdated: Date | null
}

/**
 * 統計データ管理のカスタムフック
 */
export function useStatistics(options: UseStatisticsOptions = {}): UseStatisticsReturn {
  const {
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5分
    forceRefresh = false
  } = options

  const { userProfile } = useAuth()
  const [statistics, setStatistics] = useState<StatisticsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  /**
   * 統計データの取得
   */
  const fetchStatistics = useCallback(async (force = false) => {
    if (!userProfile) {
      setStatistics(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const stats = await statisticsService.getUserStatistics(userProfile.uid, force)
      setStatistics(stats)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch statistics:', err)
      setError(err instanceof Error ? err.message : '統計データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [userProfile])

  /**
   * 手動リフレッシュ
   */
  const refresh = useCallback(async () => {
    await fetchStatistics(true)
  }, [fetchStatistics])

  /**
   * キャッシュクリア
   */
  const clearCache = useCallback(() => {
    if (userProfile) {
      statisticsService.clearCache(userProfile.uid)
    }
  }, [userProfile])

  /**
   * 初回読み込み
   */
  useEffect(() => {
    fetchStatistics(forceRefresh)
  }, [fetchStatistics, forceRefresh])

  /**
   * 自動リフレッシュ
   */
  useEffect(() => {
    if (!autoRefresh || !userProfile) return

    const interval = setInterval(() => {
      // キャッシュの有効期限をチェック
      if (statistics && statistics.cacheExpiry && new Date() > statistics.cacheExpiry) {
        fetchStatistics(false)
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, userProfile, statistics, fetchStatistics])

  return {
    statistics,
    isLoading,
    error,
    refresh,
    clearCache,
    lastUpdated
  }
}

/**
 * 年間サマリー取得フック
 */
export function useYearSummary(year: number) {
  const { userProfile } = useAuth()
  const [summary, setSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    if (!userProfile) return

    setIsLoading(true)
    setError(null)

    try {
      const yearSummary = await statisticsService.generateYearSummary(userProfile.uid, year)
      setSummary(yearSummary)
    } catch (err) {
      console.error('Failed to fetch year summary:', err)
      setError(err instanceof Error ? err.message : '年間サマリーの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [userProfile, year])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return {
    summary,
    isLoading,
    error,
    refresh: fetchSummary
  }
}

/**
 * リアルタイム統計更新フック
 */
export function useRealTimeStatistics() {
  const { userProfile } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)

  const updateStatistics = useCallback(async () => {
    if (!userProfile || isUpdating) return

    setIsUpdating(true)
    try {
      // キャッシュをクリアして最新データを取得
      statisticsService.clearCache(userProfile.uid)
      await statisticsService.getUserStatistics(userProfile.uid, true)
    } catch (error) {
      console.error('Failed to update statistics:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [userProfile, isUpdating])

  return {
    updateStatistics,
    isUpdating
  }
}

/**
 * 統計比較フック（期間比較）
 */
export function useStatisticsComparison(
  currentPeriod: { start: Date; end: Date },
  comparisonPeriod: { start: Date; end: Date }
) {
  const { userProfile } = useAuth()
  const [comparison, setComparison] = useState<{
    current: Partial<StatisticsData>
    previous: Partial<StatisticsData>
    changes: Record<string, number>
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchComparison = async () => {
      if (!userProfile) return

      setIsLoading(true)
      try {
        // 期間比較の実装は複雑なため、基本実装のみ
        // 実際の実装では期間フィルタリングが必要
        const stats = await statisticsService.getUserStatistics(userProfile.uid)
        
        // 模擬的な比較データ
        setComparison({
          current: stats,
          previous: stats,
          changes: {}
        })
      } catch (error) {
        console.error('Failed to fetch comparison:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchComparison()
  }, [userProfile, currentPeriod, comparisonPeriod])

  return {
    comparison,
    isLoading
  }
}