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

export enum WineType {
  RED = 'red',
  WHITE = 'white',
  ROSE = 'rose',
  SPARKLING = 'sparkling',
  FORTIFIED = 'fortified',
  DESSERT = 'dessert'
}

export enum WineColor {
  LIGHT = 'light',
  MEDIUM = 'medium',
  DEEP = 'deep'
}

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