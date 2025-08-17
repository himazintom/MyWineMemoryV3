import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import tastingRecordService from '../../services/tastingRecordService'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import type { TastingRecord } from '../../types'

interface FilterOptions {
  searchTerm: string
  sortBy: 'tastingDate' | 'createdAt' | 'rating' | 'wineName'
  sortOrder: 'asc' | 'desc'
  groupBy: 'none' | 'wine' | 'month'
  showPublicOnly: boolean
}

interface GroupedRecord {
  groupKey: string
  groupName: string
  records: TastingRecord[]
  totalRecords: number
  avgRating: number
  latestDate: Date
}

export default function RecordsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userProfile } = useAuth()
  
  const [records, setRecords] = useState<TastingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    sortBy: 'tastingDate',
    sortOrder: 'desc',
    groupBy: 'wine',
    showPublicOnly: false
  })

  // Success message from record creation
  const successMessage = location.state?.message
  const newRecordId = location.state?.newRecordId

  // Load user records
  useEffect(() => {
    if (!userProfile) return

    const loadRecords = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const { records: userRecords } = await tastingRecordService.getUserRecords(userProfile.uid)
        setRecords(userRecords)
      } catch (err) {
        console.error('Failed to load records:', err)
        setError('記録の読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    loadRecords()
  }, [userProfile])

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let filtered = records

    // Search filter
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(record =>
        record.wineName.toLowerCase().includes(searchLower) ||
        record.producer.toLowerCase().includes(searchLower) ||
        (record.country || '').toLowerCase().includes(searchLower) ||
        (record.region || '').toLowerCase().includes(searchLower) ||
        (record.quickNotes || record.notes || '').toLowerCase().includes(searchLower) ||
        (record.tags || []).some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Public/private filter
    if (filters.showPublicOnly) {
      filtered = filtered.filter(record => record.isPublic)
    }

    // Sort records
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (filters.sortBy) {
        case 'tastingDate':
          comparison = new Date(a.tastingDate).getTime() - new Date(b.tastingDate).getTime()
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'rating':
          comparison = a.rating - b.rating
          break
        case 'wineName':
          comparison = a.wineName.localeCompare(b.wineName)
          break
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [records, filters])

  // Group records
  const groupedRecords = useMemo((): GroupedRecord[] => {
    if (filters.groupBy === 'none') {
      return [{
        groupKey: 'all',
        groupName: '全ての記録',
        records: filteredRecords,
        totalRecords: filteredRecords.length,
        avgRating: filteredRecords.length > 0 
          ? filteredRecords.reduce((sum, r) => sum + r.rating, 0) / filteredRecords.length 
          : 0,
        latestDate: filteredRecords.length > 0 
          ? new Date(Math.max(...filteredRecords.map(r => new Date(r.tastingDate).getTime())))
          : new Date()
      }]
    }

    const groups = new Map<string, TastingRecord[]>()

    filteredRecords.forEach(record => {
      let groupKey: string
      
      if (filters.groupBy === 'wine') {
        groupKey = `${record.wineName}_${record.producer}`
      } else if (filters.groupBy === 'month') {
        const date = new Date(record.tastingDate)
        groupKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      } else {
        groupKey = 'default'
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(record)
    })

    const result: GroupedRecord[] = Array.from(groups.entries()).map(([groupKey, groupRecords]) => {
      const avgRating = groupRecords.reduce((sum, r) => sum + r.rating, 0) / groupRecords.length
      const latestDate = new Date(Math.max(...groupRecords.map(r => new Date(r.tastingDate).getTime())))
      
      let groupName: string
      if (filters.groupBy === 'wine') {
        const firstRecord = groupRecords[0]
        groupName = `${firstRecord.wineName} (${firstRecord.producer})`
      } else if (filters.groupBy === 'month') {
        const [year, month] = groupKey.split('-')
        groupName = `${year}年${month}月`
      } else {
        groupName = groupKey
      }

      return {
        groupKey,
        groupName,
        records: groupRecords,
        totalRecords: groupRecords.length,
        avgRating,
        latestDate
      }
    })

    // Sort groups by latest date
    result.sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime())

    return result
  }, [filteredRecords, filters.groupBy])

  const handleFilterChange = (field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleRecordClick = (record: TastingRecord) => {
    navigate(`/records/${record.id}`)
  }

  const handleEditRecord = (e: React.MouseEvent, record: TastingRecord) => {
    e.stopPropagation()
    navigate(`/records/add`, { 
      state: { 
        editRecord: record,
        selectedWine: {
          wineName: record.wineName,
          producer: record.producer,
          country: record.country,
          region: record.region,
          type: record.type,
          color: record.color || record.type,
          vintage: record.vintage,
          alcoholContent: record.alcoholContent,
          price: record.price,
          recordCount: 0,
          averageRating: 0,
          lastTasted: new Date()
        }
      }
    })
  }

  const handleDeleteRecord = async (e: React.MouseEvent, record: TastingRecord) => {
    e.stopPropagation()
    
    if (!confirm(`「${record.wineName}」の記録を削除しますか？この操作は取り消せません。`)) {
      return
    }

    try {
      await tastingRecordService.deleteRecord(record.id)
      setRecords(prev => prev.filter(r => r.id !== record.id))
    } catch (err) {
      console.error('Failed to delete record:', err)
      setError('記録の削除に失敗しました')
    }
  }

  if (!userProfile) {
    return (
      <div className="records-page">
        <div className="page-header">
          <h1>テイスティング記録</h1>
        </div>
        <ErrorMessage message="ログインが必要です" />
      </div>
    )
  }

  return (
    <div className="records-page">
      <div className="page-header">
        <h1>テイスティング記録</h1>
        <div className="header-actions">
          <Button
            variant="primary"
            onClick={() => navigate('/records/add')}
          >
            新しい記録を追加
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)}
        />
      )}

      {/* Filters and Controls */}
      <div className="records-controls">
        <div className="search-section">
          <input
            type="search"
            placeholder="ワイン名、生産者、地域、メモで検索..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <div className="filter-group">
            <label htmlFor="sort-by">並び替え</label>
            <select
              id="sort-by"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value as FilterOptions['sortBy'])}
              className="filter-select"
            >
              <option value="tastingDate">テイスティング日時</option>
              <option value="createdAt">作成日時</option>
              <option value="rating">評価</option>
              <option value="wineName">ワイン名</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-order">順序</label>
            <select
              id="sort-order"
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
              className="filter-select"
            >
              <option value="desc">降順</option>
              <option value="asc">昇順</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="group-by">グループ化</label>
            <select
              id="group-by"
              value={filters.groupBy}
              onChange={(e) => handleFilterChange('groupBy', e.target.value as FilterOptions['groupBy'])}
              className="filter-select"
            >
              <option value="wine">ワイン別</option>
              <option value="month">月別</option>
              <option value="none">グループ化なし</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.showPublicOnly}
                onChange={(e) => handleFilterChange('showPublicOnly', e.target.checked)}
              />
              公開記録のみ
            </label>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="records-content">
        {isLoading ? (
          <LoadingSpinner />
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h2>テイスティング記録がありません</h2>
            <p>最初のワインテイスティング記録を作成してみましょう</p>
            <Button
              variant="primary"
              onClick={() => navigate('/records/add')}
            >
              記録を追加
            </Button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h2>検索条件に一致する記録がありません</h2>
            <p>検索条件を変更してもう一度お試しください</p>
          </div>
        ) : (
          <div className="records-list">
            {groupedRecords.map((group) => (
              <div key={group.groupKey} className="record-group">
                {filters.groupBy !== 'none' && (
                  <div className="group-header">
                    <div className="group-info">
                      <h2 className="group-name">{group.groupName}</h2>
                      <div className="group-stats">
                        <span className="stat">
                          {group.totalRecords}件の記録
                        </span>
                        <span className="stat">
                          平均評価: {group.avgRating.toFixed(1)}
                        </span>
                        <span className="stat">
                          最新: {group.latestDate.toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="records-grid">
                  {group.records.map((record) => (
                    <div
                      key={record.id}
                      className={`record-card ${newRecordId === record.id ? 'highlight' : ''}`}
                      onClick={() => handleRecordClick(record)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRecordClick(record)
                        }
                      }}
                    >
                      <div className="record-header">
                        <div className="wine-info">
                          <h3 className="wine-name">{record.wineName}</h3>
                          <p className="wine-producer">{record.producer}</p>
                          {(record.country || record.region) && (
                            <p className="wine-origin">
                              {record.country}{record.region && `, ${record.region}`}
                            </p>
                          )}
                          {record.vintage && (
                            <span className="wine-vintage">{record.vintage}</span>
                          )}
                        </div>
                        
                        <div className="record-actions">
                          <Button
                            variant="text"
                            size="sm"
                            onClick={(e) => handleEditRecord(e, record)}
                            aria-label="編集"
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="text"
                            size="sm"
                            onClick={(e) => handleDeleteRecord(e, record)}
                            aria-label="削除"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>

                      <div className="record-content">
                        <div className="rating-section">
                          <div className="rating-display">
                            <span className="rating-value">{record.rating.toFixed(1)}</span>
                            <span className="rating-max">/10</span>
                          </div>
                          <div className="rating-bar">
                            <div 
                              className="rating-fill"
                              style={{ width: `${(record.rating / 10) * 100}%` }}
                            />
                          </div>
                        </div>

                        {(record.quickNotes || record.notes) && (
                          <div className="notes-preview">
                            <p>{(record.quickNotes || record.notes || '').slice(0, 100)}{(record.quickNotes || record.notes || '').length > 100 ? '...' : ''}</p>
                          </div>
                        )}

                        {record.tags && record.tags.length > 0 && (
                          <div className="record-tags">
                            {record.tags?.slice(0, 3).map((tag, index) => (
                              <span key={index} className="tag">{tag}</span>
                            ))}
                            {record.tags && record.tags.length > 3 && (
                              <span className="tag-more">+{record.tags.length - 3}</span>
                            )}
                          </div>
                        )}

                        <div className="record-meta">
                          <div className="record-dates">
                            <span className="tasting-date">
                              テイスティング: {new Date(record.tastingDate).toLocaleDateString('ja-JP')}
                            </span>
                            <span className={`mode-badge mode-${record.mode}`}>
                              {record.mode === 'quick' ? 'クイック' : '詳細'}
                            </span>
                          </div>
                          <div className="record-status">
                            {record.isPublic ? (
                              <span className="public-badge">公開</span>
                            ) : (
                              <span className="private-badge">非公開</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}