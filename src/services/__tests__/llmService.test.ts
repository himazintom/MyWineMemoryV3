import { LLMService } from '../llmService'
import type { TastingRecord } from '../../types'

// Mock Firebase and admin service
jest.mock('../firebase', () => ({
  default: {
    getFirestore: jest.fn()
  }
}))

jest.mock('../adminService', () => ({
  adminService: {
    getCurrentModel: jest.fn().mockResolvedValue('openai-gpt-oss-free')
  }
}))

// Mock fetch
global.fetch = jest.fn()

describe('LLMService', () => {
  let service: LLMService
  
  beforeEach(() => {
    service = LLMService.getInstance()
    jest.clearAllMocks()
    
    // Reset singleton for clean tests
    ;(LLMService as any).instance = undefined
    service = LLMService.getInstance()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = LLMService.getInstance()
      const instance2 = LLMService.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('getAvailableModels', () => {
    it('should return available models', () => {
      const models = service.getAvailableModels()
      
      expect(models).toHaveLength(6) // Based on the 6 models defined
      expect(models[0]).toHaveProperty('id')
      expect(models[0]).toHaveProperty('name')
      expect(models[0]).toHaveProperty('provider')
      expect(models[0]).toHaveProperty('modelId')
    })
  })

  describe('getFreeModels', () => {
    it('should return only free models', () => {
      const freeModels = service.getFreeModels()
      
      freeModels.forEach(model => {
        expect(model.isFree).toBe(true)
        expect(model.costPer1MTokens).toBe(0)
      })
    })
  })

  describe('switchModel', () => {
    it('should switch to a valid model', async () => {
      const success = await service.switchModel('meta-llama-free')
      
      expect(success).toBe(true)
      
      const currentModel = service.getCurrentModel()
      expect(currentModel?.id).toBe('meta-llama-free')
    })

    it('should fail to switch to invalid model', async () => {
      const success = await service.switchModel('invalid-model')
      
      expect(success).toBe(false)
    })

    it('should update provider for Groq models', async () => {
      const success = await service.switchModel('groq-llama-free')
      
      expect(success).toBe(true)
      
      const currentModel = service.getCurrentModel()
      expect(currentModel?.provider).toBe('groq')
    })
  })

  describe('extractUserPreferences', () => {
    it('should extract user preferences correctly', () => {
      const mockRecords: Partial<TastingRecord>[] = [
        {
          type: 'red',
          country: 'France',
          grapes: ['Cabernet Sauvignon', 'Merlot'],
          rating: 9.0,
          price: 5000,
          notes: 'Excellent wine'
        },
        {
          type: 'red',
          country: 'Italy',
          grapes: ['Sangiovese'],
          rating: 8.5,
          price: 3000,
          notes: 'Good structure'
        },
        {
          type: 'white',
          country: 'France',
          grapes: ['Chardonnay'],
          rating: 8.0,
          price: 4000,
          notes: 'Crisp and clean'
        }
      ]

      const preferences = (service as any).extractUserPreferences(mockRecords as TastingRecord[])
      
      expect(preferences.favoriteTypes).toContain('red')
      expect(preferences.favoriteCountries).toContain('France')
      expect(preferences.favoriteGrapes).toContain('Cabernet Sauvignon')
      expect(preferences.averageRating).toBeCloseTo(8.5)
      expect(preferences.priceRange).toBeDefined()
      expect(preferences.tastingNotes).toHaveLength(3)
    })

    it('should handle empty records', () => {
      const preferences = (service as any).extractUserPreferences([])
      
      expect(preferences.favoriteTypes).toEqual([])
      expect(preferences.favoriteCountries).toEqual([])
      expect(preferences.favoriteGrapes).toEqual([])
      expect(preferences.averageRating).toBeNaN()
      expect(preferences.priceRange).toBe('不明')
      expect(preferences.tastingNotes).toEqual([])
    })
  })

  describe('getMostFrequent', () => {
    it('should return most frequent items', () => {
      const items = ['a', 'b', 'a', 'c', 'a', 'b']
      const result = (service as any).getMostFrequent(items)
      
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty array', () => {
      const result = (service as any).getMostFrequent([])
      expect(result).toEqual([])
    })

    it('should filter out falsy values', () => {
      const items = ['a', '', 'b', null, 'a', undefined]
      const result = (service as any).getMostFrequent(items)
      
      expect(result).toEqual(['a', 'b'])
    })
  })

  describe('getTypicalPriceRange', () => {
    it('should categorize price ranges correctly', () => {
      const testCases = [
        { prices: [1000, 1500], expected: '〜2,000円' },
        { prices: [3000, 4000], expected: '2,000〜5,000円' },
        { prices: [7000, 8000], expected: '5,000〜10,000円' },
        { prices: [15000, 20000], expected: '10,000円〜' }
      ]

      testCases.forEach(({ prices, expected }) => {
        const records = prices.map(price => ({ price } as TastingRecord))
        const result = (service as any).getTypicalPriceRange(records)
        expect(result).toBe(expected)
      })
    })

    it('should handle records without prices', () => {
      const records: TastingRecord[] = [
        { price: null } as TastingRecord,
        { price: 0 } as TastingRecord,
        { price: undefined } as TastingRecord
      ]
      
      const result = (service as any).getTypicalPriceRange(records)
      expect(result).toBe('不明')
    })
  })

  describe('Usage limits', () => {
    beforeEach(() => {
      // Reset usage count
      service.resetUsageCount()
    })

    it('should track usage count', () => {
      expect(service.getUsageCount()).toBe(0)
      
      // Simulate API calls by incrementing internal counter
      // This would normally happen in makeRequest
      ;(service as any).requestCount = 5
      
      expect(service.getUsageCount()).toBe(5)
    })

    it('should reset usage count', () => {
      ;(service as any).requestCount = 10
      
      service.resetUsageCount()
      
      expect(service.getUsageCount()).toBe(0)
    })

    it('should check usage limits correctly', () => {
      // Test free user limit (10)
      ;(service as any).requestCount = 9
      expect((service as any).checkUsageLimit(false)).toBe(true)
      
      ;(service as any).requestCount = 10
      expect((service as any).checkUsageLimit(false)).toBe(false)
      
      // Test premium user limit (100)
      ;(service as any).requestCount = 99
      expect((service as any).checkUsageLimit(true)).toBe(true)
      
      ;(service as any).requestCount = 100
      expect((service as any).checkUsageLimit(true)).toBe(false)
    })
  })

  describe('API Integration', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockClear()
    })

    it('should make API request with correct headers', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Test response' } }]
        })
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
      
      // Mock environment variables using process.env
      process.env.VITE_OPENROUTER_API_KEY = 'test-key'

      try {
        await (service as any).makeRequest('test prompt')
      } catch (error) {
        // Expected to fail due to mocking limitations
      }

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('openrouter.ai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect((service as any).makeRequest('test')).rejects.toThrow('AI分析の実行に失敗しました')
    })
  })
})