import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useError } from '../../contexts/ErrorContext'
import tastingRecordService from '../../services/tastingRecordService'
import gamificationService from '../../services/gamificationService'
import imageUploadService from '../../services/imageUploadService'
import Button from '../../components/common/Button'
import ErrorMessage from '../../components/common/ErrorMessage'
import TagInput from '../../components/common/TagInput'
import ImageUpload from '../../components/common/ImageUpload'
import DrawingCanvas from '../../components/features/DrawingCanvas'
import CitationSelector from '../../components/features/CitationSelector'
import type { 
  TastingRecord, 
  DetailedAnalysis, 
  TastingEnvironment, 
  WineType,
  WineColor,
  PopularWine,
  GlassType,
  Citation
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
  grapes: string[]
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
  images: string[]
  drawingData?: string
  citations: Citation[]
}

// グラスタイプの選択肢
const GLASS_TYPES: { value: GlassType; label: string; icon: string }[] = [
  { value: 'universal', label: 'ユニバーサル', icon: '🍷' },
  { value: 'bordeaux', label: 'ボルドー', icon: '🍷' },
  { value: 'burgundy', label: 'ブルゴーニュ', icon: '🍷' },
  { value: 'champagne_flute', label: 'シャンパン', icon: '🥂' },
  { value: 'white_wine', label: '白ワイン', icon: '🥂' },
  { value: 'dessert_wine', label: 'デザートワイン', icon: '🥃' },
  { value: 'spirits_snifter', label: 'スピリッツ', icon: '🥃' },
  { value: 'water_tumbler', label: 'タンブラー', icon: '🥤' }
]

// 香りカテゴリー
const AROMA_CATEGORIES = {
  fruits: ['レモン', 'グレープフルーツ', 'リンゴ', '洋梨', '桃', 'アプリコット', 'チェリー', 'ストロベリー', 'ブラックベリー', 'カシス'],
  florals: ['スミレ', 'バラ', 'ジャスミン', 'オレンジの花', 'アカシア', 'エルダーフラワー'],
  spices: ['黒胡椒', '白胡椒', 'シナモン', 'クローブ', 'ナツメグ', 'バニラ', 'リコリス'],
  earthy: ['土', '枯葉', 'きのこ', 'トリュフ', '森林', '湿った土'],
  oaky: ['オーク', 'スモーク', 'トースト', 'キャラメル', 'チョコレート', 'コーヒー'],
  other: ['ミネラル', '石灰', '火打石', 'ゴム', 'ペトロール', '硫黄']
}

export default function AddTastingRecordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { wineId } = useParams()
  const { userProfile } = useAuth()
  const { handleError } = useError()
  
  const [formData, setFormData] = useState<TastingFormData>({
    wineName: '',
    producer: '',
    region: '',
    country: '',
    type: 'red',
    color: 'medium',
    grapes: [],
    tastingDate: new Date(),
    mode: 'quick',
    rating: 5,
    quickNotes: '',
    isPublic: false,
    tags: [],
    images: [],
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
    },
    citations: []
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModeSelector, setShowModeSelector] = useState(true)
  const [activeTab, setActiveTab] = useState<'basic' | 'detailed' | 'environment' | 'media'>('basic')
  const [showDrawingCanvas, setShowDrawingCanvas] = useState(false)
  const [showCitationSelector, setShowCitationSelector] = useState(false)

  // ワイン情報を取得（SelectWineページから）
  useEffect(() => {
    const selectedWine = location.state?.selectedWine as PopularWine
    if (selectedWine) {
      setFormData(prev => ({
        ...prev,
        wineName: selectedWine.wineName || '',
        producer: selectedWine.producer || '',
        country: selectedWine.country || '',
        region: selectedWine.region || '',
        type: selectedWine.type || 'red',
        color: selectedWine.color || 'medium',
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

  const handleDetailedAnalysisChange = (
    section: keyof DetailedAnalysis, 
    field: string, 
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      detailedAnalysis: {
        ...prev.detailedAnalysis!,
        [section]: {
          ...((prev.detailedAnalysis as any)[section] || {}),
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
          ...prev.detailedAnalysis?.aroma!,
          categories: {
            ...prev.detailedAnalysis?.aroma?.categories!,
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

  const handleImageUpload = (results: any[]) => {
    const urls = results.map(r => r.url)
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...urls]
    }))
  }

  const handleDrawingSave = (dataUrl: string) => {
    setFormData(prev => ({
      ...prev,
      drawingData: dataUrl
    }))
    setShowDrawingCanvas(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

      // 描画データを画像としてアップロード
      let drawingUrl: string | undefined
      if (formData.drawingData) {
        try {
          const blob = await fetch(formData.drawingData).then(r => r.blob())
          const file = new File([blob], 'drawing.png', { type: 'image/png' })
          const result = await imageUploadService.uploadImage(
            file,
            'drawing',
            userProfile.uid,
            `tasting/${Date.now()}`
          )
          drawingUrl = result.url
        } catch (err) {
          console.error('Failed to upload drawing:', err)
        }
      }

      const recordData: Omit<TastingRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        wineId,
        wineName: formData.wineName,
        producer: formData.producer,
        vintage: formData.vintage,
        region: formData.region,
        country: formData.country,
        type: formData.type,
        color: formData.color,
        grapes: formData.grapes,
        alcoholContent: formData.alcoholContent,
        price: formData.price,
        tastingDate: formData.tastingDate,
        mode: formData.mode,
        rating: formData.rating,
        quickNotes: formData.quickNotes,
        detailedAnalysis: formData.mode === 'detailed' ? formData.detailedAnalysis : undefined,
        environment: formData.mode === 'detailed' ? formData.environment : undefined,
        isPublic: formData.isPublic,
        images: [...formData.images, ...(drawingUrl ? [drawingUrl] : [])],
        tags: formData.tags,
        citations: formData.citations
      }

      // 記録を保存
      const newRecord = await tastingRecordService.createRecord(userProfile.uid, recordData)

      // XP付与
      const xpAmount = formData.mode === 'detailed' ? 20 : 10
      await gamificationService.awardXP(
        userProfile.uid,
        xpAmount,
        'tasting_record_create',
        `テイスティング記録「${formData.wineName}」を作成`,
        newRecord.id
      )

      // デイリー目標とストリーク更新
      await gamificationService.updateGoalProgress(userProfile.uid, 'tasting', 1)
      await gamificationService.updateStreak(userProfile.uid, 'tasting')

      navigate('/records', { 
        state: { 
          message: 'テイスティング記録が保存されました！',
          newRecordId: newRecord.id 
        }
      })
    } catch (err) {
      const appError = handleError(err, { 
        operation: 'createTastingRecord',
        wineName: formData.wineName 
      })
      setError(appError.userMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCitationSelect = (citations: Citation[], fieldsData: Partial<TastingRecord>) => {
    setFormData(prev => ({
      ...prev,
      ...(fieldsData as Partial<TastingFormData>),
      citations: [...prev.citations, ...citations]
    }))
    setShowCitationSelector(false)
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

  // モード選択画面
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
                  handleModeSelect('quick')
                }
              }}
            >
              <div className="mode-icon">⚡</div>
              <h3>クイックモード</h3>
              <p className="mode-info">基本情報と評価のみ</p>
              <ul className="mode-features">
                <li>ワイン基本情報</li>
                <li>評価（0-10点）</li>
                <li>クイックメモ</li>
                <li>タグ付け</li>
              </ul>
              <div className="mode-xp">+10 XP</div>
            </div>

            <div 
              className="mode-card detailed-mode"
              onClick={() => handleModeSelect('detailed')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleModeSelect('detailed')
                }
              }}
            >
              <div className="mode-icon">📊</div>
              <h3>詳細モード</h3>
              <p className="mode-info">プロフェッショナル分析</p>
              <ul className="mode-features">
                <li>外観・香り・味わい分析</li>
                <li>構造要素評価</li>
                <li>環境記録</li>
                <li>画像・描画記録</li>
              </ul>
              <div className="mode-xp">+20 XP</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // メインフォーム
  return (
    <div className="add-tasting-record-page">
      <div className="page-header">
        <h1>
          テイスティング記録作成
          <span className="mode-badge">{formData.mode === 'quick' ? 'クイック' : '詳細'}</span>
        </h1>
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
        >
          戻る
        </Button>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <form onSubmit={handleSubmit} className="tasting-form">
        {/* タブナビゲーション（詳細モードのみ） */}
        {formData.mode === 'detailed' && (
          <div className="tab-navigation">
            <button
              type="button"
              className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              基本情報
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'detailed' ? 'active' : ''}`}
              onClick={() => setActiveTab('detailed')}
            >
              詳細分析
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'environment' ? 'active' : ''}`}
              onClick={() => setActiveTab('environment')}
            >
              環境
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              画像・描画
            </button>
          </div>
        )}

        {/* 基本情報タブ */}
        {(formData.mode === 'quick' || activeTab === 'basic') && (
          <div className="form-section">
            <h2>ワイン情報</h2>
            
            {/* ワイン選択/変更 */}
            {formData.wineName && (
              <div className="selected-wine-info">
                <div className="wine-summary">
                  <h3>{formData.wineName}</h3>
                  <p>{formData.producer}</p>
                  {formData.country && <p>{formData.country} {formData.region}</p>}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectWine}
                >
                  変更
                </Button>
              </div>
            )}

            {!formData.wineName && (
              <Button
                type="button"
                variant="primary"
                onClick={handleSelectWine}
                className="select-wine-button"
              >
                ワインを選択
              </Button>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="wine-name">
                  ワイン名 <span className="required">*</span>
                </label>
                <input
                  id="wine-name"
                  type="text"
                  value={formData.wineName}
                  onChange={(e) => handleBasicInfoChange('wineName', e.target.value)}
                  required
                  placeholder="シャトー・マルゴー"
                />
              </div>

              <div className="form-group">
                <label htmlFor="producer">
                  生産者 <span className="required">*</span>
                </label>
                <input
                  id="producer"
                  type="text"
                  value={formData.producer}
                  onChange={(e) => handleBasicInfoChange('producer', e.target.value)}
                  required
                  placeholder="シャトー・マルゴー"
                />
              </div>

              <div className="form-group">
                <label htmlFor="vintage">ヴィンテージ</label>
                <input
                  id="vintage"
                  type="number"
                  value={formData.vintage || ''}
                  onChange={(e) => handleBasicInfoChange('vintage', e.target.value ? parseInt(e.target.value) : undefined)}
                  min="1800"
                  max={new Date().getFullYear()}
                  placeholder="2020"
                />
              </div>

              <div className="form-group">
                <label htmlFor="country">国</label>
                <input
                  id="country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleBasicInfoChange('country', e.target.value)}
                  placeholder="フランス"
                />
              </div>

              <div className="form-group">
                <label htmlFor="region">地域</label>
                <input
                  id="region"
                  type="text"
                  value={formData.region}
                  onChange={(e) => handleBasicInfoChange('region', e.target.value)}
                  placeholder="ボルドー"
                />
              </div>

              <div className="form-group">
                <label htmlFor="wine-type">タイプ</label>
                <select
                  id="wine-type"
                  value={formData.type}
                  onChange={(e) => handleBasicInfoChange('type', e.target.value as WineType)}
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
                <label htmlFor="wine-color">色調</label>
                <select
                  id="wine-color"
                  value={formData.color}
                  onChange={(e) => handleBasicInfoChange('color', e.target.value as WineColor)}
                >
                  <option value="light">淡い</option>
                  <option value="medium">中程度</option>
                  <option value="deep">濃い</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="alcohol">アルコール度数（%）</label>
                <input
                  id="alcohol"
                  type="number"
                  value={formData.alcoholContent || ''}
                  onChange={(e) => handleBasicInfoChange('alcoholContent', e.target.value ? parseFloat(e.target.value) : undefined)}
                  min="0"
                  max="50"
                  step="0.5"
                  placeholder="13.5"
                />
              </div>

              <div className="form-group">
                <label htmlFor="price">価格（円）</label>
                <input
                  id="price"
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => handleBasicInfoChange('price', e.target.value ? parseInt(e.target.value) : undefined)}
                  min="0"
                  placeholder="5000"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <TagInput
                label="ブドウ品種"
                tags={formData.grapes}
                onChange={(grapes) => handleBasicInfoChange('grapes', grapes)}
                placeholder="品種を入力してEnterで追加"
                maxTags={10}
              />
            </div>

            <h2>テイスティング評価</h2>
            
            <div className="form-group">
              <label htmlFor="rating">
                評価（0.0 - 10.0）
                <span className="rating-value">{formData.rating.toFixed(1)}</span>
              </label>
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
              <div className="rating-marks">
                <span>0</span>
                <span>2.5</span>
                <span>5</span>
                <span>7.5</span>
                <span>10</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="quick-notes">テイスティングメモ</label>
              <textarea
                id="quick-notes"
                value={formData.quickNotes}
                onChange={(e) => handleBasicInfoChange('quickNotes', e.target.value)}
                rows={4}
                placeholder="香り、味わい、印象などを自由に記録..."
              />
            </div>

            <div className="form-group">
              <TagInput
                label="タグ"
                tags={formData.tags}
                onChange={(tags) => handleBasicInfoChange('tags', tags)}
                placeholder="タグを入力してEnterで追加"
                maxTags={10}
              />
            </div>

            {/* 過去記録引用機能 */}
            <div className="form-group">
              <div className="citation-section">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCitationSelector(true)}
                  disabled={!formData.wineName || !formData.producer}
                >
                  📋 過去記録から引用
                </Button>
                {formData.citations.length > 0 && (
                  <div className="citations-info">
                    <small>{formData.citations.length}件の記録から引用済み</small>
                  </div>
                )}
              </div>
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
            </div>
          </div>
        )}

        {/* 詳細分析タブ（詳細モードのみ） */}
        {formData.mode === 'detailed' && activeTab === 'detailed' && (
          <div className="form-section">
            <h2>外観分析</h2>
            <div className="analysis-grid">
              <div className="form-group">
                <label>強度（1-5）: {formData.detailedAnalysis?.appearance?.intensity}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.appearance?.intensity || 3}
                  onChange={(e) => handleDetailedAnalysisChange('appearance', 'intensity', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>透明度（1-5）: {formData.detailedAnalysis?.appearance?.transparency}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.appearance?.transparency || 3}
                  onChange={(e) => handleDetailedAnalysisChange('appearance', 'transparency', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>粘性（1-5）: {formData.detailedAnalysis?.appearance?.viscosity}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.appearance?.viscosity || 3}
                  onChange={(e) => handleDetailedAnalysisChange('appearance', 'viscosity', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group full-width">
                <label>色調の詳細</label>
                <input
                  type="text"
                  value={formData.detailedAnalysis?.appearance?.color || ''}
                  onChange={(e) => handleDetailedAnalysisChange('appearance', 'color', e.target.value)}
                  placeholder="ガーネット、ルビー、紫がかった..."
                />
              </div>

              <div className="form-group full-width">
                <label>外観メモ</label>
                <textarea
                  value={formData.detailedAnalysis?.appearance?.colorNotes || ''}
                  onChange={(e) => handleDetailedAnalysisChange('appearance', 'colorNotes', e.target.value)}
                  rows={2}
                  placeholder="輝き、清澄度、その他の観察..."
                />
              </div>
            </div>

            <h2>香り分析</h2>
            <div className="aroma-analysis">
              <div className="form-group">
                <label>第一印象</label>
                <textarea
                  value={formData.detailedAnalysis?.aroma?.firstImpression || ''}
                  onChange={(e) => handleDetailedAnalysisChange('aroma', 'firstImpression', e.target.value)}
                  rows={2}
                  placeholder="最初に感じた香りの印象..."
                />
              </div>

              <div className="form-group">
                <label>スワリング後</label>
                <textarea
                  value={formData.detailedAnalysis?.aroma?.afterSwirling || ''}
                  onChange={(e) => handleDetailedAnalysisChange('aroma', 'afterSwirling', e.target.value)}
                  rows={2}
                  placeholder="スワリング後の香りの変化..."
                />
              </div>

              <div className="form-group">
                <label>香りの強度（1-5）: {formData.detailedAnalysis?.aroma?.intensity}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.aroma?.intensity || 3}
                  onChange={(e) => handleDetailedAnalysisChange('aroma', 'intensity', parseInt(e.target.value))}
                />
              </div>

              {/* 香りカテゴリー */}
              {Object.entries(AROMA_CATEGORIES).map(([category, options]) => (
                <div key={category} className="aroma-category">
                  <h3>{category === 'fruits' ? 'フルーツ' :
                      category === 'florals' ? 'フローラル' :
                      category === 'spices' ? 'スパイス' :
                      category === 'earthy' ? 'アーシー' :
                      category === 'oaky' ? 'オーク' : 'その他'}</h3>
                  <div className="aroma-options">
                    {options.map(option => (
                      <label key={option} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.detailedAnalysis?.aroma?.categories?.[category as keyof typeof AROMA_CATEGORIES]?.includes(option) || false}
                          onChange={(e) => {
                            const current = formData.detailedAnalysis?.aroma?.categories?.[category as keyof typeof AROMA_CATEGORIES] || []
                            const updated = e.target.checked 
                              ? [...current, option]
                              : current.filter((o: string) => o !== option)
                            handleAromaCategoryChange(category, updated)
                          }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <h2>味わい分析</h2>
            <div className="taste-analysis">
              <div className="form-group">
                <label>アタック（第一印象）</label>
                <textarea
                  value={formData.detailedAnalysis?.taste?.attack || ''}
                  onChange={(e) => handleDetailedAnalysisChange('taste', 'attack', e.target.value)}
                  rows={2}
                  placeholder="口に含んだ瞬間の印象..."
                />
              </div>

              <div className="form-group">
                <label>展開（中盤）</label>
                <textarea
                  value={formData.detailedAnalysis?.taste?.development || ''}
                  onChange={(e) => handleDetailedAnalysisChange('taste', 'development', e.target.value)}
                  rows={2}
                  placeholder="味わいの広がりと変化..."
                />
              </div>

              <div className="form-group">
                <label>フィニッシュ（余韻）</label>
                <textarea
                  value={formData.detailedAnalysis?.taste?.finish || ''}
                  onChange={(e) => handleDetailedAnalysisChange('taste', 'finish', e.target.value)}
                  rows={2}
                  placeholder="飲み込んだ後の印象..."
                />
              </div>

              <div className="form-group">
                <label>余韻の長さ（1-5）: {formData.detailedAnalysis?.taste?.finishLength}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.taste?.finishLength || 3}
                  onChange={(e) => handleDetailedAnalysisChange('taste', 'finishLength', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>バランス（1-5）: {formData.detailedAnalysis?.taste?.balance}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.taste?.balance || 3}
                  onChange={(e) => handleDetailedAnalysisChange('taste', 'balance', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>複雑性（1-5）: {formData.detailedAnalysis?.taste?.complexity}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.taste?.complexity || 3}
                  onChange={(e) => handleDetailedAnalysisChange('taste', 'complexity', parseInt(e.target.value))}
                />
              </div>
            </div>

            <h2>構造分析</h2>
            <div className="structure-analysis">
              <div className="form-group">
                <label>甘味（1-5）: {formData.detailedAnalysis?.structure?.sweetness}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.structure?.sweetness || 1}
                  onChange={(e) => handleDetailedAnalysisChange('structure', 'sweetness', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>酸味（1-5）: {formData.detailedAnalysis?.structure?.acidity}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.structure?.acidity || 3}
                  onChange={(e) => handleDetailedAnalysisChange('structure', 'acidity', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>タンニン（1-5）: {formData.detailedAnalysis?.structure?.tannin}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.structure?.tannin || 3}
                  onChange={(e) => handleDetailedAnalysisChange('structure', 'tannin', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>アルコール感（1-5）: {formData.detailedAnalysis?.structure?.alcohol}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.structure?.alcohol || 3}
                  onChange={(e) => handleDetailedAnalysisChange('structure', 'alcohol', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>ボディ（1-5）: {formData.detailedAnalysis?.structure?.body}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.detailedAnalysis?.structure?.body || 3}
                  onChange={(e) => handleDetailedAnalysisChange('structure', 'body', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {/* 環境タブ（詳細モードのみ） */}
        {formData.mode === 'detailed' && activeTab === 'environment' && (
          <div className="form-section">
            <h2>テイスティング環境</h2>
            
            <div className="glass-types">
              <label>グラスタイプ</label>
              <div className="glass-grid">
                {GLASS_TYPES.map(glass => (
                  <div
                    key={glass.value}
                    className={`glass-option ${formData.environment?.glassType === glass.value ? 'selected' : ''}`}
                    onClick={() => handleEnvironmentChange('glassType', glass.value)}
                  >
                    <div className="glass-icon">{glass.icon}</div>
                    <div className="glass-label">{glass.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="serving-temp">提供温度（℃）</label>
                <input
                  id="serving-temp"
                  type="number"
                  value={formData.environment?.servingTemperature || ''}
                  onChange={(e) => handleEnvironmentChange('servingTemperature', e.target.value ? parseFloat(e.target.value) : undefined)}
                  min="-5"
                  max="30"
                  step="0.5"
                  placeholder="16"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.environment?.decanted || false}
                    onChange={(e) => handleEnvironmentChange('decanted', e.target.checked)}
                  />
                  デカンタージュ済み
                </label>
              </div>

              {formData.environment?.decanted && (
                <div className="form-group">
                  <label htmlFor="decanting-time">デカンタージュ時間（分）</label>
                  <input
                    id="decanting-time"
                    type="number"
                    value={formData.environment?.decantingTime || ''}
                    onChange={(e) => handleEnvironmentChange('decantingTime', e.target.value ? parseInt(e.target.value) : undefined)}
                    min="0"
                    max="480"
                    placeholder="30"
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="lighting">照明</label>
                <input
                  id="lighting"
                  type="text"
                  value={formData.environment?.lighting || ''}
                  onChange={(e) => handleEnvironmentChange('lighting', e.target.value)}
                  placeholder="自然光、LED、キャンドル..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="atmosphere">雰囲気</label>
                <input
                  id="atmosphere"
                  type="text"
                  value={formData.environment?.atmosphere || ''}
                  onChange={(e) => handleEnvironmentChange('atmosphere', e.target.value)}
                  placeholder="レストラン、自宅、パーティー..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="mood">気分</label>
                <input
                  id="mood"
                  type="text"
                  value={formData.environment?.mood || ''}
                  onChange={(e) => handleEnvironmentChange('mood', e.target.value)}
                  placeholder="リラックス、お祝い、学習..."
                />
              </div>
            </div>

            <div className="form-group">
              <TagInput
                label="同席者"
                tags={formData.environment?.companions || []}
                onChange={(companions) => handleEnvironmentChange('companions', companions)}
                placeholder="名前を入力してEnterで追加"
                maxTags={10}
              />
            </div>

            <div className="form-group">
              <TagInput
                label="フードペアリング"
                tags={formData.environment?.food || []}
                onChange={(food) => handleEnvironmentChange('food', food)}
                placeholder="料理名を入力してEnterで追加"
                maxTags={10}
              />
            </div>

            <div className="form-group">
              <label htmlFor="env-notes">環境メモ</label>
              <textarea
                id="env-notes"
                value={formData.environment?.notes || ''}
                onChange={(e) => handleEnvironmentChange('notes', e.target.value)}
                rows={3}
                placeholder="その他の環境情報..."
              />
            </div>
          </div>
        )}

        {/* 画像・描画タブ（詳細モードのみ） */}
        {formData.mode === 'detailed' && activeTab === 'media' && (
          <div className="form-section">
            <h2>画像アップロード</h2>
            <ImageUpload
              category="tasting"
              multiple={true}
              maxFiles={4}
              onUpload={handleImageUpload}
              existingImages={formData.images}
            />

            <h2>手描きメモ</h2>
            {!showDrawingCanvas ? (
              <div className="drawing-section">
                {formData.drawingData && (
                  <div className="drawing-preview">
                    <img src={formData.drawingData} alt="描画メモ" />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowDrawingCanvas(true)}
                    >
                      編集
                    </Button>
                  </div>
                )}
                {!formData.drawingData && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowDrawingCanvas(true)}
                  >
                    描画を開始
                  </Button>
                )}
              </div>
            ) : (
              <DrawingCanvas
                width={600}
                height={400}
                initialImage={formData.drawingData}
                onSave={handleDrawingSave}
              />
            )}
          </div>
        )}

        {/* 送信ボタン */}
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
            disabled={!formData.wineName || !formData.producer}
          >
            記録を保存
          </Button>
        </div>
      </form>

      {/* 引用セレクター */}
      {showCitationSelector && (
        <div className="modal-overlay">
          <div className="modal-content">
            <CitationSelector
              currentWineInfo={{
                wineName: formData.wineName,
                producer: formData.producer,
                vintage: formData.vintage
              }}
              onCitationSelect={handleCitationSelect}
              onClose={() => setShowCitationSelector(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}