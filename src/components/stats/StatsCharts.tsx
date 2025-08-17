import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import type { ChartOptions } from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

// Chart.js の必要な要素を登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface StatsChartsProps {
  monthlyRecords: Array<{ month: string; count: number }>
  favoriteCountries: Array<{ country: string; count: number }>
  favoriteTypes: Array<{ type: string; count: number }>
  ratingDistribution: Array<{ range: string; count: number }>
  recentActivity: Array<{ date: string; count: number }>
}

export default function StatsCharts({
  monthlyRecords,
  favoriteCountries,
  favoriteTypes,
  ratingDistribution,
  recentActivity
}: StatsChartsProps) {
  
  // 共通のChart.jsオプション
  const commonOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          }
        }
      }
    }
  }

  // 月別記録数チャートデータ
  const monthlyChartData = {
    labels: monthlyRecords.map(item => {
      const [year, month] = item.month.split('-')
      return `${year}/${month}`
    }),
    datasets: [
      {
        label: '記録数',
        data: monthlyRecords.map(item => item.count),
        borderColor: '#722F37',
        backgroundColor: 'rgba(114, 47, 55, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }
    ]
  }

  // 国別分布チャートデータ（上位5カ国）
  const countryChartData = {
    labels: favoriteCountries.slice(0, 5).map(item => item.country),
    datasets: [
      {
        data: favoriteCountries.slice(0, 5).map(item => item.count),
        backgroundColor: [
          '#722F37',
          '#A64D4D',
          '#D4737A',
          '#E8A5AA',
          '#F2C2C7'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  }

  // ワインタイプ別チャートデータ
  const typeLabels: Record<string, string> = {
    red: '赤ワイン',
    white: '白ワイン',
    rose: 'ロゼワイン',
    sparkling: 'スパークリング',
    fortified: '酒精強化',
    dessert: 'デザートワイン'
  }

  const typeChartData = {
    labels: favoriteTypes.map(item => typeLabels[item.type] || item.type),
    datasets: [
      {
        label: '記録数',
        data: favoriteTypes.map(item => item.count),
        backgroundColor: [
          '#722F37',
          '#A64D4D',
          '#D4737A',
          '#E8A5AA',
          '#F2C2C7',
          '#C8A2A8'
        ],
        borderColor: 'rgba(114, 47, 55, 0.8)',
        borderWidth: 1
      }
    ]
  }

  // 評価分布チャートデータ
  const ratingChartData = {
    labels: ratingDistribution.map(item => item.range),
    datasets: [
      {
        label: '記録数',
        data: ratingDistribution.map(item => item.count),
        backgroundColor: 'rgba(114, 47, 55, 0.6)',
        borderColor: '#722F37',
        borderWidth: 1
      }
    ]
  }

  // 最近のアクティビティチャートデータ（過去30日）
  const activityChartData = {
    labels: recentActivity.slice(-14).map(item => {
      const date = new Date(item.date)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }),
    datasets: [
      {
        label: '記録数',
        data: recentActivity.slice(-14).map(item => item.count),
        borderColor: '#722F37',
        backgroundColor: 'rgba(114, 47, 55, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }
    ]
  }

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = context.parsed
            const total = context.dataset.data.reduce((sum: number, val: any) => sum + val, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${value}件 (${percentage}%)`
          }
        }
      }
    }
  }

  return (
    <div className="stats-charts">
      <div className="charts-grid">
        {/* 月別記録数 - 線グラフ */}
        <div className="chart-container">
          <h3>月別記録数の推移</h3>
          <div className="chart-wrapper">
            <Line data={monthlyChartData} options={commonOptions} />
          </div>
        </div>

        {/* 国別分布 - ドーナツチャート */}
        <div className="chart-container">
          <h3>お気に入りの国（上位5位）</h3>
          <div className="chart-wrapper">
            <Doughnut data={countryChartData} options={doughnutOptions} />
          </div>
        </div>

        {/* ワインタイプ別 - 棒グラフ */}
        <div className="chart-container">
          <h3>ワインタイプ別記録数</h3>
          <div className="chart-wrapper">
            <Bar data={typeChartData} options={commonOptions} />
          </div>
        </div>

        {/* 評価分布 - 棒グラフ */}
        <div className="chart-container">
          <h3>評価分布</h3>
          <div className="chart-wrapper">
            <Bar data={ratingChartData} options={commonOptions} />
          </div>
        </div>

        {/* 最近のアクティビティ - 線グラフ */}
        <div className="chart-container chart-full-width">
          <h3>最近のアクティビティ（過去2週間）</h3>
          <div className="chart-wrapper">
            <Line data={activityChartData} options={commonOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}