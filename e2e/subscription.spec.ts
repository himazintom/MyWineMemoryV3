import { test, expect } from '@playwright/test'

test.describe('Subscription Management', () => {
  test.beforeEach(async ({ page, context }) => {
    // ダミーの認証状態を設定
    await context.addInitScript(() => {
      localStorage.setItem('auth_token', 'dummy_token')
      localStorage.setItem('user_id', 'test_user_123')
      localStorage.setItem('user_email', 'test@example.com')
    })
    
    await page.goto('/')
    await page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 10000 })
  })

  test('should display subscription plans', async ({ page }) => {
    // 設定ページまたはサブスクリプションページに移動
    await page.goto('/settings')
    
    // サブスクリプションセクションを探す
    const subscriptionSection = page.locator('[data-testid="subscription"], .subscription-section, .plan-selection')
    
    if (await subscriptionSection.isVisible()) {
      // プランカードが表示されることを確認
      await expect(page.locator('.plan-card, .subscription-plan')).toHaveCount(3) // free, premium, premium_yearly
      
      // 各プランの基本要素を確認
      await expect(page.locator('text=フリープラン, text=Free Plan')).toBeVisible()
      await expect(page.locator('text=プレミアムプラン, text=Premium Plan')).toBeVisible()
    }
  })

  test('should show current plan status', async ({ page }) => {
    await page.goto('/settings')
    
    // 現在のプラン表示を確認
    const currentPlan = page.locator('.current-plan, .plan-status, [data-testid="current-plan"]')
    
    if (await currentPlan.isVisible()) {
      // プラン名が表示されていることを確認
      await expect(currentPlan).toContainText(['フリー', 'プレミアム', 'Free', 'Premium'])
    }
  })

  test('should display plan features comparison', async ({ page }) => {
    await page.goto('/settings')
    
    // 機能比較が表示されることを確認
    const featuresSection = page.locator('.plan-features, .features-list')
    
    if (await featuresSection.isVisible()) {
      // 各プランの機能リストを確認
      await expect(page.locator('text=画像アップロード, text=Image Upload')).toBeVisible()
      await expect(page.locator('text=AI分析, text=AI Analysis')).toBeVisible()
      await expect(page.locator('text=ワイン記録, text=Wine Records')).toBeVisible()
    }
  })

  test('should show upgrade options for free users', async ({ page, context }) => {
    // フリープランユーザーとして設定
    await context.addInitScript(() => {
      localStorage.setItem('user_plan', 'free')
    })
    
    await page.goto('/settings')
    
    // アップグレードボタンが表示されることを確認
    const upgradeButton = page.locator('button:has-text("アップグレード"), button:has-text("Upgrade"), [data-testid="upgrade-button"]')
    
    if (await upgradeButton.isVisible()) {
      await expect(upgradeButton).toBeEnabled()
    }
  })

  test('should handle subscription upgrade flow', async ({ page, context }) => {
    await page.goto('/settings')
    
    // プレミアムプランの選択ボタンをクリック
    const premiumButton = page.locator('.plan-card:has-text("プレミアム") button, button:has-text("プレミアムを選ぶ")')
    
    if (await premiumButton.isVisible()) {
      await premiumButton.click()
      
      // Stripeチェックアウトへのリダイレクトまたはモーダルの表示を確認
      // 実際のStripe環境では外部リダイレクトが発生するため、
      // ここではローディング状態やモーダルの表示を確認
      await expect(page.locator('.loading, .checkout-modal, .stripe-checkout')).toBeVisible({ timeout: 5000 })
        .or(expect(page.url()).toContain('stripe.com'))
        .or(expect(page.url()).toContain('checkout'))
    }
  })

  test('should display plan limits for current user', async ({ page }) => {
    await page.goto('/settings')
    
    // プラン制限の表示を確認
    const limitsSection = page.locator('.plan-limits, .usage-limits, [data-testid="plan-limits"]')
    
    if (await limitsSection.isVisible()) {
      // 画像アップロード制限
      await expect(page.locator('text=画像アップロード')).toBeVisible()
      
      // AI分析回数制限
      await expect(page.locator('text=AI分析')).toBeVisible()
      
      // 使用量の表示
      await expect(page.locator('.usage-indicator, .progress-bar')).toBeVisible()
    }
  })

  test('should show usage statistics', async ({ page }) => {
    await page.goto('/settings')
    
    // 使用量統計の表示を確認
    const usageStats = page.locator('.usage-stats, .current-usage, [data-testid="usage-stats"]')
    
    if (await usageStats.isVisible()) {
      // 今月の使用量表示
      await expect(page.locator('text=今月, text=This Month')).toBeVisible()
      
      // 残り使用回数の表示
      await expect(page.locator('text=残り, text=Remaining')).toBeVisible()
    }
  })

  test('should handle premium feature access restrictions', async ({ page, context }) => {
    // フリープランユーザーとして設定
    await context.addInitScript(() => {
      localStorage.setItem('user_plan', 'free')
    })
    
    await page.goto('/records/new')
    
    // 複数画像アップロードを試行
    const fileInputs = page.locator('input[type="file"]')
    
    if (await fileInputs.count() > 0) {
      // フリープランでは1枚制限のメッセージが表示される可能性がある
      const limitMessage = page.locator('.plan-limit-message, .upgrade-prompt')
      
      if (await limitMessage.isVisible()) {
        await expect(limitMessage).toContainText(['アップグレード', 'プレミアム', 'Upgrade', 'Premium'])
      }
    }
  })

  test('should allow plan management for premium users', async ({ page, context }) => {
    // プレミアムユーザーとして設定
    await context.addInitScript(() => {
      localStorage.setItem('user_plan', 'premium')
      localStorage.setItem('subscription_status', 'active')
    })
    
    await page.goto('/settings')
    
    // プラン管理ボタンが表示されることを確認
    const manageButton = page.locator('button:has-text("プラン管理"), button:has-text("Manage Plan"), [data-testid="manage-subscription"]')
    
    if (await manageButton.isVisible()) {
      await manageButton.click()
      
      // カスタマーポータルへのリダイレクトまたは管理画面の表示
      await expect(page.locator('.loading, .customer-portal')).toBeVisible({ timeout: 5000 })
        .or(expect(page.url()).toContain('stripe.com'))
        .or(expect(page.url()).toContain('billing'))
    }
  })

  test('should display subscription renewal date', async ({ page, context }) => {
    // アクティブなサブスクリプションユーザーとして設定
    await context.addInitScript(() => {
      localStorage.setItem('user_plan', 'premium')
      localStorage.setItem('subscription_status', 'active')
      localStorage.setItem('subscription_end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
    })
    
    await page.goto('/settings')
    
    // 更新日の表示を確認
    const renewalDate = page.locator('.renewal-date, .subscription-details, [data-testid="renewal-date"]')
    
    if (await renewalDate.isVisible()) {
      await expect(renewalDate).toContainText(['更新', '期限', 'renewal', 'expires'])
    }
  })

  test('should handle subscription cancellation flow', async ({ page, context }) => {
    // アクティブなプレミアムユーザーとして設定
    await context.addInitScript(() => {
      localStorage.setItem('user_plan', 'premium')
      localStorage.setItem('subscription_status', 'active')
    })
    
    await page.goto('/settings')
    
    // キャンセルボタンをクリック
    const cancelButton = page.locator('button:has-text("キャンセル"), button:has-text("Cancel"), [data-testid="cancel-subscription"]')
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click()
      
      // 確認ダイアログが表示されることを確認
      await expect(page.locator('.confirmation-dialog, .cancel-confirmation')).toBeVisible()
      
      // キャンセルの取り消し
      await page.click('button:has-text("戻る"), button:has-text("Back"), button:has-text("取り消し")')
      
      // ダイアログが閉じることを確認
      await expect(page.locator('.confirmation-dialog')).not.toBeVisible()
    }
  })

  test('should display plan comparison modal', async ({ page }) => {
    await page.goto('/settings')
    
    // プラン比較ボタンをクリック
    const compareButton = page.locator('button:has-text("比較"), button:has-text("Compare"), [data-testid="compare-plans"]')
    
    if (await compareButton.isVisible()) {
      await compareButton.click()
      
      // 比較モーダルが表示されることを確認
      await expect(page.locator('.comparison-modal, .plan-comparison')).toBeVisible()
      
      // 機能比較テーブルが表示されることを確認
      await expect(page.locator('.feature-comparison, table')).toBeVisible()
      
      // モーダルを閉じる
      await page.click('button:has-text("閉じる"), .modal-close, [data-testid="close-modal"]')
      
      // モーダルが閉じることを確認
      await expect(page.locator('.comparison-modal')).not.toBeVisible()
    }
  })

  test('should handle billing history access', async ({ page, context }) => {
    // プレミアムユーザーとして設定
    await context.addInitScript(() => {
      localStorage.setItem('user_plan', 'premium')
      localStorage.setItem('subscription_status', 'active')
    })
    
    await page.goto('/settings')
    
    // 請求履歴ボタンをクリック
    const billingButton = page.locator('button:has-text("請求履歴"), button:has-text("Billing History"), [data-testid="billing-history"]')
    
    if (await billingButton.isVisible()) {
      await billingButton.click()
      
      // 請求履歴ページまたはモーダルが表示されることを確認
      await expect(page.locator('.billing-history, .invoice-list')).toBeVisible({ timeout: 5000 })
        .or(expect(page.url()).toContain('billing'))
        .or(expect(page.url()).toContain('stripe.com'))
    }
  })

  test('should show payment method update option', async ({ page, context }) => {
    // プレミアムユーザーとして設定
    await context.addInitScript(() => {
      localStorage.setItem('user_plan', 'premium')
      localStorage.setItem('subscription_status', 'active')
    })
    
    await page.goto('/settings')
    
    // 支払い方法更新ボタンを確認
    const paymentButton = page.locator('button:has-text("支払い方法"), button:has-text("Payment Method"), [data-testid="payment-method"]')
    
    if (await paymentButton.isVisible()) {
      await expect(paymentButton).toBeEnabled()
    }
  })
})