import { test, expect } from '@playwright/test'

test('check flashcard word modal', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('Browser:', msg.text()))

  // Login
  await page.goto('http://localhost:3000/login')
  await page.fill('input[type="email"]', 'admin@test.com')
  await page.fill('input[type="password"]', 'test123456')
  await page.click('button[type="submit"]')
  
  // Wait for redirect
  await page.waitForTimeout(3000)
  
  // Go to flashcards
  await page.goto('http://localhost:3000/study/flashcards-v2')
  await page.waitForTimeout(2000)
  
  // Get current word
  const word = await page.locator('h2').first().textContent()
  console.log('Current word:', word)
  
  // Open modal
  await page.click('button[title="상세 정보 보기"]')
  await page.waitForTimeout(2000)
  
  // Take screenshot
  await page.screenshot({ path: 'word-modal-test.png', fullPage: true })
  console.log('Screenshot saved to word-modal-test.png')
  
  // Check for content
  const modalVisible = await page.locator('.max-w-3xl').isVisible()
  console.log('Modal visible:', modalVisible)
  
  // Check for examples
  const hasExamples = await page.locator('text=예문').count()
  console.log('Has examples section:', hasExamples > 0)
  
  // Check for AI generating message
  const generatingExamples = await page.locator('text=AI가 예문을 생성하고 있습니다...').isVisible()
  console.log('Generating examples:', generatingExamples)
  
  // Wait a bit more
  await page.waitForTimeout(5000)
  
  // Check again
  const exampleTexts = await page.locator('.text-green-700').allTextContents()
  console.log('Found examples:', exampleTexts.length)
  
  // Take final screenshot
  await page.screenshot({ path: 'word-modal-final.png', fullPage: true })
})