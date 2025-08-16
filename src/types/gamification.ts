// ゲーミフィケーション機能の型定義

// XPシステム
export interface UserXP {
  userId: string
  currentXP: number
  level: number
  xpToNextLevel: number
  totalXPEarned: number
  
  // XP履歴
  xpHistory: XPRecord[]
  
  // レベル履歴
  levelHistory: LevelUpRecord[]
  
  updatedAt: Date
}

// XP獲得記録
export interface XPRecord {
  id: string
  userId: string
  amount: number
  source: XPSource
  sourceId?: string // 関連するレコードやクイズのID
  description: string
  earnedAt: Date
}

// XP獲得源
export const XPSource = {
  TASTING_RECORD_CREATE: 'tasting_record_create', // 10-20 XP
  QUIZ_CORRECT_ANSWER: 'quiz_correct_answer', // 5 XP
  QUIZ_LEVEL_COMPLETE: 'quiz_level_complete', // 50 XP
  BADGE_EARNED: 'badge_earned', // 25 XP
  DAILY_GOAL_ACHIEVED: 'daily_goal_achieved', // 30 XP
  STREAK_MILESTONE: 'streak_milestone', // 40-100 XP
  PROFILE_COMPLETION: 'profile_completion', // 20 XP
  FIRST_LOGIN: 'first_login' // 10 XP
} as const

export type XPSource = typeof XPSource[keyof typeof XPSource]

// レベルアップ記録
export interface LevelUpRecord {
  id: string
  userId: string
  previousLevel: number
  newLevel: number
  xpAtLevelUp: number
  achievedAt: Date
}

// バッジシステム
export interface Badge {
  id: string
  name: string
  description: string
  iconUrl: string
  category: BadgeCategory
  rarity: BadgeRarity
  
  // 獲得条件
  requirements: BadgeRequirement[]
  
  // メタデータ
  isHidden: boolean // シークレットバッジ
  sortOrder: number
  createdAt: Date
}

// バッジカテゴリ
export const BadgeCategory = {
  TASTING: 'tasting',
  QUIZ: 'quiz', 
  SOCIAL: 'social',
  ACHIEVEMENT: 'achievement'
} as const

export type BadgeCategory = typeof BadgeCategory[keyof typeof BadgeCategory]

// バッジレア度
export const BadgeRarity = {
  COMMON: 'common',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary'
} as const

export type BadgeRarity = typeof BadgeRarity[keyof typeof BadgeRarity]

// バッジ獲得条件
export interface BadgeRequirement {
  type: RequirementType
  target: number
  category?: string
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time'
}

export const RequirementType = {
  RECORDS_COUNT: 'records_count',
  QUIZ_CORRECT: 'quiz_correct',
  STREAK_DAYS: 'streak_days',
  LEVEL_REACHED: 'level_reached',
  XP_EARNED: 'xp_earned',
  WINES_TRIED: 'wines_tried',
  COUNTRIES_VISITED: 'countries_visited',
  LOGIN_DAYS: 'login_days'
} as const

export type RequirementType = typeof RequirementType[keyof typeof RequirementType]

// ユーザーバッジ獲得記録
export interface UserBadge {
  id: string
  userId: string
  badgeId: string
  badge: Badge
  earnedAt: Date
  progress?: number // 進捗バッジの場合の進捗率 (0-100)
}

// 日常目標システム
export interface DailyGoal {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  
  // 目標設定
  tastingRecordsTarget: number
  quizQuestionsTarget: number
  
  // 進捗
  tastingRecordsCompleted: number
  quizQuestionsCompleted: number
  
  // 状態
  isCompleted: boolean
  completedAt?: Date
  bonusXPEarned: number
  
  createdAt: Date
  updatedAt: Date
}

// ストリーク管理
export interface UserStreak {
  userId: string
  
  // 現在のストリーク
  currentStreak: number
  currentStreakStart: Date
  lastActivityDate: Date
  
  // 記録
  longestStreak: number
  longestStreakStart: Date
  longestStreakEnd: Date
  
  // ストリーク種別
  tastingStreak: number // テイスティング記録の連続日数
  quizStreak: number // クイズプレイの連続日数
  loginStreak: number // ログインの連続日数
  
  updatedAt: Date
}

// アクティビティ履歴
export interface ActivityRecord {
  id: string
  userId: string
  type: ActivityType
  description: string
  relatedId?: string
  metadata?: Record<string, any>
  createdAt: Date
}

export const ActivityType = {
  TASTING_RECORD_CREATED: 'tasting_record_created',
  QUIZ_SESSION_COMPLETED: 'quiz_session_completed',
  BADGE_EARNED: 'badge_earned',
  LEVEL_UP: 'level_up',
  GOAL_ACHIEVED: 'goal_achieved',
  STREAK_MILESTONE: 'streak_milestone'
} as const

export type ActivityType = typeof ActivityType[keyof typeof ActivityType]