// Mock import.meta.env
global.importMeta = {
  env: {
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test-auth-domain',
    VITE_FIREBASE_PROJECT_ID: 'test-project-id',
    VITE_FIREBASE_STORAGE_BUCKET: 'test-storage-bucket',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'test-sender-id',
    VITE_FIREBASE_APP_ID: 'test-app-id',
    VITE_FIREBASE_MEASUREMENT_ID: 'test-measurement-id',
    VITE_FIREBASE_VAPID_KEY: 'test-vapid-key',
    VITE_OPENROUTER_API_KEY: 'test-openrouter-key',
    VITE_SENTRY_DSN: 'test-sentry-dsn',
    VITE_STRIPE_PUBLISHABLE_KEY: 'test-stripe-key',
    VITE_ENVIRONMENT: 'test',
    VITE_APP_VERSION: '1.0.0-test',
    MODE: 'test',
    DEV: false,
    PROD: false,
    SSR: false
  }
};

// Add import.meta to global
Object.defineProperty(global, 'import', {
  value: {
    meta: global.importMeta
  },
  writable: true,
  configurable: true
});