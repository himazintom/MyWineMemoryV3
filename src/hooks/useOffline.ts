import { useState, useEffect, useCallback } from 'react'
import offlineService from '../services/offlineService'
import type { TastingRecord } from '../types'

interface OfflineState {
  isOnline: boolean
  hasOfflineData: boolean
  isSyncing: boolean
  lastSyncTime: number | null
  conflictRecords: TastingRecord[]
  syncResult: {
    success: number
    failed: number
    conflicts: number
  } | null
}

interface UseOfflineReturn extends OfflineState {
  sync: () => Promise<void>
  saveOffline: (record: TastingRecord) => Promise<void>
  updateOffline: (record: TastingRecord) => Promise<void>
  deleteOffline: (recordId: string) => Promise<void>
  getOfflineRecords: (userId: string) => Promise<TastingRecord[]>
  resolveConflict: (recordId: string, useLocal: boolean) => Promise<void>
  refreshOfflineState: () => Promise<void>
}

/**
 * オフライン機能のカスタムフック
 */
export function useOffline(): UseOfflineReturn {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    hasOfflineData: false,
    isSyncing: false,
    lastSyncTime: null,
    conflictRecords: [],
    syncResult: null
  })

  /**
   * オフライン状態の更新
   */
  const refreshOfflineState = useCallback(async () => {
    try {
      const hasOfflineData = await offlineService.hasOfflineData()
      const settings = await offlineService.getAppSettings()
      const conflictRecords = await offlineService.getConflictRecords()

      setState(prev => ({
        ...prev,
        isOnline: offlineService.getOnlineStatus(),
        hasOfflineData,
        lastSyncTime: settings?.lastSyncTime || null,
        conflictRecords
      }))
    } catch (error) {
      console.error('Failed to refresh offline state:', error)
    }
  }, [])

  /**
   * 同期実行
   */
  const sync = useCallback(async () => {
    if (state.isSyncing || !state.isOnline) return

    setState(prev => ({ ...prev, isSyncing: true }))

    try {
      const result = await offlineService.syncOfflineData()
      setState(prev => ({
        ...prev,
        syncResult: result,
        isSyncing: false
      }))

      // 状態を再取得
      await refreshOfflineState()
    } catch (error) {
      console.error('Sync failed:', error)
      setState(prev => ({ ...prev, isSyncing: false }))
    }
  }, [state.isSyncing, state.isOnline, refreshOfflineState])

  /**
   * オフラインでの保存
   */
  const saveOffline = useCallback(async (record: TastingRecord) => {
    try {
      await offlineService.saveTastingRecordOffline(record)
      await refreshOfflineState()
    } catch (error) {
      console.error('Failed to save offline:', error)
      throw error
    }
  }, [refreshOfflineState])

  /**
   * オフラインでの更新
   */
  const updateOffline = useCallback(async (record: TastingRecord) => {
    try {
      await offlineService.updateTastingRecordOffline(record)
      await refreshOfflineState()
    } catch (error) {
      console.error('Failed to update offline:', error)
      throw error
    }
  }, [refreshOfflineState])

  /**
   * オフラインでの削除
   */
  const deleteOffline = useCallback(async (recordId: string) => {
    try {
      await offlineService.deleteTastingRecordOffline(recordId)
      await refreshOfflineState()
    } catch (error) {
      console.error('Failed to delete offline:', error)
      throw error
    }
  }, [refreshOfflineState])

  /**
   * オフライン記録の取得
   */
  const getOfflineRecords = useCallback(async (userId: string): Promise<TastingRecord[]> => {
    try {
      return await offlineService.getOfflineTastingRecords(userId)
    } catch (error) {
      console.error('Failed to get offline records:', error)
      return []
    }
  }, [])

  /**
   * 競合の解決
   */
  const resolveConflict = useCallback(async (recordId: string, useLocal: boolean) => {
    try {
      if (useLocal) {
        await offlineService.resolveConflictLocal(recordId)
      } else {
        await offlineService.resolveConflictServer(recordId)
      }
      await refreshOfflineState()
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      throw error
    }
  }, [refreshOfflineState])

  /**
   * オンライン状態の監視
   */
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }))
      refreshOfflineState()
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refreshOfflineState])

  /**
   * 初期化
   */
  useEffect(() => {
    const init = async () => {
      try {
        await offlineService.initialize()
        await refreshOfflineState()
      } catch (error) {
        console.error('Failed to initialize offline service:', error)
      }
    }

    init()
  }, [refreshOfflineState])

  /**
   * 自動同期（オンライン復帰時）
   */
  useEffect(() => {
    if (state.isOnline && state.hasOfflineData && !state.isSyncing) {
      // 3秒後に自動同期開始
      const timer = setTimeout(() => {
        sync()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [state.isOnline, state.hasOfflineData, state.isSyncing, sync])

  return {
    ...state,
    sync,
    saveOffline,
    updateOffline,
    deleteOffline,
    getOfflineRecords,
    resolveConflict,
    refreshOfflineState
  }
}

/**
 * シンプルなオンライン状態フック
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}