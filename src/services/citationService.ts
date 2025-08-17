import type { TastingRecord, Citation } from '../types'
import { tastingRecordService } from './tastingRecordService'

export interface CitationSearchOptions {
  threshold?: number // 類似度の閾値 (0-1)
  maxResults?: number // 最大結果数
  includeFields?: string[] // 検索対象フィールド
  excludeRecordIds?: string[] // 除外する記録ID
}

export interface CitationCandidate {
  record: TastingRecord
  confidence: number
  matchedFields: string[]
  suggestedFields: string[] // 引用可能フィールド
}

export interface CitationPreview {
  sourceRecord: TastingRecord
  targetFields: string[]
  conflicts: string[] // 競合するフィールド
  preview: Partial<TastingRecord> // プレビューデータ
}

export class CitationService {
  private static instance: CitationService
  
  static getInstance(): CitationService {
    if (!CitationService.instance) {
      CitationService.instance = new CitationService()
    }
    return CitationService.instance
  }

  /**
   * 類似ワインを検索して引用候補を取得
   */
  async findSimilarWines(
    wine: Partial<TastingRecord>,
    userId: string,
    options: CitationSearchOptions = {}
  ): Promise<CitationCandidate[]> {
    const {
      threshold = 0.3,
      maxResults = 10,
      includeFields = ['wineName', 'producer', 'vintage', 'country', 'region', 'grapes'],
      excludeRecordIds = []
    } = options

    try {
      // ユーザーの全記録を取得
      const userRecordsResult = await tastingRecordService.getUserRecords(userId, {
        limitCount: 1000 // 十分な数を取得
      })
      const userRecords = userRecordsResult.records

      const candidates: CitationCandidate[] = []

      for (const record of userRecords) {
        // 除外リストに含まれる場合はスキップ
        if (excludeRecordIds.includes(record.id)) {
          continue
        }

        // 類似度を計算
        const similarity = this.calculateSimilarity(wine, record, includeFields)
        
        if (similarity.confidence >= threshold) {
          // 引用可能フィールドを特定
          const suggestedFields = this.getSuggestedFields(wine, record)
          
          candidates.push({
            record,
            confidence: similarity.confidence,
            matchedFields: similarity.matchedFields,
            suggestedFields
          })
        }
      }

      // 類似度でソートして上位を返す
      return candidates
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxResults)

    } catch (error) {
      console.error('Failed to find similar wines:', error)
      throw new Error('類似ワインの検索に失敗しました')
    }
  }

  /**
   * 2つのワイン記録の類似度を計算
   */
  private calculateSimilarity(
    wine1: Partial<TastingRecord>,
    wine2: TastingRecord,
    fields: string[]
  ): { confidence: number; matchedFields: string[] } {
    let score = 0
    let maxScore = 0
    const matchedFields: string[] = []

    const weights = {
      wineName: 3.0,
      producer: 2.5,
      vintage: 1.0,
      country: 1.5,
      region: 2.0,
      grapes: 2.0,
      type: 1.5,
      color: 1.0
    }

    for (const field of fields) {
      const weight = weights[field as keyof typeof weights] || 1.0
      maxScore += weight

      const value1 = wine1[field as keyof TastingRecord]
      const value2 = wine2[field as keyof TastingRecord]

      if (value1 && value2) {
        const similarity = this.calculateFieldSimilarity(value1, value2, field)
        if (similarity > 0.5) { // 50%以上の類似度
          score += weight * similarity
          matchedFields.push(field)
        }
      }
    }

    const confidence = maxScore > 0 ? score / maxScore : 0

    return { confidence, matchedFields }
  }

  /**
   * フィールド値の類似度を計算
   */
  private calculateFieldSimilarity(value1: any, value2: any, field: string): number {
    if (value1 === value2) {
      return 1.0
    }

    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return this.calculateStringSimilarity(value1, value2)
    }

    if (typeof value1 === 'number' && typeof value2 === 'number') {
      // 数値の場合は差分に基づく類似度
      if (field === 'vintage') {
        const diff = Math.abs(value1 - value2)
        return Math.max(0, 1 - diff / 10) // 10年差で類似度0
      }
      return value1 === value2 ? 1.0 : 0
    }

    if (Array.isArray(value1) && Array.isArray(value2)) {
      return this.calculateArraySimilarity(value1, value2)
    }

    return 0
  }

  /**
   * 文字列の類似度を計算（Jaro-Winkler距離）
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0

    const s1 = str1.toLowerCase().trim()
    const s2 = str2.toLowerCase().trim()

    if (s1 === s2) return 1.0

    // 部分一致による簡易類似度計算
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.8
    }

    // レーベンシュタイン距離による類似度
    const distance = this.levenshteinDistance(s1, s2)
    const maxLength = Math.max(s1.length, s2.length)
    return maxLength > 0 ? 1 - distance / maxLength : 0
  }

  /**
   * レーベンシュタイン距離を計算
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator   // substitution
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * 配列の類似度を計算
   */
  private calculateArraySimilarity(arr1: any[], arr2: any[]): number {
    const set1 = new Set(arr1.map(item => item.toString().toLowerCase()))
    const set2 = new Set(arr2.map(item => item.toString().toLowerCase()))
    
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * 引用可能なフィールドを特定
   */
  private getSuggestedFields(
    target: Partial<TastingRecord>,
    source: TastingRecord
  ): string[] {
    const suggestedFields: string[] = []

    // 引用可能フィールドの定義
    const citableFields = [
      'region',
      'grapes',
      'alcoholContent',
      'detailedAnalysis',
      'environment',
      'tags'
    ]

    for (const field of citableFields) {
      const targetValue = target[field as keyof TastingRecord]
      const sourceValue = source[field as keyof TastingRecord]

      // ターゲットに値がなく、ソースに値がある場合は引用候補
      if (!targetValue && sourceValue) {
        suggestedFields.push(field)
      }
    }

    return suggestedFields
  }

  /**
   * 引用プレビューを生成
   */
  async generateCitationPreview(
    targetRecord: Partial<TastingRecord>,
    sourceRecord: TastingRecord,
    fields: string[]
  ): Promise<CitationPreview> {
    const conflicts: string[] = []
    const preview: Partial<TastingRecord> = { ...targetRecord }

    // フィールドごとに引用処理
    for (const field of fields) {
      const targetValue = targetRecord[field as keyof TastingRecord]
      const sourceValue = sourceRecord[field as keyof TastingRecord]

      if (targetValue && sourceValue && !this.isValueEqual(targetValue, sourceValue)) {
        // 値が異なる場合は競合として記録
        conflicts.push(field)
      }

      // プレビューに値をコピー
      if (sourceValue) {
        (preview as any)[field] = sourceValue
      }
    }

    return {
      sourceRecord,
      targetFields: fields,
      conflicts,
      preview
    }
  }

  /**
   * 引用を実行して記録に適用
   */
  async applyCitation(
    targetRecord: Partial<TastingRecord>,
    sourceRecord: TastingRecord,
    fields: string[]
  ): Promise<Partial<TastingRecord>> {
    const updatedRecord: Partial<TastingRecord> = { ...targetRecord }

    // 引用情報を追加
    const citation: Citation = {
      sourceRecordId: sourceRecord.id,
      citedFields: fields,
      citedAt: new Date()
    }

    if (!updatedRecord.citations) {
      updatedRecord.citations = []
    }
    updatedRecord.citations.push(citation)

    // フィールドをコピー
    for (const field of fields) {
      const sourceValue = sourceRecord[field as keyof TastingRecord]
      if (sourceValue) {
        (updatedRecord as any)[field] = sourceValue
      }
    }

    // 更新日時を設定
    updatedRecord.updatedAt = new Date()

    return updatedRecord
  }

  /**
   * 値の等価性をチェック
   */
  private isValueEqual(value1: any, value2: any): boolean {
    if (value1 === value2) return true

    if (Array.isArray(value1) && Array.isArray(value2)) {
      return JSON.stringify(value1.sort()) === JSON.stringify(value2.sort())
    }

    if (typeof value1 === 'object' && typeof value2 === 'object') {
      return JSON.stringify(value1) === JSON.stringify(value2)
    }

    return false
  }

  /**
   * 引用履歴を取得
   */
  async getCitationHistory(recordId: string): Promise<{
    citedBy: TastingRecord[] // この記録を引用した記録
    citedFrom: TastingRecord[] // この記録が引用した記録
  }> {
    try {
      // この記録を引用した記録を検索
      const citedBy = await tastingRecordService.findRecordsByCitation(recordId)

      // この記録が引用した記録を取得
      const record = await tastingRecordService.getTastingRecord(recordId)
      const citedFrom: TastingRecord[] = []

      if (record?.citations) {
        for (const citation of record.citations) {
          try {
            const sourceRecord = await tastingRecordService.getTastingRecord(citation.sourceRecordId)
            if (sourceRecord) {
              citedFrom.push(sourceRecord)
            }
          } catch (error) {
            console.warn(`Failed to fetch cited record ${citation.sourceRecordId}:`, error)
          }
        }
      }

      return { citedBy, citedFrom }
    } catch (error) {
      console.error('Failed to get citation history:', error)
      throw new Error('引用履歴の取得に失敗しました')
    }
  }

  /**
   * 引用統計を取得
   */
  async getCitationStats(userId: string): Promise<{
    totalCitations: number // 総引用数
    mostCitedRecord?: TastingRecord // 最も引用された記録
    recentCitations: Citation[] // 最近の引用
  }> {
    try {
      const recordsResult = await tastingRecordService.getUserRecords(userId, {
        limitCount: 1000
      })
      const records = recordsResult.records

      let totalCitations = 0
      const citationCounts = new Map<string, number>()
      const recentCitations: Citation[] = []

      for (const record of records) {
        if (record.citations) {
          totalCitations += record.citations.length
          
          for (const citation of record.citations) {
            // 引用元の統計
            citationCounts.set(
              citation.sourceRecordId,
              (citationCounts.get(citation.sourceRecordId) || 0) + 1
            )
            
            // 最近の引用（30日以内）
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            
            if (citation.citedAt > thirtyDaysAgo) {
              recentCitations.push(citation)
            }
          }
        }
      }

      // 最も引用された記録を特定
      let mostCitedRecord: TastingRecord | undefined
      let maxCitations = 0

      for (const [recordId, count] of citationCounts) {
        if (count > maxCitations) {
          maxCitations = count
          try {
            const record = await tastingRecordService.getTastingRecord(recordId)
            if (record) {
              mostCitedRecord = record
            }
          } catch (error) {
            console.warn(`Failed to fetch most cited record ${recordId}:`, error)
          }
        }
      }

      // 最近の引用を日時でソート
      recentCitations.sort((a, b) => b.citedAt.getTime() - a.citedAt.getTime())

      return {
        totalCitations,
        mostCitedRecord,
        recentCitations: recentCitations.slice(0, 10) // 最新10件
      }
    } catch (error) {
      console.error('Failed to get citation stats:', error)
      throw new Error('引用統計の取得に失敗しました')
    }
  }
}

// シングルトンインスタンスをエクスポート
export const citationService = CitationService.getInstance()