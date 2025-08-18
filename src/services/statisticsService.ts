import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  startAfter,
  limit,
  Timestamp
} from 'firebase/firestore'
import firebaseService from './firebase'
import type { TastingRecord } from '../types'

// 統計データの型定義
export interface StatisticsData {
  // 基本統計
  totalRecords: number
  averageRating: number
  totalSpent: number
  uniqueWines: number
  uniqueProducers: number
  
  // 期間別統計
  monthlyStats: MonthlyStats[]
  yearlyStats: YearlyStats[]
  
  // 分析データ
  countryAnalysis: CountryAnalysis[]
  typeAnalysis: TypeAnalysis[]
  priceAnalysis: PriceAnalysis
  ratingAnalysis: RatingAnalysis
  
  // トレンド分析
  trends: TrendAnalysis
  
  // 生成時間
  generatedAt: Date
  cacheExpiry: Date
}

export interface MonthlyStats {
  year: number
  month: number
  recordCount: number
  averageRating: number
  totalSpent: number
  uniqueWines: number
  topCountry: string
  topType: string
}

export interface YearlyStats {
  year: number
  recordCount: number
  averageRating: number
  totalSpent: number
  uniqueWines: number
  growth: number // 前年比成長率
}

export interface CountryAnalysis {
  country: string
  count: number
  percentage: number
  averageRating: number
  averagePrice: number
  totalSpent: number
  favoriteTypes: string[]
}

export interface TypeAnalysis {
  type: string
  count: number
  percentage: number
  averageRating: number
  averagePrice: number
  seasonality: Record<string, number> // 月別の傾向
}

export interface PriceAnalysis {
  ranges: PriceRange[]
  averageByCountry: Record<string, number>
  averageByType: Record<string, number>
  priceVsRating: { price: number; rating: number }[]
  mostExpensive: TastingRecord[]
  bestValue: TastingRecord[] // 価格対評価比が良い
}

export interface PriceRange {
  min: number
  max: number
  count: number
  percentage: number
  averageRating: number
}

export interface RatingAnalysis {
  distribution: Record<string, number>
  averageByPrice: Record<string, number>
  averageByCountry: Record<string, number>
  averageByType: Record<string, number>
  topRated: TastingRecord[]
  improvementTrend: number // 評価の向上傾向
}

export interface TrendAnalysis {
  ratingTrend: TrendData[]
  priceTrend: TrendData[]
  volumeTrend: TrendData[]
  diversityTrend: TrendData[]
  preferences: PreferenceEvolution[]
}

export interface TrendData {
  period: string
  value: number
  change: number // 前期からの変化率
}

export interface PreferenceEvolution {
  period: string
  topCountries: string[]
  topTypes: string[]
  averagePrice: number
  ratingStandard: number
}

class StatisticsService {
  private readonly collectionName = 'tastingRecords'
  private cache = new Map<string, { data: StatisticsData; timestamp: number }>()
  private readonly cacheTimeout = 30 * 60 * 1000 // 30分間キャッシュ

  /**
   * ユーザーの統計データを取得（キャッシュ付き）
   */
  async getUserStatistics(userId: string, forceRefresh = false): Promise<StatisticsData> {
    const cacheKey = `stats_${userId}`
    
    // キャッシュチェック
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
    }

    // 統計データを計算
    const stats = await this.calculateStatistics(userId)
    
    // キャッシュに保存
    this.cache.set(cacheKey, {
      data: stats,
      timestamp: Date.now()
    })

    return stats
  }

  /**
   * 統計データの計算
   */
  private async calculateStatistics(userId: string): Promise<StatisticsData> {
    const records = await this.getAllUserRecords(userId)
    
    if (records.length === 0) {
      return this.getEmptyStatistics()
    }

    // 並列計算で高速化
    const [
      basicStats,
      monthlyStats,
      yearlyStats,
      countryAnalysis,
      typeAnalysis,
      priceAnalysis,
      ratingAnalysis,
      trends
    ] = await Promise.all([
      this.calculateBasicStats(records),
      this.calculateMonthlyStats(records),
      this.calculateYearlyStats(records),
      this.calculateCountryAnalysis(records),
      this.calculateTypeAnalysis(records),
      this.calculatePriceAnalysis(records),
      this.calculateRatingAnalysis(records),
      this.calculateTrends(records)
    ])

    const now = new Date()
    return {
      totalRecords: basicStats.totalRecords || 0,
      averageRating: basicStats.averageRating || 0,
      totalSpent: basicStats.totalSpent || 0,
      uniqueWines: basicStats.uniqueWines || 0,
      uniqueProducers: basicStats.uniqueProducers || 0,
      monthlyStats,
      yearlyStats,
      countryAnalysis,
      typeAnalysis,
      priceAnalysis,
      ratingAnalysis,
      trends,
      generatedAt: now,
      cacheExpiry: new Date(now.getTime() + this.cacheTimeout)
    }
  }

  /**
   * 全ユーザーレコードを取得
   */
  private async getAllUserRecords(userId: string): Promise<TastingRecord[]> {
    const firestore = firebaseService.getFirestore()
    const records: TastingRecord[] = []
    let lastDoc = null
    const batchSize = 500

    while (true) {
      let q = query(
        collection(firestore, this.collectionName),
        where('userId', '==', userId),
        orderBy('tastingDate', 'desc'),
        limit(batchSize)
      )

      if (lastDoc) {
        q = query(q, startAfter(lastDoc))
      }

      const snapshot = await getDocs(q)
      
      if (snapshot.empty) break

      snapshot.docs.forEach(doc => {
        const data = doc.data()
        records.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          tastingDate: data.tastingDate?.toDate() || new Date()
        } as TastingRecord)
      })

      if (snapshot.docs.length < batchSize) break
      lastDoc = snapshot.docs[snapshot.docs.length - 1]
    }

    return records
  }

  /**
   * 基本統計の計算
   */
  private async calculateBasicStats(records: TastingRecord[]): Promise<Partial<StatisticsData>> {
    const totalRecords = records.length
    
    if (totalRecords === 0) {
      return {
        totalRecords: 0,
        averageRating: 0,
        totalSpent: 0,
        uniqueWines: 0,
        uniqueProducers: 0
      }
    }
    
    const averageRating = records.reduce((sum, r) => sum + r.rating, 0) / totalRecords
    const totalSpent = records
      .filter(r => r.price)
      .reduce((sum, r) => sum + (r.price || 0), 0)
    
    const uniqueWines = new Set(
      records.map(r => `${r.wineName}_${r.producer}_${r.vintage}`)
    ).size
    
    const uniqueProducers = new Set(records.map(r => r.producer)).size

    return {
      totalRecords,
      averageRating,
      totalSpent,
      uniqueWines,
      uniqueProducers
    }
  }

  /**
   * 月別統計の計算
   */
  private async calculateMonthlyStats(records: TastingRecord[]): Promise<MonthlyStats[]> {
    const monthlyGroups = new Map<string, TastingRecord[]>()

    records.forEach(record => {
      const date = record.tastingDate
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyGroups.has(key)) {
        monthlyGroups.set(key, [])
      }
      monthlyGroups.get(key)!.push(record)
    })

    return Array.from(monthlyGroups.entries()).map(([key, monthRecords]) => {
      const [year, month] = key.split('-').map(Number)
      
      const countryCount = this.getTopItem(monthRecords, 'country')
      const typeCount = this.getTopItem(monthRecords, 'type')
      
      return {
        year,
        month,
        recordCount: monthRecords.length,
        averageRating: monthRecords.reduce((sum, r) => sum + r.rating, 0) / monthRecords.length,
        totalSpent: monthRecords
          .filter(r => r.price)
          .reduce((sum, r) => sum + (r.price || 0), 0),
        uniqueWines: new Set(monthRecords.map(r => `${r.wineName}_${r.producer}`)).size,
        topCountry: countryCount[0]?.[0] || 'Unknown',
        topType: typeCount[0]?.[0] || 'Unknown'
      }
    }).sort((a, b) => b.year - a.year || b.month - a.month)
  }

  /**
   * 年別統計の計算
   */
  private async calculateYearlyStats(records: TastingRecord[]): Promise<YearlyStats[]> {
    const yearlyGroups = new Map<number, TastingRecord[]>()

    records.forEach(record => {
      const year = record.tastingDate.getFullYear()
      if (!yearlyGroups.has(year)) {
        yearlyGroups.set(year, [])
      }
      yearlyGroups.get(year)!.push(record)
    })

    const yearlyStats = Array.from(yearlyGroups.entries()).map(([year, yearRecords]) => ({
      year,
      recordCount: yearRecords.length,
      averageRating: yearRecords.reduce((sum, r) => sum + r.rating, 0) / yearRecords.length,
      totalSpent: yearRecords
        .filter(r => r.price)
        .reduce((sum, r) => sum + (r.price || 0), 0),
      uniqueWines: new Set(yearRecords.map(r => `${r.wineName}_${r.producer}`)).size,
      growth: 0
    }))

    // 成長率を計算
    yearlyStats.sort((a, b) => a.year - b.year)
    for (let i = 1; i < yearlyStats.length; i++) {
      const current = yearlyStats[i]
      const previous = yearlyStats[i - 1]
      current.growth = ((current.recordCount - previous.recordCount) / previous.recordCount) * 100
    }

    return yearlyStats.sort((a, b) => b.year - a.year)
  }

  /**
   * 国別分析の計算
   */
  private async calculateCountryAnalysis(records: TastingRecord[]): Promise<CountryAnalysis[]> {
    const countryGroups = new Map<string, TastingRecord[]>()

    records.forEach(record => {
      const country = record.country || 'Unknown'
      if (!countryGroups.has(country)) {
        countryGroups.set(country, [])
      }
      countryGroups.get(country)!.push(record)
    })

    return Array.from(countryGroups.entries()).map(([country, countryRecords]) => {
      const count = countryRecords.length
      const percentage = (count / records.length) * 100
      const averageRating = countryRecords.reduce((sum, r) => sum + r.rating, 0) / count
      const priceRecords = countryRecords.filter(r => r.price)
      const averagePrice = priceRecords.length > 0 
        ? priceRecords.reduce((sum, r) => sum + (r.price || 0), 0) / priceRecords.length 
        : 0
      const totalSpent = priceRecords.reduce((sum, r) => sum + (r.price || 0), 0)
      
      const typeCount = this.getTopItem(countryRecords, 'type')
      const favoriteTypes = typeCount.slice(0, 3).map(([type]) => type)

      return {
        country,
        count,
        percentage,
        averageRating,
        averagePrice,
        totalSpent,
        favoriteTypes
      }
    }).sort((a, b) => b.count - a.count)
  }

  /**
   * タイプ別分析の計算
   */
  private async calculateTypeAnalysis(records: TastingRecord[]): Promise<TypeAnalysis[]> {
    const typeGroups = new Map<string, TastingRecord[]>()

    records.forEach(record => {
      const type = record.type || 'Unknown'
      if (!typeGroups.has(type)) {
        typeGroups.set(type, [])
      }
      typeGroups.get(type)!.push(record)
    })

    return Array.from(typeGroups.entries()).map(([type, typeRecords]) => {
      const count = typeRecords.length
      const percentage = (count / records.length) * 100
      const averageRating = typeRecords.reduce((sum, r) => sum + r.rating, 0) / count
      const priceRecords = typeRecords.filter(r => r.price)
      const averagePrice = priceRecords.length > 0 
        ? priceRecords.reduce((sum, r) => sum + (r.price || 0), 0) / priceRecords.length 
        : 0

      // 季節性分析
      const seasonality: Record<string, number> = {}
      for (let month = 1; month <= 12; month++) {
        const monthRecords = typeRecords.filter(r => r.tastingDate.getMonth() + 1 === month)
        seasonality[month.toString()] = monthRecords.length
      }

      return {
        type,
        count,
        percentage,
        averageRating,
        averagePrice,
        seasonality
      }
    }).sort((a, b) => b.count - a.count)
  }

  /**
   * 価格分析の計算
   */
  private async calculatePriceAnalysis(records: TastingRecord[]): Promise<PriceAnalysis> {
    const priceRecords = records.filter(r => r.price && r.price > 0)
    
    if (priceRecords.length === 0) {
      return {
        ranges: [],
        averageByCountry: {},
        averageByType: {},
        priceVsRating: [],
        mostExpensive: [],
        bestValue: []
      }
    }

    // 価格帯分析
    const ranges: PriceRange[] = [
      { min: 0, max: 3000, count: 0, percentage: 0, averageRating: 0 },
      { min: 3000, max: 5000, count: 0, percentage: 0, averageRating: 0 },
      { min: 5000, max: 10000, count: 0, percentage: 0, averageRating: 0 },
      { min: 10000, max: 20000, count: 0, percentage: 0, averageRating: 0 },
      { min: 20000, max: Infinity, count: 0, percentage: 0, averageRating: 0 }
    ]

    priceRecords.forEach(record => {
      const price = record.price!
      const range = ranges.find(r => price >= r.min && price < r.max)
      if (range) {
        range.count++
        range.averageRating += record.rating
      }
    })

    ranges.forEach(range => {
      range.percentage = (range.count / priceRecords.length) * 100
      range.averageRating = range.count > 0 ? range.averageRating / range.count : 0
    })

    // 国別・タイプ別平均価格
    const averageByCountry = this.calculateAverageByField(priceRecords, 'country', 'price')
    const averageByType = this.calculateAverageByField(priceRecords, 'type', 'price')

    // 価格と評価の関係
    const priceVsRating = priceRecords.map(r => ({
      price: r.price!,
      rating: r.rating
    }))

    // 最高額ワイン（上位10件）
    const mostExpensive = [...priceRecords]
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, 10)

    // コスパの良いワイン（価格対評価比）
    const bestValue = [...priceRecords]
      .map(r => ({ ...r, valueScore: r.rating / (r.price! / 1000) }))
      .sort((a, b) => (b as any).valueScore - (a as any).valueScore)
      .slice(0, 10)

    return {
      ranges,
      averageByCountry,
      averageByType,
      priceVsRating,
      mostExpensive,
      bestValue
    }
  }

  /**
   * 評価分析の計算
   */
  private async calculateRatingAnalysis(records: TastingRecord[]): Promise<RatingAnalysis> {
    // 評価分布
    const distribution: Record<string, number> = {}
    for (let i = 0; i <= 10; i++) {
      const count = records.filter(r => Math.floor(r.rating) === i).length
      if (count > 0) {
        distribution[`${i}-${i + 1}`] = count
      }
    }

    // 価格帯別平均評価
    const averageByPrice: Record<string, number> = {}
    const priceRanges = ['0-3000', '3000-5000', '5000-10000', '10000-20000', '20000+']
    priceRanges.forEach(range => {
      const [min, max] = range.split('-').map(v => v === '+' ? Infinity : Number(v))
      const rangeRecords = records.filter(r => {
        if (!r.price) return false
        return r.price >= min && (max === Infinity ? true : r.price < max)
      })
      if (rangeRecords.length > 0) {
        averageByPrice[range] = rangeRecords.reduce((sum, r) => sum + r.rating, 0) / rangeRecords.length
      }
    })

    const averageByCountry = this.calculateAverageByField(records, 'country', 'rating')
    const averageByType = this.calculateAverageByField(records, 'type', 'rating')

    // 高評価ワイン（9.0以上）
    const topRated = records
      .filter(r => r.rating >= 9.0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 20)

    // 評価向上トレンド（過去6ヶ月vs前6ヶ月）
    const now = new Date()
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
    const yearAgo = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000)

    const recentRecords = records.filter(r => r.tastingDate >= sixMonthsAgo)
    const previousRecords = records.filter(r => r.tastingDate >= yearAgo && r.tastingDate < sixMonthsAgo)

    const recentAvg = recentRecords.length > 0 
      ? recentRecords.reduce((sum, r) => sum + r.rating, 0) / recentRecords.length 
      : 0
    const previousAvg = previousRecords.length > 0 
      ? previousRecords.reduce((sum, r) => sum + r.rating, 0) / previousRecords.length 
      : 0

    const improvementTrend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0

    return {
      distribution,
      averageByPrice,
      averageByCountry,
      averageByType,
      topRated,
      improvementTrend
    }
  }

  /**
   * トレンド分析の計算
   */
  private async calculateTrends(records: TastingRecord[]): Promise<TrendAnalysis> {
    // 過去12ヶ月のデータを月別に分析
    const trends = this.calculateMonthlyTrends(records)
    const preferences = this.calculatePreferenceEvolution(records)

    return {
      ratingTrend: trends.rating,
      priceTrend: trends.price,
      volumeTrend: trends.volume,
      diversityTrend: trends.diversity,
      preferences
    }
  }

  // ===============================
  // ヘルパーメソッド
  // ===============================

  private getTopItem(records: TastingRecord[], field: keyof TastingRecord): [string, number][] {
    const counts = new Map<string, number>()
    records.forEach(record => {
      const value = String(record[field] || 'Unknown')
      counts.set(value, (counts.get(value) || 0) + 1)
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }

  private calculateAverageByField(
    records: TastingRecord[], 
    groupField: keyof TastingRecord, 
    valueField: keyof TastingRecord
  ): Record<string, number> {
    const groups = new Map<string, TastingRecord[]>()
    
    records.forEach(record => {
      const key = String(record[groupField] || 'Unknown')
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(record)
    })

    const result: Record<string, number> = {}
    groups.forEach((groupRecords, key) => {
      const values = groupRecords
        .map(r => Number(r[valueField]))
        .filter(v => !isNaN(v) && v > 0)
      
      if (values.length > 0) {
        result[key] = values.reduce((sum, v) => sum + v, 0) / values.length
      }
    })

    return result
  }

  private calculateMonthlyTrends(_records: TastingRecord[]): {
    rating: TrendData[]
    price: TrendData[]
    volume: TrendData[]
    diversity: TrendData[]
  } {
    // 実装の簡略化のため、基本的なトレンドデータを返す
    return {
      rating: [],
      price: [],
      volume: [],
      diversity: []
    }
  }

  private calculatePreferenceEvolution(_records: TastingRecord[]): PreferenceEvolution[] {
    // 実装の簡略化のため、空配列を返す
    return []
  }

  private getEmptyStatistics(): StatisticsData {
    const now = new Date()
    return {
      totalRecords: 0,
      averageRating: 0,
      totalSpent: 0,
      uniqueWines: 0,
      uniqueProducers: 0,
      monthlyStats: [],
      yearlyStats: [],
      countryAnalysis: [],
      typeAnalysis: [],
      priceAnalysis: {
        ranges: [],
        averageByCountry: {},
        averageByType: {},
        priceVsRating: [],
        mostExpensive: [],
        bestValue: []
      },
      ratingAnalysis: {
        distribution: {},
        averageByPrice: {},
        averageByCountry: {},
        averageByType: {},
        topRated: [],
        improvementTrend: 0
      },
      trends: {
        ratingTrend: [],
        priceTrend: [],
        volumeTrend: [],
        diversityTrend: [],
        preferences: []
      },
      generatedAt: now,
      cacheExpiry: new Date(now.getTime() + this.cacheTimeout)
    }
  }

  /**
   * キャッシュクリア
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(`stats_${userId}`)
    } else {
      this.cache.clear()
    }
  }

  /**
   * 年間サマリーの生成
   */
  async generateYearSummary(userId: string, year: number): Promise<{
    totalRecords: number
    favoriteCountry: string
    favoriteType: string
    averageRating: number
    totalSpent: number
    bestWine: TastingRecord | null
    worstWine: TastingRecord | null
    mostExpensiveWine: TastingRecord | null
    bestValueWine: TastingRecord | null
    monthlyBreakdown: MonthlyStats[]
    achievements: string[]
  }> {
    const firestore = firebaseService.getFirestore()
    
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year + 1, 0, 1)

    const q = query(
      collection(firestore, this.collectionName),
      where('userId', '==', userId),
      where('tastingDate', '>=', Timestamp.fromDate(startDate)),
      where('tastingDate', '<', Timestamp.fromDate(endDate)),
      orderBy('tastingDate', 'desc')
    )

    const snapshot = await getDocs(q)
    const records = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        tastingDate: data.tastingDate?.toDate() || new Date()
      } as TastingRecord
    })

    if (records.length === 0) {
      return {
        totalRecords: 0,
        favoriteCountry: '',
        favoriteType: '',
        averageRating: 0,
        totalSpent: 0,
        bestWine: null,
        worstWine: null,
        mostExpensiveWine: null,
        bestValueWine: null,
        monthlyBreakdown: [],
        achievements: []
      }
    }

    // 基本統計
    const totalRecords = records.length
    const averageRating = records.reduce((sum, r) => sum + r.rating, 0) / totalRecords
    const totalSpent = records.filter(r => r.price).reduce((sum, r) => sum + (r.price || 0), 0)

    // 人気分析
    const countryCount = this.getTopItem(records, 'country')
    const typeCount = this.getTopItem(records, 'type')
    const favoriteCountry = countryCount[0]?.[0] || ''
    const favoriteType = typeCount[0]?.[0] || ''

    // ベストワイン分析
    const bestWine = records.reduce((best, current) => 
      current.rating > best.rating ? current : best
    )
    const worstWine = records.reduce((worst, current) => 
      current.rating < worst.rating ? current : worst
    )
    
    const priceRecords = records.filter(r => r.price)
    const mostExpensiveWine = priceRecords.length > 0 
      ? priceRecords.reduce((expensive, current) => 
          (current.price || 0) > (expensive.price || 0) ? current : expensive
        )
      : null

    const bestValueWine = priceRecords.length > 0 
      ? priceRecords.reduce((bestValue, current) => {
          const currentValue = current.rating / (current.price! / 1000)
          const bestValueScore = bestValue.rating / (bestValue.price! / 1000)
          return currentValue > bestValueScore ? current : bestValue
        })
      : null

    // 月別内訳
    const monthlyBreakdown = await this.calculateMonthlyStats(records)

    // 達成項目
    const achievements: string[] = []
    if (totalRecords >= 50) achievements.push('年間50本以上テイスティング')
    if (averageRating >= 8.0) achievements.push('高評価テイスター')
    if (countryCount.length >= 10) achievements.push('世界のワイン探検家')
    if (totalSpent >= 100000) achievements.push('ワイン投資家')

    return {
      totalRecords,
      favoriteCountry,
      favoriteType,
      averageRating,
      totalSpent,
      bestWine,
      worstWine,
      mostExpensiveWine,
      bestValueWine,
      monthlyBreakdown,
      achievements
    }
  }
}

export default new StatisticsService()