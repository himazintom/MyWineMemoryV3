import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIAnalysis } from '../AIAnalysis'
import { useAuth } from '../../contexts/AuthContext'
import { llmService } from '../../services/llmService'
import { tastingRecordService } from '../../services/tastingRecordService'

// Mock dependencies
jest.mock('../../contexts/AuthContext')
jest.mock('../../services/llmService')
jest.mock('../../services/tastingRecordService')

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockLlmService = llmService as jest.Mocked<typeof llmService>
const mockTastingRecordService = tastingRecordService as jest.Mocked<typeof tastingRecordService>

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

  const mockTastingRecords = [
    {
      id: '1',
      wineName: 'Test Wine',
      producer: 'Test Producer',
      type: 'red',
      rating: 8.5,
      notes: 'Great wine',
      createdAt: new Date()
    }
  ]

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

    mockLlmService.getUsageCount.mockReturnValue(5)
    mockLlmService.getCurrentModel.mockReturnValue({
      id: 'test-model',
      name: 'Test Model',
      provider: 'openrouter',
      modelId: 'test/model',
      maxTokens: 1000,
      costPer1MTokens: 0,
      description: 'Test model',
      isFree: true
    })

    mockTastingRecordService.getUserRecords.mockResolvedValue({
      records: mockTastingRecords,
      hasMore: false,
      lastDoc: null
    })
  })

  it('renders AI analysis component correctly', () => {
    render(<AIAnalysis />)
    
    expect(screen.getByText('🤖 AI ワイン分析')).toBeInTheDocument()
    expect(screen.getByText('🧠 Test Model')).toBeInTheDocument()
    expect(screen.getByText('5/10 回使用')).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('shows premium badge for premium users', () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuth(),
      userProfile: {
        ...mockUserProfile,
        subscription: { plan: 'premium' }
      }
    })

    render(<AIAnalysis />)
    
    expect(screen.getByText('5/100 回使用')).toBeInTheDocument()
    expect(screen.getByText('Premium')).toBeInTheDocument()
  })

  it('shows usage limit notice when limit reached', () => {
    mockLlmService.getUsageCount.mockReturnValue(10)
    
    render(<AIAnalysis />)
    
    expect(screen.getByText('📊 月間利用上限に達しました')).toBeInTheDocument()
    expect(screen.getByText(/フリープランの月間利用回数/)).toBeInTheDocument()
  })

  it('handles taste profile analysis correctly', async () => {
    const mockAnalysis = {
      summary: 'あなたは赤ワインを好む傾向があります',
      preferredTypes: ['赤ワイン', 'フルボディ'],
      flavorProfile: {
        sweetness: 3,
        acidity: 7,
        tannins: 8,
        body: 9
      },
      recommendations: ['ボルドーワイン', 'バローロ'],
      insights: ['タンニンの強いワインを好みます']
    }

    mockLlmService.analyzeTasteProfile.mockResolvedValue(mockAnalysis)
    
    const user = userEvent.setup()
    render(<AIAnalysis />)
    
    const analyzeButton = screen.getByText('🧠 味覚プロフィール分析')
    await user.click(analyzeButton)
    
    await waitFor(() => {
      expect(screen.getByText('🧠 あなたの味覚プロフィール')).toBeInTheDocument()
    })
    
    expect(screen.getByText(mockAnalysis.summary)).toBeInTheDocument()
    expect(screen.getByText('赤ワイン')).toBeInTheDocument()
    expect(screen.getByText('ボルドーワイン')).toBeInTheDocument()
  })

  it('handles wine recommendations correctly', async () => {
    const mockRecommendations = [
      {
        wineName: 'Recommended Wine',
        producer: 'Great Producer',
        vintage: 2020,
        country: 'France',
        region: 'Bordeaux',
        grapes: ['Cabernet Sauvignon'],
        priceRange: '5,000-10,000円',
        reason: 'Matches your taste profile',
        confidence: 0.9
      }
    ]

    mockLlmService.recommendWines.mockResolvedValue(mockRecommendations)
    
    const user = userEvent.setup()
    render(<AIAnalysis />)
    
    const recommendButton = screen.getByText('💡 おすすめワイン提案')
    await user.click(recommendButton)
    
    await waitFor(() => {
      expect(screen.getByText('💡 あなたにおすすめのワイン')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Recommended Wine')).toBeInTheDocument()
    expect(screen.getByText('Great Producer')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
  })

  it('shows error message when analysis fails', async () => {
    mockLlmService.analyzeTasteProfile.mockRejectedValue(
      new Error('AI分析に失敗しました')
    )
    
    const user = userEvent.setup()
    render(<AIAnalysis />)
    
    const analyzeButton = screen.getByText('🧠 味覚プロフィール分析')
    await user.click(analyzeButton)
    
    await waitFor(() => {
      expect(screen.getByText('AI分析に失敗しました')).toBeInTheDocument()
    })
  })

  it('shows error when no tasting records exist', async () => {
    mockTastingRecordService.getUserRecords.mockResolvedValue({
      records: [],
      hasMore: false,
      lastDoc: null
    })
    
    const user = userEvent.setup()
    render(<AIAnalysis />)
    
    const analyzeButton = screen.getByText('🧠 味覚プロフィール分析')
    await user.click(analyzeButton)
    
    await waitFor(() => {
      expect(screen.getByText(/分析に必要なテイスティング記録がありません/)).toBeInTheDocument()
    })
  })

  it('disables buttons when usage limit reached', () => {
    mockLlmService.getUsageCount.mockReturnValue(10)
    
    render(<AIAnalysis />)
    
    const analyzeButton = screen.queryByText('🧠 味覚プロフィール分析')
    const recommendButton = screen.queryByText('💡 おすすめワイン提案')
    
    expect(analyzeButton).not.toBeInTheDocument()
    expect(recommendButton).not.toBeInTheDocument()
  })

  it('shows loading state during analysis', async () => {
    mockLlmService.analyzeTasteProfile.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )
    
    const user = userEvent.setup()
    render(<AIAnalysis />)
    
    const analyzeButton = screen.getByText('🧠 味覚プロフィール分析')
    await user.click(analyzeButton)
    
    expect(screen.getByText('AI分析中...')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows feature information when no results', () => {
    render(<AIAnalysis />)
    
    expect(screen.getByText('味覚プロフィール分析')).toBeInTheDocument()
    expect(screen.getByText('パーソナライズド推薦')).toBeInTheDocument()
    expect(screen.getByText(/利用にはテイスティング記録が必要です/)).toBeInTheDocument()
  })

  it('renders flavor profile chart correctly', async () => {
    const mockAnalysis = {
      summary: 'Test summary',
      preferredTypes: ['red'],
      flavorProfile: {
        sweetness: 5,
        acidity: 7,
        tannins: 8,
        body: 9
      },
      recommendations: ['test'],
      insights: ['test insight']
    }

    mockLlmService.analyzeTasteProfile.mockResolvedValue(mockAnalysis)
    
    const user = userEvent.setup()
    render(<AIAnalysis />)
    
    const analyzeButton = screen.getByText('🧠 味覚プロフィール分析')
    await user.click(analyzeButton)
    
    await waitFor(() => {
      expect(screen.getByText('🍷 味覚プロフィール')).toBeInTheDocument()
    })
    
    expect(screen.getByText('甘味')).toBeInTheDocument()
    expect(screen.getByText('5/10')).toBeInTheDocument()
    expect(screen.getByText('タンニン')).toBeInTheDocument()
    expect(screen.getByText('8/10')).toBeInTheDocument()
  })
})