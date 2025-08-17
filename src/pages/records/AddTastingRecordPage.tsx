import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import tastingRecordService from '../../services/tastingRecordService'
import gamificationService from '../../services/gamificationService'
import Button from '../../components/common/Button'
import ErrorMessage from '../../components/common/ErrorMessage'
import TagInput from '../../components/common/TagInput'
import type { 
  TastingRecord, 
  DetailedAnalysis, 
  TastingEnvironment, 
  WineType,
  WineColor 
} from '../../types'

interface TastingFormData {
  // ワイン基本情報
  wineName: string
  producer: string
  vintage?: number
  region: string
  country: string
  type: WineType
  color: WineColor
  alcoholContent?: number
  price?: number
  
  // テイスティング基本情報
  tastingDate: Date
  mode: 'quick' | 'detailed'
  rating: number
  quickNotes: string
  
  // 詳細分析
  detailedAnalysis?: DetailedAnalysis
  
  // 環境情報
  environment?: TastingEnvironment
  
  // メタデータ
  isPublic: boolean
  tags: string[]
}

export default function AddTastingRecordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { wineId } = useParams()
  const { userProfile } = useAuth()
  
  const [formData, setFormData] = useState<TastingFormData>({
    wineName: '',
    producer: '',
    region: '',
    country: '',
    type: 'red',
    color: 'medium',
    tastingDate: new Date(),
    mode: 'quick',
    rating: 5,
    quickNotes: '',
    isPublic: false,
    tags: [],
    detailedAnalysis: {
      appearance: {
        intensity: 3,
        transparency: 3,
        viscosity: 3,
        color: '',
        colorNotes: ''
      },
      aroma: {
        firstImpression: '',
        afterSwirling: '',
        intensity: 3,
        categories: {
          fruits: [],
          florals: [],
          spices: [],
          earthy: [],
          oaky: [],
          other: []
        }
      },
      taste: {
        attack: '',
        development: '',
        finish: '',
        finishLength: 3,
        balance: 3,
        complexity: 3
      },
      structure: {
        sweetness: 1,
        acidity: 3,
        tannin: 3,
        alcohol: 3,
        body: 3
      }
    },
    environment: {
      glassType: 'universal',
      servingTemperature: undefined,
      decanted: false,
      decantingTime: undefined,
      lighting: '',
      atmosphere: '',
      mood: '',
      companions: [],
      food: [],
      notes: ''
    }
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModeSelector, setShowModeSelector] = useState(true)

  // Get wine info from SelectWine page if available
  useEffect(() => {
    const selectedWine = location.state?.selectedWine
    if (selectedWine) {
      setFormData(prev => ({
        ...prev,
        wineName: selectedWine.wineName || '',
        producer: selectedWine.producer || '',
        country: selectedWine.country || '',
        region: selectedWine.region || '',
        type: selectedWine.type || 'still',
        color: selectedWine.color || 'red',
        vintage: selectedWine.vintage,
        alcoholContent: selectedWine.alcoholContent,
        price: selectedWine.price
      }))
      setShowModeSelector(false)
    }
  }, [location.state])

  const handleModeSelect = (mode: 'quick' | 'detailed') => {
    setFormData(prev => ({ ...prev, mode }))
    setShowModeSelector(false)
  }

  const handleBasicInfoChange = (field: keyof TastingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDetailedAnalysisChange = (section: keyof DetailedAnalysis, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      detailedAnalysis: {
        ...prev.detailedAnalysis!,
        [section]: {
          ...prev.detailedAnalysis![section],
          [field]: value
        }
      }
    }))
  }

  const handleAromaCategoryChange = (category: string, values: string[]) => {
    setFormData(prev => ({
      ...prev,
      detailedAnalysis: {
        ...prev.detailedAnalysis!,
        aroma: {
          ...prev.detailedAnalysis?.aroma,
          categories: {
            ...prev.detailedAnalysis?.aroma?.categories,
            [category]: values
          }
        }
      }
    }))
  }

  const handleEnvironmentChange = (field: keyof TastingEnvironment, value: any) => {
    setFormData(prev => ({
      ...prev,
      environment: {
        ...prev.environment!,
        [field]: value
      }
    }))
  }

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userProfile) {
      setError('ログインが必要です')
      return
    }

    if (!formData.wineName || !formData.producer) {
      setError('ワイン名と生産者は必須です')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const recordData: Omit<TastingRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        wineId,
        wineName: formData.wineName,
        producer: formData.producer,
        vintage: formData.vintage,
        region: formData.region,
        country: formData.country,
        type: formData.type,
        color: formData.color,
        alcoholContent: formData.alcoholContent,
        price: formData.price,
        tastingDate: formData.tastingDate,
        mode: formData.mode,
        rating: formData.rating,
        quickNotes: formData.quickNotes,
        detailedAnalysis: formData.mode === 'detailed' ? formData.detailedAnalysis : undefined,
        environment: formData.mode === 'detailed' ? formData.environment : undefined,
        isPublic: formData.isPublic,
        images: [],
        tags: formData.tags
      }

      // Save record
      const newRecord = await tastingRecordService.createRecord(userProfile.uid, recordData)

      // Award XP for creating a record
      const xpAmount = formData.mode === 'detailed' ? 20 : 10
      await gamificationService.awardXP(
        userProfile.uid,
        xpAmount,
        'tasting_record_create',
        `テイスティング記録「${formData.wineName}」を作成`,
        newRecord.id
      )

      // Update daily goals
      await gamificationService.updateGoalProgress(userProfile.uid, 'tasting', 1)

      // Update streak
      await gamificationService.updateStreak(userProfile.uid, 'tasting')

      navigate('/records', { 
        state: { 
          message: 'テイスティング記録が保存されました！',
          newRecordId: newRecord.id 
        }
      })
    } catch (err) {
      console.error('Failed to save tasting record:', err)
      setError('記録の保存に失敗しました。もう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectWine = () => {
    navigate('/wines/select', { 
      state: { returnTo: location.pathname } 
    })
  }

  if (!userProfile) {
    return (
      <div className="add-tasting-record-page">
        <div className="page-header">
          <h1>テイスティング記録作成</h1>
        </div>
        <ErrorMessage message="ログインが必要です" />
      </div>
    )
  }

  if (showModeSelector) {
    return (
      <div className="add-tasting-record-page">
        <div className="page-header">
          <h1>テイスティング記録作成</h1>
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            戻る
          </Button>
        </div>

        <div className="mode-selector">
          <h2>記録モードを選択</h2>
          <p className="mode-description">
            テイスティング記録の詳細レベルを選択してください
          </p>

          <div className="mode-cards">
            <div 
              className="mode-card quick-mode"
              onClick={() => handleModeSelect('quick')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleModeSelect('quick')
                }
              }}
            >
              <div className="mode-icon">⚡</div>
              <h3>クイックモード</h3>
              <p>簡単・素早く記録</p>
              <ul>
                <li>基本情報 + 評価</li>
                <li>簡単なメモ</li>
                <li>約2分で完了</li>
                <li>10 XP獲得</li>
              </ul>
              <div className="mode-badge">推奨</div>
            </div>

            <div 
              className="mode-card detailed-mode"
              onClick={() => handleModeSelect('detailed')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleModeSelect('detailed')
                }
              }}
            >
              <div className="mode-icon">🔬</div>
              <h3>詳細モード</h3>
              <p>本格的なテイスティングノート</p>
              <ul>
                <li>外観・香り・味わい分析</li>
                <li>構造分析</li>
                <li>環境記録</li>
                <li>20 XP獲得</li>
              </ul>
              <div className="mode-badge pro">プロ</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="add-tasting-record-page">
      <div className="page-header">
        <h1>
          {formData.mode === 'quick' ? 'クイック記録' : '詳細テイスティング記録'}
        </h1>
        <div className="header-actions">
          <Button
            variant="text"
            onClick={() => setShowModeSelector(true)}
          >
            モード変更
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            戻る
          </Button>
        </div>
      </div>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)}
        />
      )}

      <form onSubmit={handleQuickSubmit} className="tasting-record-form">
        {/* Wine Selection Section */}
        <div className="form-section">
          <div className="section-header">
            <h2>ワイン選択</h2>
            {!formData.wineName && (
              <Button
                type="button"
                variant="primary"
                onClick={handleSelectWine}
              >
                ワインを選択
              </Button>
            )}
          </div>

          {formData.wineName ? (
            <div className="selected-wine-info">
              <div className="wine-summary">
                <h3>{formData.wineName}</h3>
                <p>{formData.producer}</p>
                {(formData.country || formData.region) && (
                  <p className="wine-origin">
                    {formData.country}{formData.region && `, ${formData.region}`}
                  </p>
                )}
                {formData.vintage && (
                  <p className="wine-vintage">{formData.vintage}</p>
                )}
              </div>
              <Button
                type="button"
                variant="text"
                onClick={handleSelectWine}
                className="change-wine-btn"
              >
                変更
              </Button>
            </div>
          ) : (
            <div className="wine-selection-prompt">
              <p>まずはテイスティングするワインを選択してください</p>
              <Button
                type="button"
                variant="primary"
                onClick={handleSelectWine}
              >
                ワインを選択
              </Button>
            </div>
          )}
        </div>

        {/* Basic Tasting Info - Only show if wine is selected */}
        {formData.wineName && (
          <>
            <div className="form-section">
              <h2>基本テイスティング情報</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tasting-date">テイスティング日</label>
                  <input
                    id="tasting-date"
                    type="date"
                    value={formData.tastingDate.toISOString().split('T')[0]}
                    onChange={(e) => handleBasicInfoChange('tastingDate', new Date(e.target.value))}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="rating">
                    総合評価 <span className="required-asterisk">*</span>
                  </label>
                  <div className="rating-input-container">
                    <input
                      id="rating"
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={formData.rating}
                      onChange={(e) => handleBasicInfoChange('rating', parseFloat(e.target.value))}
                      className="rating-slider"
                    />
                    <div className="rating-display">
                      <span className="rating-value">{formData.rating.toFixed(1)}</span>
                      <span className="rating-label">
                        {formData.rating >= 9 ? '卓越' :
                         formData.rating >= 8 ? '優秀' :
                         formData.rating >= 7 ? '良い' :
                         formData.rating >= 6 ? '普通' :
                         formData.rating >= 5 ? 'まあまあ' : '期待以下'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="quick-notes">
                  テイスティングノート
                  {formData.mode === 'quick' && <span className="required-asterisk">*</span>}
                </label>
                <textarea
                  id="quick-notes"
                  value={formData.quickNotes}
                  onChange={(e) => handleBasicInfoChange('quickNotes', e.target.value)}
                  placeholder="このワインの印象、味わい、香りなどを自由に記録してください..."
                  rows={formData.mode === 'quick' ? 6 : 3}
                  required={formData.mode === 'quick'}
                />
              </div>

              <div className="form-group">
                <TagInput
                  label="タグ"
                  tags={formData.tags}
                  onChange={(tags) => handleBasicInfoChange('tags', tags)}
                  placeholder="味わいの特徴、シーンなどのタグを追加"
                  maxTags={10}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => handleBasicInfoChange('isPublic', e.target.checked)}
                  />
                  この記録を公開する
                </label>
                <p className="form-help">
                  公開すると他のユーザーがあなたの記録を参考にできます
                </p>
              </div>
            </div>

            {/* Detailed Analysis Section - Only in detailed mode */}
            {formData.mode === 'detailed' && (
              <>
                {/* Appearance Analysis */}
                <div className="form-section detailed-analysis" data-section="appearance">
                  <h2>外観分析</h2>
                  <p className="section-description">
                    ワインの視覚的特徴を評価します
                  </p>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="appearance-intensity">
                        色の濃さ (1-5)
                      </label>
                      <div className="slider-container">
                        <input
                          id="appearance-intensity"
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData.detailedAnalysis?.appearance?.intensity || 3}
                          onChange={(e) => handleDetailedAnalysisChange('appearance', 'intensity', parseInt(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>薄い</span>
                          <span>濃い</span>
                        </div>
                        <div className="slider-value">{formData.detailedAnalysis?.appearance?.intensity || 3}</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="appearance-transparency">
                        透明度 (1-5)
                      </label>
                      <div className="slider-container">
                        <input
                          id="appearance-transparency"
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData.detailedAnalysis?.appearance?.transparency || 3}
                          onChange={(e) => handleDetailedAnalysisChange('appearance', 'transparency', parseInt(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>濁っている</span>
                          <span>透明</span>
                        </div>
                        <div className="slider-value">{formData.detailedAnalysis?.appearance?.transparency || 3}</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="appearance-viscosity">
                        粘性 (1-5)
                      </label>
                      <div className="slider-container">
                        <input
                          id="appearance-viscosity"
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData.detailedAnalysis?.appearance?.viscosity || 3}
                          onChange={(e) => handleDetailedAnalysisChange('appearance', 'viscosity', parseInt(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>さらさら</span>
                          <span>とろみ</span>
                        </div>
                        <div className="slider-value">{formData.detailedAnalysis?.appearance?.viscosity || 3}</div>
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="appearance-color">色調</label>
                      <input
                        id="appearance-color"
                        type="text"
                        value={formData.detailedAnalysis?.appearance?.color || ''}
                        onChange={(e) => handleDetailedAnalysisChange('appearance', 'color', e.target.value)}
                        placeholder="例: ガーネット、レモンイエロー、ピンクゴールド"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="appearance-notes">色に関する詳細ノート</label>
                      <textarea
                        id="appearance-notes"
                        value={formData.detailedAnalysis?.appearance?.colorNotes || ''}
                        onChange={(e) => handleDetailedAnalysisChange('appearance', 'colorNotes', e.target.value)}
                        placeholder="縁の色、グラデーション、経年変化など..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Aroma Analysis */}
                <div className="form-section detailed-analysis" data-section="aroma">
                  <h2>香り分析</h2>
                  <p className="section-description">
                    ワインの香りの特徴を詳細に記録します
                  </p>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="aroma-intensity">
                        香りの強さ (1-5)
                      </label>
                      <div className="slider-container">
                        <input
                          id="aroma-intensity"
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData.detailedAnalysis?.aroma?.intensity || 3}
                          onChange={(e) => handleDetailedAnalysisChange('aroma', 'intensity', parseInt(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>弱い</span>
                          <span>強い</span>
                        </div>
                        <div className="slider-value">{formData.detailedAnalysis?.aroma?.intensity || 3}</div>
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="aroma-first">第一印象</label>
                      <textarea
                        id="aroma-first"
                        value={formData.detailedAnalysis?.aroma?.firstImpression || ''}
                        onChange={(e) => handleDetailedAnalysisChange('aroma', 'firstImpression', e.target.value)}
                        placeholder="グラスに注いだ直後の香りの印象..."
                        rows={2}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="aroma-swirling">スワリング後</label>
                      <textarea
                        id="aroma-swirling"
                        value={formData.detailedAnalysis?.aroma?.afterSwirling || ''}
                        onChange={(e) => handleDetailedAnalysisChange('aroma', 'afterSwirling', e.target.value)}
                        placeholder="グラスを回した後の香りの変化..."
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="aroma-categories">
                    <h3>香りのカテゴリー</h3>
                    <div className="category-grid">
                      <div className="category-group">
                        <TagInput
                          label="果実系"
                          tags={formData.detailedAnalysis?.aroma?.categories?.fruits || []}
                          onChange={(values) => handleAromaCategoryChange('fruits', values)}
                          placeholder="ベリー、柑橘、トロピカル..."
                          maxTags={8}
                        />
                      </div>

                      <div className="category-group">
                        <TagInput
                          label="花・植物系"
                          tags={formData.detailedAnalysis?.aroma?.categories?.florals || []}
                          onChange={(values) => handleAromaCategoryChange('florals', values)}
                          placeholder="バラ、スミレ、ハーブ..."
                          maxTags={8}
                        />
                      </div>

                      <div className="category-group">
                        <TagInput
                          label="スパイス"
                          tags={formData.detailedAnalysis?.aroma?.categories?.spices || []}
                          onChange={(values) => handleAromaCategoryChange('spices', values)}
                          placeholder="胡椒、シナモン、バニラ..."
                          maxTags={8}
                        />
                      </div>

                      <div className="category-group">
                        <TagInput
                          label="土・鉱物系"
                          tags={formData.detailedAnalysis?.aroma?.categories?.earthy || []}
                          onChange={(values) => handleAromaCategoryChange('earthy', values)}
                          placeholder="土、石、ミネラル..."
                          maxTags={8}
                        />
                      </div>

                      <div className="category-group">
                        <TagInput
                          label="樽・木系"
                          tags={formData.detailedAnalysis?.aroma?.categories?.oaky || []}
                          onChange={(values) => handleAromaCategoryChange('oaky', values)}
                          placeholder="オーク、杉、煙..."
                          maxTags={8}
                        />
                      </div>

                      <div className="category-group">
                        <TagInput
                          label="その他"
                          tags={formData.detailedAnalysis?.aroma?.categories?.other || []}
                          onChange={(values) => handleAromaCategoryChange('other', values)}
                          placeholder="革、タバコ、動物系..."
                          maxTags={8}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Taste Analysis */}
                <div className="form-section detailed-analysis" data-section="taste">
                  <h2>味わい分析</h2>
                  <p className="section-description">
                    口に含んだ時の味わいの変化を記録します
                  </p>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="taste-attack">アタック（第一印象）</label>
                      <textarea
                        id="taste-attack"
                        value={formData.detailedAnalysis?.taste?.attack || ''}
                        onChange={(e) => handleDetailedAnalysisChange('taste', 'attack', e.target.value)}
                        placeholder="口に含んだ瞬間の印象..."
                        rows={2}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="taste-development">展開</label>
                      <textarea
                        id="taste-development"
                        value={formData.detailedAnalysis?.taste?.development || ''}
                        onChange={(e) => handleDetailedAnalysisChange('taste', 'development', e.target.value)}
                        placeholder="味わいの変化、中盤の印象..."
                        rows={2}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="taste-finish">フィニッシュ</label>
                      <textarea
                        id="taste-finish"
                        value={formData.detailedAnalysis?.taste?.finish || ''}
                        onChange={(e) => handleDetailedAnalysisChange('taste', 'finish', e.target.value)}
                        placeholder="余韻の特徴..."
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="taste-finish-length">
                        余韻の長さ (1-5)
                      </label>
                      <div className="slider-container">
                        <input
                          id="taste-finish-length"
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData.detailedAnalysis?.taste?.finishLength || 3}
                          onChange={(e) => handleDetailedAnalysisChange('taste', 'finishLength', parseInt(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>短い</span>
                          <span>長い</span>
                        </div>
                        <div className="slider-value">{formData.detailedAnalysis?.taste?.finishLength || 3}</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="taste-balance">
                        バランス (1-5)
                      </label>
                      <div className="slider-container">
                        <input
                          id="taste-balance"
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData.detailedAnalysis?.taste?.balance || 3}
                          onChange={(e) => handleDetailedAnalysisChange('taste', 'balance', parseInt(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>アンバランス</span>
                          <span>完璧</span>
                        </div>
                        <div className="slider-value">{formData.detailedAnalysis?.taste?.balance || 3}</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="taste-complexity">
                        複雑さ (1-5)
                      </label>
                      <div className="slider-container">
                        <input
                          id="taste-complexity"
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData.detailedAnalysis?.taste?.complexity || 3}
                          onChange={(e) => handleDetailedAnalysisChange('taste', 'complexity', parseInt(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>単純</span>
                          <span>複雑</span>
                        </div>
                        <div className="slider-value">{formData.detailedAnalysis?.taste?.complexity || 3}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Structure Analysis */}
                <div className="form-section detailed-analysis" data-section="structure">
                  <h2>構造分析</h2>
                  <p className="section-description">
                    ワインの基本構造要素を評価します
                  </p>

                  <div className="structure-grid">
                    <div className="form-group">
                      <label htmlFor="structure-sweetness">
                        甘味 (1-5)
                      </label>
                      <div className="slider-container">
                        <input
                          id="structure-sweetness"
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData.detailedAnalysis?.structure?.sweetness || 1}
                          onChange={(e) => handleDetailedAnalysisChange('structure', 'sweetness', parseInt(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>辛口</span>
                          <span>甘口</span>
                        </div>
                        <div className="slider-value">{formData.detailedAnalysis?.structure?.sweetness || 1}</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="structure-acidity">
                        酸味 (1-5)
                      </label>
                      <div className="slider-container">
                        <input
                          id="structure-acidity"
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData.detailedAnalysis?.structure?.acidity || 3}
                          onChange={(e) => handleDetailedAnalysisChange('structure', 'acidity', parseInt(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>低い</span>
                          <span>高い</span>
                        </div>
                        <div className="slider-value">{formData.detailedAnalysis?.structure?.acidity || 3}</div>
                      </div>
                    </div>

                    {formData.type === 'red' && (
                      <div className="form-group">
                        <label htmlFor="structure-tannin">
                          タンニン (1-5)
                        </label>
                        <div className="slider-container">
                          <input
                            id="structure-tannin"
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={formData.detailedAnalysis?.structure?.tannin || 3}
                            onChange={(e) => handleDetailedAnalysisChange('structure', 'tannin', parseInt(e.target.value))}
                          />
                          <div className="slider-labels">
                            <span>軽い</span>
                            <span>強い</span>
                          </div>
                          <div className="slider-value">{formData.detailedAnalysis?.structure?.tannin || 3}</div>
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="structure-alcohol">
                        アルコール感 (1-5)
                      </label>
                      <div className="slider-container">
                        <input
                          id="structure-alcohol"
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData.detailedAnalysis?.structure?.alcohol || 3}
                          onChange={(e) => handleDetailedAnalysisChange('structure', 'alcohol', parseInt(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>軽い</span>
                          <span>強い</span>
                        </div>
                        <div className="slider-value">{formData.detailedAnalysis?.structure?.alcohol || 3}</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="structure-body">
                        ボディ (1-5)
                      </label>
                      <div className="slider-container">
                        <input
                          id="structure-body"
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData.detailedAnalysis?.structure?.body || 3}
                          onChange={(e) => handleDetailedAnalysisChange('structure', 'body', parseInt(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>ライト</span>
                          <span>フル</span>
                        </div>
                        <div className="slider-value">{formData.detailedAnalysis?.structure?.body || 3}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Environment Section - Only in detailed mode */}
            {formData.mode === 'detailed' && (
              <div className="form-section detailed-analysis" data-section="environment">
                <h2>テイスティング環境</h2>
                <p className="section-description">
                  テイスティング時の環境やコンテキストを記録します
                </p>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="env-glass">グラスタイプ</label>
                    <select
                      id="env-glass"
                      value={formData.environment?.glassType || 'universal'}
                      onChange={(e) => handleEnvironmentChange('glassType', e.target.value)}
                    >
                      <option value="universal">ユニバーサル</option>
                      <option value="bordeaux">ボルドー</option>
                      <option value="burgundy">ブルゴーニュ</option>
                      <option value="chardonnay">シャルドネ</option>
                      <option value="sauvignon_blanc">ソーヴィニヨン・ブラン</option>
                      <option value="riesling">リースリング</option>
                      <option value="champagne_flute">シャンパンフルート</option>
                      <option value="champagne_coupe">シャンパンクープ</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="env-temperature">サービス温度 (°C)</label>
                    <input
                      id="env-temperature"
                      type="number"
                      min="0"
                      max="25"
                      step="0.5"
                      value={formData.environment?.servingTemperature || ''}
                      onChange={(e) => handleEnvironmentChange('servingTemperature', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="例: 16.5"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.environment?.decanted || false}
                        onChange={(e) => handleEnvironmentChange('decanted', e.target.checked)}
                      />
                      デキャンタージュした
                    </label>
                  </div>

                  {formData.environment?.decanted && (
                    <div className="form-group">
                      <label htmlFor="env-decanting-time">デキャンタージュ時間 (分)</label>
                      <input
                        id="env-decanting-time"
                        type="number"
                        min="0"
                        max="480"
                        step="5"
                        value={formData.environment?.decantingTime || ''}
                        onChange={(e) => handleEnvironmentChange('decantingTime', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="例: 30"
                      />
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="env-lighting">照明環境</label>
                    <input
                      id="env-lighting"
                      type="text"
                      value={formData.environment?.lighting || ''}
                      onChange={(e) => handleEnvironmentChange('lighting', e.target.value)}
                      placeholder="例: 自然光、白熱電球、LED照明"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="env-atmosphere">雰囲気・場所</label>
                    <input
                      id="env-atmosphere"
                      type="text"
                      value={formData.environment?.atmosphere || ''}
                      onChange={(e) => handleEnvironmentChange('atmosphere', e.target.value)}
                      placeholder="例: レストラン、自宅、ワイナリー"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="env-mood">気分・状態</label>
                    <input
                      id="env-mood"
                      type="text"
                      value={formData.environment?.mood || ''}
                      onChange={(e) => handleEnvironmentChange('mood', e.target.value)}
                      placeholder="例: リラックス、集中、祝祭気分"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <TagInput
                      label="同席者"
                      tags={formData.environment?.companions || []}
                      onChange={(values) => handleEnvironmentChange('companions', values)}
                      placeholder="一緒にテイスティングした人"
                      maxTags={5}
                    />
                  </div>

                  <div className="form-group">
                    <TagInput
                      label="合わせた料理"
                      tags={formData.environment?.food || []}
                      onChange={(values) => handleEnvironmentChange('food', values)}
                      placeholder="一緒に楽しんだ料理"
                      maxTags={8}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="env-notes">環境に関する追加メモ</label>
                  <textarea
                    id="env-notes"
                    value={formData.environment?.notes || ''}
                    onChange={(e) => handleEnvironmentChange('notes', e.target.value)}
                    placeholder="その他の環境要因、特記事項など..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={
                  !formData.wineName || 
                  !formData.producer || 
                  (formData.mode === 'quick' && !formData.quickNotes) ||
                  (formData.mode === 'detailed' && (
                    !formData.detailedAnalysis?.appearance?.color ||
                    !formData.detailedAnalysis?.aroma?.firstImpression ||
                    !formData.detailedAnalysis?.taste?.attack
                  ))
                }
              >
                {formData.mode === 'quick' ? '記録を保存' : '詳細記録を保存'}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}