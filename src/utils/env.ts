/**
 * 環境変数取得ユーティリティ
 * Jest環境とブラウザ環境の両方で動作する
 */

// 環境変数の型定義
export interface EnvironmentVariables {
  VITE_FIREBASE_API_KEY: string
  VITE_FIREBASE_AUTH_DOMAIN: string
  VITE_FIREBASE_PROJECT_ID: string
  VITE_FIREBASE_STORAGE_BUCKET: string
  VITE_FIREBASE_MESSAGING_SENDER_ID: string
  VITE_FIREBASE_APP_ID: string
  VITE_FIREBASE_MEASUREMENT_ID: string
  VITE_FIREBASE_VAPID_KEY: string
  VITE_OPENROUTER_API_KEY: string
  VITE_GROQ_API_KEY: string
  VITE_SENTRY_DSN: string
  VITE_STRIPE_PUBLISHABLE_KEY: string
  VITE_STRIPE_PREMIUM_PRICE_ID: string
  VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID: string
  VITE_ENVIRONMENT: string
  VITE_APP_VERSION: string
}

/**
 * 環境変数を安全に取得する
 * テスト環境では process.env、ブラウザ環境では import.meta.env を使用
 */
export function getEnvVar(key: keyof EnvironmentVariables): string {
  // Jest/Node.js環境では process.env を使用
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || ''
  }

  // ブラウザ環境では import.meta.env を使用
  // Viteがビルド時に環境変数を注入する
  try {
    // @ts-ignore - import.meta is not available in all environments
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key] || ''
    }
  } catch (e) {
    // import.meta が使えない環境（古いブラウザなど）
    console.warn('import.meta.env is not available, falling back to empty string')
  }

  // フォールバック：デフォルト値を返す
  if (key === 'VITE_ENVIRONMENT') return 'production'
  if (key === 'VITE_APP_VERSION') return '1.0.0'
  
  return ''
}

/**
 * 環境変数オブジェクトを取得（デバッグ用）
 */
export function getAllEnvVars(): Partial<EnvironmentVariables> {
  const keys: (keyof EnvironmentVariables)[] = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_MEASUREMENT_ID',
    'VITE_FIREBASE_VAPID_KEY',
    'VITE_OPENROUTER_API_KEY',
    'VITE_GROQ_API_KEY',
    'VITE_SENTRY_DSN',
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'VITE_STRIPE_PREMIUM_PRICE_ID',
    'VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID',
    'VITE_ENVIRONMENT',
    'VITE_APP_VERSION'
  ]

  return keys.reduce((acc, key) => {
    acc[key] = getEnvVar(key) || undefined
    return acc
  }, {} as Partial<EnvironmentVariables>)
}