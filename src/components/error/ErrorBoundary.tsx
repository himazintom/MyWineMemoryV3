import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import * as Sentry from '@sentry/react'
import sentryService from '../../services/sentryService'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Sentryにエラーを送信
    sentryService.captureError(error, {
      component: 'ErrorBoundary',
      errorBoundary: true,
      componentStack: errorInfo.componentStack
    })

    // ブレッドクラムを追加
    sentryService.addBreadcrumb(
      'Error caught by ErrorBoundary',
      'error',
      'error',
      {
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack
      }
    )

    this.setState({
      error,
      errorInfo
    })

    // カスタムエラーハンドラを呼び出し
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleReportIssue = () => {
    // GitHubのIssue作成ページを開く
    const issueUrl = `https://github.com/your-username/MyWineMemoryV3/issues/new?template=bug_report.md&title=Error%20Report&body=${encodeURIComponent(
      `## エラー詳細\n\n**エラーメッセージ:** ${this.state.error?.message}\n\n**スタックトレース:**\n\`\`\`\n${this.state.error?.stack}\n\`\`\`\n\n**発生時刻:** ${new Date().toISOString()}\n\n**ブラウザ:** ${navigator.userAgent}`
    )}`
    
    window.open(issueUrl, '_blank')
  }

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIが提供されている場合
      if (this.props.fallback) {
        return this.props.fallback
      }

      // デフォルトのエラーUI
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-icon">
              <span>⚠️</span>
            </div>
            
            <div className="error-content">
              <h1>申し訳ございません</h1>
              <p className="error-description">
                予期しないエラーが発生しました。この問題は自動的に報告されており、
                開発チームが修正に取り組んでいます。
              </p>

              <div className="error-details">
                <details>
                  <summary>エラー詳細を表示</summary>
                  <div className="error-detail-content">
                    <h3>エラーメッセージ:</h3>
                    <pre>{this.state.error?.message}</pre>
                    
                    <h3>スタックトレース:</h3>
                    <pre className="stack-trace">{this.state.error?.stack}</pre>
                    
                    {this.state.errorInfo && (
                      <>
                        <h3>コンポーネントスタック:</h3>
                        <pre className="component-stack">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </>
                    )}
                  </div>
                </details>
              </div>

              <div className="error-actions">
                <button
                  onClick={this.handleReload}
                  className="btn btn-primary"
                >
                  ページを再読み込み
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="btn btn-secondary"
                >
                  ホームに戻る
                </button>
                
                <button
                  onClick={this.handleReportIssue}
                  className="btn btn-outline"
                >
                  問題を報告
                </button>
              </div>

              <div className="error-help">
                <p>
                  <strong>問題が解決しない場合:</strong>
                </p>
                <ul>
                  <li>ブラウザのキャッシュをクリアしてください</li>
                  <li>別のブラウザで試してください</li>
                  <li>しばらく時間をおいてから再度お試しください</li>
                  <li>それでも問題が続く場合は、上記の「問題を報告」ボタンをクリックしてください</li>
                </ul>
              </div>
            </div>
          </div>

          <style jsx>{`
            .error-boundary {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--background);
              padding: 2rem;
            }

            .error-container {
              max-width: 600px;
              width: 100%;
              background: var(--surface);
              border-radius: 1rem;
              padding: 3rem;
              text-align: center;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
              border: 1px solid var(--border);
            }

            .error-icon {
              font-size: 4rem;
              margin-bottom: 1.5rem;
            }

            .error-content h1 {
              color: var(--text-primary);
              font-size: 2rem;
              margin-bottom: 1rem;
              font-weight: 600;
            }

            .error-description {
              color: var(--text-secondary);
              font-size: 1.125rem;
              line-height: 1.6;
              margin-bottom: 2rem;
            }

            .error-details {
              margin: 2rem 0;
              text-align: left;
            }

            .error-details summary {
              cursor: pointer;
              color: var(--primary);
              font-weight: 500;
              margin-bottom: 1rem;
              user-select: none;
            }

            .error-details summary:hover {
              color: var(--primary-dark);
            }

            .error-detail-content {
              background: var(--background);
              border-radius: 0.5rem;
              padding: 1.5rem;
              border: 1px solid var(--border);
              margin-top: 1rem;
            }

            .error-detail-content h3 {
              color: var(--text-primary);
              font-size: 0.875rem;
              font-weight: 600;
              margin: 1rem 0 0.5rem 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .error-detail-content h3:first-child {
              margin-top: 0;
            }

            .error-detail-content pre {
              background: var(--code-background, #f5f5f5);
              border-radius: 0.25rem;
              padding: 0.75rem;
              font-family: 'Monaco', 'Menlo', monospace;
              font-size: 0.75rem;
              color: var(--code-text, #333);
              white-space: pre-wrap;
              word-break: break-word;
              margin: 0;
              border: 1px solid var(--border);
            }

            .stack-trace,
            .component-stack {
              max-height: 200px;
              overflow-y: auto;
            }

            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              flex-wrap: wrap;
              margin-bottom: 2rem;
            }

            .btn {
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
              text-decoration: none;
              border: none;
              font-size: 0.875rem;
            }

            .btn-primary {
              background: var(--primary);
              color: white;
            }

            .btn-primary:hover {
              background: var(--primary-dark);
              transform: translateY(-1px);
            }

            .btn-secondary {
              background: var(--border);
              color: var(--text-primary);
            }

            .btn-secondary:hover {
              background: var(--border-hover, #d1d5db);
              transform: translateY(-1px);
            }

            .btn-outline {
              background: transparent;
              color: var(--primary);
              border: 1px solid var(--primary);
            }

            .btn-outline:hover {
              background: var(--primary);
              color: white;
              transform: translateY(-1px);
            }

            .error-help {
              text-align: left;
              background: var(--info-light, #f0f9ff);
              border-radius: 0.5rem;
              padding: 1.5rem;
              border: 1px solid var(--info, #3b82f6);
            }

            .error-help p {
              margin: 0 0 1rem 0;
              color: var(--info-dark, #1e40af);
              font-weight: 600;
            }

            .error-help ul {
              margin: 0;
              padding-left: 1.5rem;
              color: var(--text-secondary);
            }

            .error-help li {
              margin-bottom: 0.5rem;
              line-height: 1.5;
            }

            @media (max-width: 768px) {
              .error-boundary {
                padding: 1rem;
              }

              .error-container {
                padding: 2rem;
              }

              .error-content h1 {
                font-size: 1.5rem;
              }

              .error-actions {
                flex-direction: column;
              }

              .btn {
                width: 100%;
              }
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}

// SentryのHOCでラップしたバージョンも提供
export const SentryErrorBoundary = Sentry.withErrorBoundary(ErrorBoundary, {
  fallback: ({ error, resetError }) => (
    <div>
      <h2>Something went wrong</h2>
      <details style={{ whiteSpace: 'pre-wrap' }}>
        {error?.toString()}
      </details>
      <button onClick={resetError}>Try again</button>
    </div>
  ),
})

export default ErrorBoundary