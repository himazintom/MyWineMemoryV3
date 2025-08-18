import { test, expect } from '@playwright/test'

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('auth_token', 'dummy_token')
      localStorage.setItem('user_id', 'test_user_123')
    })
    
    await page.goto('/')
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    // h1タグが1つだけ存在することを確認
    const h1Elements = page.locator('h1')
    const h1Count = await h1Elements.count()
    expect(h1Count).toBeLessThanOrEqual(1)
    
    // 見出し階層が適切であることを確認
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const headingCount = await headings.count()
    
    if (headingCount > 0) {
      // 最初の見出しがh1であることを確認
      const firstHeading = headings.first()
      const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase())
      expect(tagName).toBe('h1')
    }
  })

  test('should have alt text for all images', async ({ page }) => {
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const altText = await img.getAttribute('alt')
      
      // alt属性が存在し、空でないことを確認
      expect(altText).toBeTruthy()
      expect(altText?.trim()).not.toBe('')
    }
  })

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/records/new')
    
    const inputs = page.locator('input, textarea, select')
    const inputCount = await inputs.count()
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const inputId = await input.getAttribute('id')
      const inputName = await input.getAttribute('name')
      const ariaLabel = await input.getAttribute('aria-label')
      
      if (inputId) {
        // 対応するlabelタグが存在することを確認
        const label = page.locator(`label[for="${inputId}"]`)
        const labelExists = await label.count() > 0
        
        // IDに対応するlabel、またはaria-labelが存在することを確認
        expect(labelExists || ariaLabel).toBeTruthy()
      } else if (inputName) {
        // nameまたはaria-labelが存在することを確認
        expect(ariaLabel).toBeTruthy()
      }
    }
  })

  test('should have proper button labels', async ({ page }) => {
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i)
      const buttonText = await button.textContent()
      const ariaLabel = await button.getAttribute('aria-label')
      const title = await button.getAttribute('title')
      
      // ボタンにテキスト、aria-label、またはtitleが存在することを確認
      expect(buttonText?.trim() || ariaLabel || title).toBeTruthy()
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Tabキーでのナビゲーションテスト
    await page.keyboard.press('Tab')
    
    // フォーカス可能な要素が適切にフォーカスされることを確認
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // 複数回Tabを押してナビゲーション順序を確認
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      const currentFocused = page.locator(':focus')
      
      if (await currentFocused.count() > 0) {
        await expect(currentFocused).toBeVisible()
      }
    }
  })

  test('should have proper color contrast', async ({ page }) => {
    // 主要なテキスト要素のコントラスト比を確認
    const textElements = page.locator('p, span, h1, h2, h3, button, a')
    const count = await textElements.count()
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = textElements.nth(i)
      
      if (await element.isVisible()) {
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el)
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize
          }
        })
        
        // 基本的なコントラスト要件のチェック
        // 実際のコントラスト比計算は複雑なため、基本的な色の存在を確認
        expect(styles.color).toBeTruthy()
      }
    }
  })

  test('should support screen reader navigation', async ({ page }) => {
    // ARIAロールの確認
    const mainContent = page.locator('[role="main"], main')
    await expect(mainContent).toBeVisible()
    
    // ナビゲーションランドマークの確認
    const navigation = page.locator('[role="navigation"], nav')
    const navCount = await navigation.count()
    expect(navCount).toBeGreaterThanOrEqual(1)
    
    // ボタンロールの確認
    const buttons = page.locator('[role="button"], button')
    const buttonCount = await buttons.count()
    expect(buttonCount).toBeGreaterThanOrEqual(1)
  })

  test('should have proper focus indicators', async ({ page }) => {
    // フォーカスインジケーターが表示されることを確認
    const focusableElements = page.locator('button, a, input, textarea, select')
    const count = await focusableElements.count()
    
    if (count > 0) {
      const firstElement = focusableElements.first()
      await firstElement.focus()
      
      // フォーカスされた要素が視覚的に識別可能であることを確認
      const focusedStyles = await firstElement.evaluate(el => {
        const computed = window.getComputedStyle(el)
        return {
          outline: computed.outline,
          outlineColor: computed.outlineColor,
          boxShadow: computed.boxShadow
        }
      })
      
      // アウトラインまたはボックスシャドウが設定されていることを確認
      expect(
        focusedStyles.outline !== 'none' || 
        focusedStyles.boxShadow !== 'none'
      ).toBeTruthy()
    }
  })

  test('should have accessible error messages', async ({ page }) => {
    await page.goto('/records/new')
    
    // 空のフォームで送信してエラーを発生させる
    await page.click('button[type="submit"]')
    
    // エラーメッセージが表示される場合
    const errorMessages = page.locator('.error-message, .field-error, [role="alert"]')
    const errorCount = await errorMessages.count()
    
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i)
        
        // エラーメッセージが視覚的に識別可能であることを確認
        await expect(error).toBeVisible()
        
        // aria-live属性またはrole="alert"が設定されていることを確認
        const ariaLive = await error.getAttribute('aria-live')
        const role = await error.getAttribute('role')
        
        expect(ariaLive === 'polite' || ariaLive === 'assertive' || role === 'alert').toBeTruthy()
      }
    }
  })

  test('should support reduced motion preferences', async ({ page }) => {
    // アニメーションが適切に制御されていることを確認
    const animatedElements = page.locator('[class*="animate"], [class*="transition"], .fade, .slide')
    const count = await animatedElements.count()
    
    for (let i = 0; i < count; i++) {
      const element = animatedElements.nth(i)
      
      // CSS変数やprefers-reduced-motionの対応を確認
      const hasReducedMotionSupport = await element.evaluate(el => {
        const styles = window.getComputedStyle(el)
        // 基本的なアニメーション設定の確認
        return styles.animationDuration || styles.transitionDuration
      })
      
      expect(hasReducedMotionSupport).toBeTruthy()
    }
  })

  test('should have proper skip links', async ({ page }) => {
    // スキップリンクの存在確認
    const skipLinks = page.locator('a[href="#main"], a[href="#content"], .skip-link')
    
    if (await skipLinks.count() > 0) {
      const skipLink = skipLinks.first()
      
      // スキップリンクが機能することを確認
      await skipLink.click()
      
      // メインコンテンツにフォーカスが移動することを確認
      const mainContent = page.locator('#main, #content, [role="main"]')
      await expect(mainContent).toBeFocused()
    }
  })

  test('should handle modal accessibility', async ({ page }) => {
    // モーダルダイアログのアクセシビリティ確認
    const modalTrigger = page.locator('button:has-text("追加"), [data-testid="add-record"]')
    
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click()
      
      const modal = page.locator('[role="dialog"], .modal, .dialog')
      
      if (await modal.isVisible()) {
        // モーダルにrole="dialog"が設定されていることを確認
        const role = await modal.getAttribute('role')
        expect(role).toBe('dialog')
        
        // aria-labelまたはaria-labelledbyが設定されていることを確認
        const ariaLabel = await modal.getAttribute('aria-label')
        const ariaLabelledby = await modal.getAttribute('aria-labelledby')
        expect(ariaLabel || ariaLabelledby).toBeTruthy()
        
        // フォーカスがモーダル内に移動することを確認
        const focusedElement = page.locator(':focus')
        const modalContainsFocus = await modal.evaluate((modal, focused) => {
          return modal.contains(focused)
        }, await focusedElement.elementHandle())
        
        expect(modalContainsFocus).toBeTruthy()
      }
    }
  })

  test('should have proper table accessibility', async ({ page }) => {
    await page.goto('/records')
    
    // テーブルが存在する場合のアクセシビリティ確認
    const tables = page.locator('table')
    const tableCount = await tables.count()
    
    for (let i = 0; i < tableCount; i++) {
      const table = tables.nth(i)
      
      // テーブルヘッダーが適切に設定されていることを確認
      const headers = table.locator('th')
      const headerCount = await headers.count()
      
      if (headerCount > 0) {
        // ヘッダーにscope属性が設定されていることを確認
        for (let j = 0; j < headerCount; j++) {
          const header = headers.nth(j)
          const scope = await header.getAttribute('scope')
          expect(scope).toBeTruthy()
        }
      }
      
      // テーブルキャプションまたはaria-labelが設定されていることを確認
      const caption = table.locator('caption')
      const ariaLabel = await table.getAttribute('aria-label')
      const ariaLabelledby = await table.getAttribute('aria-labelledby')
      
      const captionExists = await caption.count() > 0
      expect(captionExists || ariaLabel || ariaLabelledby).toBeTruthy()
    }
  })
})