import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/common/Button'
import ErrorMessage from '../../components/common/ErrorMessage'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import gamificationService from '../../services/gamificationService'
import learningProgressService from '../../services/learningProgressService'
import tastingRecordService from '../../services/tastingRecordService'
import type { Badge, UserBadge } from '../../types'

export default function ProfilePageEnhanced() {
  const { userProfile, isGuestMode, signOut, updateUserProfile, error, clearError } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    displayName: userProfile?.displayName || '',
    email: userProfile?.email || ''
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userStats, setUserStats] = useState<any>(null)
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [quizStats, setQuizStats] = useState<any>(null)
  const [tastingStats, setTastingStats] = useState<any>(null)

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return

    try {
      setIsUpdating(true)
      clearError()
      
      await updateUserProfile({
        displayName: editForm.displayName,
        email: editForm.email
      })
      
      setIsEditing(false)
    } catch (err) {
      console.error('Profile update failed:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Sign out failed:', err)
    }
  }

  // ユーザー統計とバッジを取得
  useEffect(() => {
    if (!userProfile) return

    const loadUserData = async () => {
      setIsLoading(true)
      try {
        // XPとレベル情報
        const xpInfo = await gamificationService.getUserXP(userProfile.uid)
        const level = gamificationService.calculateLevel(xpInfo.totalXP)
        
        // バッジ情報
        const badges = await gamificationService.getUserBadges(userProfile.uid)
        
        // アクティビティ履歴
        const activities = await gamificationService.getUserActivities(userProfile.uid)
        
        // クイズ統計
        const quiz = await learningProgressService.getOverallStatistics(userProfile.uid)
        
        // テイスティング統計
        const tasting = await tastingRecordService.getUserStatistics(userProfile.uid)
        
        setUserStats({
          ...xpInfo,
          level,
          nextLevelXP: gamificationService.getXPForLevel(level + 1),
          progress: (xpInfo.totalXP - gamificationService.getXPForLevel(level)) / 
                   (gamificationService.getXPForLevel(level + 1) - gamificationService.getXPForLevel(level)) * 100
        })
        setUserBadges(badges)
        setRecentActivity(activities.slice(0, 10))
        setQuizStats(quiz)
        setTastingStats(tasting)
      } catch (err) {
        console.error('Failed to load user data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [userProfile])

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>プロフィール</h1>
      </div>

      {/* ユーザー統計カード */}
      {userStats && (
        <div className="stats-overview">
          <div className="stat-card level-card">
            <div className="level-icon">
              <span className="level-number">{userStats.level}</span>
            </div>
            <div className="level-info">
              <h3>レベル</h3>
              <div className="xp-progress">
                <div className="xp-bar">
                  <div 
                    className="xp-fill" 
                    style={{ width: `${userStats.progress}%` }}
                  />
                </div>
                <span className="xp-text">
                  {userStats.totalXP} / {userStats.nextLevelXP} XP
                </span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon quiz-icon">📚</div>
            <div className="stat-content">
              <h3>クイズ統計</h3>
              <div className="stat-details">
                <div className="stat-item">
                  <span className="stat-label">総問題数:</span>
                  <span className="stat-value">{quizStats?.totalQuestions || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">正解率:</span>
                  <span className="stat-value">{quizStats?.overallAccuracy?.toFixed(1) || 0}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">連続正解:</span>
                  <span className="stat-value">{quizStats?.currentStreak || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon tasting-icon">🍷</div>
            <div className="stat-content">
              <h3>テイスティング統計</h3>
              <div className="stat-details">
                <div className="stat-item">
                  <span className="stat-label">総記録数:</span>
                  <span className="stat-value">{tastingStats?.totalRecords || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">平均評価:</span>
                  <span className="stat-value">{tastingStats?.averageRating?.toFixed(1) || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">好きな国:</span>
                  <span className="stat-value">{tastingStats?.favoriteCountry || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* バッジコレクション */}
      {userBadges.length > 0 && (
        <div className="badges-section">
          <h2>獲得バッジ</h2>
          <div className="badges-grid">
            {userBadges.map((userBadge) => (
              <div 
                key={userBadge.badgeId}
                className={`badge-item ${userBadge.badge?.rarity}`}
              >
                <div className="badge-icon">{userBadge.badge?.icon}</div>
                <div className="badge-name">{userBadge.badge?.name}</div>
                <div className="badge-date">
                  {userBadge.earnedAt.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アクティビティ履歴 */}
      {recentActivity.length > 0 && (
        <div className="activity-section">
          <h2>最近のアクティビティ</h2>
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'quiz' ? '📝' : 
                   activity.type === 'tasting' ? '🍷' : 
                   activity.type === 'badge' ? '🏆' : '⭐'}
                </div>
                <div className="activity-content">
                  <div className="activity-title">{activity.description}</div>
                  <div className="activity-date">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
                {activity.xpEarned && (
                  <div className="activity-xp">+{activity.xpEarned} XP</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* プロフィール編集セクション */}
      <div className="profile-section">
        <h2>アカウント情報</h2>
        
        {error && <ErrorMessage message={error} />}

        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="edit-form">
            <div className="form-group">
              <label htmlFor="displayName">表示名</label>
              <input
                id="displayName"
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                placeholder="表示名を入力"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">メールアドレス</label>
              <input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="メールアドレスを入力"
                disabled={!isGuestMode}
              />
            </div>

            <div className="button-group">
              <Button
                type="submit"
                variant="primary"
                loading={isUpdating}
                disabled={isUpdating}
              >
                保存
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditing(false)}
                disabled={isUpdating}
              >
                キャンセル
              </Button>
            </div>
          </form>
        ) : (
          <div className="profile-info">
            <div className="info-row">
              <span className="info-label">表示名:</span>
              <span className="info-value">{userProfile?.displayName || '未設定'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">メールアドレス:</span>
              <span className="info-value">{userProfile?.email || '未設定'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">アカウントタイプ:</span>
              <span className="info-value">{isGuestMode ? 'ゲスト' : '認証済み'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">登録日:</span>
              <span className="info-value">
                {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : '不明'}
              </span>
            </div>

            <div className="button-group">
              <Button onClick={() => setIsEditing(true)} variant="primary">
                プロフィールを編集
              </Button>
              {!isGuestMode && (
                <Button onClick={handleSignOut} variant="secondary">
                  ログアウト
                </Button>
              )}
            </div>
          </div>
        )}

        {isGuestMode && (
          <div className="guest-notice">
            <p>ゲストモードでご利用中です。</p>
            <Link to="/login" className="link">
              アカウントを作成してデータを保存
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .profile-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 2rem;
          color: var(--text-primary);
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin: 2rem 0;
        }

        .stat-card {
          background: var(--surface);
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .level-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .level-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .level-number {
          font-size: 2rem;
          font-weight: bold;
          color: white;
        }

        .level-info {
          flex: 1;
        }

        .level-info h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
          text-transform: uppercase;
        }

        .xp-progress {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .xp-bar {
          height: 8px;
          background: var(--border);
          border-radius: 4px;
          overflow: hidden;
        }

        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--primary-light));
          transition: width 0.3s ease;
        }

        .xp-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .stat-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .stat-content h3 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .stat-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .stat-label {
          color: var(--text-secondary);
        }

        .stat-value {
          font-weight: 600;
          color: var(--text-primary);
        }

        .badges-section {
          margin: 3rem 0;
        }

        .badges-section h2 {
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          color: var(--text-primary);
        }

        .badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 1rem;
        }

        .badge-item {
          background: var(--surface);
          border-radius: 0.75rem;
          padding: 1rem;
          text-align: center;
          transition: transform 0.2s;
          cursor: pointer;
        }

        .badge-item:hover {
          transform: translateY(-2px);
        }

        .badge-item.legendary {
          background: linear-gradient(135deg, #ffd700, #ffed4e);
        }

        .badge-item.epic {
          background: linear-gradient(135deg, #a855f7, #c084fc);
        }

        .badge-item.rare {
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
        }

        .badge-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .badge-name {
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .badge-date {
          font-size: 0.625rem;
          color: var(--text-secondary);
        }

        .activity-section {
          margin: 3rem 0;
        }

        .activity-section h2 {
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          color: var(--text-primary);
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--surface);
          border-radius: 0.5rem;
          transition: background 0.2s;
        }

        .activity-item:hover {
          background: var(--surface-hover);
        }

        .activity-icon {
          font-size: 1.5rem;
        }

        .activity-content {
          flex: 1;
        }

        .activity-title {
          font-size: 0.875rem;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .activity-date {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .activity-xp {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--success);
        }

        .profile-section {
          background: var(--surface);
          border-radius: 1rem;
          padding: 2rem;
          margin-top: 2rem;
        }

        .profile-section h2 {
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          color: var(--text-primary);
        }

        .edit-form {
          max-width: 500px;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .profile-info {
          max-width: 500px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border);
        }

        .info-label {
          font-weight: 500;
          color: var(--text-secondary);
        }

        .info-value {
          color: var(--text-primary);
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .guest-notice {
          margin-top: 2rem;
          padding: 1rem;
          background: var(--warning-light);
          border-radius: 0.5rem;
          text-align: center;
        }

        .link {
          color: var(--primary);
          text-decoration: none;
          font-weight: 500;
        }

        .link:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .profile-page {
            padding: 1rem;
          }

          .stats-overview {
            grid-template-columns: 1fr;
          }

          .level-card {
            flex-direction: column;
            text-align: center;
          }

          .badges-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          }
        }
      `}</style>
    </div>
  )
}