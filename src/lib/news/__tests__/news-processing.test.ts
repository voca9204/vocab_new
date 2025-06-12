// News Processing - Tests

import { satWordDetector } from '../sat-word-detector'
import { contentFilteringService } from '../content-filtering'
import type { RawNewsArticle } from '@/types/news'

describe('News Processing System', () => {
  const sampleText = `
    The unprecedented economic analysis revealed significant discrepancies in the 
    comprehensive evaluation of market fluctuations. Economists emphasized the 
    substantial implications of these sophisticated methodologies for understanding 
    contemporary financial dynamics.
  `

  const sampleArticle: RawNewsArticle = {
    title: 'Economic Analysis Reveals Market Trends',
    content: sampleText,
    url: 'https://example.com/news/economic-analysis',
    publishedAt: new Date(),
    sourceName: 'Test News',
    sourceId: 'test-source',
    language: 'en'
  }

  describe('SAT Word Detector', () => {
    it('should analyze text quality', () => {
      const analysis = satWordDetector.analyzeText(sampleText)
      
      expect(analysis.wordCount).toBeGreaterThan(0)
      expect(analysis.sentenceCount).toBeGreaterThan(0)
      expect(analysis.readingTime).toBeGreaterThan(0)
      expect(analysis.gradeLevel).toBeGreaterThan(0)
    })

    it('should evaluate content quality', () => {
      const evaluation = satWordDetector.evaluateContentQuality(sampleText)
      
      expect(evaluation.score).toBeGreaterThanOrEqual(1)
      expect(evaluation.score).toBeLessThanOrEqual(10)
      expect(evaluation.reasons).toBeInstanceOf(Array)
      expect(typeof evaluation.isEducational).toBe('boolean')
    })

    it('should extract words correctly', () => {
      const text = "Hello, world! This is a test."
      const words = satWordDetector['extractWords'](text)
      
      expect(words).toContain('hello')
      expect(words).toContain('world')
      expect(words).toContain('test')
      expect(words).not.toContain('!')
    })
  })

  describe('Content Filtering Service', () => {
    it('should check age appropriateness', () => {
      const ageCheck = contentFilteringService.checkAgeAppropriateness(sampleText)
      
      expect(ageCheck.isAppropriate).toBe(true)
      expect(ageCheck.ageRating).toBeGreaterThanOrEqual(13)
      expect(ageCheck.concerns).toBeInstanceOf(Array)
    })

    it('should detect content length issues', () => {
      const shortArticle: RawNewsArticle = {
        ...sampleArticle,
        content: 'Too short.'
      }
      
      const result = contentFilteringService['checkContentLength'](shortArticle)
      
      expect(result.passed).toBe(false)
      expect(result.blocked).toBe(true)
      expect(result.reasons[0]).toContain('too short')
    })

    it('should validate English language', () => {
      const result = contentFilteringService['checkLanguage'](sampleArticle)
      
      expect(result.passed).toBe(true)
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  describe('Integration Tests', () => {
    it('should handle empty or invalid content gracefully', async () => {
      const invalidArticle: RawNewsArticle = {
        ...sampleArticle,
        content: ''
      }

      const filterResult = await contentFilteringService.filterArticle(invalidArticle)
      expect(filterResult.passed).toBe(false)
    })
  })
})
