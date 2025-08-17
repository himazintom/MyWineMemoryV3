import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useDebounceSearch } from '../../hooks/useDebounce'
import tastingRecordService from '../../services/tastingRecordService'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import TagInput from '../../components/common/TagInput'
import type { WineType, WineColor, PopularWine } from '../../types'

interface NewWineForm {
  wineName: string
  producer: string
  country: string
  region: string
  type: WineType
  color: WineColor
  vintage?: number
  grapes: string[]
  appellationAOC: string
  price?: number
  purchaseLocation: string
  notes: string
}

export default function SelectWinePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userProfile } = useAuth()
  
  const [popularWines, setPopularWines] = useState<PopularWine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewWineForm, setShowNewWineForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // デバウンス検索フックを使用
  const {
    searchTerm,
    setSearchTerm,
    results: searchResults,
    isLoading: isSearching,
    error: searchError
  } = useDebounceSearch<PopularWine>(
    async (term: string) => {
      if (!userProfile?.uid) return []
      return await tastingRecordService.searchWines(term, userProfile.uid)
    },
    [],
    300
  )

  const [newWine, setNewWine] = useState<NewWineForm>({
    wineName: '',
    producer: '',
    country: '',
    region: '',
    type: 'red',
    color: 'medium',
    grapes: [],
    appellationAOC: '',
    purchaseLocation: '',
    notes: ''
  })

  // Get return URL from location state
  const returnTo = location.state?.returnTo || '/records/add'

  // 人気ワインを取得
  useEffect(() => {
    const loadPopularWines = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const wines = await tastingRecordService.getPopularWines(userProfile?.uid, 20)
        setPopularWines(wines)
      } catch (err) {
        console.error('Failed to load popular wines:', err)
        setError('人気ワインの読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    loadPopularWines()
  }, [userProfile?.uid])

  // 検索エラーを統合
  const combinedError = error || searchError

  // 表示するワインリスト
  const displayedWines = useMemo(() => {
    if (searchTerm.trim()) {
      return searchResults
    }
    return popularWines
  }, [searchTerm, searchResults, popularWines])

  const handleWineSelect = (wine: PopularWine) => {
    navigate(returnTo, { 
      state: { 
        selectedWine: wine 
      }
    })
  }

  const handleNewWineSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newWine.wineName || !newWine.producer) {
      setError('ワイン名と生産者は必須です')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // 新規ワインデータをPopularWine形式に変換
      const newWineData: PopularWine = {
        wineName: newWine.wineName,
        producer: newWine.producer,
        country: newWine.country,
        region: newWine.region,
        type: newWine.type,
        color: newWine.color,
        vintage: newWine.vintage,
        alcoholContent: undefined,
        price: newWine.price,
        recordCount: 0,
        averageRating: 0,
        lastTasted: new Date()
      }

      navigate(returnTo, {
        state: {
          selectedWine: newWineData
        }
      })
    } catch (err) {
      console.error('Failed to create wine:', err)
      setError('ワインの作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }


  if (!userProfile) {
    return (
      <div className="select-wine-page">
        <div className="page-header">
          <h1>ワイン選択</h1>
        </div>
        <ErrorMessage message="ログインが必要です" />
      </div>
    )
  }

  return (
    <div className="select-wine-page">
      <div className="page-header">
        <h1>ワイン選択</h1>
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
        >
          戻る
        </Button>
      </div>

      {combinedError && (
        <ErrorMessage 
          message={combinedError} 
          onDismiss={() => setError(null)}
        />
      )}

      {/* Search Section */}
      <div className="search-section">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="ワイン名または生産者で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {isSearching && <LoadingSpinner size="small" />}
        </div>
      </div>

      {/* Wine List Section */}
      <div className="popular-wines-section">
        <div className="section-header">
          <h2>
            {searchTerm.trim() ? '検索結果' : 'あなたの人気ワイン'}
          </h2>
          <div className="wine-count">
            {displayedWines.length}件
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : displayedWines.length > 0 ? (
          <div className="wine-grid">
            {displayedWines.map((wine, index) => (
              <div 
                key={`${wine.wineName}-${wine.producer}-${index}`}
                className="wine-card"
                onClick={() => handleWineSelect(wine)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleWineSelect(wine)
                  }
                }}
                aria-label={`${wine.wineName} by ${wine.producer}を選択`}
              >
                <div className="wine-info">
                  <h3 className="wine-name">{wine.wineName}</h3>
                  <p className="wine-producer">{wine.producer}</p>
                  {(wine.country || wine.region) && (
                    <p className="wine-origin">
                      {wine.country}{wine.region && `, ${wine.region}`}
                    </p>
                  )}
                  {wine.vintage && (
                    <p className="wine-vintage">{wine.vintage}</p>
                  )}
                </div>
                <div className="wine-stats">
                  <div className="stat">
                    <span className="stat-label">記録数</span>
                    <span className="stat-value">{wine.recordCount}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">平均評価</span>
                    <span className="stat-value">{wine.averageRating.toFixed(1)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">最終記録</span>
                    <span className="stat-value">
                      {wine.lastTasted.toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : searchTerm.trim() ? (
          <div className="empty-state">
            <p>「{searchTerm}」に一致するワインが見つかりませんでした</p>
          </div>
        ) : (
          <div className="empty-state">
            <p>まだワインの記録がありません</p>
          </div>
        )}
      </div>

      {/* New Wine Section */}
      <div className="new-wine-section">
        {!showNewWineForm ? (
          <Button
            variant="secondary"
            onClick={() => setShowNewWineForm(true)}
            className="new-wine-button"
          >
            新しいワインを追加
          </Button>
        ) : (
          <div className="new-wine-form-section">
          <h2>新しいワイン情報</h2>
          <form onSubmit={handleNewWineSubmit} className="new-wine-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="wine-name">
                  ワイン名 <span className="required-asterisk">*</span>
                </label>
                <input
                  id="wine-name"
                  type="text"
                  value={newWine.wineName}
                  onChange={(e) => setNewWine(prev => ({ ...prev, wineName: e.target.value }))}
                  required
                  placeholder="シャトー・マルゴー"
                />
              </div>

              <div className="form-group">
                <label htmlFor="producer">
                  生産者 <span className="required-asterisk">*</span>
                </label>
                <input
                  id="producer"
                  type="text"
                  value={newWine.producer}
                  onChange={(e) => setNewWine(prev => ({ ...prev, producer: e.target.value }))}
                  required
                  placeholder="シャトー・マルゴー"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="country">国</label>
                <input
                  id="country"
                  type="text"
                  value={newWine.country}
                  onChange={(e) => setNewWine(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="フランス"
                />
              </div>

              <div className="form-group">
                <label htmlFor="region">地域</label>
                <input
                  id="region"
                  type="text"
                  value={newWine.region}
                  onChange={(e) => setNewWine(prev => ({ ...prev, region: e.target.value }))}
                  placeholder="ボルドー"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="wine-type">タイプ</label>
                <select
                  id="wine-type"
                  value={newWine.type}
                  onChange={(e) => setNewWine(prev => ({ ...prev, type: e.target.value as WineType }))}
                >
                  <option value="red">赤ワイン</option>
                  <option value="white">白ワイン</option>
                  <option value="rose">ロゼワイン</option>
                  <option value="sparkling">スパークリングワイン</option>
                  <option value="fortified">酒精強化ワイン</option>
                  <option value="dessert">デザートワイン</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="wine-color">色</label>
                <select
                  id="wine-color"
                  value={newWine.color}
                  onChange={(e) => setNewWine(prev => ({ ...prev, color: e.target.value as WineColor }))}
                >
                  <option value="light">淡い</option>
                  <option value="medium">中程度</option>
                  <option value="deep">濃い</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="vintage">ヴィンテージ</label>
                <input
                  id="vintage"
                  type="number"
                  value={newWine.vintage || ''}
                  onChange={(e) => setNewWine(prev => ({ 
                    ...prev, 
                    vintage: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  min="1800"
                  max={new Date().getFullYear()}
                  placeholder="2020"
                />
              </div>
            </div>

            <div className="form-group">
              <TagInput
                label="ブドウ品種"
                tags={newWine.grapes}
                onChange={(grapes) => setNewWine(prev => ({ ...prev, grapes }))}
                placeholder="ブドウ品種を入力してEnterで追加"
                maxTags={10}
              />
            </div>

            <div className="form-group">
              <label htmlFor="appellation">アペラシオン/AOC</label>
              <input
                id="appellation"
                type="text"
                value={newWine.appellationAOC}
                onChange={(e) => setNewWine(prev => ({ ...prev, appellationAOC: e.target.value }))}
                placeholder="マルゴー AOC"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">価格（円）</label>
                <input
                  id="price"
                  type="number"
                  value={newWine.price || ''}
                  onChange={(e) => setNewWine(prev => ({ 
                    ...prev, 
                    price: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  min="0"
                  placeholder="5000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="purchase-location">購入場所</label>
                <input
                  id="purchase-location"
                  type="text"
                  value={newWine.purchaseLocation}
                  onChange={(e) => setNewWine(prev => ({ ...prev, purchaseLocation: e.target.value }))}
                  placeholder="○○酒店"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">メモ</label>
              <textarea
                id="notes"
                value={newWine.notes}
                onChange={(e) => setNewWine(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="このワインについてのメモ..."
                rows={3}
              />
            </div>

            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowNewWineForm(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={!newWine.wineName || !newWine.producer}
              >
                このワインを使用
              </Button>
            </div>
          </form>
          </div>
        )}
      </div>
    </div>
  )
}