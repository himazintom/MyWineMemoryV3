import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import tastingRecordService from '../../services/tastingRecordService'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import Button from '../../components/common/Button'
import type { TastingRecord } from '../../types/tasting'

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  
  const [record, setRecord] = useState<TastingRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!id) {
      navigate('/records')
      return
    }

    const loadRecord = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const recordData = await tastingRecordService.getRecord(id)
        
        if (!recordData) {
          setError('記録が見つかりません')
          return
        }
        
        setRecord(recordData)
      } catch (err) {
        console.error('Failed to load record:', err)
        setError('記録の読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    loadRecord()
  }, [id, navigate])

  const handleEdit = () => {
    if (!record) return
    navigate(`/records/${record.id}/edit`)
  }

  const handleDelete = async () => {
    if (!record || !userProfile) return
    
    // 所有者チェック
    if (record.userId !== userProfile.uid) {
      setError('この記録を削除する権限がありません')
      return
    }
    
    setIsDeleting(true)
    try {
      await tastingRecordService.deleteRecord(record.id)
      navigate('/records', { 
        state: { message: '記録を削除しました' } 
      })
    } catch (err) {
      console.error('Failed to delete record:', err)
      setError('記録の削除に失敗しました')
      setIsDeleting(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    }).format(date)
  }

  const formatPrice = (price: number | undefined) => {
    if (!price) return '価格情報なし'
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(price)
  }

  if (isLoading) {
    return (
      <div className="record-detail-page">
        <LoadingSpinner />
      </div>
    )
  }

  if (error && !record) {
    return (
      <div className="record-detail-page">
        <ErrorMessage message={error} />
        <Button onClick={() => navigate('/records')}>記録一覧に戻る</Button>
      </div>
    )
  }

  if (!record) {
    return null
  }

  const isOwner = userProfile?.uid === record.userId
  const typeLabels: Record<string, string> = {
    red: '赤ワイン',
    white: '白ワイン',
    rose: 'ロゼワイン',
    sparkling: 'スパークリング',
    fortified: '酒精強化',
    dessert: 'デザートワイン'
  }

  return (
    <div className="record-detail-page">
      {/* ヘッダー */}
      <div className="detail-header">
        <Button 
          variant="secondary" 
          onClick={() => navigate('/records')}
          className="back-button"
        >
          ← 記録一覧に戻る
        </Button>
        
        {isOwner && (
          <div className="header-actions">
            <Button 
              variant="secondary"
              onClick={handleEdit}
            >
              編集
            </Button>
            <Button 
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              削除
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {/* メインコンテンツ */}
      <div className="detail-content">
        {/* ワイン情報 */}
        <div className="wine-info-section">
          <h1 className="wine-name">{record.wineName}</h1>
          <div className="wine-meta">
            <span className="producer">{record.producer}</span>
            {record.vintage && <span className="vintage">{record.vintage}年</span>}
          </div>
          
          <div className="wine-tags">
            <span className="tag type-tag">{typeLabels[record.type] || record.type}</span>
            {record.country && <span className="tag country-tag">{record.country}</span>}
            {record.region && <span className="tag region-tag">{record.region}</span>}
            {record.grapes && record.grapes.map((grape, index) => (
              <span key={index} className="tag grape-tag">{grape}</span>
            ))}
          </div>
        </div>

        {/* 評価セクション */}
        <div className="rating-section-detail">
          <div className="rating-display">
            <div className="rating-value">{record.rating.toFixed(1)}</div>
            <div className="rating-label">/ 10</div>
          </div>
          <div className="rating-stars">
            {Array.from({ length: 10 }, (_, i) => (
              <span 
                key={i} 
                className={`star ${i < Math.round(record.rating) ? 'filled' : ''}`}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* 基本情報 */}
        <div className="info-grid">
          <div className="info-card">
            <h3>基本情報</h3>
            <dl className="info-list">
              <dt>テイスティング日</dt>
              <dd>{formatDate(record.tastingDate)}</dd>
              
              <dt>価格</dt>
              <dd>{formatPrice(record.price)}</dd>
              
              {record.alcoholContent && (
                <>
                  <dt>アルコール度数</dt>
                  <dd>{record.alcoholContent}%</dd>
                </>
              )}
              
              <dt>記録モード</dt>
              <dd className={`mode-badge mode-${record.mode}`}>
                {record.mode === 'quick' ? 'クイック' : '詳細'}
              </dd>
              
              <dt>公開設定</dt>
              <dd>
                {record.isPublic ? (
                  <span className="public-badge">公開</span>
                ) : (
                  <span className="private-badge">非公開</span>
                )}
              </dd>
            </dl>
          </div>

          {/* メモ */}
          {record.notes && (
            <div className="info-card">
              <h3>テイスティングノート</h3>
              <p className="notes-text">{record.notes}</p>
            </div>
          )}

          {/* 詳細分析 - 外観 */}
          {record.detailedAnalysis?.appearance && (
            <div className="info-card">
              <h3>外観</h3>
              <dl className="info-list">
                {record.detailedAnalysis.appearance.clarity && (
                  <>
                    <dt>透明度</dt>
                    <dd>{record.detailedAnalysis.appearance.clarity}</dd>
                  </>
                )}
                {record.detailedAnalysis.appearance.intensity && (
                  <>
                    <dt>濃淡</dt>
                    <dd>{record.detailedAnalysis.appearance.intensity}</dd>
                  </>
                )}
                {record.detailedAnalysis.appearance.color && (
                  <>
                    <dt>色調</dt>
                    <dd>{record.detailedAnalysis.appearance.color}</dd>
                  </>
                )}
                {record.detailedAnalysis.appearance.viscosity && (
                  <>
                    <dt>粘性</dt>
                    <dd>{record.detailedAnalysis.appearance.viscosity}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* 詳細分析 - 香り */}
          {record.detailedAnalysis?.aroma && (
            <div className="info-card">
              <h3>香り</h3>
              <dl className="info-list">
                {record.detailedAnalysis.aroma.intensity && (
                  <>
                    <dt>強度</dt>
                    <dd>{record.detailedAnalysis.aroma.intensity}/10</dd>
                  </>
                )}
                {record.detailedAnalysis.aroma.complexity && (
                  <>
                    <dt>複雑性</dt>
                    <dd>{record.detailedAnalysis.aroma.complexity}/10</dd>
                  </>
                )}
                {record.detailedAnalysis.aroma.categories && 
                 Object.entries(record.detailedAnalysis.aroma.categories).map(([category, value]) => (
                  Array.isArray(value) && value.length > 0 && (
                    <div key={category}>
                      <dt>{category}</dt>
                      <dd>{value.join(', ')}</dd>
                    </div>
                  )
                ))}
              </dl>
              {record.detailedAnalysis.aroma.notes && (
                <p className="aroma-notes">{record.detailedAnalysis.aroma.notes}</p>
              )}
            </div>
          )}

          {/* 詳細分析 - 味わい */}
          {record.detailedAnalysis?.taste && (
            <div className="info-card">
              <h3>味わい</h3>
              <dl className="info-list">
                {record.detailedAnalysis.taste.sweetness !== undefined && (
                  <>
                    <dt>甘味</dt>
                    <dd>{record.detailedAnalysis.taste.sweetness}/10</dd>
                  </>
                )}
                {record.detailedAnalysis.taste.acidity !== undefined && (
                  <>
                    <dt>酸味</dt>
                    <dd>{record.detailedAnalysis.taste.acidity}/10</dd>
                  </>
                )}
                {record.detailedAnalysis.taste.tannin !== undefined && (
                  <>
                    <dt>タンニン</dt>
                    <dd>{record.detailedAnalysis.taste.tannin}/10</dd>
                  </>
                )}
                {record.detailedAnalysis.taste.body !== undefined && (
                  <>
                    <dt>ボディ</dt>
                    <dd>{record.detailedAnalysis.taste.body}/10</dd>
                  </>
                )}
                {record.detailedAnalysis.taste.alcohol !== undefined && (
                  <>
                    <dt>アルコール感</dt>
                    <dd>{record.detailedAnalysis.taste.alcohol}/10</dd>
                  </>
                )}
                {record.detailedAnalysis.taste.balance !== undefined && (
                  <>
                    <dt>バランス</dt>
                    <dd>{record.detailedAnalysis.taste.balance}/10</dd>
                  </>
                )}
                {record.detailedAnalysis.taste.length !== undefined && (
                  <>
                    <dt>余韻</dt>
                    <dd>{record.detailedAnalysis.taste.length}/10</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* 環境 */}
          {record.environment && (
            <div className="info-card">
              <h3>環境・コンテキスト</h3>
              <dl className="info-list">
                {record.environment.glassType && (
                  <>
                    <dt>グラスタイプ</dt>
                    <dd>{record.environment.glassType}</dd>
                  </>
                )}
                {record.environment.temperature && (
                  <>
                    <dt>提供温度</dt>
                    <dd>{record.environment.temperature}°C</dd>
                  </>
                )}
                {record.environment.decantTime && (
                  <>
                    <dt>デカンタ時間</dt>
                    <dd>{record.environment.decantTime}分</dd>
                  </>
                )}
                {record.environment.weather && (
                  <>
                    <dt>天気</dt>
                    <dd>{record.environment.weather}</dd>
                  </>
                )}
                {record.environment.mood && (
                  <>
                    <dt>気分</dt>
                    <dd>{record.environment.mood}</dd>
                  </>
                )}
                {record.environment.pairing && record.environment.pairing.length > 0 && (
                  <>
                    <dt>ペアリング</dt>
                    <dd>{record.environment.pairing.join(', ')}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* 画像 */}
          {record.images && record.images.length > 0 && (
            <div className="info-card full-width">
              <h3>画像</h3>
              <div className="images-grid">
                {record.images.map((image, index) => (
                  <img 
                    key={index}
                    src={image}
                    alt={`${record.wineName} - ${index + 1}`}
                    className="record-image"
                    onClick={() => window.open(image, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* メタ情報 */}
          <div className="info-card full-width">
            <h3>記録情報</h3>
            <dl className="info-list horizontal">
              <dt>記録ID</dt>
              <dd>{record.id}</dd>
              
              <dt>作成日時</dt>
              <dd>{formatDate(record.createdAt)}</dd>
              
              <dt>更新日時</dt>
              <dd>{formatDate(record.updatedAt)}</dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>記録を削除しますか？</h2>
            <p>この操作は取り消せません。本当に削除してもよろしいですか？</p>
            <div className="modal-actions">
              <Button 
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button 
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? '削除中...' : '削除する'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}