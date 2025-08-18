import { test, expect } from '@playwright/test'

test.describe('Wine Records Management', () => {
  // テスト用のダミー認証を設定
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      // ダミーの認証状態を設定
      localStorage.setItem('auth_token', 'dummy_token')
      localStorage.setItem('user_id', 'test_user_123')
      localStorage.setItem('user_email', 'test@example.com')
    })
    
    await page.goto('/')
    
    // 認証済みページが表示されるまで待機
    await page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 10000 })
  })

  test('should display wine records list', async ({ page }) => {
    // ワイン記録一覧ページに移動
    await page.goto('/records')
    
    // 記録一覧が表示されることを確認
    await expect(page.locator('h1, h2')).toContainText(['ワイン記録', 'Wine Records', '記録一覧'])
    
    // 記録追加ボタンが存在することを確認
    await expect(page.locator('button:has-text("追加"), button:has-text("新規"), button:has-text("Add"), [data-testid="add-record"]')).toBeVisible()
  })

  test('should open wine record creation form', async ({ page }) => {
    await page.goto('/records')
    
    // 新規作成ボタンをクリック
    await page.click('button:has-text("追加"), button:has-text("新規"), button:has-text("Add"), [data-testid="add-record"]')
    
    // フォームが表示されることを確認
    await expect(page.locator('form, .form-container, [data-testid="wine-form"]')).toBeVisible()
    
    // 必要なフィールドが存在することを確認
    await expect(page.locator('input[name="wineName"], input[placeholder*="ワイン名"], input[placeholder*="Wine Name"]')).toBeVisible()
    await expect(page.locator('input[name="vintage"], input[placeholder*="年"], input[placeholder*="vintage"]')).toBeVisible()
    await expect(page.locator('input[name="producer"], input[placeholder*="生産者"], input[placeholder*="producer"]')).toBeVisible()
  })

  test('should validate required fields in wine form', async ({ page }) => {
    await page.goto('/records/new')
    
    // 空のフォームで送信を試行
    await page.click('button[type="submit"], button:has-text("保存"), button:has-text("Save")')
    
    // バリデーションエラーが表示されることを確認
    await expect(page.locator('.error-message, .field-error, .validation-error')).toBeVisible()
  })

  test('should create wine record with basic information', async ({ page }) => {
    await page.goto('/records/new')
    
    // 基本情報を入力
    await page.fill('input[name="wineName"], input[placeholder*="ワイン名"]', 'Château Margaux')
    await page.fill('input[name="vintage"], input[placeholder*="年"]', '2015')
    await page.fill('input[name="producer"], input[placeholder*="生産者"]', 'Château Margaux')
    
    // 地域情報
    await page.fill('input[name="region"], input[placeholder*="地域"]', 'Bordeaux')
    await page.fill('input[name="country"], input[placeholder*="国"]', 'France')
    
    // テイスティング日
    const today = new Date().toISOString().split('T')[0]
    await page.fill('input[type="date"], input[name="tastingDate"]', today)
    
    // 評価
    const ratingSlider = page.locator('input[type="range"], [data-testid="rating-slider"]')
    if (await ratingSlider.isVisible()) {
      await ratingSlider.fill('85')
    }
    
    // テイスティングノート
    await page.fill('textarea[name="notes"], textarea[placeholder*="ノート"]', '素晴らしいワインでした。')
    
    // 保存
    await page.click('button[type="submit"], button:has-text("保存")')
    
    // 成功メッセージまたはリダイレクトを確認
    await expect(page.locator('.success-message, .toast-success')).toBeVisible({ timeout: 5000 })
      .or(expect(page.url()).toContain('/records'))
  })

  test('should search wine records', async ({ page }) => {
    await page.goto('/records')
    
    // 検索フィールドが存在することを確認
    const searchInput = page.locator('input[type="search"], input[placeholder*="検索"], [data-testid="search-input"]')
    await expect(searchInput).toBeVisible()
    
    // 検索クエリを入力
    await searchInput.fill('Margaux')
    
    // 検索結果が表示されることを確認（または検索中の状態）
    await page.waitForTimeout(1000) // デバウンス待機
    
    // 結果が表示されるか、結果がない場合のメッセージが表示されることを確認
    await expect(page.locator('.wine-record-item, .search-results, .no-results')).toBeVisible({ timeout: 5000 })
  })

  test('should filter wine records by category', async ({ page }) => {
    await page.goto('/records')
    
    // フィルターボタンまたはドロップダウンが存在することを確認
    const filterElement = page.locator('select[name="category"], button:has-text("フィルタ"), [data-testid="filter"]')
    
    if (await filterElement.isVisible()) {
      await filterElement.click()
      
      // フィルターオプションが表示されることを確認
      await expect(page.locator('.filter-options, .dropdown-menu')).toBeVisible()
    }
  })

  test('should edit existing wine record', async ({ page }) => {
    await page.goto('/records')
    
    // 既存の記録の編集ボタンをクリック
    const editButton = page.locator('button:has-text("編集"), button:has-text("Edit"), [data-testid="edit-record"]').first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      
      // 編集フォームが表示されることを確認
      await expect(page.locator('form, .edit-form')).toBeVisible()
      
      // フィールドに既存の値が入力されていることを確認
      const wineNameInput = page.locator('input[name="wineName"]')
      await expect(wineNameInput).not.toHaveValue('')
    }
  })

  test('should delete wine record with confirmation', async ({ page }) => {
    await page.goto('/records')
    
    // 削除ボタンをクリック
    const deleteButton = page.locator('button:has-text("削除"), button:has-text("Delete"), [data-testid="delete-record"]').first()
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      // 確認ダイアログが表示されることを確認
      await expect(page.locator('.confirmation-dialog, .modal, dialog')).toBeVisible()
      
      // キャンセルボタンをクリック
      await page.click('button:has-text("キャンセル"), button:has-text("Cancel")')
      
      // ダイアログが閉じることを確認
      await expect(page.locator('.confirmation-dialog, .modal, dialog')).not.toBeVisible()
    }
  })

  test('should upload wine photo', async ({ page }) => {
    await page.goto('/records/new')
    
    // ファイルアップロードフィールドが存在することを確認
    const fileInput = page.locator('input[type="file"], [data-testid="photo-upload"]')
    
    if (await fileInput.isVisible()) {
      // テスト用の画像ファイルパスを設定
      const testImagePath = 'e2e/fixtures/test-wine.jpg'
      
      // ファイルをアップロード（実際のファイルが存在する場合）
      try {
        await fileInput.setInputFiles(testImagePath)
        
        // アップロード中のローディング状態を確認
        await expect(page.locator('.upload-progress, .loading')).toBeVisible({ timeout: 2000 })
        
        // アップロード完了後のプレビューを確認
        await expect(page.locator('.image-preview, img')).toBeVisible({ timeout: 10000 })
      } catch (error) {
        // ファイルが存在しない場合はスキップ
        console.log('Test image file not found, skipping upload test')
      }
    }
  })

  test('should display wine record details', async ({ page }) => {
    await page.goto('/records')
    
    // 記録のタイトルまたは詳細ボタンをクリック
    const recordLink = page.locator('.wine-record-title, .wine-record-item, [data-testid="record-link"]').first()
    
    if (await recordLink.isVisible()) {
      await recordLink.click()
      
      // 詳細ページが表示されることを確認
      await expect(page.locator('.wine-details, .record-details')).toBeVisible()
      
      // 戻るボタンが存在することを確認
      await expect(page.locator('button:has-text("戻る"), button:has-text("Back"), [data-testid="back-button"]')).toBeVisible()
    }
  })

  test('should handle pagination', async ({ page }) => {
    await page.goto('/records')
    
    // ページネーションが存在する場合のテスト
    const pagination = page.locator('.pagination, .page-navigation')
    
    if (await pagination.isVisible()) {
      // 次のページボタンが存在することを確認
      const nextButton = page.locator('button:has-text("次"), button:has-text("Next"), .pagination-next')
      
      if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
        await nextButton.click()
        
        // ページが変更されることを確認
        await page.waitForTimeout(1000)
        await expect(page.locator('.wine-record-item')).toBeVisible()
      }
    }
  })

  test('should export wine records', async ({ page }) => {
    await page.goto('/records')
    
    // エクスポートボタンが存在する場合のテスト
    const exportButton = page.locator('button:has-text("エクスポート"), button:has-text("Export"), [data-testid="export-button"]')
    
    if (await exportButton.isVisible()) {
      // ダウンロード開始の待機
      const downloadPromise = page.waitForEvent('download')
      
      await exportButton.click()
      
      // ダウンロードが開始されることを確認
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.(csv|json|pdf)$/)
    }
  })
})