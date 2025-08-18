import { useState, useEffect } from 'react'

interface HeartDisplayProps {
  hearts: number
  maxHearts?: number
  size?: 'small' | 'medium' | 'large'
  showAnimation?: boolean
  className?: string
}

export default function HeartDisplay({ 
  hearts, 
  maxHearts = 5,
  size = 'medium',
  showAnimation = true,
  className = '' 
}: HeartDisplayProps) {
  const [animatingHearts, setAnimatingHearts] = useState<number[]>([])
  const [previousHearts, setPreviousHearts] = useState(hearts)

  useEffect(() => {
    if (hearts < previousHearts && showAnimation) {
      // ハートが減った時のアニメーション
      const lostHearts = []
      for (let i = hearts; i < previousHearts; i++) {
        lostHearts.push(i)
      }
      setAnimatingHearts(lostHearts)
      
      setTimeout(() => {
        setAnimatingHearts([])
      }, 600)
    } else if (hearts > previousHearts && showAnimation) {
      // ハートが回復した時のアニメーション
      const gainedHearts = []
      for (let i = previousHearts; i < hearts; i++) {
        gainedHearts.push(i)
      }
      setAnimatingHearts(gainedHearts)
      
      setTimeout(() => {
        setAnimatingHearts([])
      }, 600)
    }
    setPreviousHearts(hearts)
  }, [hearts, previousHearts, showAnimation])

  const getHeartSize = () => {
    switch (size) {
      case 'small': return 20
      case 'large': return 40
      default: return 28
    }
  }

  const heartSize = getHeartSize()

  return (
    <div className={`heart-display ${size} ${className}`}>
      {Array.from({ length: maxHearts }, (_, index) => {
        const isFilled = index < hearts
        const isAnimating = animatingHearts.includes(index)
        const isLosing = isAnimating && index >= hearts
        const isGaining = isAnimating && index < hearts

        return (
          <div
            key={index}
            className={`
              heart-icon 
              ${isFilled ? 'filled' : 'empty'}
              ${isLosing ? 'losing' : ''}
              ${isGaining ? 'gaining' : ''}
            `}
          >
            <svg 
              width={heartSize} 
              height={heartSize} 
              viewBox="0 0 32 32" 
              fill="none"
            >
              <path
                d="M16 28.5C16 28.5 3 20 3 10.5C3 6.5 6 3.5 10 3.5C13 3.5 15.5 5.5 16 6.5C16.5 5.5 19 3.5 22 3.5C26 3.5 29 6.5 29 10.5C29 20 16 28.5 16 28.5Z"
                fill={isFilled ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )
      })}

      <style jsx>{`
        .heart-display {
          display: inline-flex;
          gap: 0.25rem;
          align-items: center;
        }

        .heart-display.small {
          gap: 0.125rem;
        }

        .heart-display.large {
          gap: 0.375rem;
        }

        .heart-icon {
          position: relative;
          transition: all 0.3s ease;
        }

        .heart-icon.filled {
          color: #ef4444;
        }

        .heart-icon.empty {
          color: #9ca3af;
          opacity: 0.4;
        }

        .heart-icon.losing {
          animation: heartLose 0.6s ease-out;
        }

        .heart-icon.gaining {
          animation: heartGain 0.6s ease-out;
        }

        @keyframes heartLose {
          0% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.2) rotate(-15deg);
            opacity: 0.8;
          }
          100% {
            transform: scale(0.8) rotate(0deg);
            opacity: 0.4;
          }
        }

        @keyframes heartGain {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.3);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}