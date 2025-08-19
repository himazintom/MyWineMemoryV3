import React from 'react'
import { useAnalytics } from '../hooks/useAnalytics'

interface AnalyticsWrapperProps {
  children: React.ReactNode
}

const AnalyticsWrapper: React.FC<AnalyticsWrapperProps> = ({ children }) => {
  // アナリティクス自動追跡を有効化
  useAnalytics()
  
  return <>{children}</>
}

export default AnalyticsWrapper