import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import quizService from '../../services/quizService'

interface HeartSystemProps {
  level: number
  hearts: number
  onHeartsUpdate?: (hearts: number) => void
  className?: string
}

export default function HeartSystem({ 
  level, 
  hearts: initialHearts, 
  onHeartsUpdate,
  className = '' 
}: HeartSystemProps) {
  const { userProfile } = useAuth()
  const [hearts, setHearts] = useState(initialHearts)
  const [nextRecoveryTime, setNextRecoveryTime] = useState<Date | null>(null)
  const [timeUntilRecovery, setTimeUntilRecovery] = useState<string>('')
  const [isRecovering, setIsRecovering] = useState(false)

  // ハート回復チェック
  useEffect(() => {
    if (!userProfile) return

    const checkRecovery = async () => {
      setIsRecovering(true)
      try {
        const recoveredHearts = await quizService.checkHeartRecovery(userProfile.uid, level)
        if (recoveredHearts !== hearts) {
          setHearts(recoveredHearts)
          onHeartsUpdate?.(recoveredHearts)
        }

        // 次回の回復時間を取得
        const progress = await quizService.getUserProgress(userProfile.uid, level)
        if (progress?.nextHeartRecovery) {
          setNextRecoveryTime(progress.nextHeartRecovery)
        } else {
          setNextRecoveryTime(null)
        }
      } catch (error) {
        console.error('Failed to check heart recovery:', error)
      } finally {
        setIsRecovering(false)
      }
    }

    checkRecovery()
    // 1分ごとに回復チェック
    const interval = setInterval(checkRecovery, 60000)

    return () => clearInterval(interval)
  }, [userProfile, level, hearts, onHeartsUpdate])

  // 回復までの時間カウントダウン
  useEffect(() => {
    if (!nextRecoveryTime || hearts >= 5) {
      setTimeUntilRecovery('')
      return
    }

    const updateTimer = () => {
      const now = new Date()
      const diff = nextRecoveryTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeUntilRecovery('回復中...')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeUntilRecovery(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [nextRecoveryTime, hearts])

  const renderHeart = (index: number) => {
    const isFilled = index < hearts
    const isLost = index >= hearts && hearts < 5

    return (
      <div
        key={index}
        className={`heart ${isFilled ? 'filled' : ''} ${isLost ? 'lost' : ''} ${isRecovering && index === hearts ? 'recovering' : ''}`}
      >
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 32 32" 
          fill="none"
        >
          <path
            d="M16 28.5C16 28.5 3 20 3 10.5C3 6.5 6 3.5 10 3.5C13 3.5 15.5 5.5 16 6.5C16.5 5.5 19 3.5 22 3.5C26 3.5 29 6.5 29 10.5C29 20 16 28.5 16 28.5Z"
            fill={isFilled ? '#ef4444' : 'none'}
            stroke={isFilled ? '#ef4444' : '#6b7280'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className={`heart-system ${className}`}>
      <div className="hearts-container">
        <div className="hearts-row">
          {[0, 1, 2, 3, 4].map(renderHeart)}
        </div>
        
        {hearts < 5 && (
          <div className="recovery-info">
            {timeUntilRecovery && (
              <span className="recovery-timer">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 4v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {timeUntilRecovery}
              </span>
            )}
            <span className="recovery-text">
              {hearts === 0 
                ? 'ハートがありません！30分待ってください' 
                : `次のハートまで: ${timeUntilRecovery}`
              }
            </span>
          </div>
        )}

        {hearts === 5 && (
          <div className="hearts-full">
            <span>ハート満タン！</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .heart-system {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .hearts-container {
          background: var(--surface);
          border-radius: 1rem;
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .hearts-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .heart {
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .heart.filled {
          animation: heartBeat 1.5s ease-in-out infinite;
        }

        .heart.lost {
          animation: heartLost 0.5s ease-out;
          opacity: 0.3;
        }

        .heart.recovering {
          animation: heartRecover 1s ease-in-out infinite;
        }

        .recovery-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.5rem;
        }

        .recovery-timer {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--primary);
        }

        .recovery-text {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-align: center;
        }

        .hearts-full {
          text-align: center;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--success);
          margin-top: 0.5rem;
        }

        @keyframes heartBeat {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes heartLost {
          0% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(0.8) rotate(-10deg);
          }
          100% {
            transform: scale(0.6) rotate(0deg);
            opacity: 0.3;
          }
        }

        @keyframes heartRecover {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }

        @media (max-width: 640px) {
          .hearts-container {
            padding: 0.75rem;
          }

          .heart svg {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </div>
  )
}