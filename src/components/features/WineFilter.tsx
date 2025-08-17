import { useState, useEffect, useMemo } from 'react'
import type { TastingRecord } from '../../types/tasting'

interface WineFilterProps {
  records: TastingRecord[]
  onFilterChange: (filtered: TastingRecord[]) => void
  showCount?: boolean
}

interface FilterState {
  // 種類・産地・品種タブ
  types: string[]
  countries: string[]
  regions: string[]
  grapes: string[]
  
  // 価格・年代タブ
  priceMin?: number
  priceMax?: number
  vintageMin?: number
  vintageMax?: number
  
  // 評価タブ
  ratingMin?: number
  ratingMax?: number
  
  // その他タブ
  mode?: 'quick' | 'detailed' | ''
  isPublic?: boolean | null
  searchTerm: string
}

export default function WineFilter({ 
  records, 
  onFilterChange, 
  showCount = true 
}: WineFilterProps) {
  const [activeTab, setActiveTab] = useState<'type' | 'price' | 'rating' | 'other'>('type')
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    countries: [],
    regions: [],
    grapes: [],
    searchTerm: ''
  })
  
  // 利用可能なオプションを動的に計算
  const availableOptions = useMemo(() => {
    const types = new Set<string>()
    const countries = new Set<string>()
    const regions = new Set<string>()
    const grapes = new Set<string>()
    let minPrice = Infinity
    let maxPrice = 0
    let minVintage = Infinity
    let maxVintage = 0
    
    records.forEach(record => {
      types.add(record.type)
      if (record.country) countries.add(record.country)
      if (record.region) regions.add(record.region)
      if (record.grapes) {
        record.grapes.forEach(grape => grapes.add(grape))
      }
      if (record.price) {
        minPrice = Math.min(minPrice, record.price)
        maxPrice = Math.max(maxPrice, record.price)
      }
      if (record.vintage) {
        minVintage = Math.min(minVintage, record.vintage)
        maxVintage = Math.max(maxVintage, record.vintage)
      }
    })
    
    return {
      types: Array.from(types).sort(),
      countries: Array.from(countries).sort(),
      regions: Array.from(regions).sort(),
      grapes: Array.from(grapes).sort(),
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice
      },
      vintageRange: {
        min: minVintage === Infinity ? 1900 : minVintage,
        max: maxVintage === 0 ? new Date().getFullYear() : maxVintage
      }
    }
  }, [records])
  
  // フィルタリング処理
  useEffect(() => {
    let filtered = [...records]
    
    // タイプフィルター
    if (filters.types.length > 0) {
      filtered = filtered.filter(record => 
        filters.types.includes(record.type)
      )
    }
    
    // 国フィルター
    if (filters.countries.length > 0) {
      filtered = filtered.filter(record => 
        record.country && filters.countries.includes(record.country)
      )
    }
    
    // 地域フィルター
    if (filters.regions.length > 0) {
      filtered = filtered.filter(record => 
        record.region && filters.regions.includes(record.region)
      )
    }
    
    // 品種フィルター
    if (filters.grapes.length > 0) {
      filtered = filtered.filter(record => 
        record.grapes && record.grapes.some(grape => 
          filters.grapes.includes(grape)
        )
      )
    }
    
    // 価格フィルター
    if (filters.priceMin !== undefined) {
      filtered = filtered.filter(record => 
        record.price && record.price >= filters.priceMin!
      )
    }
    if (filters.priceMax !== undefined) {
      filtered = filtered.filter(record => 
        record.price && record.price <= filters.priceMax!
      )
    }
    
    // ヴィンテージフィルター
    if (filters.vintageMin !== undefined) {
      filtered = filtered.filter(record => 
        record.vintage && record.vintage >= filters.vintageMin!
      )
    }
    if (filters.vintageMax !== undefined) {
      filtered = filtered.filter(record => 
        record.vintage && record.vintage <= filters.vintageMax!
      )
    }
    
    // 評価フィルター
    if (filters.ratingMin !== undefined) {
      filtered = filtered.filter(record => 
        record.rating >= filters.ratingMin!
      )
    }
    if (filters.ratingMax !== undefined) {
      filtered = filtered.filter(record => 
        record.rating <= filters.ratingMax!
      )
    }
    
    // モードフィルター
    if (filters.mode) {
      filtered = filtered.filter(record => 
        record.mode === filters.mode
      )
    }
    
    // 公開設定フィルター
    if (filters.isPublic !== null && filters.isPublic !== undefined) {
      filtered = filtered.filter(record => 
        record.isPublic === filters.isPublic
      )
    }
    
    // 検索フィルター
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(record => 
        record.wineName.toLowerCase().includes(searchLower) ||
        record.producer.toLowerCase().includes(searchLower) ||
        (record.notes && record.notes.toLowerCase().includes(searchLower))
      )
    }
    
    onFilterChange(filtered)
  }, [filters, records, onFilterChange])
  
  // 選択トグル
  const toggleSelection = (category: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentValues = prev[category] as string[]
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      
      return { ...prev, [category]: newValues }
    })
  }
  
  // フィルターリセット
  const resetFilters = () => {
    setFilters({
      types: [],
      countries: [],
      regions: [],
      grapes: [],
      searchTerm: ''
    })
  }
  
  // アクティブフィルター数
  const activeFilterCount = 
    filters.types.length +
    filters.countries.length +
    filters.regions.length +
    filters.grapes.length +
    (filters.priceMin !== undefined ? 1 : 0) +
    (filters.priceMax !== undefined ? 1 : 0) +
    (filters.vintageMin !== undefined ? 1 : 0) +
    (filters.vintageMax !== undefined ? 1 : 0) +
    (filters.ratingMin !== undefined ? 1 : 0) +
    (filters.ratingMax !== undefined ? 1 : 0) +
    (filters.mode ? 1 : 0) +
    (filters.isPublic !== null && filters.isPublic !== undefined ? 1 : 0) +
    (filters.searchTerm ? 1 : 0)

  const typeLabels: Record<string, string> = {
    red: '赤ワイン',
    white: '白ワイン',
    rose: 'ロゼワイン',
    sparkling: 'スパークリング',
    fortified: '酒精強化',
    dessert: 'デザートワイン'
  }

  return (
    <div className="wine-filter">
      {/* フィルターヘッダー */}
      <div className="filter-header">
        <h3>フィルター</h3>
        {activeFilterCount > 0 && (
          <div className="filter-status">
            <span className="filter-count">{activeFilterCount}個のフィルター</span>
            <button 
              className="reset-button"
              onClick={resetFilters}
            >
              リセット
            </button>
          </div>
        )}
      </div>

      {/* タブ */}
      <div className="filter-tabs">
        <button
          className={`tab-button ${activeTab === 'type' ? 'active' : ''}`}
          onClick={() => setActiveTab('type')}
        >
          種類・産地・品種
        </button>
        <button
          className={`tab-button ${activeTab === 'price' ? 'active' : ''}`}
          onClick={() => setActiveTab('price')}
        >
          価格・年代
        </button>
        <button
          className={`tab-button ${activeTab === 'rating' ? 'active' : ''}`}
          onClick={() => setActiveTab('rating')}
        >
          評価
        </button>
        <button
          className={`tab-button ${activeTab === 'other' ? 'active' : ''}`}
          onClick={() => setActiveTab('other')}
        >
          その他
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="filter-content">
        {/* 種類・産地・品種タブ */}
        {activeTab === 'type' && (
          <div className="filter-section">
            {/* ワインタイプ */}
            <div className="filter-group">
              <h4>ワインタイプ</h4>
              <div className="filter-options">
                {availableOptions.types.map(type => (
                  <label key={type} className="filter-option">
                    <input
                      type="checkbox"
                      checked={filters.types.includes(type)}
                      onChange={() => toggleSelection('types', type)}
                    />
                    <span>{typeLabels[type] || type}</span>
                    {showCount && (
                      <span className="option-count">
                        ({records.filter(r => r.type === type).length})
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* 国 */}
            {availableOptions.countries.length > 0 && (
              <div className="filter-group">
                <h4>国</h4>
                <div className="filter-options scrollable">
                  {availableOptions.countries.map(country => (
                    <label key={country} className="filter-option">
                      <input
                        type="checkbox"
                        checked={filters.countries.includes(country)}
                        onChange={() => toggleSelection('countries', country)}
                      />
                      <span>{country}</span>
                      {showCount && (
                        <span className="option-count">
                          ({records.filter(r => r.country === country).length})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 地域 */}
            {availableOptions.regions.length > 0 && (
              <div className="filter-group">
                <h4>地域</h4>
                <div className="filter-options scrollable">
                  {availableOptions.regions.map(region => (
                    <label key={region} className="filter-option">
                      <input
                        type="checkbox"
                        checked={filters.regions.includes(region)}
                        onChange={() => toggleSelection('regions', region)}
                      />
                      <span>{region}</span>
                      {showCount && (
                        <span className="option-count">
                          ({records.filter(r => r.region === region).length})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 品種 */}
            {availableOptions.grapes.length > 0 && (
              <div className="filter-group">
                <h4>品種</h4>
                <div className="filter-options scrollable">
                  {availableOptions.grapes.map(grape => (
                    <label key={grape} className="filter-option">
                      <input
                        type="checkbox"
                        checked={filters.grapes.includes(grape)}
                        onChange={() => toggleSelection('grapes', grape)}
                      />
                      <span>{grape}</span>
                      {showCount && (
                        <span className="option-count">
                          ({records.filter(r => r.grapes?.includes(grape)).length})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 価格・年代タブ */}
        {activeTab === 'price' && (
          <div className="filter-section">
            {/* 価格範囲 */}
            <div className="filter-group">
              <h4>価格範囲</h4>
              <div className="range-inputs">
                <input
                  type="number"
                  placeholder={`最小: ¥${availableOptions.priceRange.min}`}
                  value={filters.priceMin || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priceMin: e.target.value ? Number(e.target.value) : undefined
                  }))}
                  className="range-input"
                />
                <span className="range-separator">〜</span>
                <input
                  type="number"
                  placeholder={`最大: ¥${availableOptions.priceRange.max}`}
                  value={filters.priceMax || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priceMax: e.target.value ? Number(e.target.value) : undefined
                  }))}
                  className="range-input"
                />
              </div>
            </div>

            {/* ヴィンテージ */}
            <div className="filter-group">
              <h4>ヴィンテージ</h4>
              <div className="range-inputs">
                <input
                  type="number"
                  placeholder={`最小: ${availableOptions.vintageRange.min}`}
                  value={filters.vintageMin || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    vintageMin: e.target.value ? Number(e.target.value) : undefined
                  }))}
                  className="range-input"
                />
                <span className="range-separator">〜</span>
                <input
                  type="number"
                  placeholder={`最大: ${availableOptions.vintageRange.max}`}
                  value={filters.vintageMax || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    vintageMax: e.target.value ? Number(e.target.value) : undefined
                  }))}
                  className="range-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* 評価タブ */}
        {activeTab === 'rating' && (
          <div className="filter-section">
            <div className="filter-group">
              <h4>評価範囲</h4>
              <div className="rating-filter">
                <div className="rating-slider">
                  <label>
                    最小評価: {filters.ratingMin || 0}
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={filters.ratingMin || 0}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        ratingMin: Number(e.target.value) || undefined
                      }))}
                      className="slider"
                    />
                  </label>
                </div>
                <div className="rating-slider">
                  <label>
                    最大評価: {filters.ratingMax || 10}
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={filters.ratingMax || 10}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        ratingMax: Number(e.target.value) || undefined
                      }))}
                      className="slider"
                    />
                  </label>
                </div>
                <div className="rating-display">
                  <span className="rating-range">
                    {filters.ratingMin || 0} 〜 {filters.ratingMax || 10}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* その他タブ */}
        {activeTab === 'other' && (
          <div className="filter-section">
            {/* 検索 */}
            <div className="filter-group">
              <h4>キーワード検索</h4>
              <input
                type="text"
                placeholder="ワイン名、生産者、メモで検索..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  searchTerm: e.target.value
                }))}
                className="search-input"
              />
            </div>

            {/* 記録モード */}
            <div className="filter-group">
              <h4>記録モード</h4>
              <div className="filter-options">
                <label className="filter-option">
                  <input
                    type="radio"
                    name="mode"
                    checked={filters.mode === ''}
                    onChange={() => setFilters(prev => ({ ...prev, mode: '' }))}
                  />
                  <span>すべて</span>
                </label>
                <label className="filter-option">
                  <input
                    type="radio"
                    name="mode"
                    checked={filters.mode === 'quick'}
                    onChange={() => setFilters(prev => ({ ...prev, mode: 'quick' }))}
                  />
                  <span>クイック</span>
                </label>
                <label className="filter-option">
                  <input
                    type="radio"
                    name="mode"
                    checked={filters.mode === 'detailed'}
                    onChange={() => setFilters(prev => ({ ...prev, mode: 'detailed' }))}
                  />
                  <span>詳細</span>
                </label>
              </div>
            </div>

            {/* 公開設定 */}
            <div className="filter-group">
              <h4>公開設定</h4>
              <div className="filter-options">
                <label className="filter-option">
                  <input
                    type="radio"
                    name="public"
                    checked={filters.isPublic === null}
                    onChange={() => setFilters(prev => ({ ...prev, isPublic: null }))}
                  />
                  <span>すべて</span>
                </label>
                <label className="filter-option">
                  <input
                    type="radio"
                    name="public"
                    checked={filters.isPublic === true}
                    onChange={() => setFilters(prev => ({ ...prev, isPublic: true }))}
                  />
                  <span>公開</span>
                </label>
                <label className="filter-option">
                  <input
                    type="radio"
                    name="public"
                    checked={filters.isPublic === false}
                    onChange={() => setFilters(prev => ({ ...prev, isPublic: false }))}
                  />
                  <span>非公開</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}