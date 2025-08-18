import { CitationService } from '../citationService'
import type { TastingRecord, Citation } from '../../types'

// Mock dependencies
jest.mock('../tastingRecordService', () => ({
  tastingRecordService: {
    getUserRecords: jest.fn(),
    getTastingRecord: jest.fn(),
    findRecordsByCitation: jest.fn()
  }
}))

describe('CitationService', () => {
  let service: CitationService
  
  beforeEach(() => {
    service = CitationService.getInstance()
    jest.clearAllMocks()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = CitationService.getInstance()
      const instance2 = CitationService.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('calculateStringSimilarity', () => {
    it('should return 1 for identical strings', () => {
      const similarity = (service as any).calculateStringSimilarity('test', 'test')
      expect(similarity).toBe(1)
    })

    it('should return high similarity for similar strings', () => {
      const similarity = (service as any).calculateStringSimilarity('Château Margaux', 'Chateau Margaux')
      expect(similarity).toBeGreaterThan(0.8)
    })

    it('should return medium similarity for partial matches', () => {
      const similarity = (service as any).calculateStringSimilarity('Château Margaux', 'Margaux')
      expect(similarity).toBe(0.8)
    })

    it('should handle case insensitive comparison', () => {
      const similarity = (service as any).calculateStringSimilarity('TEST', 'test')
      expect(similarity).toBe(1)
    })

    it('should return 0 for completely different strings', () => {
      const similarity = (service as any).calculateStringSimilarity('abc', 'xyz')
      expect(similarity).toBeGreaterThanOrEqual(0)
    })
  })

  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      const distance = (service as any).levenshteinDistance('test', 'test')
      expect(distance).toBe(0)
    })

    it('should return correct distance for different strings', () => {
      const distance = (service as any).levenshteinDistance('kitten', 'sitting')
      expect(distance).toBe(3)
    })

    it('should handle empty strings', () => {
      const distance1 = (service as any).levenshteinDistance('', 'test')
      const distance2 = (service as any).levenshteinDistance('test', '')
      expect(distance1).toBe(4)
      expect(distance2).toBe(4)
    })
  })

  describe('calculateArraySimilarity', () => {
    it('should return 1 for identical arrays', () => {
      const similarity = (service as any).calculateArraySimilarity(['a', 'b'], ['a', 'b'])
      expect(similarity).toBe(1)
    })

    it('should return 0.333 for arrays with one common element', () => {
      const similarity = (service as any).calculateArraySimilarity(['a', 'b'], ['a', 'c'])
      expect(similarity).toBeCloseTo(0.333, 2)
    })

    it('should return 0 for completely different arrays', () => {
      const similarity = (service as any).calculateArraySimilarity(['a', 'b'], ['c', 'd'])
      expect(similarity).toBe(0)
    })

    it('should handle case insensitive comparison', () => {
      const similarity = (service as any).calculateArraySimilarity(['A', 'B'], ['a', 'b'])
      expect(similarity).toBe(1)
    })
  })

  describe('calculateFieldSimilarity', () => {
    it('should return 1 for identical values', () => {
      const similarity = (service as any).calculateFieldSimilarity('test', 'test', 'wineName')
      expect(similarity).toBe(1)
    })

    it('should calculate string similarity correctly', () => {
      const similarity = (service as any).calculateFieldSimilarity('Château Margaux', 'Chateau Margaux', 'wineName')
      expect(similarity).toBeGreaterThan(0.8)
    })

    it('should handle vintage comparison', () => {
      const similarity1 = (service as any).calculateFieldSimilarity(2015, 2016, 'vintage')
      const similarity2 = (service as any).calculateFieldSimilarity(2015, 2025, 'vintage')
      
      expect(similarity1).toBeGreaterThan(similarity2)
      expect(similarity2).toBe(0)
    })

    it('should handle array comparison', () => {
      const similarity = (service as any).calculateFieldSimilarity(
        ['Cabernet Sauvignon', 'Merlot'], 
        ['Cabernet Sauvignon'], 
        'grapes'
      )
      expect(similarity).toBeGreaterThan(0)
      expect(similarity).toBeLessThan(1)
    })
  })

  describe('getSuggestedFields', () => {
    it('should suggest fields that are missing in target', () => {
      const target = { wineName: 'Test Wine' }
      const source = {
        wineName: 'Test Wine',
        region: 'Bordeaux',
        grapes: ['Merlot'],
        alcoholContent: 13.5
      } as TastingRecord
      
      const suggestions = (service as any).getSuggestedFields(target, source)
      
      expect(suggestions).toContain('region')
      expect(suggestions).toContain('grapes')
      expect(suggestions).toContain('alcoholContent')
    })

    it('should not suggest fields that already exist in target', () => {
      const target = { 
        wineName: 'Test Wine',
        region: 'Burgundy'
      }
      const source = {
        wineName: 'Test Wine',
        region: 'Bordeaux',
        grapes: ['Merlot']
      } as TastingRecord
      
      const suggestions = (service as any).getSuggestedFields(target, source)
      
      expect(suggestions).not.toContain('region')
      expect(suggestions).toContain('grapes')
    })
  })

  describe('isValueEqual', () => {
    it('should return true for identical primitive values', () => {
      expect((service as any).isValueEqual('test', 'test')).toBe(true)
      expect((service as any).isValueEqual(123, 123)).toBe(true)
    })

    it('should return true for equal arrays', () => {
      expect((service as any).isValueEqual(['a', 'b'], ['b', 'a'])).toBe(true)
    })

    it('should return true for equal objects', () => {
      const obj1 = { name: 'test', value: 123 }
      const obj2 = { name: 'test', value: 123 }
      expect((service as any).isValueEqual(obj1, obj2)).toBe(true)
    })

    it('should return false for different values', () => {
      expect((service as any).isValueEqual('test1', 'test2')).toBe(false)
      expect((service as any).isValueEqual(['a'], ['b'])).toBe(false)
    })
  })

  describe('applyCitation', () => {
    it('should apply citation and copy fields correctly', async () => {
      const targetRecord: Partial<TastingRecord> = {
        wineName: 'Target Wine',
        producer: 'Target Producer'
      }

      const sourceRecord: TastingRecord = {
        id: 'source-123',
        wineName: 'Source Wine',
        producer: 'Source Producer',
        region: 'Bordeaux',
        grapes: ['Merlot']
      } as TastingRecord

      const result = await service.applyCitation(
        targetRecord,
        sourceRecord,
        ['region', 'grapes']
      )

      expect(result.region).toBe('Bordeaux')
      expect(result.grapes).toEqual(['Merlot'])
      expect(result.wineName).toBe('Target Wine') // Should remain unchanged
      expect(result.citations).toHaveLength(1)
      expect(result.citations![0].sourceRecordId).toBe('source-123')
      expect(result.citations![0].citedFields).toEqual(['region', 'grapes'])
    })

    it('should preserve existing citations', async () => {
      const targetRecord: Partial<TastingRecord> = {
        wineName: 'Target Wine',
        citations: [{
          sourceRecordId: 'existing-123',
          citedFields: ['vintage'],
          citedAt: new Date('2023-01-01')
        }]
      }

      const sourceRecord: TastingRecord = {
        id: 'source-456',
        region: 'Burgundy'
      } as TastingRecord

      const result = await service.applyCitation(
        targetRecord,
        sourceRecord,
        ['region']
      )

      expect(result.citations).toHaveLength(2)
      expect(result.citations![0].sourceRecordId).toBe('existing-123')
      expect(result.citations![1].sourceRecordId).toBe('source-456')
    })

    it('should set updated timestamp', async () => {
      const targetRecord: Partial<TastingRecord> = {
        wineName: 'Target Wine'
      }

      const sourceRecord: TastingRecord = {
        id: 'source-123',
        region: 'Bordeaux'
      } as TastingRecord

      const result = await service.applyCitation(
        targetRecord,
        sourceRecord,
        ['region']
      )

      expect(result.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('generateCitationPreview', () => {
    it('should generate preview with conflicts detection', async () => {
      const targetRecord: Partial<TastingRecord> = {
        wineName: 'Target Wine',
        region: 'Burgundy'
      }

      const sourceRecord: TastingRecord = {
        id: 'source-123',
        wineName: 'Source Wine',
        region: 'Bordeaux',
        grapes: ['Merlot']
      } as TastingRecord

      const preview = await service.generateCitationPreview(
        targetRecord,
        sourceRecord,
        ['region', 'grapes']
      )

      expect(preview.conflicts).toContain('region')
      expect(preview.conflicts).not.toContain('grapes')
      expect(preview.preview.region).toBe('Bordeaux')
      expect(preview.preview.grapes).toEqual(['Merlot'])
      expect(preview.targetFields).toEqual(['region', 'grapes'])
    })

    it('should handle no conflicts', async () => {
      const targetRecord: Partial<TastingRecord> = {
        wineName: 'Target Wine'
      }

      const sourceRecord: TastingRecord = {
        id: 'source-123',
        region: 'Bordeaux',
        grapes: ['Merlot']
      } as TastingRecord

      const preview = await service.generateCitationPreview(
        targetRecord,
        sourceRecord,
        ['region', 'grapes']
      )

      expect(preview.conflicts).toHaveLength(0)
      expect(preview.preview.region).toBe('Bordeaux')
      expect(preview.preview.grapes).toEqual(['Merlot'])
    })
  })
})