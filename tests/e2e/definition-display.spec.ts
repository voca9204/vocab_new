import { test, expect } from '@playwright/test'

test.describe('Definition Display Fix', () => {
  test('should display word definition correctly', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@test.com')
    await page.fill('input[type="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Go to flashcards
    await page.goto('http://localhost:3000/study/flashcards-v2')
    await page.waitForSelector('h2', { timeout: 10000 })
    
    // Get current word
    const currentWord = await page.locator('h2').first().textContent()
    console.log('Testing definition display with word:', currentWord)
    
    // Open word detail modal
    await page.click('button[title="상세 정보 보기"]')
    await page.waitForSelector('[data-testid="word-detail-modal"]', { timeout: 5000 })
    
    // Check word title in modal
    const modalWord = await page.locator('[data-testid="word-detail-modal"] h2').textContent()
    console.log('Modal word:', modalWord)
    expect(modalWord).toBe(currentWord)
    
    // Check definition display
    const definitionElement = page.locator('.text-lg').first()
    const definition = await definitionElement.textContent()
    console.log('Definition text:', definition)
    
    // Definition should not be "No definition available"
    expect(definition, 'Definition should not show "No definition available"').not.toBe('No definition available')
    expect(definition, 'Definition should not be empty').not.toBe('')
    expect(definition, 'Definition should be a meaningful text').toMatch(/\w+/)
    
    // Take screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/definition-display-fixed.png',
      fullPage: true 
    })
    
    console.log('✅ Definition display test passed')
    
    // Test with multiple words by navigating
    console.log('\n=== Testing with next word ===')
    
    // Close modal first
    await page.click('button:has(svg)') // Close button
    await page.waitForSelector('[data-testid="word-detail-modal"]', { state: 'detached' })
    
    // Go to next word
    await page.click('button:has(svg)') // Next button (assuming it has a ChevronRight icon)
    await page.waitForTimeout(1000)
    
    // Get new word
    const nextWord = await page.locator('h2').first().textContent()
    console.log('Next word:', nextWord)
    
    if (nextWord !== currentWord) {
      // Open modal for new word
      await page.click('button[title="상세 정보 보기"]')
      await page.waitForSelector('[data-testid="word-detail-modal"]', { timeout: 5000 })
      
      // Check definition for new word
      const nextDefinition = await page.locator('.text-lg').first().textContent()
      console.log('Next word definition:', nextDefinition)
      
      expect(nextDefinition, 'Next word definition should not show "No definition available"').not.toBe('No definition available')
      expect(nextDefinition, 'Next word definition should not be empty').not.toBe('')
      
      console.log('✅ Multiple words test passed')
    }
  })
})