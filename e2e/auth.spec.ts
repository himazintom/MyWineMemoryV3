import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login form when not authenticated', async ({ page }) => {
    // ログイン画面が表示されることを確認
    await expect(page.locator('h1')).toContainText(['ログイン', 'Login'])
    
    // ログインフォームの要素が存在することを確認
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for invalid email', async ({ page }) => {
    // 無効なメールアドレスを入力
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // バリデーションエラーが表示されることを確認
    await expect(page.locator('.error-message, .input-error')).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    // 空のフィールドで送信
    await page.click('button[type="submit"]')
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('.error-message, .input-error')).toBeVisible()
  })

  test('should navigate to signup page', async ({ page }) => {
    // サインアップリンクをクリック
    await page.click('text=アカウント作成, text=Sign Up, text=新規登録')
    
    // サインアップページに遷移することを確認
    await expect(page.url()).toContain('/signup')
    await expect(page.locator('h1')).toContainText(['アカウント作成', 'Sign Up', '新規登録'])
  })

  test('should navigate to password reset page', async ({ page }) => {
    // パスワードリセットリンクをクリック
    await page.click('text=パスワードを忘れた, text=Forgot Password, text=パスワードリセット')
    
    // パスワードリセットページまたはモーダルが表示されることを確認
    await expect(page.locator('h1, h2, .modal-title')).toContainText([
      'パスワードリセット', 
      'Password Reset', 
      'パスワードを忘れた'
    ])
  })

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]')
    const toggleButton = page.locator('[data-testid="password-toggle"], .password-toggle, button:has-text("👁"), button:has-text("👁️")')
    
    if (await toggleButton.isVisible()) {
      // パスワードが非表示であることを確認
      await expect(passwordInput).toHaveAttribute('type', 'password')
      
      // トグルボタンをクリック
      await toggleButton.click()
      
      // パスワードが表示されることを確認
      await expect(passwordInput).toHaveAttribute('type', 'text')
      
      // 再度クリックして非表示に戻す
      await toggleButton.click()
      await expect(passwordInput).toHaveAttribute('type', 'password')
    }
  })

  test('should handle loading state during authentication', async ({ page }) => {
    // テスト用の有効なメールアドレスとパスワードを入力
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    
    // 送信ボタンをクリック
    await page.click('button[type="submit"]')
    
    // ローディング状態が表示されることを確認
    await expect(page.locator('.loading, .spinner, [data-testid="loading"]')).toBeVisible({ timeout: 2000 })
  })

  test('should remember me checkbox work correctly', async ({ page }) => {
    const rememberCheckbox = page.locator('input[type="checkbox"]')
    
    if (await rememberCheckbox.isVisible()) {
      // 初期状態は未チェック
      await expect(rememberCheckbox).not.toBeChecked()
      
      // チェックボックスをクリック
      await rememberCheckbox.click()
      await expect(rememberCheckbox).toBeChecked()
      
      // 再度クリックして未チェックに戻す
      await rememberCheckbox.click()
      await expect(rememberCheckbox).not.toBeChecked()
    }
  })

  test('should display social login options', async ({ page }) => {
    // ソーシャルログインボタンが表示されることを確認
    const socialButtons = page.locator('button:has-text("Google"), button:has-text("GitHub"), button:has-text("Twitter"), .social-login button')
    
    const buttonCount = await socialButtons.count()
    if (buttonCount > 0) {
      for (let i = 0; i < buttonCount; i++) {
        await expect(socialButtons.nth(i)).toBeVisible()
      }
    }
  })

  test('should handle network errors gracefully', async ({ page, context }) => {
    // ネットワークを無効化
    await context.setOffline(true)
    
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('.error-message, .network-error, [data-testid="error"]')).toBeVisible({ timeout: 10000 })
    
    // ネットワークを復旧
    await context.setOffline(false)
  })

  test('should redirect authenticated users from login page', async ({ page, context }) => {
    // ローカルストレージにダミーの認証情報を設定
    await context.addInitScript(() => {
      localStorage.setItem('auth_token', 'dummy_token')
      localStorage.setItem('user_id', 'dummy_user_id')
    })
    
    await page.goto('/login')
    
    // ダッシュボードまたはホームページにリダイレクトされることを確認
    await page.waitForTimeout(2000)
    await expect(page.url()).not.toContain('/login')
  })
})