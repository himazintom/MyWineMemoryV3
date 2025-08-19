import React, { useState, useEffect } from 'react'
import { analyticsService, KPIMetrics } from '../services/analyticsService'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './common/LoadingSpinner'
import ErrorMessage from './common/ErrorMessage'
import { Line, Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface UserAnalytics {
  totalActivities: number
  sessionCount: number
  averageSessionDuration: number
  mostUsedFeatures: Array<{ feature: string; count: number }>
  activityTimeline: Array<{ date: string; activities: number }>
}

const AnalyticsDashboard: React.FC = () => {
  const { currentUser, userProfile } = useAuth()
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null)
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<30 | 7 | 1>(30)

  useEffect(() => {
    loadAnalytics()
  }, [currentUser, selectedPeriod])

  const loadAnalytics = async () => {
    if (!currentUser) return

    setLoading(true)
    setError(null)

    try {
      // 管理者の場合はKPI全体を表示
      if (userProfile?.isAdmin) {
        const kpis = await analyticsService.calculateKPIs()
        setKpiMetrics(kpis)
      }

      // ユーザー個別分析を取得
      const userStats = await analyticsService.getUserAnalytics(currentUser.uid, selectedPeriod)
      setUserAnalytics(userStats)
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('分析データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error} />
      </div>
    )
  }

  const formatChartData = () => {
    if (!userAnalytics) return null

    // アクティビティタイムライン
    const timelineData = {
      labels: userAnalytics.activityTimeline.map(item => 
        new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: 'アクティビティ数',
          data: userAnalytics.activityTimeline.map(item => item.activities),
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          tension: 0.1,
          fill: true,
        },
      ],
    }

    // 機能使用頻度
    const featureData = {
      labels: userAnalytics.mostUsedFeatures.map(item => item.feature),
      datasets: [
        {
          label: '使用回数',
          data: userAnalytics.mostUsedFeatures.map(item => item.count),
          backgroundColor: [
            'rgba(147, 51, 234, 0.8)',
            'rgba(99, 102, 241, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(14, 165, 233, 0.8)',
            'rgba(6, 182, 212, 0.8)',
          ],
        },
      ],
    }

    return { timelineData, featureData }
  }

  const chartData = formatChartData()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            📊 分析ダッシュボード
          </h1>
          
          {/* 期間選択 */}
          <div className="flex space-x-4 mb-6">
            {[1, 7, 30].map(days => (
              <button
                key={days}
                onClick={() => setSelectedPeriod(days as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPeriod === days
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {days === 1 ? '今日' : days === 7 ? '7日間' : '30日間'}
              </button>
            ))}
          </div>
        </div>

        {/* KPI全体表示（管理者のみ） */}
        {userProfile?.isAdmin && kpiMetrics && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📈 KPI概要</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">DAU</h3>
                <p className="text-3xl font-bold text-purple-600">{kpiMetrics.dau}</p>
                <p className="text-sm text-gray-500">デイリーアクティブユーザー</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">MAU</h3>
                <p className="text-3xl font-bold text-blue-600">{kpiMetrics.mau}</p>
                <p className="text-sm text-gray-500">マンスリーアクティブユーザー</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">総記録数</h3>
                <p className="text-3xl font-bold text-green-600">{kpiMetrics.totalRecords}</p>
                <p className="text-sm text-gray-500">ワインテイスティング記録</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">リテンション率</h3>
                <p className="text-3xl font-bold text-orange-600">{kpiMetrics.retentionRate7d}%</p>
                <p className="text-sm text-gray-500">7日間リテンション</p>
              </div>
            </div>

            {/* 人気ワインタイプ */}
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">🍷 人気ワインタイプ</h3>
              <div className="space-y-3">
                {kpiMetrics.popularWineTypes.slice(0, 5).map((wine, index) => (
                  <div key={wine.type} className="flex items-center justify-between">
                    <span className="font-medium">#{index + 1} {wine.type}</span>
                    <span className="text-purple-600 font-bold">{wine.count}件</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ユーザー個別分析 */}
        {userAnalytics && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 あなたの利用状況</h2>
            
            {/* 統計サマリー */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">総アクティビティ</h3>
                <p className="text-3xl font-bold text-purple-600">{userAnalytics.totalActivities}</p>
                <p className="text-sm text-gray-500">過去{selectedPeriod}日間</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">セッション数</h3>
                <p className="text-3xl font-bold text-blue-600">{userAnalytics.sessionCount}</p>
                <p className="text-sm text-gray-500">アプリ利用回数</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">平均利用時間</h3>
                <p className="text-3xl font-bold text-green-600">{userAnalytics.averageSessionDuration}</p>
                <p className="text-sm text-gray-500">分/セッション</p>
              </div>
            </div>

            {/* チャート */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* アクティビティタイムライン */}
              {chartData?.timelineData && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">📈 アクティビティ推移</h3>
                  <Line 
                    data={chartData.timelineData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1,
                          },
                        },
                      },
                    }}
                  />
                </div>
              )}

              {/* 機能使用頻度 */}
              {chartData?.featureData && userAnalytics.mostUsedFeatures.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">🎯 よく使う機能</h3>
                  <Bar 
                    data={chartData.featureData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1,
                          },
                        },
                      },
                    }}
                  />
                </div>
              )}
            </div>

            {/* 機能使用ランキング */}
            {userAnalytics.mostUsedFeatures.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🏆 機能使用ランキング</h3>
                <div className="space-y-3">
                  {userAnalytics.mostUsedFeatures.map((feature, index) => (
                    <div key={feature.feature} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                        </span>
                        <span className="font-medium">{feature.feature}</span>
                      </div>
                      <span className="text-purple-600 font-bold">{feature.count}回</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* アクションアイテム */}
        <div className="bg-white p-6 rounded-lg shadow mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">💡 おすすめアクション</h3>
          <div className="space-y-3">
            {userAnalytics && userAnalytics.sessionCount < 5 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">
                  📱 毎日の記録で習慣化！定期的にワインの記録をつけて、味覚の成長を追跡しましょう。
                </p>
              </div>
            )}
            
            {userAnalytics && userAnalytics.averageSessionDuration < 5 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">
                  🎯 クイズ機能を活用！知識向上のためにワインクイズにもチャレンジしてみましょう。
                </p>
              </div>
            )}
            
            {userAnalytics && userAnalytics.mostUsedFeatures.length < 3 && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-purple-800">
                  ✨ 新機能を試そう！統計機能やAI分析など、まだ使っていない機能を探してみましょう。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard