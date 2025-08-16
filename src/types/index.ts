// 統合型エクスポート

// ユーザー関連
export type { 
  User, 
  UserPreferences, 
  UserSubscription, 
  UserStats 
} from './user'

// ワイン関連
export type { 
  Wine, 
  TastingNotes, 
  WineFilters,
  WineType,
  WineColor 
} from './wine'

export { WineType, WineColor } from './wine'

// テイスティング記録関連
export type {
  TastingRecord,
  DetailedAnalysis,
  TastingEnvironment,
  Citation,
  TimeSeriesNote,
  WineMatch,
  GlassType
} from './tasting'

export { GlassType } from './tasting'

// クイズ関連
export type {
  QuizQuestion,
  QuizProgress,
  QuizAnswer,
  QuizSession,
  UserQuizStats,
  QuizCategory
} from './quiz'

export { QuizCategory } from './quiz'

// デイリークイズ関連
export type {
  DailyQuizSession,
  DailyQuizQuestion,
  DailyQuizStats,
  DailyQuizSettings,
  QuestionPool,
  DailyQuizUIState,
  WineQuizCategory
} from './daily-quiz'

export { WineQuizCategory } from './daily-quiz'

// ゲーミフィケーション関連
export type {
  UserXP,
  XPRecord,
  LevelUpRecord,
  Badge,
  BadgeRequirement,
  UserBadge,
  DailyGoal,
  UserStreak,
  ActivityRecord,
  XPSource,
  BadgeCategory,
  BadgeRarity,
  RequirementType,
  ActivityType
} from './gamification'

export { 
  XPSource,
  BadgeCategory,
  BadgeRarity,
  RequirementType,
  ActivityType
} from './gamification'