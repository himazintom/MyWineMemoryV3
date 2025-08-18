import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorMessage from '../ErrorMessage'

describe('ErrorMessage', () => {
  it('renders error message correctly', () => {
    const testMessage = 'Test error message'
    render(<ErrorMessage message={testMessage} />)
    
    const errorElement = screen.getByText(testMessage)
    expect(errorElement).toBeInTheDocument()
    
    const alertElement = screen.getByRole('alert')
    expect(alertElement).toBeInTheDocument()
  })

  it('renders default error message when no message provided', () => {
    render(<ErrorMessage />)
    
    const defaultMessage = screen.getByText('エラーが発生しました')
    expect(defaultMessage).toBeInTheDocument()
  })

  it('renders error from Error object', () => {
    const error = new Error('Test error from object')
    render(<ErrorMessage error={error} />)
    
    expect(screen.getByText('Test error from object')).toBeInTheDocument()
  })

  it('renders error from string', () => {
    const errorString = 'Test error string'
    render(<ErrorMessage error={errorString} />)
    
    expect(screen.getByText(errorString)).toBeInTheDocument()
  })

  it('prioritizes message over error prop', () => {
    const message = 'Priority message'
    const error = new Error('Secondary error')
    render(<ErrorMessage message={message} error={error} />)
    
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.queryByText('Secondary error')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const customClass = 'custom-error'
    render(<ErrorMessage message="Test" className={customClass} />)
    
    const alertElement = screen.getByRole('alert')
    expect(alertElement).toHaveClass('error-message', customClass)
  })

  it('renders children content', () => {
    render(
      <ErrorMessage message="Main error">
        <div>Additional error details</div>
      </ErrorMessage>
    )
    
    expect(screen.getByText('Main error')).toBeInTheDocument()
    expect(screen.getByText('Additional error details')).toBeInTheDocument()
  })

  it('renders retry button when onRetry provided', async () => {
    const onRetry = jest.fn()
    const user = userEvent.setup()
    
    render(<ErrorMessage message="Test error" onRetry={onRetry} />)
    
    const retryButton = screen.getByText('再試行')
    expect(retryButton).toBeInTheDocument()
    
    await user.click(retryButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders dismiss button when onDismiss provided', async () => {
    const onDismiss = jest.fn()
    const user = userEvent.setup()
    
    render(<ErrorMessage message="Test error" onDismiss={onDismiss} />)
    
    const dismissButton = screen.getByLabelText('エラーメッセージを閉じる')
    expect(dismissButton).toBeInTheDocument()
    
    await user.click(dismissButton)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('applies variant classes correctly', () => {
    const { rerender } = render(<ErrorMessage message="Test" variant="default" />)
    
    let alertElement = screen.getByRole('alert')
    expect(alertElement).toHaveClass('error-message')
    expect(alertElement).not.toHaveClass('error-message--inline')
    
    rerender(<ErrorMessage message="Test" variant="inline" />)
    alertElement = screen.getByRole('alert')
    expect(alertElement).toHaveClass('error-message', 'error-message--inline')
    
    rerender(<ErrorMessage message="Test" variant="banner" />)
    alertElement = screen.getByRole('alert')
    expect(alertElement).toHaveClass('error-message', 'error-message--banner')
  })

  it('has correct accessibility attributes', () => {
    render(<ErrorMessage message="Accessibility test" />)
    
    const alertElement = screen.getByRole('alert')
    expect(alertElement).toHaveAttribute('aria-live', 'polite')
    
    const icon = screen.getByText('⚠️')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})