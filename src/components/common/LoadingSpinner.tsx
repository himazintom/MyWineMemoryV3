interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
}

export default function LoadingSpinner({ 
  size = 'medium', 
  message = '読み込み中...' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }

  return (
    <div className="loading-spinner" role="status" aria-label={message}>
      <div className={`spinner ${sizeClasses[size]}`}></div>
      {message && <span className="sr-only">{message}</span>}
    </div>
  )
}