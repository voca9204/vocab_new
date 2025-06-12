// Integration test for Dictionary API
import { vocabularyService } from '../vocabulary-service'

describe('Dictionary API Integration Tests', () => {
  // Skip if no internet connection or in CI
  const shouldSkipIntegration = process.env.SKIP_INTEGRATION_TESTS === 'true'

  beforeEach(() => {
    vocabularyService.clearCache()
  })

  describe('Real API Calls', () => {
    it('should fetch a common word successfully', async () => {
      if (shouldSkipIntegration) {
        console.log('Skipping integration test')
        return
      }

      const result = await vocabularyService.fetchAndProcessWord('test')
      
      expect(result.success).toBe(true)
      expect(result.word).toBeDefined()
      expect(result.word?.word).toBe('test')
      expect(result.word?.definition).toBeTruthy()
      expect(result.word?.partOfSpeech).toBeTruthy()
      expect(result.apiSource).toBe('FreeDictionary')
    }, 30000) // 30 second timeout for API calls

    it('should handle invalid words gracefully', async () => {
      if (shouldSkipIntegration) {
        console.log('Skipping integration test')
        return
      }

      const result = await vocabularyService.fetchAndProcessWord('xyzabcnonexistentword123')
      
      expect(result.success).toBe(false)
      expect(result.word).toBeNull()
      expect(result.error).toBeTruthy()
    }, 30000)

    it('should use cache on repeated requests', async () => {
      if (shouldSkipIntegration) {
        console.log('Skipping integration test')
        return
      }

      // First request
      const start1 = Date.now()
      const result1 = await vocabularyService.fetchAndProcessWord('hello')
      const duration1 = Date.now() - start1

      expect(result1.success).toBe(true)

      // Second request (should be cached)
      const start2 = Date.now()
      const result2 = await vocabularyService.fetchAndProcessWord('hello')
      const duration2 = Date.now() - start2

      expect(result2.success).toBe(true)
      expect(duration2).toBeLessThan(duration1) // Cache should be faster
      expect(duration2).toBeLessThan(100) // Should be very fast from cache
    }, 30000)
  })

  describe('Vocabulary Processing', () => {
    it('should estimate difficulty correctly', async () => {
      if (shouldSkipIntegration) {
        console.log('Skipping integration test')
        return
      }

      const simpleResult = await vocabularyService.fetchAndProcessWord('cat')
      const complexResult = await vocabularyService.fetchAndProcessWord('sophisticated')

      if (simpleResult.success && complexResult.success) {
        expect(simpleResult.word?.difficulty).toBeLessThan(complexResult.word?.difficulty || 0)
      }
    }, 30000)

    it('should generate appropriate tags', async () => {
      if (shouldSkipIntegration) {
        console.log('Skipping integration test')
        return
      }

      const result = await vocabularyService.fetchAndProcessWord('beautiful')
      
      if (result.success && result.word) {
        expect(result.word.tags).toBeInstanceOf(Array)
        expect(result.word.tags.length).toBeGreaterThan(0)
        expect(result.word.tags).toContain('adjective')
      }
    }, 30000)
  })

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = vocabularyService.getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(typeof stats.size).toBe('number')
    })

    it('should clear cache properly', async () => {
      if (shouldSkipIntegration) {
        console.log('Skipping integration test')
        return
      }

      // Add something to cache
      await vocabularyService.fetchAndProcessWord('test')
      let stats = vocabularyService.getCacheStats()
      expect(stats.size).toBeGreaterThan(0)

      // Clear cache
      vocabularyService.clearCache()
      stats = vocabularyService.getCacheStats()
      expect(stats.size).toBe(0)
    }, 30000)
  })
})
