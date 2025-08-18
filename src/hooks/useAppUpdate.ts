import { useState, useEffect, useCallback } from 'react'
import updateService from '../services/updateService'
import type { UpdateState } from '../services/updateService'

interface UseAppUpdateReturn extends UpdateState {
  checkForUpdates: () => Promise<boolean>
  downloadUpdate: () => Promise<void>
  applyUpdate: () => Promise<void>
  postponeUpdate: () => Promise<void>
  ignoreUpdate: () => Promise<void>
}

/**
 * アプリ更新管理のカスタムフック
 */
export function useAppUpdate(): UseAppUpdateReturn {
  const [updateState, setUpdateState] = useState<UpdateState>(updateService.getUpdateState())

  // 状態変更の監視
  useEffect(() => {
    const unsubscribe = updateService.onStateChange(setUpdateState)
    return unsubscribe
  }, [])

  // 更新チェック
  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    return await updateService.checkForUpdates(true)
  }, [])

  // 更新ダウンロード
  const downloadUpdate = useCallback(async (): Promise<void> => {
    await updateService.downloadUpdate()
  }, [])

  // 更新適用
  const applyUpdate = useCallback(async (): Promise<void> => {
    await updateService.applyUpdate()
  }, [])

  // 更新延期
  const postponeUpdate = useCallback(async (): Promise<void> => {
    await updateService.postponeUpdate()
  }, [])

  // 更新無視
  const ignoreUpdate = useCallback(async (): Promise<void> => {
    await updateService.ignoreUpdate()
  }, [])

  return {
    ...updateState,
    checkForUpdates,
    downloadUpdate,
    applyUpdate,
    postponeUpdate,
    ignoreUpdate
  }
}