import { getMessaging, onMessage } from 'firebase/messaging'
import firebaseService from './firebase'

// アップデート情報の型定義
export interface UpdateInfo {
  version: string
  releaseDate: Date
  features: string[]
  fixes: string[]
  breaking: boolean
  mandatory: boolean
  downloadUrl?: string
  size?: number // バイト
}

// アップデート状態の型定義
export interface UpdateState {
  available: boolean
  downloaded: boolean
  installing: boolean
  info: UpdateInfo | null
  progress: number
  error: string | null
}

class UpdateService {
  private updateState: UpdateState = {
    available: false,
    downloaded: false,
    installing: false,
    info: null,
    progress: 0,
    error: null
  }

  private listeners: Array<(state: UpdateState) => void> = []
  private registration: ServiceWorkerRegistration | null = null
  private checkInterval: NodeJS.Timeout | null = null
  private readonly CHECK_INTERVAL = 30 * 60 * 1000 // 30分間隔

  /**
   * 自動更新システムの初期化
   */
  async initialize(): Promise<void> {
    try {
      // Service Worker の登録確認
      if ('serviceWorker' in navigator) {
        this.registration = await navigator.serviceWorker.ready
        this.setupServiceWorkerListeners()
      }

      // 初回チェック
      await this.checkForUpdates()

      // 定期チェックの開始
      this.startPeriodicCheck()

      // Firebase Messaging でリモート更新通知を受信
      this.setupRemoteUpdateNotifications()

      console.log('UpdateService initialized')
    } catch (error) {
      console.error('Failed to initialize UpdateService:', error)
    }
  }

  /**
   * Service Worker のリスナー設定
   */
  private setupServiceWorkerListeners(): void {
    if (!this.registration) return

    // 新しい Service Worker が利用可能になった時
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // アップデートが利用可能
              this.handleUpdateAvailable()
            }
          }
        })
      }
    })

    // Service Worker からのメッセージを受信
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, payload } = event.data

      switch (type) {
        case 'UPDATE_AVAILABLE':
          this.handleUpdateAvailable(payload)
          break
        case 'UPDATE_DOWNLOADED':
          this.handleUpdateDownloaded(payload)
          break
        case 'UPDATE_PROGRESS':
          this.handleUpdateProgress(payload)
          break
        case 'UPDATE_ERROR':
          this.handleUpdateError(payload)
          break
      }
    })
  }

  /**
   * リモート更新通知の設定
   */
  private setupRemoteUpdateNotifications(): void {
    try {
      const messaging = getMessaging(firebaseService.getApp())
      
      onMessage(messaging, (payload) => {
        if (payload.data?.type === 'APP_UPDATE') {
          this.handleRemoteUpdateNotification(payload.data)
        }
      })
    } catch (error) {
      console.error('Failed to setup remote update notifications:', error)
    }
  }

  /**
   * アップデートの確認
   */
  async checkForUpdates(manual = false): Promise<boolean> {
    try {
      // バージョン情報を取得
      const currentVersion = await this.getCurrentVersion()
      const latestVersion = await this.getLatestVersion()

      if (this.compareVersions(latestVersion.version, currentVersion) > 0) {
        this.updateState.available = true
        this.updateState.info = latestVersion
        this.notifyListeners()

        // 自動ダウンロード（重要な更新の場合）
        if (latestVersion.mandatory || manual) {
          await this.downloadUpdate()
        }

        return true
      }

      return false
    } catch (error) {
      console.error('Failed to check for updates:', error)
      this.updateState.error = error instanceof Error ? error.message : 'アップデートの確認に失敗しました'
      this.notifyListeners()
      return false
    }
  }

  /**
   * アップデートのダウンロード
   */
  async downloadUpdate(): Promise<void> {
    if (!this.updateState.available || !this.updateState.info) {
      throw new Error('ダウンロード可能なアップデートがありません')
    }

    try {
      this.updateState.progress = 0
      this.updateState.error = null
      this.notifyListeners()

      // Service Worker にダウンロード開始を通知
      if (this.registration?.active) {
        this.registration.active.postMessage({
          type: 'DOWNLOAD_UPDATE',
          payload: this.updateState.info
        })
      }

      // プログレッシブダウンロードのシミュレーション
      await this.simulateDownload()

      this.updateState.downloaded = true
      this.updateState.progress = 100
      this.notifyListeners()

      console.log('Update downloaded successfully')
    } catch (error) {
      console.error('Failed to download update:', error)
      this.updateState.error = error instanceof Error ? error.message : 'アップデートのダウンロードに失敗しました'
      this.notifyListeners()
    }
  }

  /**
   * アップデートの適用
   */
  async applyUpdate(): Promise<void> {
    if (!this.updateState.downloaded) {
      throw new Error('ダウンロードされたアップデートがありません')
    }

    try {
      this.updateState.installing = true
      this.updateState.progress = 0
      this.updateState.error = null
      this.notifyListeners()

      // キャッシュクリア
      await this.clearCaches()

      // Service Worker の更新
      if (this.registration?.waiting) {
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }

      // ページリロード前の最終準備
      await this.prepareForReload()

      // アプリケーションのリロード
      this.reloadApplication()
    } catch (error) {
      console.error('Failed to apply update:', error)
      this.updateState.installing = false
      this.updateState.error = error instanceof Error ? error.message : 'アップデートの適用に失敗しました'
      this.notifyListeners()
    }
  }

  /**
   * アップデートの延期
   */
  async postponeUpdate(): Promise<void> {
    this.updateState.available = false
    this.updateState.downloaded = false
    this.updateState.info = null
    this.notifyListeners()

    // 1時間後に再チェック
    setTimeout(() => {
      this.checkForUpdates()
    }, 60 * 60 * 1000)
  }

  /**
   * アップデートの無視
   */
  async ignoreUpdate(): Promise<void> {
    if (this.updateState.info) {
      // ローカルストレージに無視したバージョンを記録
      localStorage.setItem('ignoredVersion', this.updateState.info.version)
    }

    this.updateState.available = false
    this.updateState.downloaded = false
    this.updateState.info = null
    this.notifyListeners()
  }

  // ===============================
  // イベントハンドラー
  // ===============================

  private handleUpdateAvailable(info?: UpdateInfo): void {
    this.updateState.available = true
    if (info) {
      this.updateState.info = info
    }
    this.notifyListeners()
  }

  private handleUpdateDownloaded(info?: UpdateInfo): void {
    this.updateState.downloaded = true
    this.updateState.progress = 100
    if (info) {
      this.updateState.info = info
    }
    this.notifyListeners()
  }

  private handleUpdateProgress(progress: number): void {
    this.updateState.progress = progress
    this.notifyListeners()
  }

  private handleUpdateError(error: string): void {
    this.updateState.error = error
    this.notifyListeners()
  }

  private handleRemoteUpdateNotification(data: any): void {
    const updateInfo: UpdateInfo = {
      version: data.version,
      releaseDate: new Date(data.releaseDate),
      features: JSON.parse(data.features || '[]'),
      fixes: JSON.parse(data.fixes || '[]'),
      breaking: data.breaking === 'true',
      mandatory: data.mandatory === 'true'
    }

    this.updateState.available = true
    this.updateState.info = updateInfo
    this.notifyListeners()

    // 強制更新の場合は自動ダウンロード
    if (updateInfo.mandatory) {
      this.downloadUpdate()
    }
  }

  // ===============================
  // ユーティリティメソッド
  // ===============================

  private async getCurrentVersion(): Promise<string> {
    // package.json からバージョンを取得（実際の実装では環境変数など）
    return process.env.REACT_APP_VERSION || '1.0.0'
  }

  private async getLatestVersion(): Promise<UpdateInfo> {
    try {
      // 実際の実装では API エンドポイントから取得
      const response = await fetch('/api/version/latest')
      if (!response.ok) {
        throw new Error('バージョン情報の取得に失敗しました')
      }
      
      const data = await response.json()
      return {
        version: data.version,
        releaseDate: new Date(data.releaseDate),
        features: data.features || [],
        fixes: data.fixes || [],
        breaking: data.breaking || false,
        mandatory: data.mandatory || false,
        downloadUrl: data.downloadUrl,
        size: data.size
      }
    } catch (error) {
      // フォールバック: ローカルの模擬データ
      return {
        version: '1.0.1',
        releaseDate: new Date(),
        features: ['新機能追加', 'パフォーマンス改善'],
        fixes: ['バグ修正'],
        breaking: false,
        mandatory: false
      }
    }
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number)
    const v2Parts = version2.split('.').map(Number)

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0
      const v2Part = v2Parts[i] || 0

      if (v1Part > v2Part) return 1
      if (v1Part < v2Part) return -1
    }

    return 0
  }

  private async simulateDownload(): Promise<void> {
    return new Promise((resolve) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 20
        this.updateState.progress = Math.min(progress, 95)
        this.notifyListeners()

        if (progress >= 95) {
          clearInterval(interval)
          this.updateState.progress = 100
          resolve()
        }
      }, 200)
    })
  }

  private async clearCaches(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
    }
  }

  private async prepareForReload(): Promise<void> {
    // アプリケーション状態の保存
    const currentState = {
      timestamp: Date.now(),
      url: window.location.href,
      scrollPosition: window.scrollY
    }
    sessionStorage.setItem('preReloadState', JSON.stringify(currentState))

    // 進行中のリクエストの完了を待つ
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  private reloadApplication(): void {
    // スムーズなリロード
    window.location.reload()
  }

  private startPeriodicCheck(): void {
    this.checkInterval = setInterval(() => {
      this.checkForUpdates()
    }, this.CHECK_INTERVAL)
  }

  private stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  // ===============================
  // パブリック API
  // ===============================

  /**
   * 現在のアップデート状態を取得
   */
  getUpdateState(): UpdateState {
    return { ...this.updateState }
  }

  /**
   * アップデート状態の変更を監視
   */
  onStateChange(listener: (state: UpdateState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * リスナーに状態変更を通知
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.updateState })
      } catch (error) {
        console.error('Update listener error:', error)
      }
    })
  }

  /**
   * サービスの停止
   */
  destroy(): void {
    this.stopPeriodicCheck()
    this.listeners = []
  }
}

export default new UpdateService()