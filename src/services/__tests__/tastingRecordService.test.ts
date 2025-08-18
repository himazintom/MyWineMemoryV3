import { TastingRecordService } from '../tastingRecordService'
import type { TastingRecord, UserStatistics } from '../../types'

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  Timestamp: {
    fromDate: jest.fn((date) => ({ seconds: date.getTime() / 1000 })),
    toDate: jest.fn()
  }
}))

jest.mock('../firebase', () => ({
  default: {
    getFirestore: jest.fn()
  }
}))

describe('TastingRecordService', () => {
  let service: TastingRecordService
  
  beforeEach(() => {
    service = new TastingRecordService()
    jest.clearAllMocks()
  })

  describe('validateRecord', () => {
    const baseRecord: Partial<TastingRecord> = {
      wineName: 'Test Wine',
      producer: 'Test Producer',
      type: 'red',
      rating: 8.5,
      notes: 'Great wine'
    }

    it('should validate a complete record', () => {
      const result = service.validateRecord(baseRecord as TastingRecord)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should require wine name', () => {
      const record = { ...baseRecord, wineName: '' }
      const result = service.validateRecord(record as TastingRecord)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('ワイン名は必須です')
    })

    it('should require producer', () => {
      const record = { ...baseRecord, producer: '' }
      const result = service.validateRecord(record as TastingRecord)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('生産者は必須です')
    })

    it('should validate rating range', () => {
      const invalidRatings = [-1, 11, 15]
      
      invalidRatings.forEach(rating => {
        const record = { ...baseRecord, rating }
        const result = service.validateRecord(record as TastingRecord)
        
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('評価は0.0-10.0の範囲で入力してください')
      })
    })

    it('should validate wine type', () => {
      const record = { ...baseRecord, type: 'invalid' as any }
      const result = service.validateRecord(record as TastingRecord)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('有効なワインタイプを選択してください')
    })

    it('should validate price when provided', () => {
      const record = { ...baseRecord, price: -100 }
      const result = service.validateRecord(record as TastingRecord)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('価格は0以上で入力してください')
    })
  })

  describe('calculateSimilarity', () => {
    const record1: Partial<TastingRecord> = {
      wineName: 'Château Margaux',
      producer: 'Château Margaux',
      vintage: 2015,
      type: 'red'
    }

    const record2: Partial<TastingRecord> = {
      wineName: 'Chateau Margaux',
      producer: 'Château Margaux',
      vintage: 2015,
      type: 'red'
    }

    it('should calculate high similarity for nearly identical records', () => {
      const similarity = service.calculateSimilarity(
        record1 as TastingRecord,
        record2 as TastingRecord
      )
      
      expect(similarity).toBeGreaterThan(0.8)
    })

    it('should calculate low similarity for different records', () => {
      const differentRecord: Partial<TastingRecord> = {
        wineName: 'Dom Pérignon',
        producer: 'Moët & Chandon',
        vintage: 2010,
        type: 'sparkling'
      }
      
      const similarity = service.calculateSimilarity(
        record1 as TastingRecord,
        differentRecord as TastingRecord
      )
      
      expect(similarity).toBeLessThan(0.3)
    })

    it('should handle missing vintage', () => {
      const recordWithoutVintage = { ...record1, vintage: undefined }
      
      const similarity = service.calculateSimilarity(
        recordWithoutVintage as TastingRecord,
        record2 as TastingRecord
      )
      
      expect(similarity).toBeGreaterThan(0)
      expect(similarity).toBeLessThan(1)
    })
  })

  describe('jaroWinklerDistance', () => {
    it('should return 1 for identical strings', () => {
      const distance = service.jaroWinklerDistance('test', 'test')
      expect(distance).toBe(1)
    })

    it('should return 0 for completely different strings', () => {
      const distance = service.jaroWinklerDistance('abc', 'xyz')
      expect(distance).toBe(0)
    })

    it('should return values between 0 and 1 for similar strings', () => {
      const distance = service.jaroWinklerDistance('Martha', 'Marhta')
      expect(distance).toBeGreaterThan(0)
      expect(distance).toBeLessThan(1)
    })

    it('should handle empty strings', () => {
      expect(service.jaroWinklerDistance('', '')).toBe(1)
      expect(service.jaroWinklerDistance('test', '')).toBe(0)
      expect(service.jaroWinklerDistance('', 'test')).toBe(0)
    })

    it('should be case insensitive', () => {
      const distance1 = service.jaroWinklerDistance('Test', 'test')
      const distance2 = service.jaroWinklerDistance('TEST', 'test')
      
      expect(distance1).toBe(1)
      expect(distance2).toBe(1)
    })
  })

  describe('formatPriceRange', () => {
    it('should format price ranges correctly', () => {
      expect(service.formatPriceRange(0, 1000)).toBe('〜1,000円')
      expect(service.formatPriceRange(1000, 3000)).toBe('1,000〜3,000円')
      expect(service.formatPriceRange(5000, null)).toBe('5,000円〜')
    })

    it('should handle single prices', () => {
      expect(service.formatPriceRange(2500, 2500)).toBe('2,500円')
    })

    it('should handle null values', () => {
      expect(service.formatPriceRange(null, null)).toBe('価格未設定')
      expect(service.formatPriceRange(null, 1000)).toBe('〜1,000円')
    })
  })

  describe('extractTopCountries', () => {
    it('should extract and count countries correctly', () => {
      const records: Partial<TastingRecord>[] = [
        { country: 'France' },
        { country: 'Italy' },
        { country: 'France' },
        { country: 'Spain' },
        { country: 'France' }
      ]

      const result = service.extractTopCountries(records as TastingRecord[], 3)
      
      expect(result).toEqual([
        { name: 'France', count: 3 },
        { name: 'Italy', count: 1 },
        { name: 'Spain', count: 1 }
      ])
    })

    it('should limit results to specified count', () => {
      const records: Partial<TastingRecord>[] = [
        { country: 'France' },
        { country: 'Italy' },
        { country: 'Spain' },
        { country: 'Germany' }
      ]

      const result = service.extractTopCountries(records as TastingRecord[], 2)
      expect(result).toHaveLength(2)
    })

    it('should handle empty records', () => {
      const result = service.extractTopCountries([], 5)
      expect(result).toEqual([])
    })

    it('should filter out null/undefined countries', () => {
      const records: Partial<TastingRecord>[] = [
        { country: 'France' },
        { country: null },
        { country: undefined },
        { country: 'Italy' }
      ]

      const result = service.extractTopCountries(records as TastingRecord[], 5)
      
      expect(result).toEqual([
        { name: 'France', count: 1 },
        { name: 'Italy', count: 1 }
      ])
    })
  })

  describe('calculateMonthlyStats', () => {
    it('should calculate monthly statistics correctly', () => {
      const now = new Date('2024-03-15')
      const records: Partial<TastingRecord>[] = [
        { createdAt: new Date('2024-03-01'), rating: 8.0 },
        { createdAt: new Date('2024-03-10'), rating: 9.0 },
        { createdAt: new Date('2024-02-15'), rating: 7.0 },
        { createdAt: new Date('2024-01-20'), rating: 8.5 }
      ]

      const result = service.calculateMonthlyStats(records as TastingRecord[], 3, now)
      
      expect(result).toHaveLength(3)
      expect(result[0].month).toBe('2024-03')
      expect(result[0].count).toBe(2)
      expect(result[0].averageRating).toBe(8.5)
    })

    it('should fill missing months with zero counts', () => {
      const now = new Date('2024-03-15')
      const records: Partial<TastingRecord>[] = [
        { createdAt: new Date('2024-03-01'), rating: 8.0 },
        { createdAt: new Date('2024-01-20'), rating: 8.5 }
        // No February records
      ]

      const result = service.calculateMonthlyStats(records as TastingRecord[], 3, now)
      
      expect(result).toHaveLength(3)
      expect(result.find(r => r.month === '2024-02')).toEqual({
        month: '2024-02',
        count: 0,
        averageRating: 0
      })
    })
  })
})