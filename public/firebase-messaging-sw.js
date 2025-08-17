// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyBjXcxsyqtaKFoFqOZPhzAI-fqCZlcX4K0",
  authDomain: "my-wine-memory-v3.firebaseapp.com",
  projectId: "my-wine-memory-v3",
  storageBucket: "my-wine-memory-v3.firebasestorage.app",
  messagingSenderId: "334623945670",
  appId: "1:334623945670:web:4b6caccb5e6bc5a84b9e75",
  measurementId: "G-K8LJC5LLZ8"
}

// Firebase初期化
firebase.initializeApp(firebaseConfig)

// Firebase Messaging初期化
const messaging = firebase.messaging()

// バックグラウンド通知の処理
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload)

  const notificationTitle = payload.notification?.title || 'MyWineMemory'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/wine-icon-192.png',
    badge: '/wine-icon-192.png',
    data: payload.data || {},
    tag: payload.data?.type || 'default',
    requireInteraction: false,
    silent: false
  }

  // 通知タイプに応じてオプションをカスタマイズ
  if (payload.data?.type === 'badge_achievement') {
    notificationOptions.requireInteraction = true
    notificationOptions.icon = '/badge-icon.png'
  } else if (payload.data?.type === 'streak_reminder') {
    notificationOptions.icon = '/streak-icon.png'
  } else if (payload.data?.type === 'quiz_reminder') {
    notificationOptions.icon = '/quiz-icon.png'
  } else if (payload.data?.type === 'heart_recovery') {
    notificationOptions.icon = '/heart-icon.png'
  }

  // 通知を表示
  self.registration.showNotification(notificationTitle, notificationOptions)
})

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  event.notification.close()

  const data = event.notification.data
  let targetUrl = '/'

  // 通知タイプに応じてリダイレクト先を決定
  switch (data.type) {
    case 'quiz_reminder':
      targetUrl = '/quiz'
      break
    case 'streak_reminder':
      targetUrl = '/'
      break
    case 'heart_recovery':
      targetUrl = '/quiz'
      break
    case 'badge_achievement':
      targetUrl = '/profile'
      break
    default:
      targetUrl = '/'
  }

  // アプリを開く/フォーカスする
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // 既にアプリが開いている場合は、そのタブにフォーカス
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      
      // アプリが開いていない場合は新しいタブで開く
      if (clients.openWindow) {
        return clients.openWindow(self.location.origin + targetUrl)
      }
    })
  )
})

// 通知を閉じたときの処理
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event)
  
  // 分析用にイベントを記録（オプション）
  // ここでFirebase Analyticsなどにイベントを送信できます
})

// Service Workerインストール時の処理
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  self.skipWaiting()
})

// Service Workerアクティベーション時の処理
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(self.clients.claim())
})

// プッシュイベントの処理（FCM以外のプッシュ通知用）
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json()
      console.log('Push event received:', data)
      
      const title = data.title || 'MyWineMemory'
      const options = {
        body: data.body || '',
        icon: '/wine-icon-192.png',
        badge: '/wine-icon-192.png',
        data: data.data || {},
        tag: data.tag || 'default'
      }
      
      event.waitUntil(
        self.registration.showNotification(title, options)
      )
    } catch (error) {
      console.error('Error parsing push data:', error)
    }
  }
})