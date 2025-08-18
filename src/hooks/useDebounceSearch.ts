import { useState, useEffect, useCallback, useRef } from 'react'
import searchService from '../services/searchService'
import type { SearchFilters, SearchOptions, SearchResult } from '../services/searchService'
import { useAuth } from '../contexts/AuthContext'

interface UseDebounceSearchOptions {
  delay?: number // デバウンス遅延時間（デフォルト: 300ms）
  minSearchLength?: number // 最小検索文字数（デフォルト: 2）
  autoSearch?: boolean // 自動検索を有効にするか（デフォルト: true）
}

interface UseDebounceSearchReturn {
  searchResults: SearchResult | null
  isSearching: boolean
  searchError: string | null
  searchTerm: string
  filters: SearchFilters
  setSearchTerm: (term: string) => void
  setFilters: (filters: SearchFilters) => void
  search: () => Promise<void>
  clearSearch: () => void
  hasMore: boolean
  loadMore: () => Promise<void>
}

/**
 * デバウンス検索カスタムフック
 * 検索入力を遅延させてAPIコールを最適化
 */
export function useDebounceSearch(
  options: UseDebounceSearchOptions = {}
): UseDebounceSearchReturn {
  const {
    delay = 300,
    minSearchLength = 2,
    autoSearch = true
  } = options

  const { userProfile } = useAuth()
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    limitCount: 20,
    orderByField: 'tastingDate',
    orderDirection: 'desc'
  })

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastDocumentRef = useRef<any>(null)

  /**
   * 検索実行
   */
  const executeSearch = useCallback(async (
    term: string,
    currentFilters: SearchFilters,
    append: boolean = false
  ) => {
    if (!userProfile) {
      setSearchError('ログインが必要です')
      return
    }

    // 検索文字数チェック
    if (term && term.length < minSearchLength) {
      setSearchResults(null)
      return
    }

    setIsSearching(true)
    setSearchError(null)

    try {
      const searchFilters: SearchFilters = {
        ...currentFilters,
        keyword: term || undefined
      }

      const searchOpts: SearchOptions = {
        ...searchOptions,
        lastDocument: append ? lastDocumentRef.current : undefined
      }

      // キーワード検索か複合条件検索かを判定
      const result = term
        ? await searchService.searchByKeyword(userProfile.uid, term, searchOpts)
        : await searchService.searchRecords(userProfile.uid, searchFilters, searchOpts)

      if (append && searchResults) {
        // 追加読み込みの場合
        setSearchResults({
          ...result,
          records: [...searchResults.records, ...result.records],
          totalCount: searchResults.totalCount + result.records.length
        })
      } else {
        // 新規検索の場合
        setSearchResults(result)
      }

      lastDocumentRef.current = result.lastDocument
    } catch (error) {
      console.error('Search error:', error)
      setSearchError(error instanceof Error ? error.message : '検索に失敗しました')
      setSearchResults(null)
    } finally {
      setIsSearching(false)
    }
  }, [userProfile, minSearchLength, searchOptions, searchResults])

  /**
   * デバウンス処理付き検索
   */
  const debouncedSearch = useCallback((term: string, currentFilters: SearchFilters) => {
    // 既存のタイマーをクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 新しいタイマーを設定
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(term, currentFilters)
    }, delay)
  }, [delay, executeSearch])

  /**
   * 検索条件が変更されたときの処理
   */
  useEffect(() => {
    if (!autoSearch) return

    // デバウンス検索を実行
    debouncedSearch(searchTerm, filters)

    // クリーンアップ
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchTerm, filters, autoSearch, debouncedSearch])

  /**
   * 手動検索実行
   */
  const search = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    await executeSearch(searchTerm, filters)
  }, [searchTerm, filters, executeSearch])

  /**
   * 検索結果クリア
   */
  const clearSearch = useCallback(() => {
    setSearchTerm('')
    setFilters({})
    setSearchResults(null)
    setSearchError(null)
    lastDocumentRef.current = null
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
  }, [])

  /**
   * 追加読み込み
   */
  const loadMore = useCallback(async () => {
    if (!searchResults?.hasMore || isSearching) return
    await executeSearch(searchTerm, filters, true)
  }, [searchResults, isSearching, searchTerm, filters, executeSearch])


  return {
    searchResults,
    isSearching,
    searchError,
    searchTerm,
    filters,
    setSearchTerm,
    setFilters,
    search,
    clearSearch,
    hasMore: searchResults?.hasMore || false,
    loadMore
  }
}

/**
 * 重複ワイン検出フック
 */
export function useDuplicateDetection() {
  const { userProfile } = useAuth()
  const [isChecking, setIsChecking] = useState(false)
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [similarWines, setSimilarWines] = useState<any[]>([])

  const checkDuplicates = useCallback(async (
    wineName: string,
    producer?: string,
    vintage?: number
  ) => {
    if (!userProfile || !wineName) return

    setIsChecking(true)
    try {
      const result = await searchService.detectDuplicates(
        userProfile.uid,
        wineName,
        producer,
        vintage
      )
      setDuplicates(result.duplicates)
      setSimilarWines(result.similarWines)
    } catch (error) {
      console.error('Duplicate check failed:', error)
      setDuplicates([])
      setSimilarWines([])
    } finally {
      setIsChecking(false)
    }
  }, [userProfile])

  const clearResults = useCallback(() => {
    setDuplicates([])
    setSimilarWines([])
  }, [])

  return {
    isChecking,
    duplicates,
    similarWines,
    checkDuplicates,
    clearResults
  }
}