import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('auth_token', 'dummy_token')
      localStorage.setItem('user_id', 'test_user_123')
    })
  })

  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    
    // ページの主要コンテンツが表示されるまで待機
    await page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 10000 })
    
    const loadTime = Date.now() - startTime
    
    // ページロード時間が3秒以下であることを確認
    expect(loadTime).toBeLessThan(3000)
    
    console.log(`Homepage load time: ${loadTime}ms`)
  })

  test('should have good Core Web Vitals', async ({ page }) => {
    await page.goto('/')
    
    // Core Web Vitalsを測定
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const vitals: Record<string, number> = {}
          
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.FCP = entry.startTime
            }
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.LCP = entry.startTime
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              vitals.CLS = (vitals.CLS || 0) + entry.value
            }
          })
          
          // タイムアウト後に結果を返す
          setTimeout(() => resolve(vitals), 3000)
        })
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] })
      })
    })
    
    const vitals = metrics as Record<string, number>
    
    // Core Web Vitalsの閾値をチェック
    if (vitals.FCP) {
      expect(vitals.FCP).toBeLessThan(1800) // FCP < 1.8s (Good)
      console.log(`First Contentful Paint: ${vitals.FCP.toFixed(2)}ms`)
    }
    
    if (vitals.LCP) {
      expect(vitals.LCP).toBeLessThan(2500) // LCP < 2.5s (Good)
      console.log(`Largest Contentful Paint: ${vitals.LCP.toFixed(2)}ms`)
    }
    
    if (vitals.CLS !== undefined) {
      expect(vitals.CLS).toBeLessThan(0.1) // CLS < 0.1 (Good)
      console.log(`Cumulative Layout Shift: ${vitals.CLS.toFixed(4)}`)
    }
  })

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/records')
    
    const startTime = Date.now()
    
    // 大量のデータがある場合のレンダリング時間を測定
    await page.waitForSelector('.wine-record-item, .record-card', { timeout: 5000 })
    
    const renderTime = Date.now() - startTime
    
    // レンダリング時間が2秒以下であることを確認
    expect(renderTime).toBeLessThan(2000)
    
    // スクロールパフォーマンステスト
    const scrollStartTime = Date.now()
    
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    
    await page.waitForTimeout(100) // スクロール完了を待機
    
    const scrollTime = Date.now() - scrollStartTime
    expect(scrollTime).toBeLessThan(500) // スクロール時間が500ms以下
    
    console.log(`Data rendering time: ${renderTime}ms, Scroll time: ${scrollTime}ms`)
  })

  test('should load images efficiently', async ({ page }) => {
    await page.goto('/records')
    
    // 画像が存在する場合のロード時間テスト
    const images = page.locator('img')
    const imageCount = await images.count()
    
    if (imageCount > 0) {
      const imageLoadPromises = []
      
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i)
        const imageLoadPromise = img.evaluate((img) => {
          return new Promise((resolve) => {
            if (img.complete) {
              resolve(img.naturalWidth > 0)
            } else {
              img.onload = () => resolve(true)
              img.onerror = () => resolve(false)
            }
          })
        })
        imageLoadPromises.push(imageLoadPromise)
      }
      
      const startTime = Date.now()
      const results = await Promise.all(imageLoadPromises)
      const loadTime = Date.now() - startTime
      
      // 画像ロード時間が3秒以下であることを確認
      expect(loadTime).toBeLessThan(3000)
      
      // 少なくとも一部の画像がロードされていることを確認
      expect(results.some(result => result)).toBeTruthy()
      
      console.log(`Image load time: ${loadTime}ms`)
    }
  })

  test('should handle form submissions efficiently', async ({ page }) => {
    await page.goto('/records/new')
    
    // フォーム入力のパフォーマンステスト
    const startTime = Date.now()
    
    await page.fill('input[name="wineName"], input[placeholder*="ワイン名"]', 'Performance Test Wine')
    await page.fill('input[name="vintage"], input[placeholder*="年"]', '2020')
    await page.fill('input[name="producer"], input[placeholder*="生産者"]', 'Test Producer')
    
    const inputTime = Date.now() - startTime
    
    // フォーム入力時間が1秒以下であることを確認
    expect(inputTime).toBeLessThan(1000)
    
    const submitStartTime = Date.now()
    
    // フォーム送信（実際には送信せず、バリデーションまで）
    await page.click('button[type="submit"]')
    
    // バリデーション結果または次のステップまでの時間を測定
    await page.waitForTimeout(500)
    
    const submitTime = Date.now() - submitStartTime
    expect(submitTime).toBeLessThan(2000)
    
    console.log(`Form input time: ${inputTime}ms, Submit processing time: ${submitTime}ms`)
  })

  test('should handle search efficiently', async ({ page }) => {
    await page.goto('/records')
    
    const searchInput = page.locator('input[type="search"], [data-testid="search-input"]')
    
    if (await searchInput.isVisible()) {
      const startTime = Date.now()
      
      // 検索クエリを入力
      await searchInput.fill('wine search test')
      
      // デバウンス時間を考慮して待機
      await page.waitForTimeout(1000)
      
      // 検索結果の表示時間を測定
      const searchTime = Date.now() - startTime
      
      // 検索時間が2秒以下であることを確認
      expect(searchTime).toBeLessThan(2000)
      
      console.log(`Search response time: ${searchTime}ms`)
    }
  })

  test('should measure JavaScript bundle size impact', async ({ page }) => {
    // ページロード前のメモリ使用量を測定
    const initialMetrics = await page.evaluate(() => {
      return {
        // @ts-ignore
        usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
        // @ts-ignore
        totalJSHeapSize: performance.memory?.totalJSHeapSize || 0
      }
    })
    
    await page.goto('/')
    
    // ページロード後のメモリ使用量を測定
    const finalMetrics = await page.evaluate(() => {
      return {
        // @ts-ignore
        usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
        // @ts-ignore
        totalJSHeapSize: performance.memory?.totalJSHeapSize || 0
      }
    })
    
    const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize
    
    // メモリ増加量が50MB以下であることを確認
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    
    console.log(`Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
  })

  test('should handle network latency gracefully', async ({ page }) => {
    // ネットワーク遅延をシミュレート
    await page.route('**/*', async (route, request) => {
      // 500ms の遅延を追加
      await new Promise(resolve => setTimeout(resolve, 500))
      await route.continue()
    })
    
    const startTime = Date.now()
    await page.goto('/')
    
    // 遅延があってもページが適切にロードされることを確認
    await page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 15000 })
    
    const loadTime = Date.now() - startTime
    
    // ネットワーク遅延を考慮して5秒以下であることを確認
    expect(loadTime).toBeLessThan(5000)
    
    console.log(`Load time with network latency: ${loadTime}ms`)
  })

  test('should maintain performance under load', async ({ page, context }) => {
    // 複数のタブを開いてパフォーマンスをテスト
    const pages = [page]
    
    // 追加で2つのタブを開く
    for (let i = 0; i < 2; i++) {
      const newPage = await context.newPage()
      pages.push(newPage)
    }
    
    // 全タブで同時にページをロード
    const loadPromises = pages.map(async (p, index) => {
      const startTime = Date.now()
      await p.goto('/')
      await p.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 10000 })
      const loadTime = Date.now() - startTime
      console.log(`Tab ${index + 1} load time: ${loadTime}ms`)
      return loadTime
    })
    
    const loadTimes = await Promise.all(loadPromises)
    
    // 全タブのロード時間が5秒以下であることを確認
    loadTimes.forEach(time => {
      expect(time).toBeLessThan(5000)
    })
    
    // 追加タブを閉じる
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close()
    }
  })

  test('should handle offline scenarios gracefully', async ({ page, context }) => {
    await page.goto('/')
    
    // オンライン状態でのベースライン測定
    const onlineStartTime = Date.now()
    await page.reload()
    await page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 10000 })
    const onlineLoadTime = Date.now() - onlineStartTime
    
    // オフライン状態にする
    await context.setOffline(true)
    
    const offlineStartTime = Date.now()
    await page.reload()
    
    // オフライン時のフォールバック表示を確認
    await page.waitForSelector('.offline-message, .error-message, [data-testid="offline"]', { timeout: 5000 })
      .or(page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 5000 })) // PWAキャッシュがある場合
    
    const offlineResponseTime = Date.now() - offlineStartTime
    
    // オフライン時の応答時間が2秒以下であることを確認
    expect(offlineResponseTime).toBeLessThan(2000)
    
    console.log(`Online load time: ${onlineLoadTime}ms, Offline response time: ${offlineResponseTime}ms`)
    
    // オンライン状態に戻す
    await context.setOffline(false)
  })

  test('should optimize resource loading', async ({ page }) => {
    // ネットワーク活動を監視
    const resourceSizes: Record<string, number> = {}
    const resourceTypes: Record<string, number> = {}
    
    page.on('response', async (response) => {
      const url = response.url()
      const contentLength = response.headers()['content-length']
      const resourceType = response.request().resourceType()
      
      if (contentLength) {
        resourceSizes[url] = parseInt(contentLength)
        resourceTypes[resourceType] = (resourceTypes[resourceType] || 0) + parseInt(contentLength)
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // JavaScript バンドルサイズの確認
    const jsSize = resourceTypes['script'] || 0
    expect(jsSize).toBeLessThan(2 * 1024 * 1024) // 2MB以下
    
    // CSS サイズの確認
    const cssSize = resourceTypes['stylesheet'] || 0
    expect(cssSize).toBeLessThan(500 * 1024) // 500KB以下
    
    // 画像サイズの確認
    const imageSize = resourceTypes['image'] || 0
    expect(imageSize).toBeLessThan(5 * 1024 * 1024) // 5MB以下
    
    console.log(`Resource sizes - JS: ${(jsSize / 1024).toFixed(2)}KB, CSS: ${(cssSize / 1024).toFixed(2)}KB, Images: ${(imageSize / 1024).toFixed(2)}KB`)
  })
})