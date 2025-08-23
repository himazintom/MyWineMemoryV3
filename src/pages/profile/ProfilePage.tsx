import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/common/Button'
import ErrorMessage from '../../components/common/ErrorMessage'

export default function ProfilePage() {
  const { currentUser, userProfile, isGuestMode, signOut, updateUserProfile, error, clearError } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    displayName: userProfile?.displayName || '',
    email: userProfile?.email || ''
  })
  const [isUpdating, setIsUpdating] = useState(false)

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

  // デバッグ用
  useEffect(() => {
    console.log('ProfilePage - currentUser:', currentUser)
    console.log('ProfilePage - userProfile:', userProfile)
    console.log('ProfilePage - isGuestMode:', isGuestMode)
  }, [currentUser, userProfile, isGuestMode])

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>プロフィール</h1>
      </div>
      
      {error && (
        <ErrorMessage 
          message={error} 
          variant="banner"
          onDismiss={clearError}
        />
      )}
      
      <div className="profile-section">
        {isGuestMode ? (
          // ゲストモード表示
          <>
            <div className="user-info">
              <div className="avatar-placeholder">
                👤
              </div>
              <div className="user-details">
                <h2>ゲストユーザー</h2>
                <p>ゲストモードで利用中</p>
              </div>
            </div>
            
            <div className="auth-prompt">
              <p>アカウントを作成してデータを同期しませんか？</p>
              <div className="auth-buttons">
                <Link to="/login" className="btn btn-primary">
                  ログイン
                </Link>
                <Link to="/register" className="btn btn-secondary">
                  新規登録
                </Link>
              </div>
            </div>
          </>
        ) : (
          // 認証ユーザー表示
          <>
            <div className="user-info">
              <div className="avatar">
                {userProfile?.photoURL ? (
                  <img 
                    src={userProfile.photoURL} 
                    alt={userProfile.displayName || 'User Avatar'} 
                    className="avatar-image"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {userProfile?.displayName?.charAt(0) || '👤'}
                  </div>
                )}
              </div>
              <div className="user-details">
                {isEditing ? (
                  <form onSubmit={handleEditSubmit} className="edit-form">
                    <div className="form-group">
                      <label htmlFor="displayName">表示名</label>
                      <input
                        type="text"
                        id="displayName"
                        value={editForm.displayName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">メールアドレス</label>
                      <input
                        type="email"
                        id="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <Button 
                        type="submit" 
                        variant="primary" 
                        size="sm"
                        isLoading={isUpdating}
                      >
                        保存
                      </Button>
                      <Button 
                        type="button" 
                        variant="text" 
                        size="sm"
                        onClick={() => {
                          setIsEditing(false)
                          setEditForm({
                            displayName: userProfile?.displayName || '',
                            email: userProfile?.email || ''
                          })
                        }}
                        disabled={isUpdating}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h2>{userProfile?.displayName || currentUser?.displayName || 'Unknown User'}</h2>
                    <p>{userProfile?.email || currentUser?.email || ''}</p>
                    <p className="join-date">
                      登録日: {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('ja-JP') : '不明'}
                    </p>
                    <Button 
                      variant="text" 
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      編集
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="profile-actions">
              <Button 
                variant="danger" 
                onClick={handleSignOut}
              >
                ログアウト
              </Button>
            </div>
          </>
        )}
      </div>
      
      <div className="menu-section">
        <Link to="/settings" className="menu-item">
          <span>⚙️</span>
          <span>設定</span>
          <span>›</span>
        </Link>
        
        <div className="menu-item">
          <span>📄</span>
          <span>データエクスポート</span>
          <span>›</span>
        </div>
        
        <div className="menu-item">
          <span>📝</span>
          <span>フィードバック</span>
          <span>›</span>
        </div>
      </div>
    </div>
  )
}