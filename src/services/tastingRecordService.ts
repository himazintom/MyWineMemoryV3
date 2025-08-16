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
import type { TastingRecord, WineMatch } from '../types'

/**
 * テイスティング記録管理サービス
 * Firestore操作の抽象化とビジネスロジックの実装
 */
class TastingRecordService {
  private static instance: TastingRecordService
  private readonly collectionName = 'tastingRecords'

  private constructor() {}

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
      throw new Error(`テイスティング記録の作成に失敗しました: ${error}`)
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
      throw new Error(`テイスティング記録の取得に失敗しました: ${error}`)
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
   * 人気ワイン取得（記録数上位）
   */
  async getPopularWines(userId: string, limitCount: number = 10): Promise<{
    wineName: string
    producer: string
    country: string
    region: string
    recordCount: number
    averageRating: number
    lastTasted: Date
  }[]> {
    try {
      // まずユーザーの全記録を取得
      const { records } = await this.getUserRecords(userId, { limitCount: 1000 })

      // ワイン別にグループ化
      const wineGroups = new Map<string, {
        wineName: string
        producer: string
        country: string
        region: string
        records: TastingRecord[]
      }>()

      records.forEach(record => {
        const key = `${record.wineName}-${record.producer}`
        if (!wineGroups.has(key)) {
          wineGroups.set(key, {
            wineName: record.wineName,
            producer: record.producer,
            country: record.country,
            region: record.region,
            records: []
          })
        }
        wineGroups.get(key)!.records.push(record)
      })

      // 統計計算とソート
      const wineStats = Array.from(wineGroups.values())
        .map(group => ({
          wineName: group.wineName,
          producer: group.producer,
          country: group.country,
          region: group.region,
          recordCount: group.records.length,
          averageRating: group.records.reduce((sum, r) => sum + r.rating, 0) / group.records.length,
          lastTasted: new Date(Math.max(...group.records.map(r => r.tastingDate.getTime())))
        }))
        .sort((a, b) => b.recordCount - a.recordCount)
        .slice(0, limitCount)

      return wineStats
    } catch (error) {
      console.error('Failed to get popular wines:', error)
      throw new Error(`人気ワインの取得に失敗しました: ${error}`)
    }
  }

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
        acc[r.country] = (acc[r.country] || 0) + 1
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
}

// シングルトンインスタンスをエクスポート
export const tastingRecordService = TastingRecordService.getInstance()
export default tastingRecordService