import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'
import { Radar, Bar, Line, Doughnut } from 'react-chartjs-2'
import type { TastingRecord } from '../../types'

// Chart.js コンポーネントを登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

interface TastingAnalysisChartsProps {
  record: TastingRecord
  className?: string
}

export default function TastingAnalysisCharts({ record, className = '' }: TastingAnalysisChartsProps) {
  const analysis = record.detailedAnalysis

  // 成分バランスレーダーチャートのデータ
  const balanceRadarData = useMemo(() => {
    if (!analysis?.taste) return null

    const taste = analysis.taste
    return {
      labels: ['甘味', '酸味', 'タンニン', 'アルコール', 'ボディ'],
      datasets: [
        {
          label: record.wineName,
          data: [
            taste.sweetness || 0,
            taste.acidity || 0,
            taste.tannin || 0,
            taste.alcohol || 0,
            taste.body || 0
          ],
          backgroundColor: 'rgba(114, 47, 55, 0.2)',
          borderColor: 'rgba(114, 47, 55, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(114, 47, 55, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(114, 47, 55, 1)'
        }
      ]
    }
  }, [analysis?.taste, record.wineName])

  // 香りカテゴリー棒グラフのデータ
  const aromaBarData = useMemo(() => {
    if (!analysis?.aroma?.categories) return null

    const categories = analysis.aroma.categories
    const data = [
      { label: 'フルーツ', count: categories.fruits?.length || 0 },
      { label: 'フローラル', count: categories.florals?.length || 0 },
      { label: 'スパイス', count: categories.spices?.length || 0 },
      { label: 'アーシー', count: categories.earthy?.length || 0 },
      { label: 'オーキー', count: categories.oaky?.length || 0 },
      { label: 'その他', count: categories.other?.length || 0 }
    ].filter(item => item.count > 0)

    if (data.length === 0) return null

    return {
      labels: data.map(item => item.label),
      datasets: [
        {
          label: '香り要素の数',
          data: data.map(item => item.count),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 205, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1
        }
      ]
    }
  }, [analysis?.aroma?.categories])

  // 味わいの展開線グラフのデータ
  const tasteEvolutionData = useMemo(() => {
    if (!analysis?.taste) return null

    const taste = analysis.taste
    const phases = [
      { label: 'アタック', value: getPhaseIntensity(taste.attack) },
      { label: '発展', value: getPhaseIntensity(taste.development) },
      { label: 'フィニッシュ', value: taste.length || 0 }
    ]

    return {
      labels: phases.map(phase => phase.label),
      datasets: [
        {
          label: '味わいの強さ',
          data: phases.map(phase => phase.value),
          borderColor: 'rgba(114, 47, 55, 1)',
          backgroundColor: 'rgba(114, 47, 55, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(114, 47, 55, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6
        }
      ]
    }
  }, [analysis?.taste])

  // 外観特性ドーナツチャートのデータ
  const appearanceDoughnutData = useMemo(() => {
    if (!analysis?.appearance) return null

    const appearance = analysis.appearance
    const data = [
      { label: '透明度', value: appearance.transparency || 0 },
      { label: '濃度', value: typeof appearance.intensity === 'number' ? appearance.intensity : 0 },
      { label: '粘性', value: appearance.viscosity || 0 }
    ].filter(item => item.value > 0)

    if (data.length === 0) return null

    return {
      labels: data.map(item => item.label),
      datasets: [
        {
          data: data.map(item => item.value),
          backgroundColor: [
            'rgba(114, 47, 55, 0.8)',
            'rgba(180, 70, 85, 0.8)',
            'rgba(220, 130, 140, 0.8)'
          ],
          borderColor: [
            'rgba(114, 47, 55, 1)',
            'rgba(180, 70, 85, 1)',
            'rgba(220, 130, 140, 1)'
          ],
          borderWidth: 2
        }
      ]
    }
  }, [analysis?.appearance])

  // チャートオプション
  const radarOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '成分バランス'
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        ticks: {
          stepSize: 2
        }
      }
    }
  }

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: '香りカテゴリー分析'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  }

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: '味わいの展開'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        ticks: {
          stepSize: 2
        }
      }
    }
  }

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: '外観特性'
      }
    }
  }

  // 詳細分析データがない場合
  if (!analysis) {
    return (
      <div className={`tasting-analysis-charts ${className}`}>
        <div className="no-analysis-message">
          <p>詳細分析データがありません</p>
          <small>詳細モードでテイスティング記録を作成すると、グラフが表示されます</small>
        </div>
      </div>
    )
  }

  return (
    <div className={`tasting-analysis-charts ${className}`}>
      <div className="charts-grid">
        {/* 成分バランスレーダーチャート */}
        {balanceRadarData && (
          <div className="chart-container">
            <Radar data={balanceRadarData} options={radarOptions} />
          </div>
        )}

        {/* 香りカテゴリー棒グラフ */}
        {aromaBarData && (
          <div className="chart-container">
            <Bar data={aromaBarData} options={barOptions} />
          </div>
        )}

        {/* 味わいの展開線グラフ */}
        {tasteEvolutionData && (
          <div className="chart-container">
            <Line data={tasteEvolutionData} options={lineOptions} />
          </div>
        )}

        {/* 外観特性ドーナツチャート */}
        {appearanceDoughnutData && (
          <div className="chart-container">
            <Doughnut data={appearanceDoughnutData} options={doughnutOptions} />
          </div>
        )}
      </div>

      {/* 分析サマリー */}
      <div className="analysis-summary">
        <h3>分析サマリー</h3>
        <div className="summary-stats">
          {analysis.aroma?.intensity && (
            <div className="stat-item">
              <span className="stat-label">香りの強度</span>
              <span className="stat-value">{analysis.aroma.intensity}/10</span>
            </div>
          )}
          {analysis.aroma?.complexity && (
            <div className="stat-item">
              <span className="stat-label">香りの複雑さ</span>
              <span className="stat-value">{analysis.aroma.complexity}/10</span>
            </div>
          )}
          {analysis.taste?.balance && (
            <div className="stat-item">
              <span className="stat-label">味わいのバランス</span>
              <span className="stat-value">{analysis.taste.balance}/10</span>
            </div>
          )}
          {analysis.taste?.complexity && (
            <div className="stat-item">
              <span className="stat-label">味わいの複雑さ</span>
              <span className="stat-value">{analysis.taste.complexity}/10</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 味わいのフェーズから強度を数値化するヘルパー関数
function getPhaseIntensity(phase?: string): number {
  if (!phase) return 0
  
  const intensity = phase.toLowerCase()
  
  // 強度キーワードによる判定
  if (intensity.includes('強い') || intensity.includes('強烈') || intensity.includes('パワフル')) return 9
  if (intensity.includes('しっかり') || intensity.includes('豊か') || intensity.includes('濃い')) return 7
  if (intensity.includes('中程度') || intensity.includes('適度') || intensity.includes('バランス')) return 5
  if (intensity.includes('軽い') || intensity.includes('繊細') || intensity.includes('控えめ')) return 3
  if (intensity.includes('弱い') || intensity.includes('薄い') || intensity.includes('ライト')) return 1
  
  // デフォルト値
  return 5
}