import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import stripeService from '../services/stripeService'

export interface PlanLimits {
  plan: string
  canUploadImages: boolean
  maxImagesPerRecord: number
  canUseLLM: boolean
  monthlyLLMLimit: number
  hasUnlimitedRecords: boolean
}

export interface Usage {
  llmUsageThisMonth: number
  imagesUploadedToday: number
}

export interface PlanLimitsState {
  limits: PlanLimits | null
  usage: Usage | null
  isLoading: boolean
  error: string | null
  refreshLimits: () => Promise<void>
  checkCanUploadImage: () => boolean
  checkCanUseLLM: () => boolean
  getRemainingLLMUsage: () => number
}

export function usePlanLimits(): PlanLimitsState {
  const { currentUser: user } = useAuth()
  const [limits, setLimits] = useState<PlanLimits | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshLimits = async () => {
    if (!user) {
      setLimits(null)
      setUsage(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const [planLimits, currentUsage] = await Promise.all([
        stripeService.checkPlanLimits(user.uid),
        stripeService.checkUsage(user.uid)
      ])

      setLimits(planLimits)
      setUsage(currentUsage)
    } catch (err) {
      console.error('Failed to fetch plan limits:', err)
      setError('プラン制限の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshLimits()
  }, [user])

  const checkCanUploadImage = (): boolean => {
    if (!limits || !usage) return false
    return limits.canUploadImages
  }

  const checkCanUseLLM = (): boolean => {
    if (!limits || !usage) return false
    if (!limits.canUseLLM) return false
    return usage.llmUsageThisMonth < limits.monthlyLLMLimit
  }

  const getRemainingLLMUsage = (): number => {
    if (!limits || !usage) return 0
    return Math.max(0, limits.monthlyLLMLimit - usage.llmUsageThisMonth)
  }

  return {
    limits,
    usage,
    isLoading,
    error,
    refreshLimits,
    checkCanUploadImage,
    checkCanUseLLM,
    getRemainingLLMUsage
  }
}