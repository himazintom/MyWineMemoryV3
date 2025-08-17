import { useState, useEffect } from 'react'

/**
 * デバウンス機能を提供するカスタムフック
 * 指定された遅延時間後に値を更新する
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * デバウンス検索機能を提供するカスタムフック
 */
export function useDebounceSearch<T>(
  searchFunction: (searchTerm: string) => Promise<T[]>,
  initialValue: T[] = [],
  delay: number = 300
) {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<T[]>(initialValue)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedSearchTerm = useDebounce(searchTerm, delay)

  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setResults(initialValue)
      setIsLoading(false)
      setError(null)
      return
    }

    const performSearch = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const searchResults = await searchFunction(debouncedSearchTerm)
        setResults(searchResults)
      } catch (err) {
        setError(err instanceof Error ? err.message : '検索中にエラーが発生しました')
        setResults(initialValue)
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [debouncedSearchTerm, searchFunction, initialValue])

  return {
    searchTerm,
    setSearchTerm,
    results,
    isLoading,
    error,
    clearResults: () => {
      setSearchTerm('')
      setResults(initialValue)
      setError(null)
    }
  }
}

/**
 * 複合フィルター機能を提供するカスタムフック
 */
export function useAdvancedSearch<T>(
  searchFunction: (filters: any) => Promise<{ records: T[]; hasMore: boolean; totalCount: number }>,
  initialFilters: any = {},
  delay: number = 300
) {
  const [filters, setFilters] = useState(initialFilters)
  const [results, setResults] = useState<T[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastDocument, setLastDocument] = useState<any>(null)

  const debouncedFilters = useDebounce(filters, delay)

  // フィルターの更新
  const updateFilter = (key: string, value: any) => {
    setFilters((prev: any) => ({
      ...prev,
      [key]: value
    }))
    setLastDocument(null) // フィルター変更時はページネーションをリセット
  }

  // フィルターのクリア
  const clearFilters = () => {
    setFilters(initialFilters)
    setResults([])
    setLastDocument(null)
    setError(null)
  }

  // 初回検索・フィルター変更時の検索
  useEffect(() => {
    const performSearch = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const searchResults = await searchFunction(debouncedFilters)
        setResults(searchResults.records)
        setHasMore(searchResults.hasMore)
        setTotalCount(searchResults.totalCount)
        setLastDocument(searchResults.records.length > 0 ? 'reset' : null)
      } catch (err) {
        setError(err instanceof Error ? err.message : '検索中にエラーが発生しました')
        setResults([])
        setHasMore(false)
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [debouncedFilters, searchFunction])

  // 追加読み込み（ページネーション）
  const loadMore = async () => {
    if (!hasMore || isLoading) return

    setIsLoading(true)
    try {
      const searchResults = await searchFunction({
        ...debouncedFilters,
        lastRecord: lastDocument
      })

      setResults(prev => [...prev, ...searchResults.records])
      setHasMore(searchResults.hasMore)
      setLastDocument(searchResults.records.length > 0 ? 
        searchResults.records[searchResults.records.length - 1] : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '追加データの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    filters,
    updateFilter,
    clearFilters,
    results,
    hasMore,
    totalCount,
    isLoading,
    error,
    loadMore
  }
}