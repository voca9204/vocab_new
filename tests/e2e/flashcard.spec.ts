import { test, expect } from '@playwright/test'

// Use authenticated state
test.use({ storageState: 'tests/.auth/user.json' })

test.describe('Flashcard Word Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to flashcards page
    await page.goto('http://localhost:3000/study/flashcards-v2')
    
    // Wait for flashcards to load
    await page.waitForSelector('[data-testid="flashcard"]', { timeout: 10000 })
  })

  test('should open word detail modal and show all information', async ({ page }) => {
    // Click on the info button to open word detail modal
    await page.click('button[title="상세 정보 보기"]')
    
    // Wait for modal to open
    await page.waitForSelector('[data-testid="word-detail-modal"]', { timeout: 5000 })
    
    // Check if word title is visible
    const wordTitle = await page.textContent('h2')
    expect(wordTitle).toBeTruthy()
    
    // Check for synonyms section
    const synonymsSection = await page.locator('text=유사어').isVisible()
    expect(synonymsSection).toBe(true)
    
    // Check for etymology section (click to expand)
    await page.click('text=어원')
    await page.waitForTimeout(500) // Wait for animation
    
    // Check for examples section
    const examplesSection = await page.locator('text=예문').isVisible()
    console.log('Examples section visible:', examplesSection)
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/word-modal.png', fullPage: true })
  })

  test('should generate examples if not available', async ({ page }) => {
    // Click on the info button
    await page.click('button[title="상세 정보 보기"]')
    
    // Wait for modal
    await page.waitForSelector('[data-testid="word-detail-modal"]', { timeout: 5000 })
    
    // Check if "AI가 예문을 생성하고 있습니다..." appears
    const generatingText = await page.locator('text=AI가 예문을 생성하고 있습니다...').isVisible()
    
    if (generatingText) {
      console.log('AI is generating examples...')
      // Wait for examples to be generated (max 30 seconds)
      await page.waitForSelector('.text-green-700', { timeout: 30000 })
    }
    
    // Check if examples are now visible
    const examples = await page.locator('.text-green-700').count()
    expect(examples).toBeGreaterThan(0)
  })

  test('should show synonyms and allow clicking them', async ({ page }) => {
    // Click info button
    await page.click('button[title="상세 정보 보기"]')
    
    // Wait for modal
    await page.waitForSelector('[data-testid="word-detail-modal"]', { timeout: 5000 })
    
    // Wait for synonyms to load
    await page.waitForSelector('.bg-green-50.text-green-700', { timeout: 10000 })
    
    // Count synonyms
    const synonymCount = await page.locator('.bg-green-50.text-green-700').count()
    expect(synonymCount).toBeGreaterThan(0)
    
    // Click on first synonym
    await page.locator('.bg-green-50.text-green-700').first().click()
    
    // Check if discovery modal opens
    await page.waitForSelector('text=새로운 단어 발견', { timeout: 5000 })
  })
})