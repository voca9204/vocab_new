// SAT Vocabulary Database - Validation Tests

import {
  validateWord,
  validateDefinition,
  validateDifficulty,
  validateFrequency,
  validateCategories,
  validateVocabularyWord,
  sanitizeWord,
  sanitizeVocabularyWord,
  validateSATWord
} from '../vocabulary-validation'
import type { VocabularyWord, Definition } from '@/types'

describe('Vocabulary Validation', () => {
  describe('validateWord', () => {
    it('should accept valid words', () => {
      expect(validateWord('eloquent')).toBe(true)
      expect(validateWord('self-aware')).toBe(true)
      expect(validateWord("don't")).toBe(true)
    })

    it('should reject invalid words', () => {
      expect(validateWord('')).toBe(false)
      expect(validateWord('a')).toBe(false) // too short
      expect(validateWord('word123')).toBe(false) // contains numbers
      expect(validateWord('word@symbol')).toBe(false) // contains special chars
    })
  })

  describe('validateDefinition', () => {
    const validDefinition: Definition = {
      text: 'Speaking fluently and persuasively',
      source: 'Merriam-Webster',
      partOfSpeech: 'adjective'
    }

    it('should accept valid definitions', () => {
      expect(validateDefinition(validDefinition)).toBe(true)
    })

    it('should reject invalid definitions', () => {
      expect(validateDefinition({
        ...validDefinition,
        text: 'abc' // too short (< 5 chars)
      })).toBe(false)

      expect(validateDefinition({
        ...validDefinition,
        source: '' // empty source
      })).toBe(false)
    })
  })

  describe('validateDifficulty', () => {
    it('should accept valid difficulty levels', () => {
      expect(validateDifficulty(1)).toBe(true)
      expect(validateDifficulty(5)).toBe(true)
      expect(validateDifficulty(10)).toBe(true)
    })

    it('should reject invalid difficulty levels', () => {
      expect(validateDifficulty(0)).toBe(false)
      expect(validateDifficulty(11)).toBe(false)
      expect(validateDifficulty(5.5)).toBe(false) // not integer
    })
  })

  describe('validateVocabularyWord', () => {
    const validWord = {
      word: 'eloquent',
      definitions: [{
        text: 'Speaking fluently and persuasively',
        source: 'Merriam-Webster',
        partOfSpeech: 'adjective'
      }],
      examples: ['She gave an eloquent speech.'],
      partOfSpeech: ['adjective'],
      difficulty: 7,
      frequency: 6,
      satLevel: true,
      categories: ['academic', 'literary'],
      sources: ['Merriam-Webster'],
      pronunciation: 'ˈe-lə-kwənt'
    }

    it('should validate complete word data', () => {
      const result = validateVocabularyWord(validWord)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      const invalidWord = {
        ...validWord,
        definitions: [] // empty definitions
      }
      const result = validateVocabularyWord(invalidWord)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('At least one definition is required')
    })
  })

  describe('sanitizeWord', () => {
    it('should sanitize word input', () => {
      expect(sanitizeWord(' ELOQUENT ')).toBe('eloquent')
      expect(sanitizeWord('Self-Aware')).toBe('self-aware')
    })
  })

  describe('validateSATWord', () => {
    const satWord: VocabularyWord = {
      id: 'test-1',
      word: 'eloquent',
      definitions: [
        {
          text: 'Speaking fluently and persuasively',
          source: 'Merriam-Webster',
          partOfSpeech: 'adjective'
        },
        {
          text: 'Marked by forceful and fluent expression',
          source: 'Dictionary.com',
          partOfSpeech: 'adjective'
        }
      ],
      examples: ['She gave an eloquent speech.'],
      partOfSpeech: ['adjective'],
      difficulty: 7,
      frequency: 6,
      satLevel: true,
      categories: ['academic'],
      sources: ['Merriam-Webster'],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should validate proper SAT words', () => {
      expect(validateSATWord(satWord)).toBe(true)
    })

    it('should reject SAT words with low difficulty', () => {
      const lowDifficultyWord = { ...satWord, difficulty: 3 }
      expect(validateSATWord(lowDifficultyWord)).toBe(false)
    })

    it('should reject SAT words without examples', () => {
      const noExamplesWord = { ...satWord, examples: [] }
      expect(validateSATWord(noExamplesWord)).toBe(false)
    })
  })
})
