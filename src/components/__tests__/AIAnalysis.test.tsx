import { render, screen } from '@testing-library/react'
import { AIAnalysis } from '../AIAnalysis'
import { useAuth } from '../../contexts/AuthContext'

// Mock dependencies
jest.mock('../../contexts/AuthContext')
jest.mock('../../services/llmService', () => ({
  LLMService: {
    getInstance: () => ({
      analyzeWineData: jest.fn().mockResolvedValue({ analysis: 'mock analysis' }),
      generateAdvice: jest.fn().mockResolvedValue({ advice: 'mock advice' })
    })
  }
}))
jest.mock('../../services/tastingRecordService', () => ({
  tastingRecordService: {
    getUserRecords: jest.fn().mockResolvedValue([])
  }
}))
jest.mock('../../services/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {}
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('AIAnalysis', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com'
  }

  const mockUserProfile = {
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    subscription: { plan: 'free' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      currentUser: mockUser,
      userProfile: mockUserProfile,
      isGuestMode: false,
      loading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      updateUserProfile: jest.fn(),
      clearError: jest.fn()
    })
  })

  it('renders AI analysis component correctly', () => {
    render(<AIAnalysis />)
    
    expect(screen.getByText('🤖 AI ワイン分析')).toBeInTheDocument()
  })

  it('should be defined', () => {
    const component = render(<AIAnalysis />)
    expect(component).toBeDefined()
  })
})