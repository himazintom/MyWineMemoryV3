// クイズシステムの型定義

// クイズ問題
export interface QuizQuestion {
  id: string
  
  // 問題内容
  question: string
  options: string[]
  correctAnswer: number // 正解のインデックス (0-3)
  explanation: string
  
  // カテゴリ・難易度
  category: string // 実際は日本語文字列
  difficulty: number // 1-20のレベル
  
  // オプションのメタデータ
  level?: number // レベル情報（必要に応じて追加）
  questionNumber?: number // 問題番号
  tags?: string[]
  tips?: string // 解説のヒント
  imageUrl?: string
  estimatedTimeSeconds?: number
  createdAt?: Date
  updatedAt?: Date
}

// クイズカテゴリ
export const QuizCategory = {
  GRAPE_VARIETIES: 'grape_varieties',
  WINE_REGIONS: 'wine_regions', 
  WINE_MAKING: 'wine_making',
  TASTING_TECHNIQUES: 'tasting_techniques',
  WINE_HISTORY: 'wine_history',
  FOOD_PAIRING: 'food_pairing',
  WINE_SERVICE: 'wine_service',
  WINE_STORAGE: 'wine_storage'
} as const

export type QuizCategory = typeof QuizCategory[keyof typeof QuizCategory]

// ユーザーのクイズ進捗
export interface QuizProgress {
  userId: string
  level: number
  
  // レベル内の進捗
  completedQuestions: number[]
  totalQuestions: number
  correctAnswers: number
  bestScore: number // 0-100のパーセント
  
  // 統計
  totalTime: number // 秒
  averageTime: number // 問題あたりの平均時間
  streak: number // 連続正解数
  
  // ハートシステム
  hearts: number // 現在のハート数 (0-5)
  lastHeartLoss?: Date
  nextHeartRecovery?: Date
  
  // 状態
  isUnlocked: boolean
  isCompleted?: boolean
  completedAt?: Date
  lastPlayedAt: Date
  
  createdAt: Date
  updatedAt: Date
}

// クイズ回答記録
export interface QuizAnswer {
  id: string
  userId: string
  questionId: string
  level: number
  
  // 回答情報
  selectedAnswer: number
  isCorrect: boolean
  timeSpent: number // 秒
  
  // コンテキスト
  sessionId: string
  answeredAt: Date
}

// クイズセッション
export interface QuizSession {
  id: string
  userId: string
  level: number
  
  // セッション情報
  startedAt: Date
  endedAt?: Date
  totalQuestions: number
  correctAnswers: number
  score: number // 0-100
  
  // 質問と回答
  questions: QuizQuestion[]
  answers: QuizAnswer[]
  
  // 結果
  isCompleted: boolean
  heartsLost: number
  xpEarned: number
  badgesEarned: string[]
}

// ユーザーの全体クイズ統計
export interface UserQuizStats {
  userId: string
  
  // 全体統計
  totalQuestionsAnswered: number
  totalCorrectAnswers: number
  overallAccuracy: number // 0-100
  totalTimeSpent: number // 秒
  hearts: number // 現在のハート数
  
  // レベル別統計
  levelStats: Record<number, {
    completed: boolean
    bestScore: number
    attemptsCount: number
    averageScore: number
  }>
  
  // ストリーク記録
  currentStreak: number
  longestStreak: number
  streakStartDate?: Date
  
  // ハート使用履歴
  totalHeartsUsed: number
  heartRecoveryCount: number
  
  // 学習パターン
  favoriteCategories: QuizCategory[]
  weakCategories: QuizCategory[]
  studyTimeByDay: Record<string, number> // ISO date string -> minutes
  
  // 復習システム
  reviewQueue: string[] // 間違えた問題のID
  lastReviewDate?: Date
  
  createdAt: Date
  updatedAt: Date
}