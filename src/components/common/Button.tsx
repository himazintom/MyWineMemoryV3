import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'text' | 'google'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  isFullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isFullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const baseClasses = 'btn'
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary', 
    danger: 'btn-danger',
    text: 'btn-text',
    google: 'btn-google'
  }
  
  const sizeClasses = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  }
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    isFullWidth && 'btn-full-width',
    isLoading && 'btn-loading',
    className
  ].filter(Boolean).join(' ')
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <span className="btn-spinner" aria-hidden="true">
          <div className="spinner w-4 h-4"></div>
        </span>
      )}
      
      {!isLoading && leftIcon && (
        <span className="btn-icon btn-icon--left" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      
      <span className="btn-content">
        {children}
      </span>
      
      {!isLoading && rightIcon && (
        <span className="btn-icon btn-icon--right" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  )
}