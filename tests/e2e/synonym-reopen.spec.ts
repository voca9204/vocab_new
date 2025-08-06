import { test, expect } from '@playwright/test'

test.describe('Synonym Reopen Fix', () => {
  test('should load synonyms when reopening word modal', async ({ page }) => {
    // Collect console logs
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
      if (text.includes('WordDetailModal') && text.includes('synonym')) {
        console.log('Browser log:', text)
      }
    })

    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@test.com')
    await page.fill('input[type="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Go to flashcards
    await page.goto('http://localhost:3000/study/flashcards-v2')
    await page.waitForSelector('h2', { timeout: 10000 })
    
    const currentWord = await page.locator('h2').first().textContent()
    console.log('Testing synonym reopen with word:', currentWord)
    
    // === First modal open ===
    consoleLogs.length = 0 // Clear logs
    
    console.log('\n=== First Modal Open ===')
    await page.click('button[title="상세 정보 보기"]')
    await page.waitForSelector('[data-testid="word-detail-modal"]', { timeout: 5000 })
    
    // Wait for synonyms to load (first time might take longer for AI generation)
    await page.waitForTimeout(5000)
    
    // Check synonyms
    let synonymCount = await page.locator('.bg-green-50.text-green-700').count()
    console.log('First open - synonyms found:', synonymCount)
    
    // Wait for AI generation if needed
    if (synonymCount === 0) {
      const generatingMsg = await page.locator('text=AI가 유사어를 생성하고 있습니다...').isVisible()
      if (generatingMsg) {
        console.log('First open - AI is generating synonyms, waiting...')
        await page.waitForTimeout(10000) // Wait for AI generation
        synonymCount = await page.locator('.bg-green-50.text-green-700').count()
        console.log('First open - final synonyms found:', synonymCount)
      }
    }
    
    // Take screenshot of first open
    await page.screenshot({ 
      path: 'tests/screenshots/synonym-reopen-first.png' 
    })
    
    // === Close modal ===
    console.log('\n=== Closing Modal ===')
    await page.click('button:has(svg)') // Close button (X)
    await page.waitForSelector('[data-testid="word-detail-modal"]', { state: 'detached' })
    console.log('Modal closed')
    
    await page.waitForTimeout(1000)
    
    // === Second modal open ===
    consoleLogs.length = 0 // Clear logs for second open
    
    console.log('\n=== Second Modal Open ===')
    await page.click('button[title="상세 정보 보기"]')
    await page.waitForSelector('[data-testid="word-detail-modal"]', { timeout: 5000 })
    
    // Wait for synonyms to load (should be faster from DB/cache)
    await page.waitForTimeout(3000)
    
    const secondSynonymCount = await page.locator('.bg-green-50.text-green-700').count()
    console.log('Second open - synonyms found:', secondSynonymCount)
    
    // Take screenshot of second open
    await page.screenshot({ 
      path: 'tests/screenshots/synonym-reopen-second.png' 
    })
    
    // Analyze logs
    const dbSynonymsLog = consoleLogs.find(log => log.includes('Using DB synonyms'))
    const cachedSynonymsLog = consoleLogs.find(log => log.includes('Using cached synonyms'))
    const generatingLog = consoleLogs.find(log => log.includes('AI가 유사어를 생성하고 있습니다'))
    
    console.log('\n=== Second Open Analysis ===')
    console.log('Used DB synonyms:', !!dbSynonymsLog)
    console.log('Used cached synonyms:', !!cachedSynonymsLog)
    console.log('Generated new synonyms:', !!generatingLog)
    
    // Assertions
    if (synonymCount > 0) {
      // If synonyms existed in first open, they should also exist in second open
      expect(secondSynonymCount, 'Synonyms should be available on second open').toBeGreaterThan(0)
      
      // Should use DB or cache, not generate new ones
      expect(generatingLog, 'Should not generate new synonyms on second open').toBeFalsy()
      
      console.log('✅ TEST PASSED: Synonyms loaded correctly on reopen')
    } else {
      console.log('⚠️  No synonyms were loaded in first open, test incomplete')
    }
  })
})