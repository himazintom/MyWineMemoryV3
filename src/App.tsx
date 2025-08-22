import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import ErrorBoundary from './components/common/ErrorBoundary'
import LoadingSpinner from './components/common/LoadingSpinner'
import Layout from './components/layout/Layout'
import ScrollToTop from './components/common/ScrollToTop'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorProvider } from './contexts/ErrorContext'
import AnalyticsWrapper from './components/AnalyticsWrapper'

// Lazy load pages for better performance
const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const WinesPage = lazy(() => import('./pages/wines/WinesPage'))
const WineDetailPage = lazy(() => import('./pages/wines/WineDetailPage'))
const AddWinePage = lazy(() => import('./pages/wines/AddWinePage'))
const SelectWinePage = lazy(() => import('./pages/wines/SelectWinePage'))
const RecordsPage = lazy(() => import('./pages/records/RecordsPage'))
const RecordDetailPage = lazy(() => import('./pages/records/RecordDetailPage'))
const AddRecordPage = lazy(() => import('./pages/records/AddRecordPage'))
const StatsPage = lazy(() => import('./pages/stats/StatsPage'))
const QuizPage = lazy(() => import('./pages/quiz/QuizPage'))
const QuizGamePage = lazy(() => import('./pages/quiz/QuizGamePage'))
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'))
const InitializationPanel = lazy(() => import('./components/InitializationPanel'))

function App() {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <AnalyticsWrapper>
                <ScrollToTop />
                <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Wine management routes */}
              <Route path="/wines" element={<WinesPage />} />
              <Route path="/wines/select" element={<SelectWinePage />} />
              <Route path="/wines/:id" element={<WineDetailPage />} />
              <Route path="/wines/add" element={<AddWinePage />} />
              
              {/* Record management routes */}
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/records/:id" element={<RecordDetailPage />} />
              <Route path="/records/add" element={<AddRecordPage />} />
              <Route path="/wines/:wineId/record" element={<AddRecordPage />} />
              
              {/* Feature routes */}
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/quiz/level/:level" element={<QuizGamePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/admin/init" element={<InitializationPanel />} />
              
              {/* 404 fallback */}
              <Route path="*" element={<div>Page not found</div>} />
            </Routes>
          </Suspense>
                </Layout>
              </AnalyticsWrapper>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </ErrorProvider>
    </ErrorBoundary>
  )
}

export default App