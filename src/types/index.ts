// ���nq������

// �����#
export type { 
  User, 
  UserPreferences, 
  UserSubscription, 
  UserStats 
} from './user'

// ��#
export type { 
  Wine, 
  TastingNotes, 
  WineFilters,
  WineType,
  WineColor 
} from './wine'

export { WineType, WineColor } from './wine'

// Ƥ�ƣ�2�#
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

// ����#
export type {
  QuizQuestion,
  QuizProgress,
  QuizAnswer,
  QuizSession,
  UserQuizStats,
  QuizCategory
} from './quiz'

export { QuizCategory } from './quiz'

// ���ï���#
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

// ���գ�����#
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