import type { ReactNode } from 'react'

interface ErrorMessageProps {
  message?: string
  error?: Error | string
  children?: ReactNode
  variant?: 'default' | 'inline' | 'banner'
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export default function ErrorMessage({
  message,
  error,
  children,
  variant = 'default',
  onRetry,
  onDismiss,
  className = ''
}: ErrorMessageProps) {
  const errorText = message || (typeof error === 'string' ? error : error?.message) || 'エラーが発生しました'
  
  const variantClasses = {
    default: 'error-message',
    inline: 'error-message error-message--inline',
    banner: 'error-message error-message--banner'
  }
  
  return (
    <div 
      className={`${variantClasses[variant]} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="error-content">
        <div className="error-icon" aria-hidden="true">
          ⚠️
        </div>
        
        <div className="error-text">
          <div className="error-title">
            {errorText}
          </div>
          {children && (
            <div className="error-details">
              {children}
            </div>
          )}
        </div>
        
        <div className="error-actions">
          {onRetry && (
            <button 
              type="button" 
              className="btn btn-sm btn-secondary"
              onClick={onRetry}
            >
              再試行
            </button>
          )}
          {onDismiss && (
            <button 
              type="button" 
              className="btn btn-sm btn-text"
              onClick={onDismiss}
              aria-label="エラーメッセージを閉じる"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}