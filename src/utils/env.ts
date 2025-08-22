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
 * テスト環境では process.env、ブラウザ環境では Vite により実際の値に置き換えられる
 */
export function getEnvVar(key: keyof EnvironmentVariables): string {
  // Jest/Node.js環境では process.env を使用
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || ''
  }

  // ブラウザ環境では、Vite ビルド時に以下の値が実際の環境変数に置き換えられる
  // これにより import.meta 構文を使わずに済む
  switch (key) {
    case 'VITE_FIREBASE_API_KEY':
      // @ts-ignore - Vite will replace these values at build time
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_FIREBASE_API_KEY || '') : ''
    case 'VITE_FIREBASE_AUTH_DOMAIN':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_FIREBASE_AUTH_DOMAIN || '') : ''
    case 'VITE_FIREBASE_PROJECT_ID':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_FIREBASE_PROJECT_ID || '') : ''
    case 'VITE_FIREBASE_STORAGE_BUCKET':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_FIREBASE_STORAGE_BUCKET || '') : ''
    case 'VITE_FIREBASE_MESSAGING_SENDER_ID':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_FIREBASE_MESSAGING_SENDER_ID || '') : ''
    case 'VITE_FIREBASE_APP_ID':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_FIREBASE_APP_ID || '') : ''
    case 'VITE_FIREBASE_MEASUREMENT_ID':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_FIREBASE_MEASUREMENT_ID || '') : ''
    case 'VITE_FIREBASE_VAPID_KEY':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_FIREBASE_VAPID_KEY || '') : ''
    case 'VITE_OPENROUTER_API_KEY':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_OPENROUTER_API_KEY || '') : ''
    case 'VITE_GROQ_API_KEY':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_GROQ_API_KEY || '') : ''
    case 'VITE_SENTRY_DSN':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_SENTRY_DSN || '') : ''
    case 'VITE_STRIPE_PUBLISHABLE_KEY':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_STRIPE_PUBLISHABLE_KEY || '') : ''
    case 'VITE_STRIPE_PREMIUM_PRICE_ID':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_STRIPE_PREMIUM_PRICE_ID || '') : ''
    case 'VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID || '') : ''
    case 'VITE_ENVIRONMENT':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_ENVIRONMENT || 'production') : 'production'
    case 'VITE_APP_VERSION':
      // @ts-ignore
      return typeof window !== 'undefined' ? (window.__ENV__?.VITE_APP_VERSION || '1.0.0') : '1.0.0'
    default:
      return ''
  }
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