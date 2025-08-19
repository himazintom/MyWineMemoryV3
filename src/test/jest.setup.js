// Mock import.meta.env for different contexts
const mockEnv = {
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
};

// Enhanced import.meta mocking with all possible approaches
global.import = global.import || {};
global.import.meta = { env: mockEnv };

// Set up import.meta mock
global.importMeta = {
  env: mockEnv
};

// Multiple approaches to ensure import.meta works
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: { env: mockEnv }
  },
  writable: true,
  configurable: true
});

// For ES modules
if (typeof globalThis !== 'undefined') {
  globalThis.import = globalThis.import || {};
  globalThis.import.meta = globalThis.import.meta || {};
  globalThis.import.meta.env = mockEnv;
}

// Mock window.import.meta for browser environments
if (typeof window !== 'undefined') {
  window.import = window.import || {};
  window.import.meta = { env: mockEnv };
}

// Set process.env as fallback
Object.assign(process.env, mockEnv);

// Mock fetch and Response for tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

global.Response = class MockResponse {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = options.statusText || 'OK';
    this.headers = new Map(Object.entries(options.headers || {}));
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body || '{}'));
  }
  
  text() {
    return Promise.resolve(this.body || '');
  }
};

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('AppError:') || message.includes('Error should be reported')) {
    return; // Suppress expected error logs
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('Error should be reported')) {
    return; // Suppress expected warning logs
  }
  originalConsoleWarn.apply(console, args);
};