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
  serverTimestamp: jest.fn(() => new Date()),
  setDoc: jest.fn()
}))

jest.mock('../firebase', () => ({
  default: {
    getFirestore: jest.fn()
  }
}))

describe('TastingRecordService', () => {
  let service: TastingRecordService
  
  beforeEach(() => {
    service = TastingRecordService.getInstance()
    jest.clearAllMocks()
    
    // Reset singleton for clean tests
    ;(TastingRecordService as any).instance = undefined
    service = TastingRecordService.getInstance()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = TastingRecordService.getInstance()
      const instance2 = TastingRecordService.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(TastingRecordService)
    })
  })

  describe('basic functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })

    it('should have required methods', () => {
      expect(typeof service.createRecord).toBe('function')
      expect(typeof service.getRecord).toBe('function')
      expect(typeof service.updateRecord).toBe('function')
      expect(typeof service.deleteRecord).toBe('function')
      expect(typeof service.getUserRecords).toBe('function')
    })
  })
})