import { chromium } from 'playwright'

async function testWordModal() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  // Enable console logging
  page.on('console', msg => console.log('Browser:', msg.text()))
  
  try {
    // Manual login steps
    console.log('1. Please login manually with:')
    console.log('   Email: admin@test.com')
    console.log('   Password: test123456')
    console.log('2. Navigate to flashcards page')
    console.log('3. Press Enter to continue...')
    
    await page.goto('http://localhost:3000')
    
    // Wait for manual login
    await page.waitForTimeout(30000)
    
    // Now go to flashcards
    await page.goto('http://localhost:3000/study/flashcards-v2')
    await page.waitForTimeout(2000)
    
    // Get current word
    const word = await page.locator('h2').first().textContent()
    console.log('\n=== Current word:', word)
    
    // Click info button
    await page.click('button[title="상세 정보 보기"]')
    await page.waitForTimeout(2000)
    
    // Check modal content
    const modalContent = await page.locator('.max-w-3xl').innerText()
    console.log('\n=== Modal Content ===')
    console.log(modalContent)
    
    // Check specific sections
    const hasEnglishDef = await page.locator('.bg-blue-50').count()
    console.log('\n=== English definition sections:', hasEnglishDef)
    
    const hasSynonyms = await page.locator('.bg-green-50.text-green-700').count()
    console.log('=== Synonyms found:', hasSynonyms)
    
    const hasExamples = await page.locator('.bg-green-50 >> text=예문').count()
    console.log('=== Examples section:', hasExamples)
    
    // Take screenshot
    await page.screenshot({ path: 'manual-test-modal.png', fullPage: true })
    console.log('\n=== Screenshot saved to manual-test-modal.png')
    
    // Wait to see results
    await page.waitForTimeout(10000)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await browser.close()
  }
}

testWordModal()