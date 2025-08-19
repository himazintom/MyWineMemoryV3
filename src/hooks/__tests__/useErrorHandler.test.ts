import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { useErrorHandler } from '../useErrorHandler'
import { AppError, ErrorType } from '../../types/error'
import { ErrorProvider } from '../../contexts/ErrorContext'

describe('useErrorHandler', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(ErrorProvider, null, children)

  it('should initialize with no error', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper })
    
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper })
    
    const testError = new Error('Test error')
    
    act(() => {
      result.current.handleError(testError)
    })
    
    expect(result.current.error).toBe('Test error')
  })

  it('should handle AppError with user-friendly message', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper })
    
    const appError: AppError = {
      type: ErrorType.VALIDATION,
      message: 'Validation failed',
      userMessage: 'Please check your input',
      code: 'VALIDATION_ERROR'
    }
    
    act(() => {
      result.current.handleError(appError)
    })
    
    expect(result.current.error).toBe('Please check your input')
  })

  it('should clear errors', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper })
    
    act(() => {
      result.current.handleError(new Error('Test error'))
    })
    
    expect(result.current.error).toBe('Test error')
    
    act(() => {
      result.current.clearError()
    })
    
    expect(result.current.error).toBeNull()
  })

  it('should handle async operations with loading state', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper })
    
    const asyncOperation = jest.fn().mockResolvedValue('success')
    
    let promise: Promise<any>
    
    act(() => {
      promise = result.current.executeAsync(asyncOperation)
    })
    
    expect(result.current.isLoading).toBe(true)
    
    await act(async () => {
      await promise
    })
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(asyncOperation).toHaveBeenCalled()
  })

  it('should handle async operation errors', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper })
    
    const asyncOperation = jest.fn().mockRejectedValue(new Error('Async error'))
    
    let promise: Promise<any>
    
    act(() => {
      promise = result.current.executeAsync(asyncOperation)
    })
    
    await act(async () => {
      try {
        await promise
      } catch (error) {
        // Expected to throw
      }
    })
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe('Async error')
  })

  it('should retry operations', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper })
    
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce('success')
    
    let promise: Promise<any>
    
    act(() => {
      promise = result.current.retry(mockOperation, 3)
    })
    
    await act(async () => {
      await promise
    })
    
    expect(mockOperation).toHaveBeenCalledTimes(3)
    expect(result.current.error).toBeNull()
  })

  it('should fail after max retries', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper })
    
    const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent error'))
    
    let promise: Promise<any>
    
    act(() => {
      promise = result.current.retry(mockOperation, 2)
    })
    
    await act(async () => {
      try {
        await promise
      } catch (error) {
        // Expected to throw after retries
      }
    })
    
    expect(mockOperation).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBe('Persistent error')
  })

  it('should handle network errors specifically', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper })
    
    const networkError = new Error('Failed to fetch')
    
    act(() => {
      result.current.handleError(networkError)
    })
    
    expect(result.current.error).toContain('ネットワーク')
  })

  it('should handle Firebase errors', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper })
    
    const firebaseError = {
      code: 'permission-denied',
      message: 'Permission denied'
    }
    
    act(() => {
      result.current.handleError(firebaseError as any)
    })
    
    expect(result.current.error).toContain('アクセス権限がありません')
  })

  it('should clear error automatically after timeout', async () => {
    jest.useFakeTimers()
    
    const { result } = renderHook(() => useErrorHandler({ autoHideDuration: 1000 }), { wrapper })
    
    act(() => {
      result.current.handleError(new Error('Test error'))
    })
    
    expect(result.current.error).toBe('Test error')
    
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    
    expect(result.current.error).toBeNull()
    
    jest.useRealTimers()
  })
})