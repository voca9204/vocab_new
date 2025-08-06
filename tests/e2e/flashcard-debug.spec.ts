import { test, expect } from '@playwright/test'

test.describe('Flashcard Word Modal Debug', () => {
  test('debug word modal data and UI', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('Browser console:', msg.text())
      }
    })

    // Go directly to login page
    await page.goto('http://localhost:3000/login')
    
    // Login with test admin
    await page.fill('input[type="email"]', 'admin@test.com')
    await page.fill('input[type="password"]', 'test123456')
    await page.click('button[type="submit"]')
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    console.log('✓ Logged in successfully')
    
    // Navigate to flashcards
    await page.goto('http://localhost:3000/study/flashcards-v2')
    await page.waitForSelector('[data-testid="flashcard"]', { timeout: 10000 })
    console.log('✓ Flashcards page loaded')
    
    // Get the current word
    const wordElement = await page.locator('h2').first()
    const currentWord = await wordElement.textContent()
    console.log('Current flashcard word:', currentWord)
    
    // Click info button to open modal
    await page.click('button[title="상세 정보 보기"]')
    await page.waitForSelector('[data-testid="word-detail-modal"]', { timeout: 5000 })
    console.log('✓ Word detail modal opened')
    
    // Check modal content
    const modalWord = await page.locator('[data-testid="word-detail-modal"] h2').textContent()
    console.log('Modal word:', modalWord)
    
    // Check for English definition (파란 박스)
    const hasEnglishDef = await page.locator('.bg-blue-50').count()
    console.log('English definition sections found:', hasEnglishDef)
    if (hasEnglishDef > 0) {
      const englishDef = await page.locator('.bg-blue-50 .text-blue-700').textContent()
      console.log('English definition:', englishDef)
    }
    
    // Check for etymology (보라 박스 - click to expand)
    const etymologyButton = await page.locator('text=어원').count()
    console.log('Etymology button found:', etymologyButton)
    if (etymologyButton > 0) {
      await page.click('text=어원')
      await page.waitForTimeout(500)
      const etymologyVisible = await page.locator('.text-purple-700').isVisible()
      if (etymologyVisible) {
        const etymology = await page.locator('.text-purple-700').textContent()
        console.log('Etymology content:', etymology)
      } else {
        console.log('Etymology: No content or still loading')
      }
    }
    
    // Check for synonyms
    const synonymsLoading = await page.locator('text=유사어를 불러오는 중...').isVisible()
    if (synonymsLoading) {
      console.log('Synonyms: Still loading...')
      // Wait for synonyms to load
      await page.waitForSelector('.bg-green-50.text-green-700', { timeout: 10000 }).catch(() => {
        console.log('Synonyms: Failed to load within 10 seconds')
      })
    }
    
    const synonymCount = await page.locator('.bg-green-50.text-green-700').count()
    console.log('Synonyms found:', synonymCount)
    if (synonymCount > 0) {
      const synonyms = await page.locator('.bg-green-50.text-green-700').allTextContents()
      console.log('Synonym list:', synonyms)
    }
    
    // Check for examples
    const examplesSection = await page.locator('.bg-green-50 >> text=예문').count()
    console.log('Examples section found:', examplesSection)
    
    const exampleGenerating = await page.locator('text=AI가 예문을 생성하고 있습니다...').isVisible()
    if (exampleGenerating) {
      console.log('Examples: AI is generating...')
      // Wait up to 30 seconds for examples
      await page.waitForSelector('.text-green-700', { timeout: 30000 }).catch(() => {
        console.log('Examples: Failed to generate within 30 seconds')
      })
    }
    
    const exampleCount = await page.locator('.bg-green-50 .text-green-700').count()
    console.log('Examples found:', exampleCount)
    if (exampleCount > 0) {
      const examples = await page.locator('.bg-green-50 .text-green-700').allTextContents()
      console.log('Example list:', examples.slice(0, 2)) // First 2 examples
    }
    
    // Take screenshots
    await page.screenshot({ 
      path: 'tests/screenshots/word-modal-full.png', 
      fullPage: true 
    })
    
    await page.locator('[data-testid="word-detail-modal"]').screenshot({ 
      path: 'tests/screenshots/word-modal-only.png' 
    })
    
    console.log('✓ Screenshots saved to tests/screenshots/')
    
    // Log any errors
    const errors = await page.locator('.text-red-600').allTextContents()
    if (errors.length > 0) {
      console.log('Errors found:', errors)
    }
  })
})