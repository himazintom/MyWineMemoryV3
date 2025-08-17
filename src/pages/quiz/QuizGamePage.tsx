import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import quizService from '../../services/quizService'
import gamificationService from '../../services/gamificationService'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import Button from '../../components/common/Button'
import type { QuizQuestion } from '../../types/quiz'

interface QuizState {
  currentQuestion: QuizQuestion | null
  currentQuestionIndex: number
  totalQuestions: number
  selectedAnswer: number | null
  showResult: boolean
  isCorrect: boolean
  correctAnswers: number
  incorrectAnswers: number
  hearts: number
  sessionId: string | null
}

export default function QuizGamePage() {
  const { level } = useParams<{ level: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: null,
    currentQuestionIndex: 0,
    totalQuestions: 0,
    selectedAnswer: null,
    showResult: false,
    isCorrect: false,
    correctAnswers: 0,
    incorrectAnswers: 0,
    hearts: 5,
    sessionId: null
  })
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  // レベルとクイズの初期化
  useEffect(() => {
    if (!userProfile || !level) return
    
    const initQuiz = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const levelNum = parseInt(level)
        if (isNaN(levelNum) || levelNum < 1 || levelNum > 20) {
          throw new Error('無効なレベルです')
        }
        
        // ハートチェック
        const hasHearts = await quizService.checkHearts(userProfile.uid)
        if (!hasHearts) {
          setError('ハートが不足しています。30分後に回復します。')
          return
        }
        
        // レベル進捗チェック
        const progress = await quizService.getProgress(userProfile.uid, levelNum)
        const isUnlocked = await quizService.isLevelUnlocked(userProfile.uid, levelNum)
        
        if (!isUnlocked) {
          setError(`レベル${levelNum}はまだアンロックされていません`)
          return
        }
        
        // クイズ問題を読み込み
        const levelQuestions = await quizService.getQuestionsByLevel(levelNum)
        if (!levelQuestions || levelQuestions.length === 0) {
          setError('クイズデータが見つかりません')
          return
        }
        
        // 未回答の問題を優先、またはランダムに選択
        const unansweredQuestions = levelQuestions.filter(
          q => !progress?.completedQuestions.includes(q.id)
        )
        
        const questionsToShow = unansweredQuestions.length > 0 
          ? unansweredQuestions.slice(0, 10)
          : levelQuestions.sort(() => Math.random() - 0.5).slice(0, 10)
        
        // セッション開始
        const session = await quizService.startSession(
          userProfile.uid,
          levelNum,
          questionsToShow.map(q => q.id)
        )
        
        setQuestions(questionsToShow)
        setQuizState(prev => ({
          ...prev,
          currentQuestion: questionsToShow[0],
          totalQuestions: questionsToShow.length,
          sessionId: session.id,
          hearts: 5
        }))
        
      } catch (err) {
        console.error('Failed to initialize quiz:', err)
        setError('クイズの初期化に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }
    
    initQuiz()
  }, [userProfile, level])

  // 回答を選択
  const handleAnswerSelect = (answerIndex: number) => {
    if (quizState.showResult || !quizState.currentQuestion) return
    
    setQuizState(prev => ({
      ...prev,
      selectedAnswer: answerIndex
    }))
  }

  // 回答を確定
  const handleAnswerSubmit = async () => {
    if (quizState.selectedAnswer === null || !quizState.currentQuestion || !userProfile) return
    
    const isCorrect = quizState.selectedAnswer === quizState.currentQuestion.correctAnswer
    
    // 回答を記録
    if (quizState.sessionId) {
      await quizService.recordAnswer(
        userProfile.uid,
        quizState.sessionId,
        quizState.currentQuestion.id,
        quizState.selectedAnswer,
        isCorrect
      )
    }
    
    // 正解の場合XPを付与
    if (isCorrect) {
      // gamificationService.awardXPが実装されたら有効化
      // await gamificationService.awardXP(userProfile.uid, 5, 'quiz_correct_answer', `レベル${level}のクイズに正解`)
    }
    
    setQuizState(prev => ({
      ...prev,
      showResult: true,
      isCorrect,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      incorrectAnswers: !isCorrect ? prev.incorrectAnswers + 1 : prev.incorrectAnswers,
      hearts: !isCorrect ? Math.max(0, prev.hearts - 1) : prev.hearts
    }))
    
    setShowExplanation(true)
  }

  // 次の問題へ
  const handleNextQuestion = () => {
    if (quizState.hearts === 0) {
      handleQuizEnd()
      return
    }
    
    const nextIndex = quizState.currentQuestionIndex + 1
    
    if (nextIndex >= questions.length) {
      handleQuizEnd()
      return
    }
    
    setQuizState(prev => ({
      ...prev,
      currentQuestion: questions[nextIndex],
      currentQuestionIndex: nextIndex,
      selectedAnswer: null,
      showResult: false,
      isCorrect: false
    }))
    
    setShowExplanation(false)
  }

  // クイズ終了
  const handleQuizEnd = async () => {
    if (!userProfile || !quizState.sessionId) return
    
    try {
      // セッション完了
      await quizService.completeSession(
        userProfile.uid,
        quizState.sessionId,
        quizState.correctAnswers,
        quizState.incorrectAnswers
      )
      
      // ハート消費（間違えた分）
      if (quizState.incorrectAnswers > 0) {
        await quizService.consumeHearts(userProfile.uid, quizState.incorrectAnswers)
      }
      
      // 完了ボーナスXP
      if (quizState.correctAnswers >= 8) {
        await gamificationService.awardXP(
          userProfile.uid,
          20,
          'quiz_level_complete',
          `レベル${level}のクイズで高得点達成`
        )
      }
      
      navigate('/quiz', { 
        state: { 
          completedLevel: level,
          score: quizState.correctAnswers,
          total: quizState.totalQuestions
        }
      })
    } catch (err) {
      console.error('Failed to complete quiz:', err)
    }
  }

  // ローディング表示
  if (isLoading) {
    return (
      <div className="quiz-game-page">
        <LoadingSpinner />
      </div>
    )
  }

  // エラー表示
  if (error) {
    return (
      <div className="quiz-game-page">
        <ErrorMessage message={error} />
        <Button onClick={() => navigate('/quiz')}>クイズ一覧に戻る</Button>
      </div>
    )
  }

  // クイズが無い場合
  if (!quizState.currentQuestion) {
    return (
      <div className="quiz-game-page">
        <div className="empty-state">
          <h2>クイズが見つかりません</h2>
          <Button onClick={() => navigate('/quiz')}>クイズ一覧に戻る</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-game-page">
      {/* ヘッダー情報 */}
      <div className="quiz-header">
        <div className="quiz-progress">
          <span className="progress-text">
            問題 {quizState.currentQuestionIndex + 1} / {quizState.totalQuestions}
          </span>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${((quizState.currentQuestionIndex + 1) / quizState.totalQuestions) * 100}%` 
              }}
            />
          </div>
        </div>
        
        <div className="quiz-stats">
          <div className="hearts">
            {Array.from({ length: 5 }, (_, i) => (
              <span 
                key={i} 
                className={`heart ${i < quizState.hearts ? 'active' : 'lost'}`}
              >
                {i < quizState.hearts ? '❤️' : '🤍'}
              </span>
            ))}
          </div>
          <div className="score">
            <span className="correct">✓ {quizState.correctAnswers}</span>
            <span className="incorrect">✗ {quizState.incorrectAnswers}</span>
          </div>
        </div>
      </div>

      {/* 問題表示 */}
      <div className="quiz-content">
        <div className="question-card">
          <div className="question-header">
            <span className="question-category">
              {quizState.currentQuestion.category}
            </span>
            <span className="question-difficulty">
              レベル {level}
            </span>
          </div>
          
          <h2 className="question-text">
            {quizState.currentQuestion.question}
          </h2>
          
          <div className="answers">
            {quizState.currentQuestion.options.map((option, index) => {
              const isSelected = quizState.selectedAnswer === index
              const isCorrect = index === quizState.currentQuestion!.correctAnswer
              const showCorrect = quizState.showResult && isCorrect
              const showIncorrect = quizState.showResult && isSelected && !isCorrect
              
              return (
                <button
                  key={index}
                  className={`answer-option ${isSelected ? 'selected' : ''} 
                    ${showCorrect ? 'correct' : ''} 
                    ${showIncorrect ? 'incorrect' : ''}`}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={quizState.showResult}
                >
                  <span className="answer-number">{String.fromCharCode(65 + index)}</span>
                  <span className="answer-text">{option}</span>
                  {showCorrect && <span className="answer-icon">✓</span>}
                  {showIncorrect && <span className="answer-icon">✗</span>}
                </button>
              )
            })}
          </div>
          
          {/* 解説表示 */}
          {showExplanation && (
            <div className={`explanation ${quizState.isCorrect ? 'correct' : 'incorrect'}`}>
              <div className="explanation-header">
                {quizState.isCorrect ? '🎉 正解です！' : '💡 不正解'}
              </div>
              <div className="explanation-content">
                <p className="correct-answer">
                  正解: {quizState.currentQuestion.options[quizState.currentQuestion.correctAnswer]}
                </p>
                <p className="explanation-text">
                  {quizState.currentQuestion.explanation}
                </p>
                {quizState.currentQuestion.tips && (
                  <div className="tips">
                    <strong>💡 ヒント:</strong> {quizState.currentQuestion.tips}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="quiz-actions">
        {!quizState.showResult ? (
          <Button 
            onClick={handleAnswerSubmit}
            disabled={quizState.selectedAnswer === null}
            size="lg"
            className="submit-button"
          >
            回答する
          </Button>
        ) : (
          <>
            {quizState.currentQuestionIndex < questions.length - 1 && quizState.hearts > 0 ? (
              <Button 
                onClick={handleNextQuestion}
                size="lg"
                className="next-button"
              >
                次の問題へ
              </Button>
            ) : (
              <Button 
                onClick={handleQuizEnd}
                size="lg"
                className="finish-button"
              >
                結果を見る
              </Button>
            )}
          </>
        )}
        
        <Button 
          variant="secondary"
          onClick={() => navigate('/quiz')}
          className="quit-button"
        >
          やめる
        </Button>
      </div>
    </div>
  )
}