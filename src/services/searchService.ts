import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  QueryConstraint,
  QueryDocumentSnapshot,
  startAfter,
  Timestamp
} from 'firebase/firestore'
import type { DocumentData } from 'firebase/firestore'
import firebaseService from './firebase'
import type { TastingRecord } from '../types'

// 検索条件の型定義
export interface SearchFilters {
  keyword?: string           // キーワード検索（ワイン名、生産者、メモ）
  country?: string           // 国
  region?: string            // 地域
  grapeVariety?: string[]    // 品種（複数指定可能）
  type?: 'red' | 'white' | 'rose' | 'sparkling' | 'fortified' | 'dessert'
  minPrice?: number          // 最低価格
  maxPrice?: number          // 最高価格
  minRating?: number         // 最低評価
  maxRating?: number         // 最高評価
  startDate?: Date           // 開始日
  endDate?: Date             // 終了日
  vintage?: number           // ヴィンテージ
  tags?: string[]            // タグ（複数指定可能）
  isPublic?: boolean         // 公開状態
}

// 検索オプション
export interface SearchOptions {
  limitCount?: number
  orderByField?: 'tastingDate' | 'createdAt' | 'rating' | 'wineName' | 'price'
  orderDirection?: 'asc' | 'desc'
  lastDocument?: QueryDocumentSnapshot<DocumentData>
}

// 検索結果
export interface SearchResult {
  records: TastingRecord[]
  totalCount: number
  hasMore: boolean
  lastDocument: QueryDocumentSnapshot<DocumentData> | null
  facets?: SearchFacets
}

// ファセット（検索結果の集計情報）
export interface SearchFacets {
  countries: { [key: string]: number }
  types: { [key: string]: number }
  priceRanges: { [key: string]: number }
  ratingRanges: { [key: string]: number }
}

class SearchService {
  private readonly collectionName = 'tastingRecords'
  private searchCache = new Map<string, { result: SearchResult; timestamp: number }>()
  private readonly cacheTimeout = 5 * 60 * 1000 // 5分間キャッシュ

  /**
   * 複合条件検索（デバウンス対応）
   * クライアント側でdebounceを実装し、この関数を呼び出す
   */
  async searchRecords(
    userId: string,
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    try {
      // キャッシュキーの生成
      const cacheKey = this.generateCacheKey(userId, filters, options)
      
      // キャッシュチェック
      const cached = this.searchCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result
      }

      const firestore = firebaseService.getFirestore()
      const {
        limitCount = 20,
        orderByField = 'tastingDate',
        orderDirection = 'desc',
        lastDocument
      } = options

      // クエリ構築
      const constraints: QueryConstraint[] = [
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection),
        limit(limitCount + 1) // +1で次ページ確認
      ]

      // フィルター条件の追加
      if (filters.type) {
        constraints.push(where('type', '==', filters.type))
      }

      if (filters.country) {
        constraints.push(where('country', '==', filters.country))
      }

      if (filters.region) {
        constraints.push(where('region', '==', filters.region))
      }

      if (filters.minRating !== undefined) {
        constraints.push(where('rating', '>=', filters.minRating))
      }

      if (filters.maxRating !== undefined) {
        constraints.push(where('rating', '<=', filters.maxRating))
      }

      if (filters.minPrice !== undefined) {
        constraints.push(where('price', '>=', filters.minPrice))
      }

      if (filters.maxPrice !== undefined) {
        constraints.push(where('price', '<=', filters.maxPrice))
      }

      if (filters.vintage) {
        constraints.push(where('vintage', '==', filters.vintage))
      }

      if (filters.isPublic !== undefined) {
        constraints.push(where('isPublic', '==', filters.isPublic))
      }

      if (filters.startDate) {
        constraints.push(where('tastingDate', '>=', Timestamp.fromDate(filters.startDate)))
      }

      if (filters.endDate) {
        constraints.push(where('tastingDate', '<=', Timestamp.fromDate(filters.endDate)))
      }

      if (lastDocument) {
        constraints.push(startAfter(lastDocument))
      }

      const q = query(collection(firestore, this.collectionName), ...constraints)
      const querySnapshot = await getDocs(q)

      // 結果の処理
      let records = querySnapshot.docs.map(doc => this.docToRecord(doc))
      
      // クライアントサイドフィルタリング（Firestoreでできない条件）
      records = this.applyClientSideFilters(records, filters)

      // ページネーション処理
      const hasMore = records.length > limitCount
      if (hasMore) {
        records = records.slice(0, limitCount)
      }

      // ファセット計算（オプション）
      const facets = this.calculateFacets(records)

      const result: SearchResult = {
        records,
        totalCount: records.length,
        hasMore,
        lastDocument: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
        facets
      }

      // キャッシュに保存
      this.searchCache.set(cacheKey, { result, timestamp: Date.now() })

      return result
    } catch (error) {
      console.error('Search failed:', error)
      throw new Error(`検索に失敗しました: ${error}`)
    }
  }

  /**
   * 重複ワイン検出機能
   * 既存のワインと類似度をチェック
   */
  async detectDuplicates(
    userId: string,
    wineName: string,
    producer?: string,
    vintage?: number
  ): Promise<{
    duplicates: TastingRecord[]
    similarWines: Array<{ record: TastingRecord; similarity: number }>
  }> {
    try {
      const firestore = firebaseService.getFirestore()
      
      // 完全一致の検出
      const exactMatchQuery = query(
        collection(firestore, this.collectionName),
        where('userId', '==', userId),
        where('wineName', '==', wineName)
      )

      if (producer) {
        const producerQuery = query(
          collection(firestore, this.collectionName),
          where('userId', '==', userId),
          where('wineName', '==', wineName),
          where('producer', '==', producer)
        )
        const snapshot = await getDocs(producerQuery)
        const duplicates = snapshot.docs.map(doc => this.docToRecord(doc))

        // ヴィンテージも一致するか確認
        const exactDuplicates = vintage 
          ? duplicates.filter(r => r.vintage === vintage)
          : duplicates

        return {
          duplicates: exactDuplicates,
          similarWines: this.findSimilarWines(duplicates, wineName, producer, vintage)
        }
      }

      const snapshot = await getDocs(exactMatchQuery)
      const records = snapshot.docs.map(doc => this.docToRecord(doc))

      return {
        duplicates: records.filter(r => r.vintage === vintage),
        similarWines: this.findSimilarWines(records, wineName, producer, vintage)
      }
    } catch (error) {
      console.error('Duplicate detection failed:', error)
      throw new Error(`重複検出に失敗しました: ${error}`)
    }
  }

  /**
   * キーワード検索（ワイン名、生産者、メモを対象）
   */
  async searchByKeyword(
    userId: string,
    keyword: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    try {
      // 全レコードを取得してクライアントサイドでフィルタリング
      // （Firestoreは部分一致検索が苦手なため）
      const firestore = firebaseService.getFirestore()
      const q = query(
        collection(firestore, this.collectionName),
        where('userId', '==', userId),
        orderBy(options.orderByField || 'tastingDate', options.orderDirection || 'desc')
      )

      const snapshot = await getDocs(q)
      let records = snapshot.docs.map(doc => this.docToRecord(doc))

      // キーワードでフィルタリング（大文字小文字を無視）
      const lowerKeyword = keyword.toLowerCase()
      records = records.filter(record => {
        const searchFields = [
          record.wineName,
          record.producer,
          record.region,
          record.country,
          record.notes,
          ...(record.tags || [])
        ]

        return searchFields.some(field => 
          field?.toLowerCase().includes(lowerKeyword)
        )
      })

      // ページネーション
      const limitCount = options.limitCount || 20
      const paginatedRecords = records.slice(0, limitCount)
      const hasMore = records.length > limitCount

      return {
        records: paginatedRecords,
        totalCount: records.length,
        hasMore,
        lastDocument: null,
        facets: this.calculateFacets(paginatedRecords)
      }
    } catch (error) {
      console.error('Keyword search failed:', error)
      throw new Error(`キーワード検索に失敗しました: ${error}`)
    }
  }

  // ===============================
  // プライベートメソッド
  // ===============================

  private docToRecord(doc: QueryDocumentSnapshot<DocumentData>): TastingRecord {
    const data = doc.data()
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      tastingDate: data.tastingDate?.toDate() || new Date()
    } as TastingRecord
  }

  private applyClientSideFilters(
    records: TastingRecord[],
    filters: SearchFilters
  ): TastingRecord[] {
    let filtered = [...records]

    // キーワード検索
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase()
      filtered = filtered.filter(record => {
        const searchText = [
          record.wineName,
          record.producer,
          record.notes,
          record.region,
          record.country
        ].join(' ').toLowerCase()
        return searchText.includes(keyword)
      })
    }

    // 品種フィルタ
    if (filters.grapeVariety && filters.grapeVariety.length > 0) {
      filtered = filtered.filter(record => 
        record.grapes?.some(grape => 
          filters.grapeVariety!.includes(grape)
        )
      )
    }

    // タグフィルタ
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(record =>
        record.tags?.some(tag => filters.tags!.includes(tag))
      )
    }

    return filtered
  }

  private calculateFacets(records: TastingRecord[]): SearchFacets {
    const facets: SearchFacets = {
      countries: {},
      types: {},
      priceRanges: {},
      ratingRanges: {}
    }

    records.forEach(record => {
      // 国別集計
      const country = record.country || 'Unknown'
      facets.countries[country] = (facets.countries[country] || 0) + 1

      // タイプ別集計
      const type = record.type || 'Unknown'
      facets.types[type] = (facets.types[type] || 0) + 1

      // 価格帯集計
      if (record.price) {
        const priceRange = this.getPriceRange(record.price)
        facets.priceRanges[priceRange] = (facets.priceRanges[priceRange] || 0) + 1
      }

      // 評価帯集計
      const ratingRange = `${Math.floor(record.rating)}-${Math.floor(record.rating) + 1}`
      facets.ratingRanges[ratingRange] = (facets.ratingRanges[ratingRange] || 0) + 1
    })

    return facets
  }

  private getPriceRange(price: number): string {
    if (price < 3000) return '0-3000'
    if (price < 5000) return '3000-5000'
    if (price < 10000) return '5000-10000'
    if (price < 20000) return '10000-20000'
    return '20000+'
  }

  private findSimilarWines(
    records: TastingRecord[],
    wineName: string,
    producer?: string,
    vintage?: number
  ): Array<{ record: TastingRecord; similarity: number }> {
    return records
      .map(record => ({
        record,
        similarity: this.calculateSimilarity(record, wineName, producer, vintage)
      }))
      .filter(item => item.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
  }

  private calculateSimilarity(
    record: TastingRecord,
    wineName: string,
    producer?: string,
    vintage?: number
  ): number {
    let score = 0
    let maxScore = 0

    // ワイン名の類似度（Levenshtein距離を簡易実装）
    const nameSimilarity = this.getStringSimilarity(record.wineName, wineName)
    score += nameSimilarity * 0.5
    maxScore += 0.5

    // 生産者の一致
    if (producer && record.producer) {
      const producerSimilarity = this.getStringSimilarity(record.producer, producer)
      score += producerSimilarity * 0.3
      maxScore += 0.3
    }

    // ヴィンテージの近さ
    if (vintage && record.vintage) {
      const yearDiff = Math.abs(vintage - record.vintage)
      const vintageSimilarity = Math.max(0, 1 - yearDiff / 10)
      score += vintageSimilarity * 0.2
      maxScore += 0.2
    }

    return maxScore > 0 ? score / maxScore : 0
  }

  private getStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  private generateCacheKey(
    userId: string,
    filters: SearchFilters,
    options: SearchOptions
  ): string {
    return JSON.stringify({ userId, filters, options })
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.searchCache.clear()
  }
}

export default new SearchService()