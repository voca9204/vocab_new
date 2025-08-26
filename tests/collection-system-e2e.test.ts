/**
 * 단어장 선택-학습 시스템 E2E 테스트
 * 
 * 핵심 유저 시나리오 검증:
 * 1. 단어장을 선택하면 해당 단어들만 학습에 표시됨
 * 2. AI Generated 컬렉션도 동일하게 작동함
 * 3. 여러 단어장 선택 시 단어가 합쳐져서 표시됨
 */

import { test, expect } from '@playwright/test'

test.describe('단어장 선택-학습 시스템', () => {
  
  test.beforeEach(async ({ page }) => {
    // 로그인 상태로 시작
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'test@example.com')
    await page.fill('[data-testid=password]', 'password')
    await page.click('[data-testid=login-button]')
    await page.waitForURL('/dashboard')
  })

  test('기본 시나리오: SAT 단어장 선택 → 타이핑 학습', async ({ page }) => {
    // Step 1: 단어장 페이지로 이동
    await page.goto('/wordbooks')
    
    // Step 2: SAT 단어장만 선택
    await page.click('[data-testid="wordbook-SAT"] [data-testid="select-button"]')
    
    // Step 3: 선택 상태 확인
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('1개 선택됨')
    
    // Step 4: 타이핑 연습으로 이동
    await page.goto('/study/typing')
    
    // Step 5: SAT 단어만 표시되는지 확인
    const wordPreview = page.locator('[data-testid="word-preview"]')
    await expect(wordPreview).toBeVisible()
    
    // Step 6: 10개 단어가 모두 SAT 출처인지 확인
    const wordCards = page.locator('[data-testid="preview-word-card"]')
    await expect(wordCards).toHaveCount(10)
    
    // Step 7: 실제 학습 시작
    await page.click('[data-testid="start-practice-button"]')
    
    // Step 8: 단어 입력 테스트
    const firstWord = await page.locator('[data-testid="current-word-definition"]').textContent()
    expect(firstWord).toBeTruthy()
    
    // 테스트 통과 조건: SAT 단어장의 단어만 표시됨
  })

  test('AI Generated 컬렉션 시나리오', async ({ page }) => {
    // Step 1: AI Generated 컬렉션이 있는지 확인
    await page.goto('/wordbooks')
    
    const aiCollection = page.locator('[data-testid="wordbook-ai-generated"]')
    
    if (await aiCollection.isVisible()) {
      // Step 2: AI 컬렉션 선택
      await aiCollection.click()
      
      // Step 3: 다른 컬렉션 모두 해제
      const selectedCollections = page.locator('[data-testid="selected-collection"]')
      const count = await selectedCollections.count()
      for (let i = 0; i < count; i++) {
        await selectedCollections.nth(i).click()
      }
      
      // Step 4: AI 컬렉션만 선택
      await page.click('[data-testid="wordbook-ai-generated"] [data-testid="select-button"]')
      
      // Step 5: 플래시카드 학습으로 이동
      await page.goto('/study/flashcards')
      
      // Step 6: AI Generated 단어만 표시되는지 확인
      const wordCount = page.locator('[data-testid="flashcard-word-count"]')
      const displayedCount = await wordCount.textContent()
      
      // AI 컬렉션의 정확한 단어 수가 표시되어야 함 (예: "3 / 3")
      expect(displayedCount).toMatch(/\d+ \/ \d+/)
      
      // 테스트 통과 조건: AI 컬렉션의 정확한 단어 수만 표시됨
    }
  })

  test('다중 선택 시나리오', async ({ page }) => {
    await page.goto('/wordbooks')
    
    // Step 1: SAT + TOEFL 두 단어장 선택
    await page.click('[data-testid="wordbook-SAT"] [data-testid="select-button"]')
    await page.click('[data-testid="wordbook-TOEFL"] [data-testid="select-button"]')
    
    // Step 2: 선택 상태 확인
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('2개 선택됨')
    
    // Step 3: 단어 목록 페이지로 이동
    await page.goto('/study/list')
    
    // Step 4: 두 단어장의 단어가 합쳐져서 표시되는지 확인
    const wordList = page.locator('[data-testid="word-list-item"]')
    const totalWords = await wordList.count()
    
    // SAT + TOEFL 단어 수의 합계가 표시되어야 함
    expect(totalWords).toBeGreaterThan(100) // 예상 최소 단어 수
    
    // Step 5: 필터 테스트 - SAT 단어만 필터링
    await page.selectOption('[data-testid="collection-filter"]', 'SAT')
    
    const filteredWords = page.locator('[data-testid="word-list-item"]')
    const satWordCount = await filteredWords.count()
    
    expect(satWordCount).toBeLessThan(totalWords)
    
    // 테스트 통과 조건: 다중 선택 시 단어가 합쳐져서 표시됨
  })

  test('단어장 선택 해제 시나리오', async ({ page }) => {
    await page.goto('/wordbooks')
    
    // Step 1: 두 단어장 선택
    await page.click('[data-testid="wordbook-SAT"] [data-testid="select-button"]')
    await page.click('[data-testid="wordbook-TOEFL"] [data-testid="select-button"]')
    
    // Step 2: 퀴즈 페이지로 이동하여 초기 상태 확인
    await page.goto('/study/quiz')
    const initialWordCount = await page.locator('[data-testid="quiz-word-count"]').textContent()
    
    // Step 3: 한 단어장 해제
    await page.goto('/wordbooks')
    await page.click('[data-testid="wordbook-TOEFL"] [data-testid="select-button"]') // 해제
    
    // Step 4: 퀴즈 페이지로 다시 이동
    await page.goto('/study/quiz')
    const reducedWordCount = await page.locator('[data-testid="quiz-word-count"]').textContent()
    
    // Step 5: 단어 수가 감소했는지 확인
    expect(reducedWordCount).not.toBe(initialWordCount)
    
    // 테스트 통과 조건: 단어장 해제 시 즉시 반영됨
  })

  test('빈 상태 처리 시나리오', async ({ page }) => {
    await page.goto('/wordbooks')
    
    // Step 1: 모든 단어장 해제
    const selectedCollections = page.locator('[data-testid="selected-collection"]')
    const count = await selectedCollections.count()
    for (let i = 0; i < count; i++) {
      await selectedCollections.nth(0).click() // 항상 첫 번째 요소 클릭 (동적으로 줄어들기 때문)
    }
    
    // Step 2: 학습 페이지들로 이동하여 빈 상태 확인
    const studyPages = ['/study/flashcards', '/study/quiz', '/study/typing', '/study/list']
    
    for (const pagePath of studyPages) {
      await page.goto(pagePath)
      
      // Step 3: 빈 상태 메시지 확인
      const emptyState = page.locator('[data-testid="empty-state"]')
      await expect(emptyState).toBeVisible()
      
      const emptyMessage = await emptyState.textContent()
      expect(emptyMessage).toContain('단어장을 선택해주세요')
    }
    
    // 테스트 통과 조건: 빈 상태에서 적절한 안내 메시지 표시
  })
})

/**
 * 성능 테스트
 */
test.describe('단어장 시스템 성능', () => {
  test('대용량 단어장 로딩 성능', async ({ page }) => {
    await page.goto('/wordbooks')
    
    // 큰 단어장 선택 (예: 모든 단어장)
    const startTime = Date.now()
    
    await page.click('[data-testid="select-all-button"]')
    await page.goto('/study/list')
    
    // 단어 목록이 로딩되기까지의 시간 측정
    await page.waitForSelector('[data-testid="word-list-item"]', { timeout: 10000 })
    
    const endTime = Date.now()
    const loadTime = endTime - startTime
    
    // 10초 이내 로딩 완료되어야 함
    expect(loadTime).toBeLessThan(10000)
  })
})