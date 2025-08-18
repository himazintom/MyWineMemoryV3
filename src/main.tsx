import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import sentryService from './services/sentryService'
import ErrorBoundary from './components/error/ErrorBoundary'

// Sentryの初期化
sentryService.initialize()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
