import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  type DocumentData,
  serverTimestamp
} from 'firebase/firestore'
import firebaseService from './firebase'
import { AppError } from '../types/error'
import type { TastingRecord, WineMatch, PopularWine } from '../types'

/**
 * テイスティング記録管理サービス
 * Firestore操作の抽象化とビジネスロジックの実装
 */
class TastingRecordService {
  private static instance: TastingRecordService
  private readonly collectionName = 'tastingRecords'

  private constructor() {}

  /**
   * Firestoreデータを型安全なTastingRecordに変換
   */
  private convertFirestoreData(data: any): TastingRecord | null {
    try {
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt) || new Date(),
        tastingDate: data.tastingDate?.toDate?.() || new Date(data.tastingDate) || new Date(),
        citations: data.citations || []
      } as TastingRecord
    } catch (error) {
      console.error('Failed to convert Firestore data:', error)
      return null
    }
  }

  public static getInstance(): TastingRecordService {
    if (!TastingRecordService.instance) {
      TastingRecordService.instance = new TastingRecordService()
    }
    return TastingRecordService.instance
  }

  // ===============================
  // CRUD基本操作
  // ===============================

  /**
   * テイスティング記録の作成
   */
  async createRecord(
    userId: string, 
    recordData: Omit<TastingRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<TastingRecord> {
    try {
      const firestore = firebaseService.getFirestore()
      const recordRef = doc(collection(firestore, this.collectionName))
      
      const newRecord: TastingRecord = {
        ...recordData,
        id: recordRef.id,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await setDoc(recordRef, {
        ...newRecord,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      return newRecord
    } catch (error) {
      console.error('Failed to create tasting record:', error)
      
      if (error instanceof Error && error.message.includes('permission-denied')) {
        throw new AppError({
          code: 'firestore/permission-denied',
          severity: 'medium',
          category: 'permission',
          userMessage: 'テイスティング記録を作成する権限がありません',
          technicalMessage: error.message,
          originalError: error,
          context: { userId, operation: 'createRecord' }
        })
      }
      
      throw new AppError({
        code: 'firestore/internal',
        severity: 'high',
        category: 'database',
        userMessage: 'テイスティング記録の作成に失敗しました',
        technicalMessage: error instanceof Error ? error.message : String(error),
        originalError: error instanceof Error ? error : undefined,
        context: { userId, operation: 'createRecord' },
        retryable: true
      })
    }
  }

  /**
   * テイスティング記録の取得
   */
  async getRecord(recordId: string): Promise<TastingRecord | null> {
    try {
      const firestore = firebaseService.getFirestore()
      const recordRef = doc(firestore, this.collectionName, recordId)
      const recordDoc = await getDoc(recordRef)

      if (recordDoc.exists()) {
        const data = recordDoc.data()
        return {
          ...data,
          id: recordDoc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          tastingDate: data.tastingDate?.toDate() || new Date()
        } as TastingRecord
      }

      return null
    } catch (error) {
      console.error('Failed to get tasting record:', error)
      
      if (error instanceof Error && error.message.includes('not-found')) {
        throw new AppError({
          code: 'firestore/not-found',
          severity: 'low',
          category: 'user',
          userMessage: 'テイスティング記録が見つかりません',
          technicalMessage: error.message,
          originalError: error,
          context: { recordId, operation: 'getRecord' },
          shouldReport: false
        })
      }
      
      throw new AppError({
        code: 'firestore/internal',
        severity: 'medium',
        category: 'database',
        userMessage: 'テイスティング記録の取得に失敗しました',
        technicalMessage: error instanceof Error ? error.message : String(error),
        originalError: error instanceof Error ? error : undefined,
        context: { recordId, operation: 'getRecord' },
        retryable: true
      })
    }
  }

  /**
   * テイスティング記録の更新
   */
  async updateRecord(
    recordId: string, 
    updates: Partial<Omit<TastingRecord, 'id' | 'userId' | 'createdAt'>>
  ): Promise<void> {
    try {
      const firestore = firebaseService.getFirestore()
      const recordRef = doc(firestore, this.collectionName, recordId)

      await updateDoc(recordRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Failed to update tasting record:', error)
      throw new Error(`テイスティング記録の更新に失敗しました: ${error}`)
    }
  }

  /**
   * テイスティング記録の削除
   */
  async deleteRecord(recordId: string): Promise<void> {
    try {
      const firestore = firebaseService.getFirestore()
      const recordRef = doc(firestore, this.collectionName, recordId)
      await deleteDoc(recordRef)
    } catch (error) {
      console.error('Failed to delete tasting record:', error)
      throw new Error(`テイスティング記録の削除に失敗しました: ${error}`)
    }
  }

  // ===============================
  // ユーザー記録取得・フィルタリング
  // ===============================

  /**
   * ユーザーの全テイスティング記録を取得
   */
  async getUserRecords(
    userId: string,
    options: {
      limitCount?: number
      lastRecord?: QueryDocumentSnapshot<DocumentData>
      orderByField?: 'tastingDate' | 'createdAt' | 'rating'
      orderDirection?: 'asc' | 'desc'
    } = {}
  ): Promise<{
    records: TastingRecord[]
    lastDocument: QueryDocumentSnapshot<DocumentData> | null
    hasMore: boolean
  }> {
    try {
      const firestore = firebaseService.getFirestore()
      const {
        limitCount = 20,
        lastRecord,
        orderByField = 'tastingDate',
        orderDirection = 'desc'
      } = options

      let q = query(
        collection(firestore, this.collectionName),
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection),
        limit(limitCount + 1) // +1で次ページの存在確認
      )

      if (lastRecord) {
        q = query(q, startAfter(lastRecord))
      }

      const querySnapshot = await getDocs(q)
      const docs = querySnapshot.docs
      const hasMore = docs.length > limitCount
      
      // 実際のレコード数に調整
      const actualDocs = hasMore ? docs.slice(0, limitCount) : docs
      
      const records: TastingRecord[] = actualDocs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          tastingDate: data.tastingDate?.toDate() || new Date()
        } as TastingRecord
      })

      return {
        records,
        lastDocument: actualDocs.length > 0 ? actualDocs[actualDocs.length - 1] : null,
        hasMore
      }
    } catch (error) {
      console.error('Failed to get user records:', error)
      throw new Error(`ユーザー記録の取得に失敗しました: ${error}`)
    }
  }

  /**
   * 条件付きでユーザー記録をフィルタリング
   */
  async getFilteredRecords(
    userId: string,
    filters: {
      country?: string
      region?: string
      type?: string
      minRating?: number
      maxRating?: number
      startDate?: Date
      endDate?: Date
      wineName?: string
      producer?: string
    },
    options: {
      limitCount?: number
      orderByField?: 'tastingDate' | 'createdAt' | 'rating'
      orderDirection?: 'asc' | 'desc'
    } = {}
  ): Promise<TastingRecord[]> {
    try {
      const firestore = firebaseService.getFirestore()
      const { limitCount = 50, orderByField = 'tastingDate', orderDirection = 'desc' } = options

      let q = query(
        collection(firestore, this.collectionName),
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection)
      )

      // 基本フィルター
      if (filters.country) {
        q = query(q, where('country', '==', filters.country))
      }
      if (filters.region) {
        q = query(q, where('region', '==', filters.region))
      }
      if (filters.type) {
        q = query(q, where('type', '==', filters.type))
      }

      // 評価範囲フィルター
      if (filters.minRating !== undefined) {
        q = query(q, where('rating', '>=', filters.minRating))
      }
      if (filters.maxRating !== undefined) {
        q = query(q, where('rating', '<=', filters.maxRating))
      }

      // 日付範囲フィルター
      if (filters.startDate) {
        q = query(q, where('tastingDate', '>=', filters.startDate))
      }
      if (filters.endDate) {
        q = query(q, where('tastingDate', '<=', filters.endDate))
      }

      q = query(q, limit(limitCount))

      const querySnapshot = await getDocs(q)
      let records: TastingRecord[] = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          tastingDate: data.tastingDate?.toDate() || new Date()
        } as TastingRecord
      })

      // クライアントサイドフィルタリング（Firestoreの制限回避）
      if (filters.wineName) {
        const searchTerm = filters.wineName.toLowerCase()
        records = records.filter(record => 
          record.wineName.toLowerCase().includes(searchTerm)
        )
      }

      if (filters.producer) {
        const searchTerm = filters.producer.toLowerCase()
        records = records.filter(record => 
          record.producer.toLowerCase().includes(searchTerm)
        )
      }

      return records
    } catch (error) {
      console.error('Failed to get filtered records:', error)
      throw new Error(`フィルタリング記録の取得に失敗しました: ${error}`)
    }
  }

  // ===============================
  // 統計・分析機能
  // ===============================


  /**
   * ユーザーのテイスティング統計
   */
  async getUserStatistics(userId: string): Promise<{
    totalRecords: number
    averageRating: number
    favoriteCountry: string | null
    favoriteType: string | null
    recordsByMonth: { [key: string]: number }
    ratingDistribution: { [key: string]: number }
  }> {
    try {
      const { records } = await this.getUserRecords(userId, { limitCount: 1000 })

      if (records.length === 0) {
        return {
          totalRecords: 0,
          averageRating: 0,
          favoriteCountry: null,
          favoriteType: null,
          recordsByMonth: {},
          ratingDistribution: {}
        }
      }

      // 基本統計
      const totalRecords = records.length
      const averageRating = records.reduce((sum, r) => sum + r.rating, 0) / totalRecords

      // 国別カウント
      const countryCounts = records.reduce((acc, r) => {
        const country = r.country || 'Unknown'
        acc[country] = (acc[country] || 0) + 1
        return acc
      }, {} as { [key: string]: number })
      const favoriteCountry = Object.keys(countryCounts).reduce((a, b) => 
        countryCounts[a] > countryCounts[b] ? a : b
      )

      // タイプ別カウント
      const typeCounts = records.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1
        return acc
      }, {} as { [key: string]: number })
      const favoriteType = Object.keys(typeCounts).reduce((a, b) => 
        typeCounts[a] > typeCounts[b] ? a : b
      )

      // 月別記録数
      const recordsByMonth = records.reduce((acc, r) => {
        const monthKey = r.tastingDate.toISOString().substring(0, 7) // YYYY-MM
        acc[monthKey] = (acc[monthKey] || 0) + 1
        return acc
      }, {} as { [key: string]: number })

      // 評価分布
      const ratingDistribution = records.reduce((acc, r) => {
        const ratingRange = `${Math.floor(r.rating)}-${Math.floor(r.rating) + 1}`
        acc[ratingRange] = (acc[ratingRange] || 0) + 1
        return acc
      }, {} as { [key: string]: number })

      return {
        totalRecords,
        averageRating,
        favoriteCountry,
        favoriteType,
        recordsByMonth,
        ratingDistribution
      }
    } catch (error) {
      console.error('Failed to get user statistics:', error)
      throw new Error(`ユーザー統計の取得に失敗しました: ${error}`)
    }
  }

  // ===============================
  // 重複検出・類似ワイン検索
  // ===============================

  /**
   * 類似ワインの検索（重複検出用）
   */
  async findSimilarWines(
    userId: string,
    searchCriteria: {
      wineName: string
      producer: string
      vintage?: number
    }
  ): Promise<WineMatch[]> {
    try {
      const { records } = await this.getUserRecords(userId, { limitCount: 1000 })

      const matches: WineMatch[] = []
      const searchWineName = searchCriteria.wineName.toLowerCase()
      const searchProducer = searchCriteria.producer.toLowerCase()

      records.forEach(record => {
        const recordWineName = record.wineName.toLowerCase()
        const recordProducer = record.producer.toLowerCase()
        
        let confidence = 0
        const matchedFields: string[] = []

        // 完全一致
        if (recordWineName === searchWineName) {
          confidence += 0.5
          matchedFields.push('wineName')
        }
        if (recordProducer === searchProducer) {
          confidence += 0.3
          matchedFields.push('producer')
        }

        // 部分一致
        if (recordWineName.includes(searchWineName) || searchWineName.includes(recordWineName)) {
          confidence += 0.2
          if (!matchedFields.includes('wineName')) {
            matchedFields.push('wineName(partial)')
          }
        }
        if (recordProducer.includes(searchProducer) || searchProducer.includes(recordProducer)) {
          confidence += 0.1
          if (!matchedFields.includes('producer')) {
            matchedFields.push('producer(partial)')
          }
        }

        // ヴィンテージ一致
        if (searchCriteria.vintage && record.vintage === searchCriteria.vintage) {
          confidence += 0.1
          matchedFields.push('vintage')
        }

        // 閾値以上の類似度の場合のみ追加
        if (confidence >= 0.3) {
          matches.push({
            wineId: record.id,
            wineName: record.wineName,
            producer: record.producer,
            vintage: record.vintage,
            confidence,
            matchedFields
          })
        }
      })

      // 信頼度順でソート
      return matches.sort((a, b) => b.confidence - a.confidence)
    } catch (error) {
      console.error('Failed to find similar wines:', error)
      throw new Error(`類似ワインの検索に失敗しました: ${error}`)
    }
  }

  /**
   * 人気ワイン（記録が多いワイン）を取得
   */
  async getPopularWines(userId?: string, limitCount: number = 10): Promise<PopularWine[]> {
    try {
      const firestore = firebaseService.getFirestore()
      
      // 公開記録または自分の記録を取得
      let q = query(
        collection(firestore, this.collectionName),
        orderBy('createdAt', 'desc')
      )

      if (userId) {
        // ユーザーの記録に限定する場合
        q = query(q, where('userId', '==', userId))
      } else {
        // 公開記録のみ取得
        q = query(q, where('isPublic', '==', true))
      }

      const snapshot = await getDocs(q)
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TastingRecord[]

      // ワイン名 + 生産者の組み合わせで集計
      const wineMap = new Map<string, {
        wine: PopularWine
        ratings: number[]
        lastTasted: Date
      }>()

      records.forEach(record => {
        const key = `${record.wineName}_${record.producer}`
        
        if (wineMap.has(key)) {
          const existing = wineMap.get(key)!
          existing.wine.recordCount++
          existing.ratings.push(record.rating)
          if (record.tastingDate > existing.lastTasted) {
            existing.lastTasted = record.tastingDate
          }
        } else {
          wineMap.set(key, {
            wine: {
              wineName: record.wineName,
              producer: record.producer,
              country: record.country || '',
              region: record.region || '',
              type: record.type as any,
              color: (record.color || record.type) as any,
              vintage: record.vintage,
              alcoholContent: record.alcoholContent,
              price: record.price,
              recordCount: 1,
              averageRating: 0, // 後で計算
              lastTasted: record.tastingDate
            },
            ratings: [record.rating],
            lastTasted: record.tastingDate
          })
        }
      })

      // 平均評価を計算し、PopularWine配列に変換
      const popularWines: PopularWine[] = Array.from(wineMap.values()).map(({ wine, ratings, lastTasted }) => ({
        ...wine,
        averageRating: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
        lastTasted
      }))

      // 記録数でソートし、上位limitCount件を返す
      return popularWines
        .sort((a, b) => {
          // 記録数優先、同じなら平均評価で並び替え
          if (b.recordCount !== a.recordCount) {
            return b.recordCount - a.recordCount
          }
          return b.averageRating - a.averageRating
        })
        .slice(0, limitCount)

    } catch (error) {
      console.error('Failed to get popular wines:', error)
      throw new Error(`人気ワインの取得に失敗しました: ${error}`)
    }
  }

  /**
   * ワイン名で検索
   */
  async searchWines(searchTerm: string, userId?: string): Promise<PopularWine[]> {
    try {
      if (!searchTerm.trim()) {
        return []
      }

      const firestore = firebaseService.getFirestore()
      
      let q = query(
        collection(firestore, this.collectionName),
        orderBy('wineName')
      )

      if (userId) {
        q = query(q, where('userId', '==', userId))
      } else {
        q = query(q, where('isPublic', '==', true))
      }

      const snapshot = await getDocs(q)
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TastingRecord[]

      // 検索語でフィルタリング
      const searchLower = searchTerm.toLowerCase()
      const filteredRecords = records.filter(record => 
        record.wineName.toLowerCase().includes(searchLower) ||
        record.producer.toLowerCase().includes(searchLower)
      )

      // ワイン名 + 生産者の組み合わせで集計
      const wineMap = new Map<string, {
        wine: PopularWine
        ratings: number[]
        lastTasted: Date
      }>()

      filteredRecords.forEach(record => {
        const key = `${record.wineName}_${record.producer}`
        
        if (wineMap.has(key)) {
          const existing = wineMap.get(key)!
          existing.wine.recordCount++
          existing.ratings.push(record.rating)
          if (record.tastingDate > existing.lastTasted) {
            existing.lastTasted = record.tastingDate
          }
        } else {
          wineMap.set(key, {
            wine: {
              wineName: record.wineName,
              producer: record.producer,
              country: record.country || '',
              region: record.region || '',
              type: record.type as any,
              color: (record.color || record.type) as any,
              vintage: record.vintage,
              alcoholContent: record.alcoholContent,
              price: record.price,
              recordCount: 1,
              averageRating: 0,
              lastTasted: record.tastingDate
            },
            ratings: [record.rating],
            lastTasted: record.tastingDate
          })
        }
      })

      // 平均評価を計算し、PopularWine配列に変換
      const searchResults: PopularWine[] = Array.from(wineMap.values()).map(({ wine, ratings, lastTasted }) => ({
        ...wine,
        averageRating: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
        lastTasted
      }))

      // 記録数でソート
      return searchResults.sort((a, b) => b.recordCount - a.recordCount)

    } catch (error) {
      console.error('Failed to search wines:', error)
      throw new Error(`ワイン検索に失敗しました: ${error}`)
    }
  }

  /**
   * ユーザー統計情報を取得
   */
  async getUserStats(userId: string): Promise<{
    totalRecords: number
    averageRating: number
    favoriteCountries: Array<{ country: string; count: number }>
    favoriteTypes: Array<{ type: string; count: number }>
    monthlyRecords: Array<{ month: string; count: number }>
    ratingDistribution: Array<{ range: string; count: number }>
    priceDistribution: Array<{ range: string; count: number; avgRating: number }>
    recentActivity: Array<{ date: string; count: number }>
  }> {
    try {
      const { records } = await this.getUserRecords(userId)
      
      if (records.length === 0) {
        return {
          totalRecords: 0,
          averageRating: 0,
          favoriteCountries: [],
          favoriteTypes: [],
          monthlyRecords: [],
          ratingDistribution: [],
          priceDistribution: [],
          recentActivity: []
        }
      }

      // 基本統計
      const totalRecords = records.length
      const averageRating = records.reduce((sum, record) => sum + record.rating, 0) / totalRecords

      // 国別統計
      const countryMap = new Map<string, number>()
      records.forEach(record => {
        if (record.country) {
          const count = countryMap.get(record.country) || 0
          countryMap.set(record.country, count + 1)
        }
      })
      const favoriteCountries = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // タイプ別統計
      const typeMap = new Map<string, number>()
      records.forEach(record => {
        const count = typeMap.get(record.type) || 0
        typeMap.set(record.type, count + 1)
      })
      const favoriteTypes = Array.from(typeMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)

      // 月別記録数（過去12ヶ月）
      const monthlyMap = new Map<string, number>()
      const now = new Date()
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        monthlyMap.set(key, 0)
      }
      
      records.forEach(record => {
        const date = new Date(record.tastingDate)
        const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        if (monthlyMap.has(key)) {
          monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1)
        }
      })
      
      const monthlyRecords = Array.from(monthlyMap.entries())
        .map(([month, count]) => ({ month, count }))

      // 評価分布
      const ratingRanges = [
        { range: '9.0-10.0', min: 9.0, max: 10.0 },
        { range: '8.0-8.9', min: 8.0, max: 8.9 },
        { range: '7.0-7.9', min: 7.0, max: 7.9 },
        { range: '6.0-6.9', min: 6.0, max: 6.9 },
        { range: '5.0-5.9', min: 5.0, max: 5.9 },
        { range: '0.0-4.9', min: 0.0, max: 4.9 }
      ]
      
      const ratingDistribution = ratingRanges.map(({ range, min, max }) => ({
        range,
        count: records.filter(record => record.rating >= min && record.rating <= max).length
      }))

      // 価格帯別分析
      const priceRanges = [
        { range: '10,000円以上', min: 10000, max: Infinity },
        { range: '5,000-9,999円', min: 5000, max: 9999 },
        { range: '3,000-4,999円', min: 3000, max: 4999 },
        { range: '1,000-2,999円', min: 1000, max: 2999 },
        { range: '1,000円未満', min: 0, max: 999 },
        { range: '価格不明', min: null, max: null }
      ]
      
      const priceDistribution = priceRanges.map(({ range, min, max }) => {
        const recordsInRange = records.filter(record => {
          if (min === null) return !record.price
          if (max === Infinity) return record.price && record.price >= min
          return record.price && record.price >= min && record.price <= max
        })
        
        const avgRating = recordsInRange.length > 0 
          ? recordsInRange.reduce((sum, record) => sum + record.rating, 0) / recordsInRange.length
          : 0
        
        return {
          range,
          count: recordsInRange.length,
          avgRating
        }
      })

      // 最近のアクティビティ（過去30日）
      const activityMap = new Map<string, number>()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo)
        date.setDate(date.getDate() + i)
        const key = date.toISOString().split('T')[0]
        activityMap.set(key, 0)
      }
      
      records
        .filter(record => record.tastingDate >= thirtyDaysAgo)
        .forEach(record => {
          const key = record.tastingDate.toISOString().split('T')[0]
          if (activityMap.has(key)) {
            activityMap.set(key, (activityMap.get(key) || 0) + 1)
          }
        })
      
      const recentActivity = Array.from(activityMap.entries())
        .map(([date, count]) => ({ date, count }))

      return {
        totalRecords,
        averageRating,
        favoriteCountries,
        favoriteTypes,
        monthlyRecords,
        ratingDistribution,
        priceDistribution,
        recentActivity
      }
    } catch (error) {
      console.error('Failed to get user stats:', error)
      throw new Error(`ユーザー統計の取得に失敗しました: ${error}`)
    }
  }

  /**
   * 複合条件でワイン記録を検索
   */
  async searchRecordsWithFilters(
    userId: string,
    filters: {
      searchTerm?: string
      countries?: string[]
      regions?: string[]
      types?: string[]
      colors?: string[]
      grapes?: string[]
      priceRange?: { min?: number; max?: number }
      ratingRange?: { min?: number; max?: number }
      vintageRange?: { min?: number; max?: number }
      dateRange?: { start?: Date; end?: Date }
      tags?: string[]
    },
    options: {
      limitCount?: number
      lastRecord?: any
      orderByField?: string
      orderDirection?: 'asc' | 'desc'
    } = {}
  ): Promise<{
    records: TastingRecord[]
    lastDocument: any
    hasMore: boolean
    totalCount: number
  }> {
    try {
      const firestore = firebaseService.getFirestore()
      const {
        limitCount = 20,
        lastRecord,
        orderByField = 'tastingDate',
        orderDirection = 'desc'
      } = options

      // 基本クエリの構築
      let q = query(
        collection(firestore, this.collectionName),
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection)
      )

      // 配列型フィールドのフィルター
      if (filters.countries && filters.countries.length > 0) {
        q = query(q, where('country', 'in', filters.countries))
      }
      if (filters.types && filters.types.length > 0) {
        q = query(q, where('type', 'in', filters.types))
      }

      // 数値範囲フィルター
      if (filters.priceRange) {
        if (filters.priceRange.min !== undefined) {
          q = query(q, where('price', '>=', filters.priceRange.min))
        }
        if (filters.priceRange.max !== undefined) {
          q = query(q, where('price', '<=', filters.priceRange.max))
        }
      }

      if (filters.ratingRange) {
        if (filters.ratingRange.min !== undefined) {
          q = query(q, where('rating', '>=', filters.ratingRange.min))
        }
        if (filters.ratingRange.max !== undefined) {
          q = query(q, where('rating', '<=', filters.ratingRange.max))
        }
      }

      if (filters.vintageRange) {
        if (filters.vintageRange.min !== undefined) {
          q = query(q, where('vintage', '>=', filters.vintageRange.min))
        }
        if (filters.vintageRange.max !== undefined) {
          q = query(q, where('vintage', '<=', filters.vintageRange.max))
        }
      }

      if (filters.dateRange) {
        if (filters.dateRange.start) {
          q = query(q, where('tastingDate', '>=', filters.dateRange.start))
        }
        if (filters.dateRange.end) {
          q = query(q, where('tastingDate', '<=', filters.dateRange.end))
        }
      }

      // ページネーション
      if (lastRecord) {
        q = query(q, startAfter(lastRecord))
      }
      q = query(q, limit(limitCount + 1))

      const querySnapshot = await getDocs(q)
      let records: TastingRecord[] = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          tastingDate: data.tastingDate?.toDate() || new Date()
        } as TastingRecord
      })

      // クライアントサイドでの追加フィルタリング（Firestoreでは制限があるため）
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        records = records.filter(record =>
          record.wineName.toLowerCase().includes(searchLower) ||
          record.producer.toLowerCase().includes(searchLower) ||
          record.region?.toLowerCase().includes(searchLower) ||
          record.notes?.toLowerCase().includes(searchLower)
        )
      }

      if (filters.regions && filters.regions.length > 0) {
        records = records.filter(record =>
          record.region && filters.regions!.includes(record.region)
        )
      }

      if (filters.colors && filters.colors.length > 0) {
        records = records.filter(record =>
          record.color && filters.colors!.includes(record.color)
        )
      }

      if (filters.grapes && filters.grapes.length > 0) {
        records = records.filter(record =>
          record.grapes && record.grapes.some(grape =>
            filters.grapes!.includes(grape)
          )
        )
      }

      if (filters.tags && filters.tags.length > 0) {
        records = records.filter(record =>
          record.tags && record.tags.some(tag =>
            filters.tags!.includes(tag)
          )
        )
      }

      // ページネーション情報
      const hasMore = records.length > limitCount
      const actualRecords = hasMore ? records.slice(0, limitCount) : records
      const lastDocument = actualRecords.length > 0 
        ? querySnapshot.docs[Math.min(actualRecords.length - 1, querySnapshot.docs.length - 1)]
        : null

      // 総数取得（パフォーマンスを考慮してサンプリング）
      const totalCountQuery = query(
        collection(firestore, this.collectionName),
        where('userId', '==', userId)
      )
      const totalSnapshot = await getDocs(totalCountQuery)
      let totalCount = totalSnapshot.size

      // フィルター適用後の推定総数
      if (Object.keys(filters).length > 0) {
        const allRecords = totalSnapshot.docs.map(doc => doc.data() as TastingRecord)
        let filteredAll = allRecords

        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase()
          filteredAll = filteredAll.filter(record =>
            record.wineName.toLowerCase().includes(searchLower) ||
            record.producer.toLowerCase().includes(searchLower)
          )
        }

        totalCount = filteredAll.length
      }

      return {
        records: actualRecords,
        lastDocument,
        hasMore,
        totalCount
      }
    } catch (error) {
      console.error('Failed to search records with filters:', error)
      throw new Error(`フィルター検索に失敗しました: ${error}`)
    }
  }

  /**
   * 重複ワイン検出（新規登録時の重複チェック用）
   */
  async detectDuplicateWines(
    userId: string,
    wineInfo: {
      wineName: string
      producer: string
      vintage?: number
    }
  ): Promise<WineMatch[]> {
    try {
      const { records } = await this.getUserRecords(userId)
      const matches: WineMatch[] = []

      records.forEach(record => {
        let confidence = 0
        const matchedFields: string[] = []

        // 完全一致チェック
        if (record.wineName.toLowerCase() === wineInfo.wineName.toLowerCase()) {
          confidence += 0.6
          matchedFields.push('wineName')
        }
        if (record.producer.toLowerCase() === wineInfo.producer.toLowerCase()) {
          confidence += 0.3
          matchedFields.push('producer')
        }
        if (wineInfo.vintage && record.vintage === wineInfo.vintage) {
          confidence += 0.1
          matchedFields.push('vintage')
        }

        // 部分一致チェック
        if (confidence < 0.9) {
          const recordName = record.wineName.toLowerCase()
          const searchName = wineInfo.wineName.toLowerCase()
          const recordProducer = record.producer.toLowerCase()
          const searchProducer = wineInfo.producer.toLowerCase()

          if (recordName.includes(searchName) || searchName.includes(recordName)) {
            confidence += 0.2
            if (!matchedFields.includes('wineName')) {
              matchedFields.push('wineName(partial)')
            }
          }
          if (recordProducer.includes(searchProducer) || searchProducer.includes(recordProducer)) {
            confidence += 0.1
            if (!matchedFields.includes('producer')) {
              matchedFields.push('producer(partial)')
            }
          }
        }

        // 閾値以上の場合に追加
        if (confidence >= 0.4) {
          matches.push({
            wineId: record.id,
            wineName: record.wineName,
            producer: record.producer,
            vintage: record.vintage,
            confidence,
            matchedFields
          })
        }
      })

      return matches.sort((a, b) => b.confidence - a.confidence)
    } catch (error) {
      console.error('Failed to detect duplicate wines:', error)
      throw new Error(`重複ワインの検出に失敗しました: ${error}`)
    }
  }

  /**
   * 特定の記録を引用している記録を検索
   */
  async findRecordsByCitation(sourceRecordId: string): Promise<TastingRecord[]> {
    try {
      const firestore = firebaseService.getFirestore()
      
      // 引用を含む記録を検索（Firestoreでは配列内のオブジェクトフィールドでの直接検索は制限があるため、全記録を取得してフィルタリング）
      const allRecordsQuery = query(
        collection(firestore, this.collectionName),
        orderBy('updatedAt', 'desc')
      )
      
      const snapshot = await getDocs(allRecordsQuery)
      const records: TastingRecord[] = []
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        const record = this.convertFirestoreData({ id: doc.id, ...data })
        
        if (record && record.citations) {
          // 該当する引用が含まれているかチェック
          const hasCitation = record.citations.some(
            citation => citation.sourceRecordId === sourceRecordId
          )
          if (hasCitation) {
            records.push(record)
          }
        }
      })
      
      return records
    } catch (error) {
      console.error('Failed to find records by citation:', error)
      throw new Error('引用記録の検索に失敗しました')
    }
  }

  /**
   * テイスティング記録の取得（getTastingRecordのエイリアス）
   */
  async getTastingRecord(recordId: string): Promise<TastingRecord | null> {
    return this.getRecord(recordId)
  }
}

// シングルトンインスタンスをエクスポート
export const tastingRecordService = TastingRecordService.getInstance()
export default tastingRecordService