import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../useDebounce'

// Mock timers for testing
jest.useFakeTimers()

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    
    expect(result.current).toBe('initial')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )
    
    expect(result.current).toBe('initial')
    
    // Change the value
    rerender({ value: 'updated', delay: 500 })
    
    // Value should not change immediately
    expect(result.current).toBe('initial')
    
    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    // Now value should be updated
    expect(result.current).toBe('updated')
  })

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )
    
    // First change
    rerender({ value: 'first', delay: 500 })
    
    // Advance time partially
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    // Value should still be initial
    expect(result.current).toBe('initial')
    
    // Second change before timeout
    rerender({ value: 'second', delay: 500 })
    
    // Advance partial time again
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    // Value should still be initial (timer was reset)
    expect(result.current).toBe('initial')
    
    // Complete the timeout
    act(() => {
      jest.advanceTimersByTime(200)
    })
    
    // Now value should be the latest
    expect(result.current).toBe('second')
  })

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 1000 } }
    )
    
    rerender({ value: 'updated', delay: 1000 })
    
    // Advance time less than delay
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    expect(result.current).toBe('initial')
    
    // Complete the delay
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    expect(result.current).toBe('updated')
  })

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    )
    
    rerender({ value: 'updated', delay: 0 })
    
    // With zero delay, should update immediately
    act(() => {
      jest.advanceTimersByTime(0)
    })
    
    expect(result.current).toBe('updated')
  })

  it('should handle multiple rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    )
    
    const values = ['first', 'second', 'third', 'final']
    
    values.forEach((value, index) => {
      rerender({ value, delay: 300 })
      
      // Advance time partially for all but the last change
      if (index < values.length - 1) {
        act(() => {
          jest.advanceTimersByTime(100)
        })
      }
    })
    
    // Value should still be initial
    expect(result.current).toBe('initial')
    
    // Complete the timeout
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    // Should have the final value
    expect(result.current).toBe('final')
  })

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    
    const { unmount, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )
    
    rerender({ value: 'updated', delay: 500 })
    
    unmount()
    
    expect(clearTimeoutSpy).toHaveBeenCalled()
    
    clearTimeoutSpy.mockRestore()
  })

  it('should handle object values', () => {
    const initialObj = { name: 'John', age: 30 }
    const updatedObj = { name: 'Jane', age: 25 }
    
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initialObj, delay: 300 } }
    )
    
    expect(result.current).toBe(initialObj)
    
    rerender({ value: updatedObj, delay: 300 })
    
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    expect(result.current).toBe(updatedObj)
  })
})