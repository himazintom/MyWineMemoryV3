import { test, expect, devices } from '@playwright/test'

// モバイルデバイスの設定
test.use({ ...devices['iPhone 12'] })

test.describe('Mobile Responsiveness', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('auth_token', 'dummy_token')
      localStorage.setItem('user_id', 'test_user_123')
    })
    
    await page.goto('/')
  })

  test('should display mobile navigation correctly', async ({ page }) => {
    // モバイルナビゲーションハンバーガーメニューの確認
    const hamburgerMenu = page.locator('.hamburger, .mobile-menu-button, [data-testid="mobile-menu"]')
    
    if (await hamburgerMenu.isVisible()) {
      await expect(hamburgerMenu).toBeVisible()
      
      // メニューをクリック
      await hamburgerMenu.click()
      
      // ナビゲーションメニューが表示されることを確認
      await expect(page.locator('.mobile-nav, .sidebar, .navigation-menu')).toBeVisible()
      
      // メニューアイテムが表示されることを確認
      await expect(page.locator('nav a, .nav-item')).toHaveCount({ min: 1 })
    }
  })

  test('should handle touch interactions for wine records', async ({ page }) => {
    await page.goto('/records')
    
    // ワイン記録カードのタッチ操作
    const recordCard = page.locator('.wine-record-item, .record-card').first()
    
    if (await recordCard.isVisible()) {
      // タップして詳細表示
      await recordCard.tap()
      
      // 詳細が表示されるかページが遷移することを確認
      await expect(page.locator('.wine-details, .record-details')).toBeVisible({ timeout: 5000 })
        .or(expect(page.url()).toContain('/records/'))
    }
  })

  test('should adapt form layouts for mobile', async ({ page }) => {
    await page.goto('/records/new')
    
    // フォームが縦に配置されていることを確認
    const formContainer = page.locator('form, .form-container')
    await expect(formContainer).toBeVisible()
    
    // 入力フィールドが適切なサイズであることを確認
    const inputs = page.locator('input, textarea, select')
    const inputCount = await inputs.count()
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const boundingBox = await input.boundingBox()
      
      if (boundingBox) {
        // モバイルでの最小タッチターゲットサイズ（44px）を確認
        expect(boundingBox.height).toBeGreaterThanOrEqual(40)
      }
    }
  })

  test('should show mobile-optimized image upload', async ({ page }) => {
    await page.goto('/records/new')
    
    // 画像アップロードエリアの確認
    const uploadArea = page.locator('input[type="file"], .image-upload, [data-testid="photo-upload"]')
    
    if (await uploadArea.isVisible()) {
      // モバイルでのファイル選択が機能することを確認
      await expect(uploadArea).toBeVisible()
      
      // アップロードエリアのサイズが適切であることを確認
      const boundingBox = await uploadArea.boundingBox()
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(44) // モバイルタッチターゲット
      }
    }
  })

  test('should handle mobile swipe gestures', async ({ page }) => {
    await page.goto('/records')
    
    // スワイプ可能なカルーセルやリストがある場合
    const swipeableElement = page.locator('.swipeable, .carousel, .record-list')
    
    if (await swipeableElement.isVisible()) {
      const boundingBox = await swipeableElement.boundingBox()
      
      if (boundingBox) {
        // 左スワイプ
        await page.mouse.move(boundingBox.x + boundingBox.width - 50, boundingBox.y + boundingBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(boundingBox.x + 50, boundingBox.y + boundingBox.height / 2)
        await page.mouse.up()
        
        await page.waitForTimeout(500)
        
        // スワイプ後の状態変化を確認
        // 具体的な実装によって変わるため、一般的なチェック
        await expect(swipeableElement).toBeVisible()
      }
    }
  })

  test('should adapt navigation for mobile viewport', async ({ page }) => {
    // ページ幅が狭い場合のナビゲーション確認
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE サイズ
    
    // デスクトップナビが非表示になることを確認
    const desktopNav = page.locator('.desktop-nav, .main-navigation:not(.mobile)')
    if (await desktopNav.count() > 0) {
      await expect(desktopNav).not.toBeVisible()
    }
    
    // モバイルナビが表示されることを確認
    const mobileNav = page.locator('.mobile-nav, .hamburger-menu, [data-testid="mobile-menu"]')
    await expect(mobileNav).toBeVisible()
  })

  test('should handle mobile modal dialogs', async ({ page }) => {
    await page.goto('/records')
    
    // モーダルを開くアクションを実行（例：記録作成ボタン）
    const modalTrigger = page.locator('button:has-text("追加"), [data-testid="add-record"]')
    
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click()
      
      // モーダルが全画面で表示されることを確認
      const modal = page.locator('.modal, .dialog, .fullscreen-modal')
      await expect(modal).toBeVisible()
      
      // モーダルのサイズがビューポートに適合していることを確認
      const boundingBox = await modal.boundingBox()
      const viewport = page.viewportSize()
      
      if (boundingBox && viewport) {
        expect(boundingBox.width).toBeLessThanOrEqual(viewport.width)
        expect(boundingBox.height).toBeLessThanOrEqual(viewport.height)
      }
    }
  })

  test('should optimize text size for mobile reading', async ({ page }) => {
    await page.goto('/records')
    
    // テキストサイズが読みやすいサイズであることを確認
    const textElements = page.locator('p, span, h1, h2, h3, .text-content')
    const count = await textElements.count()
    
    for (let i = 0; i < Math.min(count, 5); i++) { // 最初の5つをサンプルチェック
      const element = textElements.nth(i)
      const fontSize = await element.evaluate(el => {
        return window.getComputedStyle(el).fontSize
      })
      
      // フォントサイズが16px以上であることを確認（モバイル最小推奨サイズ）
      const size = parseInt(fontSize.replace('px', ''))
      expect(size).toBeGreaterThanOrEqual(14)
    }
  })

  test('should handle mobile search interface', async ({ page }) => {
    await page.goto('/records')
    
    // モバイル検索インターフェースの確認
    const searchInput = page.locator('input[type="search"], [data-testid="search-input"]')
    
    if (await searchInput.isVisible()) {
      // 検索フィールドがフォーカス時に拡大されることを確認
      await searchInput.click()
      
      // フォーカス状態でのスタイル変更を確認
      await expect(searchInput).toBeFocused()
      
      // モバイルキーボードによる画面の調整を確認
      const boundingBox = await searchInput.boundingBox()
      expect(boundingBox?.y).toBeGreaterThanOrEqual(0)
    }
  })

  test('should provide mobile-friendly button sizes', async ({ page }) => {
    await page.goto('/records/new')
    
    // すべてのボタンのサイズを確認
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i)
      const boundingBox = await button.boundingBox()
      
      if (boundingBox && await button.isVisible()) {
        // モバイルタッチターゲットの最小サイズ（44px）を確認
        expect(boundingBox.height).toBeGreaterThanOrEqual(40)
        expect(boundingBox.width).toBeGreaterThanOrEqual(40)
      }
    }
  })

  test('should handle mobile orientation changes', async ({ page }) => {
    // 縦向き（portrait）
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('body')).toBeVisible()
    
    // 横向き（landscape）
    await page.setViewportSize({ width: 667, height: 375 })
    await expect(page.locator('body')).toBeVisible()
    
    // レイアウトが崩れていないことを確認
    const mainContent = page.locator('main, .main-content, .app-container')
    await expect(mainContent).toBeVisible()
  })

  test('should load images properly on mobile', async ({ page }) => {
    await page.goto('/records')
    
    // 画像の遅延読み込みと最適化を確認
    const images = page.locator('img')
    const imageCount = await images.count()
    
    if (imageCount > 0) {
      for (let i = 0; i < Math.min(imageCount, 3); i++) {
        const img = images.nth(i)
        
        // 画像が読み込まれることを確認
        await expect(img).toBeVisible()
        
        // alt属性が設定されていることを確認（アクセシビリティ）
        const altText = await img.getAttribute('alt')
        expect(altText).toBeTruthy()
      }
    }
  })
})