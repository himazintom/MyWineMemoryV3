import type { WineType, WineColor } from './wine'

// テイスティング記録の基本型
export interface TastingRecord {
  id: string
  userId: string
  wineId?: string // 既存ワインを参照する場合
  
  // ワイン基本情報（新規作成時またはオーバーライド時）
  wineName: string
  producer: string
  vintage?: number
  region: string
  country: string
  type: WineType
  color: WineColor
  alcoholContent?: number
  price?: number
  
  // テイスティング情報
  tastingDate: Date
  mode: 'quick' | 'detailed'
  rating: number // 0.0-10.0
  quickNotes?: string
  
  // 詳細分析（詳細モード時）
  detailedAnalysis?: DetailedAnalysis
  
  // 環境・コンテキスト
  environment?: TastingEnvironment
  
  // メタデータ
  isPublic: boolean
  citations?: Citation[] // 過去記録からの引用
  imageUrls: string[]
  tags: string[]
  
  createdAt: Date
  updatedAt: Date
}

// 詳細分析データ
export interface DetailedAnalysis {
  // 外観分析
  appearance: {
    intensity: number // 1-5
    transparency: number // 1-5
    viscosity: number // 1-5
    color: string
    colorNotes?: string
  }
  
  // 香り分析
  aroma: {
    firstImpression: string
    afterSwirling: string
    intensity: number // 1-5
    categories: {
      fruits: string[]
      florals: string[]
      spices: string[]
      earthy: string[]
      oaky: string[]
      other: string[]
    }
  }
  
  // 味わい分析
  taste: {
    attack: string
    development: string
    finish: string
    finishLength: number // 1-5
    balance: number // 1-5
    complexity: number // 1-5
  }
  
  // 構造分析
  structure: {
    sweetness: number // 1-5 (1=bone dry, 5=very sweet)
    acidity: number // 1-5
    tannin: number // 1-5 (赤ワインのみ)
    alcohol: number // 1-5
    body: number // 1-5 (1=light, 5=full)
  }
}

// テイスティング環境
export interface TastingEnvironment {
  glassType: GlassType
  servingTemperature?: number
  decanted: boolean
  decantingTime?: number // 分
  lighting: string
  atmosphere: string
  mood: string
  companions?: string[]
  food?: string[]
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