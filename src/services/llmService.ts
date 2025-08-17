import type { TastingRecord } from '../types'

export interface LLMConfig {
  provider: 'openrouter' | 'groq'
  apiKey: string
  baseURL: string
  model: string
}

export interface TasteProfileAnalysis {
  summary: string
  preferredTypes: string[]
  flavorProfile: {
    sweetness: number
    acidity: number
    tannins: number
    body: number
  }
  recommendations: string[]
  insights: string[]
}

export interface PersonalizedQuiz {
  questions: QuizQuestion[]
  difficulty: 'easy' | 'medium' | 'hard'
  theme: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface WineRecommendation {
  wineName: string
  producer: string
  vintage?: number
  country: string
  region?: string
  grapes: string[]
  priceRange: string
  reason: string
  confidence: number
}

export class LLMService {
  private static instance: LLMService
  private config: LLMConfig
  private requestCount: number = 0
  private lastResetTime: number = Date.now()
  
  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService()
    }
    return LLMService.instance
  }

  private constructor() {
    this.config = {
      provider: 'openrouter',
      apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3-haiku'
    }
  }

  /**
   * 使用回数制限チェック（無料：月10回、プレミアム：月100回）
   */
  private checkUsageLimit(isPremium: boolean = false): boolean {
    const now = Date.now()
    const oneMonth = 30 * 24 * 60 * 60 * 1000

    // 月初リセット
    if (now - this.lastResetTime > oneMonth) {
      this.requestCount = 0
      this.lastResetTime = now
    }

    const limit = isPremium ? 100 : 10
    return this.requestCount < limit
  }

  /**
   * LLM APIリクエストの実行
   */
  private async makeRequest(prompt: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('LLM API key not configured')
    }

    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'MyWineMemory'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'あなたはワインの専門家です。ユーザーのワインテイスティング記録を分析し、正確で有用な情報を提供してください。回答は日本語で行ってください。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`LLM API request failed: ${response.status}`)
      }

      const data = await response.json()
      this.requestCount++
      
      return data.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('LLM request failed:', error)
      throw new Error('AI分析の実行に失敗しました')
    }
  }

  /**
   * 味覚プロフィール分析
   */
  async analyzeTasteProfile(
    records: TastingRecord[], 
    isPremium: boolean = false
  ): Promise<TasteProfileAnalysis> {
    if (!this.checkUsageLimit(isPremium)) {
      throw new Error(`月間利用回数の上限に達しました。${isPremium ? 'プレミアム' : '無料'}プランの利用回数: ${isPremium ? '100' : '10'}回`)
    }

    if (records.length === 0) {
      throw new Error('分析するテイスティング記録がありません')
    }

    const recordsSummary = records.slice(0, 20).map(record => ({
      wineName: record.wineName,
      type: record.type,
      country: record.country,
      rating: record.rating,
      grapes: record.grapes,
      detailedAnalysis: record.detailedAnalysis
    }))

    const prompt = `
以下のワインテイスティング記録を分析し、ユーザーの味覚プロフィールを分析してください。

テイスティング記録:
${JSON.stringify(recordsSummary, null, 2)}

以下の形式のJSONで回答してください:
{
  "summary": "ユーザーの味覚の傾向についての3-4文の要約",
  "preferredTypes": ["好みのワインタイプの配列（最大5つ）"],
  "flavorProfile": {
    "sweetness": 0-10の数値,
    "acidity": 0-10の数値,
    "tannins": 0-10の数値,
    "body": 0-10の数値
  },
  "recommendations": ["おすすめワインや産地の配列（最大5つ）"],
  "insights": ["興味深い発見や傾向の配列（最大3つ）"]
}
`

    try {
      const response = await this.makeRequest(prompt)
      const analysis = JSON.parse(response)
      
      // バリデーション
      if (!analysis.summary || !analysis.preferredTypes || !analysis.flavorProfile) {
        throw new Error('Invalid analysis format')
      }

      return analysis as TasteProfileAnalysis
    } catch (error) {
      console.error('Failed to analyze taste profile:', error)
      throw new Error('味覚プロフィール分析に失敗しました')
    }
  }

  /**
   * パーソナライズドクイズ生成
   */
  async generatePersonalizedQuiz(
    records: TastingRecord[],
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    isPremium: boolean = false
  ): Promise<PersonalizedQuiz> {
    if (!this.checkUsageLimit(isPremium)) {
      throw new Error(`月間利用回数の上限に達しました。${isPremium ? 'プレミアム' : '無料'}プランの利用回数: ${isPremium ? '100' : '10'}回`)
    }

    const userPreferences = this.extractUserPreferences(records)
    
    const prompt = `
ユーザーのワインテイスティング記録に基づいて、パーソナライズされたクイズを5問作成してください。

ユーザーの好み: ${JSON.stringify(userPreferences)}
難易度: ${difficulty}

以下の形式のJSONで回答してください:
{
  "questions": [
    {
      "id": "unique_id",
      "question": "質問文",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "correctAnswer": 正解のインデックス番号,
      "explanation": "解説文",
      "difficulty": "${difficulty}"
    }
  ],
  "difficulty": "${difficulty}",
  "theme": "クイズのテーマ名"
}

注意:
- 質問はユーザーの好みに関連した内容にしてください
- ${difficulty}レベルに適した難易度にしてください
- 選択肢は4つ用意してください
- 解説は簡潔で教育的な内容にしてください
`

    try {
      const response = await this.makeRequest(prompt)
      const quiz = JSON.parse(response)
      
      // バリデーション
      if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length !== 5) {
        throw new Error('Invalid quiz format')
      }

      return quiz as PersonalizedQuiz
    } catch (error) {
      console.error('Failed to generate personalized quiz:', error)
      throw new Error('パーソナライズドクイズの生成に失敗しました')
    }
  }

  /**
   * ワイン推薦システム
   */
  async recommendWines(
    records: TastingRecord[],
    occasion: string = '',
    budget: string = '',
    isPremium: boolean = false
  ): Promise<WineRecommendation[]> {
    if (!this.checkUsageLimit(isPremium)) {
      throw new Error(`月間利用回数の上限に達しました。${isPremium ? 'プレミアム' : '無料'}プランの利用回数: ${isPremium ? '100' : '10'}回`)
    }

    const userPreferences = this.extractUserPreferences(records)
    
    const prompt = `
ユーザーのワインテイスティング記録に基づいて、おすすめのワインを5本推薦してください。

ユーザーの好み: ${JSON.stringify(userPreferences)}
シーン: ${occasion || '特に指定なし'}
予算: ${budget || '特に指定なし'}

以下の形式のJSONで回答してください:
{
  "recommendations": [
    {
      "wineName": "ワイン名",
      "producer": "生産者名",
      "vintage": 年代(数値、わからない場合はnull),
      "country": "国名",
      "region": "地域名",
      "grapes": ["ブドウ品種の配列"],
      "priceRange": "価格帯",
      "reason": "推薦理由",
      "confidence": 0-1の信頼度
    }
  ]
}

注意:
- 実在するワインを推薦してください
- ユーザーの好みに合わせた推薦理由を説明してください
- 価格帯は具体的な範囲で示してください
`

    try {
      const response = await this.makeRequest(prompt)
      const result = JSON.parse(response)
      
      if (!result.recommendations || !Array.isArray(result.recommendations)) {
        throw new Error('Invalid recommendations format')
      }

      return result.recommendations as WineRecommendation[]
    } catch (error) {
      console.error('Failed to recommend wines:', error)
      throw new Error('ワイン推薦の生成に失敗しました')
    }
  }

  /**
   * ユーザー好みの抽出
   */
  private extractUserPreferences(records: TastingRecord[]) {
    const recentRecords = records.slice(0, 10)
    
    const preferences = {
      favoriteTypes: this.getMostFrequent(recentRecords.map(r => r.type)),
      favoriteCountries: this.getMostFrequent(recentRecords.map(r => r.country).filter((c): c is string => Boolean(c))),
      favoriteGrapes: this.getMostFrequent(recentRecords.flatMap(r => r.grapes?.filter(g => g) || [])),
      averageRating: recentRecords.reduce((sum, r) => sum + r.rating, 0) / recentRecords.length,
      priceRange: this.getTypicalPriceRange(recentRecords),
      tastingNotes: recentRecords.map(r => r.notes).filter(Boolean).slice(0, 5)
    }

    return preferences
  }

  /**
   * 最頻出要素の取得
   */
  private getMostFrequent(items: string[]): string[] {
    const frequency: Record<string, number> = {}
    
    items.forEach(item => {
      if (item) {
        frequency[item] = (frequency[item] || 0) + 1
      }
    })

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([item]) => item)
  }

  /**
   * 典型的な価格帯の取得
   */
  private getTypicalPriceRange(records: TastingRecord[]): string {
    const prices = records
      .map(r => r.price)
      .filter((p): p is number => p != null && p > 0)

    if (prices.length === 0) return '不明'

    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
    
    if (avgPrice < 2000) return '〜2,000円'
    if (avgPrice < 5000) return '2,000〜5,000円'
    if (avgPrice < 10000) return '5,000〜10,000円'
    return '10,000円〜'
  }

  /**
   * 使用回数の取得
   */
  getUsageCount(): number {
    return this.requestCount
  }

  /**
   * 使用回数のリセット（管理者用）
   */
  resetUsageCount(): void {
    this.requestCount = 0
    this.lastResetTime = Date.now()
  }
}

// シングルトンインスタンスをエクスポート
export const llmService = LLMService.getInstance()