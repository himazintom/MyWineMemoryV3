import { render, screen } from '@testing-library/react'
import LoadingSpinner from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders loading spinner correctly', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('loading-spinner')
  })

  it('renders with custom size', () => {
    render(<LoadingSpinner size="large" />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('loading-spinner')
    // The size is applied to the inner spinner element
    expect(spinner.querySelector('.spinner')).toHaveClass('w-12', 'h-12')
  })

  it('renders with default message', () => {
    render(<LoadingSpinner />)
    
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('renders with custom message', () => {
    const testMessage = 'Loading data...'
    render(<LoadingSpinner message={testMessage} />)
    
    expect(screen.getByText(testMessage)).toBeInTheDocument()
  })

  it('has correct aria attributes', () => {
    const testMessage = 'カスタムメッセージ'
    render(<LoadingSpinner message={testMessage} />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', testMessage)
  })

  it('applies size classes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="small" />)
    
    let spinnerElement = screen.getByRole('status').querySelector('.spinner')
    expect(spinnerElement).toHaveClass('w-4', 'h-4')
    
    rerender(<LoadingSpinner size="medium" />)
    spinnerElement = screen.getByRole('status').querySelector('.spinner')
    expect(spinnerElement).toHaveClass('w-8', 'h-8')
    
    rerender(<LoadingSpinner size="large" />)
    spinnerElement = screen.getByRole('status').querySelector('.spinner')
    expect(spinnerElement).toHaveClass('w-12', 'h-12')
  })
})