import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import quizService from '../../services/quizService'
import LoadingSpinner from '../../components/common/LoadingSpinner'

interface LevelProgress {
  level: number
  completedQuestions: number
  totalQuestions: number
  bestScore: number
  isUnlocked: boolean
}

export default function QuizPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [levelProgress, setLevelProgress] = useState<LevelProgress[]>([])
  const [hearts, setHearts] = useState(5)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userProfile) return

    const loadProgress = async () => {
      try {
        setIsLoading(true)
        
        // 各レベルの進捗を取得
        const progressData: LevelProgress[] = []
        for (let level = 1; level <= 20; level++) {
          const progress = await quizService.getProgress(userProfile.uid, level)
          const isUnlocked = await quizService.isLevelUnlocked(userProfile.uid, level)
          
          progressData.push({
            level,
            completedQuestions: progress?.completedQuestions.length || 0,
            totalQuestions: 100,
            bestScore: progress?.bestScore || 0,
            isUnlocked
          })
        }
        
        setLevelProgress(progressData)
        
        // ハート数を取得
        const stats = await quizService.getUserStats(userProfile.uid)
        setHearts(stats?.hearts || 5)
        
      } catch (error) {
        console.error('Failed to load quiz progress:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProgress()
  }, [userProfile])

  const handleStartQuiz = (level: number) => {
    navigate(`/quiz/level/${level}`)
  }

  if (isLoading) {
    return (
      <div className="quiz-page">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="quiz-page">
      <div className="page-header">
        <h1>ワインクイズ</h1>
      </div>
      
      {/* ワンノックイズセクション */}
      <div className="daily-quiz-section">
        <h2>今日のワンノックイズ 🍷</h2>
        <div className="daily-quiz-card">
          <div className="quiz-status">
            <div className="hearts">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i}>{i < hearts ? '❤️' : '🤍'}</span>
              ))}
              <span className="hearts-text">{hearts}/5</span>
            </div>
            <div className="today-stats">
              <span>今日: 準備中</span>
            </div>
          </div>
          <div className="daily-quiz-actions">
            <button className="btn btn-primary" onClick={() => handleStartQuiz(1)}>
              1問だけ挑戦
            </button>
            <button className="btn btn-secondary" disabled>続きから</button>
          </div>
        </div>
      </div>
      
      <div className="quiz-levels">
        <h2>レベル別クイズ</h2>
        
        <div className="levels-grid">
          {levelProgress.slice(0, 5).map((progress) => (
            <div key={progress.level} className="level-card">
              <div className="level-number">Level {progress.level}</div>
              <div className="level-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${(progress.completedQuestions / progress.totalQuestions) * 100}%` 
                    }}
                  />
                </div>
                <span className="progress-text">
                  {progress.completedQuestions}/{progress.totalQuestions}
                </span>
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => handleStartQuiz(progress.level)}
                disabled={!progress.isUnlocked}
              >
                {progress.isUnlocked ? 'Start' : 'Locked'}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="quiz-stats">
        <div className="stat-item">
          <span className="stat-label">ハート</span>
          <span className="stat-value">♥️♥️♥️♥️♥️</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">総正解率</span>
          <span className="stat-value">-%</span>
        </div>
      </div>
    </div>
  )
}