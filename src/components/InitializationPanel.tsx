import React, { useState } from 'react'
import { migrationService, type InitializationResult } from '../services/migrationService'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './common/LoadingSpinner'
import ErrorMessage from './common/ErrorMessage'

const InitializationPanel: React.FC = () => {
  const { currentUser, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<InitializationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [integrityCheck, setIntegrityCheck] = useState<any>(null)

  const handleInitializeUser = async () => {
    if (!currentUser) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      await migrationService.initializeUserData(currentUser.uid, {
        email: currentUser.email || '',
        displayName: currentUser.displayName || '',
        photoURL: currentUser.photoURL || ''
      })

      const sampleResult = await migrationService.createSampleData(currentUser.uid)
      setResult(sampleResult)
    } catch (err) {
      console.error('Failed to initialize user:', err)
      setError('ユーザーデータの初期化に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIntegrity = async () => {
    if (!currentUser) return

    setLoading(true)
    setError(null)

    try {
      const integrity = await migrationService.checkDataIntegrity(currentUser.uid)
      setIntegrityCheck(integrity)
    } catch (err) {
      console.error('Failed to check integrity:', err)
      setError('データ整合性チェックに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleRepairData = async () => {
    if (!currentUser) return

    setLoading(true)
    setError(null)

    try {
      const repairResult = await migrationService.repairUserData(currentUser.uid)
      
      if (repairResult.errors.length > 0) {
        setError(repairResult.errors.join(', '))
      } else {
        // 修復後に再チェック
        await handleCheckIntegrity()
      }
    } catch (err) {
      console.error('Failed to repair data:', err)
      setError('データ修復に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">ログインが必要です</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">🔧 データ初期化・管理</h2>

      {loading && (
        <div className="flex justify-center mb-6">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* 初期化ボタン */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📝 ユーザーデータ初期化</h3>
        <p className="text-gray-600 mb-4">
          ユーザープロフィール、クイズ進捗、サンプルテイスティング記録を初期化します。
        </p>
        <button
          onClick={handleInitializeUser}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          初期化実行
        </button>
      </div>

      {/* データ整合性チェック */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">🔍 データ整合性チェック</h3>
        <div className="flex space-x-4 mb-4">
          <button
            onClick={handleCheckIntegrity}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            整合性チェック
          </button>
          
          {integrityCheck && integrityCheck.missingQuizLevels.length > 0 && (
            <button
              onClick={handleRepairData}
              disabled={loading}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              データ修復
            </button>
          )}
        </div>

        {integrityCheck && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">チェック結果</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${integrityCheck.userExists ? 'bg-green-500' : 'bg-red-500'}`}></span>
                ユーザーデータ: {integrityCheck.userExists ? '正常' : '不足'}
              </div>
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${integrityCheck.quizProgressExists ? 'bg-green-500' : 'bg-red-500'}`}></span>
                クイズ進捗: {integrityCheck.quizProgressExists ? '正常' : '不足'}
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full mr-2 bg-blue-500"></span>
                テイスティング記録: {integrityCheck.recordsCount}件
              </div>
              {integrityCheck.missingQuizLevels.length > 0 && (
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2 bg-yellow-500"></span>
                  不足レベル: {integrityCheck.missingQuizLevels.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 初期化結果 */}
      {result && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">✅ 初期化完了</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>ユーザー初期化:</span>
              <span className="font-medium">{result.usersInitialized || 1}件</span>
            </div>
            <div className="flex justify-between">
              <span>クイズデータ初期化:</span>
              <span className="font-medium">{result.quizDataInitialized || 20}レベル</span>
            </div>
            <div className="flex justify-between">
              <span>サンプル記録作成:</span>
              <span className="font-medium">{result.sampleRecordsCreated}件</span>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="font-medium text-red-800 mb-2">エラー:</h4>
                {result.errors.map((error, index) => (
                  <p key={index} className="text-red-700 text-sm">{error}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 管理者向け機能 */}
      {userProfile?.subscription?.plan === 'premium' && (
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">👑 管理者機能</h3>
          <p className="text-gray-600 mb-4">
            全ユーザーのデータ整合性をチェックできます。
          </p>
          <button
            onClick={async () => {
              setLoading(true)
              try {
                const adminCheck = await migrationService.checkAllUsersIntegrity()
                console.log('All users integrity check:', adminCheck)
                alert(`総ユーザー数: ${adminCheck.totalUsers}\n問題のあるユーザー: ${adminCheck.usersWithIssues}`)
              } catch (err) {
                console.error('Failed to check all users:', err)
                setError('全ユーザーチェックに失敗しました')
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            全ユーザー整合性チェック
          </button>
        </div>
      )}
    </div>
  )
}

export default InitializationPanel