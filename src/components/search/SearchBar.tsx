import { useState } from 'react'
import { useDebounceSearch } from '../../hooks/useDebounceSearch'
import type { SearchFilters } from '../../services/searchService'

interface SearchBarProps {
  onSearchResults?: (results: any) => void
  placeholder?: string
  showAdvancedFilters?: boolean
  className?: string
}

export default function SearchBar({
  onSearchResults,
  placeholder = 'ワイン名、生産者、地域で検索...',
  showAdvancedFilters = false,
  className = ''
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [localFilters, setLocalFilters] = useState<SearchFilters>({})

  const {
    searchResults,
    isSearching,
    searchError,
    searchTerm,
    setSearchTerm,
    setFilters,
    clearSearch
  } = useDebounceSearch({
    delay: 300,
    minSearchLength: 2,
    autoSearch: true
  })

  // 検索結果が更新されたら親コンポーネントに通知
  if (searchResults && onSearchResults) {
    onSearchResults(searchResults)
  }

  const handleFilterChange = (filterKey: keyof SearchFilters, value: any) => {
    const newFilters = { ...localFilters, [filterKey]: value }
    setLocalFilters(newFilters)
    setFilters(newFilters)
  }

  const clearAllFilters = () => {
    setLocalFilters({})
    setFilters({})
    clearSearch()
  }

  // アクティブなフィルターの数を計算
  const activeFilterCount = Object.values(localFilters).filter(v => 
    v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
  ).length

  return (
    <div className={`search-bar ${className}`}>
      {/* メイン検索バー */}
      <div className="search-bar-main">
        <div className="search-input-wrapper">
          <svg 
            className="search-icon" 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            fill="none"
          >
            <path 
              d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM15 15l4 4" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            className="search-input"
          />

          {(searchTerm || activeFilterCount > 0) && (
            <button
              onClick={clearAllFilters}
              className="search-clear"
              aria-label="検索をクリア"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path 
                  d="M15 5L5 15M5 5l10 10" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}

          {isSearching && (
            <div className="search-loading">
              <div className="spinner-small" />
            </div>
          )}
        </div>

        {showAdvancedFilters && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="filter-toggle-btn"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path 
                d="M3 5h14M5 10h10M7 15h6" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
            </svg>
            フィルター
            {activeFilterCount > 0 && (
              <span className="filter-count">{activeFilterCount}</span>
            )}
          </button>
        )}
      </div>

      {/* 詳細フィルター */}
      {showAdvancedFilters && showFilters && (
        <div className="search-filters">
          <div className="filter-grid">
            {/* ワインタイプ */}
            <div className="filter-group">
              <label>タイプ</label>
              <select
                value={localFilters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
              >
                <option value="">すべて</option>
                <option value="red">赤</option>
                <option value="white">白</option>
                <option value="rose">ロゼ</option>
                <option value="sparkling">スパークリング</option>
                <option value="fortified">酒精強化</option>
                <option value="dessert">デザート</option>
              </select>
            </div>

            {/* 国 */}
            <div className="filter-group">
              <label>国</label>
              <input
                type="text"
                value={localFilters.country || ''}
                onChange={(e) => handleFilterChange('country', e.target.value || undefined)}
                placeholder="フランス"
              />
            </div>

            {/* 地域 */}
            <div className="filter-group">
              <label>地域</label>
              <input
                type="text"
                value={localFilters.region || ''}
                onChange={(e) => handleFilterChange('region', e.target.value || undefined)}
                placeholder="ボルドー"
              />
            </div>

            {/* 価格帯 */}
            <div className="filter-group">
              <label>価格帯</label>
              <div className="price-range">
                <input
                  type="number"
                  value={localFilters.minPrice || ''}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="最低"
                  min="0"
                />
                <span>〜</span>
                <input
                  type="number"
                  value={localFilters.maxPrice || ''}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="最高"
                  min="0"
                />
              </div>
            </div>

            {/* 評価 */}
            <div className="filter-group">
              <label>評価</label>
              <div className="rating-range">
                <input
                  type="number"
                  value={localFilters.minRating || ''}
                  onChange={(e) => handleFilterChange('minRating', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="最低"
                  min="0"
                  max="10"
                  step="0.5"
                />
                <span>〜</span>
                <input
                  type="number"
                  value={localFilters.maxRating || ''}
                  onChange={(e) => handleFilterChange('maxRating', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="最高"
                  min="0"
                  max="10"
                  step="0.5"
                />
              </div>
            </div>

            {/* ヴィンテージ */}
            <div className="filter-group">
              <label>ヴィンテージ</label>
              <input
                type="number"
                value={localFilters.vintage || ''}
                onChange={(e) => handleFilterChange('vintage', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2020"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>
          </div>

          {/* アクティブフィルター表示 */}
          {activeFilterCount > 0 && (
            <div className="active-filters">
              <span className="active-filters-label">適用中のフィルター:</span>
              {Object.entries(localFilters).map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return null
                
                return (
                  <span key={key} className="filter-tag">
                    {key}: {Array.isArray(value) ? value.join(', ') : value}
                    <button
                      onClick={() => handleFilterChange(key as keyof SearchFilters, undefined)}
                      className="filter-tag-remove"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
              <button
                onClick={clearAllFilters}
                className="clear-all-filters"
              >
                すべてクリア
              </button>
            </div>
          )}
        </div>
      )}

      {/* エラー表示 */}
      {searchError && (
        <div className="search-error">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path 
              d="M8 5v3m0 3h.01M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
          </svg>
          {searchError}
        </div>
      )}

      <style jsx>{`
        .search-bar {
          width: 100%;
        }

        .search-bar-main {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .search-input-wrapper {
          flex: 1;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 3rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          font-size: 1rem;
          color: var(--text-primary);
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
        }

        .search-clear {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem;
          transition: color 0.2s;
        }

        .search-clear:hover {
          color: var(--text-primary);
        }

        .search-loading {
          position: absolute;
          right: 3rem;
          top: 50%;
          transform: translateY(-50%);
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .filter-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-toggle-btn:hover {
          background: var(--surface-hover);
        }

        .filter-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background: var(--primary);
          color: white;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .search-filters {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .filter-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .filter-group input,
        .filter-group select {
          width: 100%;
          padding: 0.5rem;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 0.25rem;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .price-range,
        .rating-range {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .price-range input,
        .rating-range input {
          flex: 1;
        }

        .active-filters {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }

        .active-filters-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-right: 0.5rem;
        }

        .filter-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: var(--primary-light);
          color: var(--primary);
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }

        .filter-tag-remove {
          background: none;
          border: none;
          color: var(--primary);
          cursor: pointer;
          padding: 0;
          font-size: 1.25rem;
          line-height: 1;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .filter-tag-remove:hover {
          opacity: 1;
        }

        .clear-all-filters {
          padding: 0.25rem 0.75rem;
          background: none;
          border: 1px solid var(--border);
          border-radius: 0.25rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-all-filters:hover {
          background: var(--surface-hover);
          color: var(--text-primary);
        }

        .search-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--error-light);
          color: var(--error);
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}