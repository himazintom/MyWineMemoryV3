export interface Wine {
  id: string
  name: string
  producer: string
  region: string
  country: string
  vintage: number
  type: WineType
  color: WineColor
  alcoholContent: number
  price?: number
  purchaseDate?: Date
  rating?: number
  notes?: string
  imageUrl?: string
  tastingNotes?: TastingNotes
  createdAt: Date
  updatedAt: Date
}

export interface TastingNotes {
  appearance?: string
  aroma?: string
  taste?: string
  finish?: string
  overall?: string
}

export const WineType = {
  RED: 'red',
  WHITE: 'white',
  ROSE: 'rose',
  SPARKLING: 'sparkling',
  FORTIFIED: 'fortified',
  DESSERT: 'dessert'
} as const

export type WineType = typeof WineType[keyof typeof WineType]

export const WineColor = {
  LIGHT: 'light',
  MEDIUM: 'medium',
  DEEP: 'deep'
} as const

export type WineColor = typeof WineColor[keyof typeof WineColor]

export interface WineFilters {
  type?: WineType
  country?: string
  region?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  maxRating?: number
  vintage?: number
}

// 人気ワイン（記録が多いワイン）の型定義
export interface PopularWine {
  wineName: string
  producer: string
  country: string
  region?: string
  type: WineType
  color: WineColor
  vintage?: number
  alcoholContent?: number
  price?: number
  recordCount: number
  averageRating: number
  lastTasted: Date
}