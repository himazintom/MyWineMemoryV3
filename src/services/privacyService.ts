import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore'
import firebaseService from './firebase'

// プライバシー設定の型定義
export interface PrivacySettings {
  recordsPublic: boolean
  showPrices: boolean
  showPersonalNotes: boolean
  allowDataSharing: boolean
  showProfile: boolean
  showStatistics: boolean
  showCollection: boolean
}

// GDPR エクスポート用データ型
export interface UserDataExport {
  userProfile: any
  tastingRecords: any[]
  preferences: any
  privacySettings: PrivacySettings
  statisticsData: any
  exportDate: Date
  format: 'json' | 'csv'
}

// データ削除オプション
export interface DataDeletionOptions {
  deleteTastingRecords: boolean
  deleteProfile: boolean
  deletePreferences: boolean
  deleteStatistics: boolean
  anonymizeData: boolean // 匿名化オプション
}

class PrivacyService {
  private readonly PRIVACY_COLLECTION = 'userPrivacy'
  private readonly EXPORT_COLLECTION = 'dataExports'

  /**
   * ユーザーのプライバシー設定を取得
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      const docSnap = await getDocs(query(collection(firebaseService.getFirestore(), this.PRIVACY_COLLECTION), where('__name__', '==', userId)))
      
      if (docSnap.empty) {
        // デフォルト設定を返す
        return this.getDefaultPrivacySettings()
      }

      const data = docSnap.docs[0].data()
      return {
        recordsPublic: data.recordsPublic ?? false,
        showPrices: data.showPrices ?? false,
        showPersonalNotes: data.showPersonalNotes ?? false,
        allowDataSharing: data.allowDataSharing ?? false,
        showProfile: data.showProfile ?? true,
        showStatistics: data.showStatistics ?? true,
        showCollection: data.showCollection ?? true
      }
    } catch (error) {
      console.error('Failed to get privacy settings:', error)
      return this.getDefaultPrivacySettings()
    }
  }

  /**
   * プライバシー設定を更新
   */
  async updatePrivacySettings(userId: string, settings: PrivacySettings): Promise<void> {
    try {
      const privacyDoc = doc(firebaseService.getFirestore(), this.PRIVACY_COLLECTION, userId)
      
      await setDoc(privacyDoc, {
        ...settings,
        updatedAt: new Date(),
        userId
      }, { merge: true })

      console.log('Privacy settings updated successfully')
    } catch (error) {
      console.error('Failed to update privacy settings:', error)
      throw new Error('プライバシー設定の更新に失敗しました')
    }
  }

  /**
   * ユーザーデータの完全エクスポート（GDPR対応）
   */
  async exportUserData(userId: string, format: 'json' | 'csv' = 'json'): Promise<UserDataExport> {
    try {
      console.log(`Starting data export for user ${userId} in ${format} format`)

      // 1. ユーザープロフィール取得
      const userProfile = await this.exportUserProfile(userId)

      // 2. テイスティング記録取得
      const tastingRecords = await this.exportTastingRecords(userId)

      // 3. ユーザー設定取得
      const preferences = await this.exportUserPreferences(userId)

      // 4. プライバシー設定取得
      const privacySettings = await this.getPrivacySettings(userId)

      // 5. 統計データ取得
      const statisticsData = await this.exportStatisticsData(userId)

      const exportData: UserDataExport = {
        userProfile,
        tastingRecords,
        preferences,
        privacySettings,
        statisticsData,
        exportDate: new Date(),
        format
      }

      // エクスポート記録を保存
      await this.saveExportRecord(userId, exportData)

      console.log('Data export completed successfully')
      return exportData
    } catch (error) {
      console.error('Failed to export user data:', error)
      throw new Error('データエクスポートに失敗しました')
    }
  }

  /**
   * ユーザーデータの削除（GDPR 忘れられる権利）
   */
  async deleteUserData(userId: string, options: DataDeletionOptions): Promise<void> {
    try {
      console.log(`Starting data deletion for user ${userId}`, options)

      const deletionPromises: Promise<void>[] = []

      if (options.deleteTastingRecords) {
        deletionPromises.push(this.deleteTastingRecords(userId, options.anonymizeData))
      }

      if (options.deleteProfile) {
        deletionPromises.push(this.deleteUserProfile(userId, options.anonymizeData))
      }

      if (options.deletePreferences) {
        deletionPromises.push(this.deleteUserPreferences(userId))
      }

      if (options.deleteStatistics) {
        deletionPromises.push(this.deleteStatisticsData(userId))
      }

      // プライバシー設定も削除
      deletionPromises.push(this.deletePrivacySettings(userId))

      await Promise.all(deletionPromises)

      // 削除記録を保存（監査用）
      await this.saveDeletionRecord(userId, options)

      console.log('Data deletion completed successfully')
    } catch (error) {
      console.error('Failed to delete user data:', error)
      throw new Error('データ削除に失敗しました')
    }
  }

  /**
   * データの匿名化処理
   */
  async anonymizeUserData(userId: string): Promise<void> {
    try {
      console.log(`Starting data anonymization for user ${userId}`)

      // 1. 個人識別情報を削除・匿名化
      const anonymizedId = this.generateAnonymousId()
      
      // 2. テイスティング記録の匿名化
      await this.anonymizeTastingRecords(userId, anonymizedId)

      // 3. プロフィール情報の匿名化
      await this.anonymizeUserProfile(userId, anonymizedId)

      console.log('Data anonymization completed successfully')
    } catch (error) {
      console.error('Failed to anonymize user data:', error)
      throw new Error('データ匿名化に失敗しました')
    }
  }

  /**
   * データポータビリティ（他サービスへの移行準備）
   */
  async prepareDataPortability(userId: string): Promise<{
    standardFormat: any
    wineAppFormat: any
    csvFormat: string
  }> {
    try {
      const exportData = await this.exportUserData(userId, 'json')

      // 標準的なフォーマット（JSON）
      const standardFormat = this.convertToStandardFormat(exportData)

      // ワインアプリ共通フォーマット
      const wineAppFormat = this.convertToWineAppFormat(exportData)

      // CSV フォーマット
      const csvFormat = this.convertToCSV(exportData)

      return {
        standardFormat,
        wineAppFormat,
        csvFormat
      }
    } catch (error) {
      console.error('Failed to prepare data portability:', error)
      throw new Error('データポータビリティの準備に失敗しました')
    }
  }

  // ===============================
  // プライベートメソッド
  // ===============================

  private getDefaultPrivacySettings(): PrivacySettings {
    return {
      recordsPublic: false,
      showPrices: false,
      showPersonalNotes: false,
      allowDataSharing: false,
      showProfile: true,
      showStatistics: true,
      showCollection: true
    }
  }

  private async exportUserProfile(userId: string): Promise<any> {
    const docSnap = await getDocs(query(collection(firebaseService.getFirestore(), 'users'), where('__name__', '==', userId)))
    
    return docSnap.empty ? null : docSnap.docs[0].data()
  }

  private async exportTastingRecords(userId: string): Promise<any[]> {
    const recordsQuery = query(
      collection(firebaseService.getFirestore(), 'tastingRecords'),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(recordsQuery)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }

  private async exportUserPreferences(userId: string): Promise<any> {
    const docSnap = await getDocs(query(collection(firebaseService.getFirestore(), 'userPreferences'), where('__name__', '==', userId)))
    
    return docSnap.empty ? null : docSnap.docs[0].data()
  }

  private async exportStatisticsData(userId: string): Promise<any> {
    // 統計データの取得（キャッシュされたデータ）
    const docSnap = await getDocs(query(collection(firebaseService.getFirestore(), 'userStatistics'), where('__name__', '==', userId)))
    
    return docSnap.empty ? null : docSnap.docs[0].data()
  }

  private async saveExportRecord(userId: string, exportData: UserDataExport): Promise<void> {
    const exportRecord = {
      userId,
      exportDate: exportData.exportDate,
      format: exportData.format,
      recordCount: exportData.tastingRecords.length,
      dataSize: JSON.stringify(exportData).length
    }

    const exportDoc = doc(collection(firebaseService.getFirestore(), this.EXPORT_COLLECTION))
    await setDoc(exportDoc, exportRecord)
  }

  private async deleteTastingRecords(userId: string, anonymize: boolean): Promise<void> {
    const recordsQuery = query(
      collection(firebaseService.getFirestore(), 'tastingRecords'),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(recordsQuery)
    const deletePromises = querySnapshot.docs.map(docSnap => {
      if (anonymize) {
        // 匿名化（ユーザーIDを削除、個人情報を除去）
        return updateDoc(docSnap.ref, {
          userId: 'anonymous',
          personalNotes: '[削除済み]',
          location: '[削除済み]',
          companions: '[削除済み]'
        })
      } else {
        // 完全削除
        return deleteDoc(docSnap.ref)
      }
    })

    await Promise.all(deletePromises)
  }

  private async deleteUserProfile(userId: string, anonymize: boolean): Promise<void> {
    const profileDoc = doc(firebaseService.getFirestore(), 'users', userId)
    
    if (anonymize) {
      await updateDoc(profileDoc, {
        name: '[匿名ユーザー]',
        email: '[削除済み]',
        avatar: null,
        personalInfo: null
      })
    } else {
      await deleteDoc(profileDoc)
    }
  }

  private async deleteUserPreferences(userId: string): Promise<void> {
    const preferencesDoc = doc(firebaseService.getFirestore(), 'userPreferences', userId)
    await deleteDoc(preferencesDoc)
  }

  private async deleteStatisticsData(userId: string): Promise<void> {
    const statsDoc = doc(firebaseService.getFirestore(), 'userStatistics', userId)
    await deleteDoc(statsDoc)
  }

  private async deletePrivacySettings(userId: string): Promise<void> {
    const privacyDoc = doc(firebaseService.getFirestore(), this.PRIVACY_COLLECTION, userId)
    await deleteDoc(privacyDoc)
  }

  private async saveDeletionRecord(userId: string, options: DataDeletionOptions): Promise<void> {
    const deletionRecord = {
      userId,
      deletionDate: new Date(),
      options,
      requestType: 'user_initiated'
    }

    const deletionDoc = doc(collection(firebaseService.getFirestore(), 'dataDeletions'))
    await setDoc(deletionDoc, deletionRecord)
  }

  private generateAnonymousId(): string {
    return 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
  }

  private async anonymizeTastingRecords(userId: string, anonymousId: string): Promise<void> {
    const recordsQuery = query(
      collection(firebaseService.getFirestore(), 'tastingRecords'),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(recordsQuery)
    const updatePromises = querySnapshot.docs.map(docSnap => 
      updateDoc(docSnap.ref, {
        userId: anonymousId,
        personalNotes: '[匿名化済み]',
        location: '[匿名化済み]',
        companions: '[匿名化済み]'
      })
    )

    await Promise.all(updatePromises)
  }

  private async anonymizeUserProfile(userId: string, anonymousId: string): Promise<void> {
    const profileDoc = doc(firebaseService.getFirestore(), 'users', userId)
    await updateDoc(profileDoc, {
      id: anonymousId,
      name: '[匿名ユーザー]',
      email: '[匿名化済み]',
      avatar: null,
      personalInfo: null
    })
  }

  private convertToStandardFormat(exportData: UserDataExport): any {
    return {
      version: '1.0',
      standard: 'GDPR_DATA_EXPORT',
      user: exportData.userProfile,
      data: {
        tastingRecords: exportData.tastingRecords,
        preferences: exportData.preferences,
        privacy: exportData.privacySettings,
        statistics: exportData.statisticsData
      },
      metadata: {
        exportDate: exportData.exportDate,
        recordCount: exportData.tastingRecords.length,
        format: exportData.format
      }
    }
  }

  private convertToWineAppFormat(exportData: UserDataExport): any {
    return {
      format: 'WineApp_Standard_v1',
      user: {
        profile: exportData.userProfile,
        preferences: exportData.preferences
      },
      wines: exportData.tastingRecords.map(record => ({
        name: record.wineName,
        producer: record.producer,
        vintage: record.vintage,
        region: record.region,
        country: record.country,
        type: record.type,
        rating: record.rating,
        tastingDate: record.tastingDate,
        notes: record.notes,
        price: record.price
      })),
      statistics: exportData.statisticsData,
      exportInfo: {
        date: exportData.exportDate,
        source: 'MyWineMemory'
      }
    }
  }

  private convertToCSV(exportData: UserDataExport): string {
    const headers = [
      'tastingDate', 'wineName', 'producer', 'vintage', 'region', 
      'country', 'type', 'rating', 'price', 'notes'
    ]

    const csvRows = [
      headers.join(','),
      ...exportData.tastingRecords.map(record => [
        record.tastingDate?.toISOString().split('T')[0] || '',
        `"${record.wineName || ''}"`,
        `"${record.producer || ''}"`,
        record.vintage || '',
        `"${record.region || ''}"`,
        `"${record.country || ''}"`,
        `"${record.type || ''}"`,
        record.rating || '',
        record.price || '',
        `"${(record.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ]

    return csvRows.join('\n')
  }
}

export default new PrivacyService()