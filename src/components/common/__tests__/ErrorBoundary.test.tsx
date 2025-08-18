import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'

// Test component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Mock console.error to avoid noise in test output
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
    expect(screen.getByText('アプリケーションでエラーが発生しました。ページを再読み込みしてください。')).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const CustomFallback = () => <div>Custom error message</div>
    
    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument()
  })

  it('logs error to console', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error)
    )
    
    consoleSpy.mockRestore()
  })

  it('displays error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Test error')).toBeInTheDocument()
    
    process.env.NODE_ENV = originalEnv
  })

  it('shows reload button that reloads the page', () => {
    const reloadSpy = jest.fn()
    Object.defineProperty(window.location, 'reload', {
      writable: true,
      value: reloadSpy
    })
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const reloadButton = screen.getByText('ページを再読み込み')
    reloadButton.click()
    
    expect(reloadSpy).toHaveBeenCalled()
  })

  it('handles error info correctly', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error)
    )
    
    consoleSpy.mockRestore()
  })

  it('renders error boundary without crashing when error boundary itself has issues', () => {
    // This test ensures the error boundary is robust
    const ProblematicFallback = () => {
      throw new Error('Fallback error')
    }
    
    // This should not crash the test
    expect(() => {
      render(
        <ErrorBoundary fallback={<ProblematicFallback />}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
    }).not.toThrow()
  })
})