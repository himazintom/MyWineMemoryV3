
// テイスティング記録の基本型
export interface TastingRecord {
  id: string
  userId: string
  wineId?: string // 既存ワインを参照する場合
  
  // ワイン基本情報（新規作成時またはオーバーライド時）
  wineName: string
  producer: string
  vintage?: number
  region?: string
  country?: string
  type: string // WineType
  color?: string // WineColor
  grapes?: string[] // 品種
  alcoholContent?: number
  price?: number
  
  // テイスティング情報
  tastingDate: Date
  mode: 'quick' | 'detailed'
  rating: number // 0.0-10.0
  notes?: string // quickNotesをnotesに統合
  quickNotes?: string // 後方互換性のため
  
  // 詳細分析（詳細モード時）
  detailedAnalysis?: DetailedAnalysis
  
  // 環境・コンテキスト
  environment?: TastingEnvironment
  
  // メタデータ
  isPublic: boolean
  citations?: Citation[] // 過去記録からの引用
  images?: string[] // imageUrlsをimagesに変更
  tags?: string[]
  
  createdAt: Date
  updatedAt: Date
}

// 詳細分析データ
export interface DetailedAnalysis {
  // 外観分析
  appearance?: {
    clarity?: string
    intensity?: number | string // 1-5 or string
    transparency?: number // 1-5
    viscosity?: number // 1-5
    color?: string
    colorNotes?: string
  }
  
  // 香り分析
  aroma?: {
    firstImpression?: string
    afterSwirling?: string
    intensity?: number // 1-10
    complexity?: number // 1-10
    categories?: {
      fruits?: string[]
      florals?: string[]
      spices?: string[]
      earthy?: string[]
      oaky?: string[]
      other?: string[]
    }
    notes?: string
  }
  
  // 味わい分析
  taste?: {
    attack?: string
    development?: string
    finish?: string
    length?: number // finishLengthをlengthに変更
    finishLength?: number // 後方互換性
    balance?: number // 1-10
    complexity?: number // 1-10
    sweetness?: number // 1-10
    acidity?: number // 1-10
    tannin?: number // 1-10
    body?: number // 1-10
    alcohol?: number // 1-10
  }
  
  // 構造分析（後方互換性）
  structure?: {
    sweetness?: number
    acidity?: number
    tannin?: number
    alcohol?: number
    body?: number
  }
}

// テイスティング環境
export interface TastingEnvironment {
  glassType?: string
  temperature?: number // servingTemperatureをtemperatureに変更
  servingTemperature?: number // 後方互換性
  decanted?: boolean
  decantTime?: number // decantingTimeをdecantTimeに変更
  decantingTime?: number // 後方互換性
  lighting?: string
  atmosphere?: string
  weather?: string
  mood?: string
  companions?: string[]
  pairing?: string[] // foodをpairingに変更
  food?: string[] // 後方互換性
  notes?: string
}

// グラスタイプ
export const GlassType = {
  BORDEAUX: 'bordeaux',
  BURGUNDY: 'burgundy', 
  CHARDONNAY: 'chardonnay',
  SAUVIGNON_BLANC: 'sauvignon_blanc',
  RIESLING: 'riesling',
  CHAMPAGNE_FLUTE: 'champagne_flute',
  CHAMPAGNE_COUPE: 'champagne_coupe',
  UNIVERSAL: 'universal'
} as const

export type GlassType = typeof GlassType[keyof typeof GlassType]

// 引用情報
export interface Citation {
  sourceRecordId: string
  citedFields: string[]
  citedAt: Date
}

// 時系列テイスティングノート
export interface TimeSeriesNote {
  id: string
  recordId: string
  timestamp: Date // テイスティング開始からの経過時間
  notes: string
  rating?: number
}

// 重複ワイン検出用のマッチング結果
export interface WineMatch {
  wineId: string
  wineName: string
  producer: string
  vintage?: number
  confidence: number // 0-1の類似度スコア
  matchedFields: string[]
}