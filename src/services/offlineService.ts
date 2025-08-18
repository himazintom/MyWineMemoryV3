import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { TastingRecord, User } from '../types'

// IndexedDB のスキーマ定義
interface OfflineDB extends DBSchema {
  tastingRecords: {
    key: string
    value: TastingRecord & { 
      isOffline: boolean
      lastModified: number
      conflictData?: TastingRecord
    }
    indexes: { 
      'userId': string
      'isOffline': boolean
      'lastModified': number
    }
  }
  userProfile: {
    key: string
    value: User & { 
      isOffline: boolean
      lastModified: number
    }
  }
  syncQueue: {
    key: number
    value: {
      type: 'CREATE' | 'UPDATE' | 'DELETE'
      collection: string
      documentId: string
      data: any
      timestamp: number
      retryCount: number
    }
    indexes: {
      'timestamp': number
      'collection': string
    }
  }
  appSettings: {
    key: string
    value: {
      lastSyncTime: number
      isOnline: boolean
      autoSync: boolean
    }
  }
}

class OfflineService {
  private db: IDBPDatabase<OfflineDB> | null = null
  private isOnline = navigator.onLine
  private syncInProgress = false
  private maxRetries = 3
  private retryDelay = 1000 // 1秒

  /**
   * IndexedDB の初期化
   */
  async initialize(): Promise<void> {
    if (this.db) return

    try {
      this.db = await openDB<OfflineDB>('MyWineMemoryOfflineDB', 1, {
        upgrade(db) {
          // テイスティング記録ストア
          if (!db.objectStoreNames.contains('tastingRecords')) {
            const recordStore = db.createObjectStore('tastingRecords', { keyPath: 'id' })
            recordStore.createIndex('userId', 'userId')
            recordStore.createIndex('isOffline', 'isOffline')
            recordStore.createIndex('lastModified', 'lastModified')
          }

          // ユーザープロフィールストア
          if (!db.objectStoreNames.contains('userProfile')) {
            db.createObjectStore('userProfile', { keyPath: 'uid' })
          }

          // 同期キューストア
          if (!db.objectStoreNames.contains('syncQueue')) {
            const syncStore = db.createObjectStore('syncQueue', { 
              keyPath: 'id', 
              autoIncrement: true 
            })
            syncStore.createIndex('timestamp', 'timestamp')
            syncStore.createIndex('collection', 'collection')
          }

          // アプリ設定ストア
          if (!db.objectStoreNames.contains('appSettings')) {
            const settingsStore = db.createObjectStore('appSettings', { keyPath: 'key' })
            // 初期設定
            settingsStore.add({
              key: 'sync',
              lastSyncTime: Date.now(),
              isOnline: navigator.onLine,
              autoSync: true
            })
          }
        }
      })

      // オンライン状態の監視
      this.setupOnlineListeners()
      
      console.log('OfflineService initialized')
    } catch (error) {
      console.error('Failed to initialize OfflineService:', error)
      throw error
    }
  }

  /**
   * オンライン状態のリスナー設定
   */
  private setupOnlineListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
  }

  private async handleOnline(): Promise<void> {
    this.isOnline = true
    await this.updateAppSettings({ isOnline: true })
    console.log('Back online - starting sync')
    
    // 自動同期が有効な場合
    const settings = await this.getAppSettings()
    if (settings?.autoSync) {
      await this.syncOfflineData()
    }
  }

  private async handleOffline(): Promise<void> {
    this.isOnline = false
    await this.updateAppSettings({ isOnline: false })
    console.log('Gone offline')
  }

  // ===============================
  // テイスティング記録の管理
  // ===============================

  /**
   * オフラインでテイスティング記録を保存
   */
  async saveTastingRecordOffline(record: TastingRecord): Promise<void> {
    if (!this.db) await this.initialize()

    const offlineRecord = {
      ...record,
      isOffline: true,
      lastModified: Date.now()
    }

    await this.db!.put('tastingRecords', offlineRecord)
    
    // 同期キューに追加
    await this.addToSyncQueue('CREATE', 'tastingRecords', record.id, record)
    
    console.log('Tasting record saved offline:', record.id)
  }

  /**
   * オフラインでテイスティング記録を更新
   */
  async updateTastingRecordOffline(record: TastingRecord): Promise<void> {
    if (!this.db) await this.initialize()

    const existingRecord = await this.db!.get('tastingRecords', record.id)
    
    const offlineRecord = {
      ...record,
      isOffline: true,
      lastModified: Date.now(),
      conflictData: existingRecord?.conflictData
    }

    await this.db!.put('tastingRecords', offlineRecord)
    
    // 同期キューに追加
    await this.addToSyncQueue('UPDATE', 'tastingRecords', record.id, record)
    
    console.log('Tasting record updated offline:', record.id)
  }

  /**
   * オフラインでテイスティング記録を削除
   */
  async deleteTastingRecordOffline(recordId: string): Promise<void> {
    if (!this.db) await this.initialize()

    await this.db!.delete('tastingRecords', recordId)
    
    // 同期キューに追加
    await this.addToSyncQueue('DELETE', 'tastingRecords', recordId, null)
    
    console.log('Tasting record deleted offline:', recordId)
  }

  /**
   * オフラインのテイスティング記録を取得
   */
  async getOfflineTastingRecords(userId: string): Promise<TastingRecord[]> {
    if (!this.db) await this.initialize()

    const records = await this.db!.getAllFromIndex('tastingRecords', 'userId', userId)
    return records.map(record => ({
      ...record,
      isOffline: record.isOffline
    }))
  }

  // ===============================
  // 同期機能
  // ===============================

  /**
   * 同期キューにアイテムを追加
   */
  private async addToSyncQueue(
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    collection: string,
    documentId: string,
    data: any
  ): Promise<void> {
    if (!this.db) return

    await this.db.add('syncQueue', {
      type,
      collection,
      documentId,
      data,
      timestamp: Date.now(),
      retryCount: 0
    })
  }

  /**
   * オフラインデータの同期
   */
  async syncOfflineData(): Promise<{ 
    success: number
    failed: number
    conflicts: number 
  }> {
    if (!this.isOnline || this.syncInProgress) {
      return { success: 0, failed: 0, conflicts: 0 }
    }

    this.syncInProgress = true
    let success = 0
    let failed = 0
    let conflicts = 0

    try {
      if (!this.db) await this.initialize()

      // 同期キューのアイテムを取得
      const queueItems = await this.db!.getAll('syncQueue')
      
      for (const item of queueItems) {
        try {
          const result = await this.syncItem(item)
          if (result === 'success') {
            success++
            await this.db!.delete('syncQueue', item.id!)
          } else if (result === 'conflict') {
            conflicts++
            // 競合の場合はキューから削除せず、競合データを保存
            await this.handleConflict(item)
          } else {
            failed++
            // リトライ回数を増やす
            if (item.retryCount < this.maxRetries) {
              await this.db!.put('syncQueue', {
                ...item,
                retryCount: item.retryCount + 1
              })
            } else {
              // 最大リトライ回数に達した場合は削除
              await this.db!.delete('syncQueue', item.id!)
            }
          }
        } catch (error) {
          console.error('Sync item failed:', error)
          failed++
        }
      }

      // 最後の同期時間を更新
      await this.updateAppSettings({ lastSyncTime: Date.now() })
      
      console.log(`Sync completed: ${success} success, ${failed} failed, ${conflicts} conflicts`)
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      this.syncInProgress = false
    }

    return { success, failed, conflicts }
  }

  /**
   * 個別アイテムの同期
   */
  private async syncItem(item: any): Promise<'success' | 'failed' | 'conflict'> {
    try {
      // ここで実際のFirebaseサービスを呼び出す
      // 例：tastingRecordService.create(item.data)
      
      // 模擬的な実装（実際はFirebaseサービスを使用）
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })

      if (response.status === 409) {
        return 'conflict'
      }
      
      return response.ok ? 'success' : 'failed'
    } catch (error) {
      console.error('Sync item error:', error)
      return 'failed'
    }
  }

  /**
   * 競合の処理
   */
  private async handleConflict(item: any): Promise<void> {
    if (!this.db) return

    try {
      // サーバーから最新データを取得
      const serverData = await this.fetchServerData(item.collection, item.documentId)
      
      if (item.collection === 'tastingRecords') {
        // ローカルデータに競合情報を追加
        const localRecord = await this.db.get('tastingRecords', item.documentId)
        if (localRecord) {
          await this.db.put('tastingRecords', {
            ...localRecord,
            conflictData: serverData
          })
        }
      }
    } catch (error) {
      console.error('Failed to handle conflict:', error)
    }
  }

  /**
   * サーバーデータの取得（競合解決用）
   */
  private async fetchServerData(collection: string, documentId: string): Promise<any> {
    // 実際の実装ではFirebaseサービスを使用
    const response = await fetch(`/api/${collection}/${documentId}`)
    return response.json()
  }

  // ===============================
  // オフライン状態の管理
  // ===============================

  /**
   * オンライン状態の確認
   */
  getOnlineStatus(): boolean {
    return this.isOnline
  }

  /**
   * オフラインデータの有無確認
   */
  async hasOfflineData(): Promise<boolean> {
    if (!this.db) await this.initialize()

    const queueItems = await this.db!.getAll('syncQueue')
    return queueItems.length > 0
  }

  /**
   * アプリ設定の取得
   */
  async getAppSettings(): Promise<any> {
    if (!this.db) await this.initialize()

    return await this.db!.get('appSettings', 'sync')
  }

  /**
   * アプリ設定の更新
   */
  async updateAppSettings(updates: Partial<any>): Promise<void> {
    if (!this.db) await this.initialize()

    const current = await this.getAppSettings()
    await this.db!.put('appSettings', {
      ...current,
      ...updates
    })
  }

  // ===============================
  // 競合解決
  // ===============================

  /**
   * 競合のあるレコードを取得
   */
  async getConflictRecords(): Promise<TastingRecord[]> {
    if (!this.db) await this.initialize()

    const allRecords = await this.db!.getAll('tastingRecords')
    return allRecords.filter(record => record.conflictData)
  }

  /**
   * 競合の解決（ローカル優先）
   */
  async resolveConflictLocal(recordId: string): Promise<void> {
    if (!this.db) await this.initialize()

    const record = await this.db!.get('tastingRecords', recordId)
    if (record?.conflictData) {
      // 競合データを削除してローカルデータを保持
      const resolvedRecord = {
        ...record,
        conflictData: undefined
      }
      await this.db!.put('tastingRecords', resolvedRecord)
      
      // 同期キューに追加して次回同期時にサーバーに反映
      await this.addToSyncQueue('UPDATE', 'tastingRecords', recordId, resolvedRecord)
    }
  }

  /**
   * 競合の解決（サーバー優先）
   */
  async resolveConflictServer(recordId: string): Promise<void> {
    if (!this.db) await this.initialize()

    const record = await this.db!.get('tastingRecords', recordId)
    if (record?.conflictData) {
      // サーバーデータでローカルデータを上書き
      const resolvedRecord = {
        ...record.conflictData,
        isOffline: false,
        lastModified: Date.now(),
        conflictData: undefined
      }
      await this.db!.put('tastingRecords', resolvedRecord)
    }
  }

  /**
   * データベースのクリーンアップ
   */
  async cleanup(): Promise<void> {
    if (!this.db) return

    try {
      // 古い同期キューアイテムを削除（7日以上前）
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000)
      const tx = this.db.transaction('syncQueue', 'readwrite')
      const index = tx.store.index('timestamp')
      
      for await (const cursor of index.iterate(IDBKeyRange.upperBound(cutoff))) {
        cursor.delete()
      }
      
      await tx.done
      console.log('Offline data cleanup completed')
    } catch (error) {
      console.error('Cleanup failed:', error)
    }
  }
}

export default new OfflineService()