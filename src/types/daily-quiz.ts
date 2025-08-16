// ワインワンノックイズ（日常ワインクイズ）の型定義

// ワンノックイズセッション
export interface DailyQuizSession {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  
  // セッション情報
  startedAt: Date
  endedAt?: Date
  totalQuestions: number
  correctAnswers: number
  
  // 問題と回答
  questions: DailyQuizQuestion[]
  currentQuestionIndex: number
  
  // 状態
  isCompleted: boolean
  score: number // 0-100
  timeSpent: number // 秒
  
  // 報酬
  xpEarned: number
  heartsUsed: number
  streakCount: number
  
  createdAt: Date
  updatedAt: Date
}

// 日常ワインクイズ問題（軽量版）
export interface DailyQuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  category: WineQuizCategory
  difficulty: 'easy' | 'medium' | 'hard'
  imageUrl?: string // ワインボトルやブドウ畑の画像
  timeLimit: number // 秒（通常30-60秒）
  
  // ワイン固有の情報
  relatedWine?: {
    name: string
    producer: string
    region: string
    vintage?: number
  }
  tips?: string // 覚え方のコツ
}

// ワインクイズカテゴリ
export const WineQuizCategory = {
  GRAPE_VARIETIES: 'grape_varieties', // ブドウ品種
  WINE_REGIONS: 'wine_regions', // ワイン産地
  WINE_PAIRING: 'wine_pairing', // ワインとフードペアリング
  TASTING_NOTES: 'tasting_notes', // テイスティングノート
  WINE_MAKING: 'wine_making', // ワイン製造
  VINTAGES: 'vintages', // ヴィンテージ
  WINE_TRIVIA: 'wine_trivia', // ワイン豆知識
  JAPANESE_WINE: 'japanese_wine' // 日本ワイン
} as const

export type WineQuizCategory = typeof WineQuizCategory[keyof typeof WineQuizCategory]

// 日常クイズ統計
export interface DailyQuizStats {
  userId: string
  
  // 今日の統計
  todayQuestions: number
  todayCorrect: number
  todayStreak: number
  todayXP: number
  
  // 週間統計
  weeklyQuestions: number
  weeklyCorrect: number
  weeklyBestStreak: number
  
  // 月間統計
  monthlyQuestions: number
  monthlyCorrect: number
  monthlyBestStreak: number
  
  // 全期間統計
  totalQuestions: number
  totalCorrect: number
  bestStreak: number
  averageAccuracy: number
  
  // ストリーク管理
  currentStreak: number
  streakStartDate: Date
  lastPlayDate: Date
  
  // プレイ習慣
  playTimePreference: 'morning' | 'afternoon' | 'evening' | 'night'
  averageDailyQuestions: number
  playDaysThisWeek: number
  
  updatedAt: Date
}

// 日常クイズ設定
export interface DailyQuizSettings {
  userId: string
  
  // 通知設定
  reminderEnabled: boolean
  reminderTime: string // HH:mm format
  reminderDays: number[] // 0-6 (Sunday-Saturday)
  
  // 難易度設定
  preferredDifficulty: 'adaptive' | 'easy' | 'medium' | 'hard'
  adaptiveAdjustment: boolean // 正答率に基づいて難易度自動調整
  
  // 目標設定
  dailyQuestionGoal: number // 1日の目標問題数
  weeklyGoal: number
  
  // ワインカテゴリ設定
  enabledCategories: WineQuizCategory[]
  disabledCategories: WineQuizCategory[]
  
  updatedAt: Date
}

// クイック問題プール（事前ロード用）
export interface QuestionPool {
  easy: DailyQuizQuestion[]
  medium: DailyQuizQuestion[]
  hard: DailyQuizQuestion[]
  lastUpdated: Date
}

// ワンノックイズのUI状態
export interface DailyQuizUIState {
  isLoading: boolean
  currentSession: DailyQuizSession | null
  currentQuestion: DailyQuizQuestion | null
  userAnswer: number | null
  showResult: boolean
  showExplanation: boolean
  timeRemaining: number
  isTimerRunning: boolean
  canProceed: boolean
}