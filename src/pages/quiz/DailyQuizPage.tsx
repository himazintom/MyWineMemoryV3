import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Button from '../../components/common/Button'
import { quizData } from '../../data/quiz'

interface DailyQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
}

export default function DailyQuizPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasAnsweredToday, setHasAnsweredToday] = useState(false)

  useEffect(() => {
    loadDailyQuestion()
  }, [userProfile])

  const loadDailyQuestion = () => {
    try {
      setIsLoading(true)
      
      // 今日の日付をキーとして使用
      const today = new Date().toDateString()
      const storageKey = `daily_quiz_${today}_${userProfile?.uid || 'guest'}`
      
      // 今日すでに回答済みかチェック
      const answered = localStorage.getItem(storageKey)
      if (answered) {
        setHasAnsweredToday(true)
        setDailyQuestion(JSON.parse(answered))
        setShowResult(true)
        setSelectedAnswer(JSON.parse(answered).userAnswer)
      } else {
        // 今日の問題を生成（日付に基づいて一意の問題を選択）
        const allQuestions: DailyQuestion[] = []
        
        // 全レベルから問題を集める
        Object.values(quizData).forEach(level => {
          level.questions.forEach(q => {
            allQuestions.push({
              id: q.id,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty: level.level <= 7 ? 'easy' : level.level <= 14 ? 'medium' : 'hard',
              category: level.category
            })
          })
        })
        
        // 日付に基づいて一意のインデックスを生成
        const dateHash = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const questionIndex = dateHash % allQuestions.length
        
        setDailyQuestion(allQuestions[questionIndex])
      }
    } catch (error) {
      console.error('Failed to load daily question:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswer = (answerIndex: number) => {
    if (showResult || hasAnsweredToday) return
    
    setSelectedAnswer(answerIndex)
    setShowResult(true)
    
    // 回答を保存
    const today = new Date().toDateString()
    const storageKey = `daily_quiz_${today}_${userProfile?.uid || 'guest'}`
    const answerData = {
      ...dailyQuestion,
      userAnswer: answerIndex,
      answeredAt: new Date().toISOString()
    }
    localStorage.setItem(storageKey, JSON.stringify(answerData))
    setHasAnsweredToday(true)
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!dailyQuestion) {
    return (
      <div className="daily-quiz-page">
        <div className="no-question">
          <h2>今日の問題を読み込めませんでした</h2>
          <Button onClick={() => navigate('/quiz')}>
            クイズページへ戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="daily-quiz-page">
      <div className="page-header">
        <h1>今日のワインクイズ</h1>
        <p className="date">{new Date().toLocaleDateString('ja-JP')}</p>
      </div>

      <div className="quiz-content">
        <div className="question-card">
          <div className="question-header">
            <span className={`difficulty ${dailyQuestion.difficulty}`}>
              {dailyQuestion.difficulty === 'easy' ? '初級' : 
               dailyQuestion.difficulty === 'medium' ? '中級' : '上級'}
            </span>
            <span className="category">{dailyQuestion.category}</span>
          </div>

          <h2 className="question">{dailyQuestion.question}</h2>

          <div className="options">
            {dailyQuestion.options.map((option, index) => (
              <button
                key={index}
                className={`option-btn ${
                  showResult && index === dailyQuestion.correctAnswer ? 'correct' : ''
                } ${
                  showResult && index === selectedAnswer && index !== dailyQuestion.correctAnswer ? 'incorrect' : ''
                } ${
                  selectedAnswer === index ? 'selected' : ''
                }`}
                onClick={() => handleAnswer(index)}
                disabled={showResult || hasAnsweredToday}
              >
                {option}
              </button>
            ))}
          </div>

          {showResult && (
            <div className="result">
              <div className={`result-message ${selectedAnswer === dailyQuestion.correctAnswer ? 'correct' : 'incorrect'}`}>
                {selectedAnswer === dailyQuestion.correctAnswer ? '正解！' : '不正解'}
              </div>
              <div className="explanation">
                <h3>解説</h3>
                <p>{dailyQuestion.explanation}</p>
              </div>
            </div>
          )}
        </div>

        {hasAnsweredToday && (
          <div className="already-answered">
            <p>今日の問題は回答済みです。明日また挑戦してください！</p>
          </div>
        )}

        <div className="actions">
          <Button 
            variant="secondary" 
            onClick={() => navigate('/quiz')}
          >
            クイズ一覧へ
          </Button>
          {!hasAnsweredToday && (
            <Button 
              variant="primary"
              onClick={() => navigate('/quiz/level/1')}
            >
              もっと挑戦する
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}