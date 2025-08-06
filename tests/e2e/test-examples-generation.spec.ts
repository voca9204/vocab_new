import { test, expect } from '@playwright/test'

test.describe('Examples Generation Fix', () => {
  test('should generate examples without timeout cancellation', async ({ page }) => {
    // Collect console logs
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
      if (text.includes('[WordDetailModal]')) {
        console.log('Browser log:', text)
      }
    })

    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@test.com')
    await page.fill('input[type="password"]', 'test123456')
    await page.click('button[type="submit"]')
    
    // Wait for navigation
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Go to flashcards
    await page.goto('http://localhost:3000/study/flashcards-v2')
    await page.waitForSelector('h2', { timeout: 10000 })
    
    // Get current word
    const currentWord = await page.locator('h2').first().textContent()
    console.log('Testing with word:', currentWord)
    
    // Clear logs before opening modal
    consoleLogs.length = 0
    
    // Open word detail modal
    await page.click('button[title="상세 정보 보기"]')
    await page.waitForSelector('[data-testid="word-detail-modal"]', { timeout: 5000 })
    
    // Wait for API calls to be set up
    await page.waitForTimeout(2000)
    
    // Analyze logs
    const setupLog = consoleLogs.find(log => log.includes('Setting up API calls'))
    const timeoutExecutedLog = consoleLogs.find(log => log.includes('Timeout executed'))
    const willGenerateLog = consoleLogs.find(log => log.includes('Will generate examples'))
    const cleanupLog = consoleLogs.find(log => log.includes('Cleanup: clearing timeout'))
    const callingGenerateLog = consoleLogs.find(log => log.includes('Calling onGenerateExamples'))
    
    console.log('\n=== Log Analysis ===')
    console.log('Setup API calls:', !!setupLog)
    console.log('Timeout executed:', !!timeoutExecutedLog)
    console.log('Will generate examples:', !!willGenerateLog)
    console.log('Calling onGenerateExamples:', !!callingGenerateLog)
    console.log('Cleanup called:', !!cleanupLog)
    
    // The fix should ensure timeout executes before cleanup
    expect(timeoutExecutedLog, 'Timeout should execute').toBeTruthy()
    
    // Check if examples generation started
    if (willGenerateLog) {
      expect(callingGenerateLog, 'onGenerateExamples should be called').toBeTruthy()
      
      // Wait for examples to appear or loading message
      const examplesLoading = page.locator('text=AI가 예문을 생성하고 있습니다...')
      const examplesSection = page.locator('.bg-green-50 >> text=예문')
      
      // Either loading message or examples should appear
      await expect(examplesLoading.or(examplesSection)).toBeVisible({ timeout: 10000 })
      
      console.log('✅ Examples generation started successfully')
      
      // Wait a bit more to see if examples actually load
      await page.waitForTimeout(5000)
      
      // Check final state
      const hasExamples = await page.locator('.bg-green-50 .text-green-700').count()
      console.log('Final examples count:', hasExamples)
      
      // Take screenshot for verification
      await page.screenshot({ 
        path: 'tests/screenshots/examples-generation-fixed.png',
        fullPage: true 
      })
    }
  })
})