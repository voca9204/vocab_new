// SAT Vocabulary Database - Data Validation and Sanitization

import type { VocabularyWord, Definition, Etymology } from '@/types'

// 단어 입력 검증
export function validateWord(word: string): boolean {
  if (!word || typeof word !== 'string') return false
  if (word.length < 2 || word.length > 50) return false
  if (!/^[a-zA-Z\-']+$/.test(word)) return false
  return true
}

// 정의 검증
export function validateDefinition(definition: Definition): boolean {
  if (!definition.text || typeof definition.text !== 'string') return false
  if (definition.text.length < 5 || definition.text.length > 500) return false
  if (!definition.source || typeof definition.source !== 'string') return false
  if (!definition.partOfSpeech || typeof definition.partOfSpeech !== 'string') return false
  return true
}

// 난이도 검증 (1-10)
export function validateDifficulty(difficulty: number): boolean {
  return Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 10
}

// 빈도 검증 (1-10)
export function validateFrequency(frequency: number): boolean {
  return Number.isInteger(frequency) && frequency >= 1 && frequency <= 10
}

// 카테고리 검증
export function validateCategories(categories: string[]): boolean {
  if (!Array.isArray(categories) || categories.length === 0) return false
  return categories.every(cat => typeof cat === 'string' && cat.length > 0)
}

// 어원 검증
export function validateEtymology(etymology: Etymology | undefined): boolean {
  if (!etymology) return true // Optional field
  if (!etymology.origin || !etymology.language || !etymology.meaning) return false
  return typeof etymology.origin === 'string' &&
         typeof etymology.language === 'string' &&
         typeof etymology.meaning === 'string'
}

// VocabularyWord 전체 검증
export function validateVocabularyWord(
  word: Omit<VocabularyWord, 'id' | 'createdAt' | 'updatedAt'>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // 필수 필드 검증
  if (!validateWord(word.word)) {
    errors.push('Invalid word format')
  }

  if (!word.definitions || word.definitions.length === 0) {
    errors.push('At least one definition is required')
  } else {
    word.definitions.forEach((def, index) => {
      if (!validateDefinition(def)) {
        errors.push(`Invalid definition at index ${index}`)
      }
    })
  }

  if (!validateDifficulty(word.difficulty)) {
    errors.push('Difficulty must be between 1-10')
  }

  if (!validateFrequency(word.frequency)) {
    errors.push('Frequency must be between 1-10')
  }

  if (!validateCategories(word.categories)) {
    errors.push('At least one valid category is required')
  }

  if (!Array.isArray(word.partOfSpeech) || word.partOfSpeech.length === 0) {
    errors.push('At least one part of speech is required')
  }

  if (!Array.isArray(word.examples)) {
    errors.push('Examples must be an array')
  }

  if (!Array.isArray(word.sources) || word.sources.length === 0) {
    errors.push('At least one source is required')
  }

  if (!validateEtymology(word.etymology)) {
    errors.push('Invalid etymology format')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// 데이터 Sanitization 함수들
export function sanitizeWord(word: string): string {
  return word.trim().toLowerCase()
}

export function sanitizeDefinition(definition: Definition): Definition {
  return {
    text: definition.text.trim(),
    source: definition.source.trim(),
    partOfSpeech: definition.partOfSpeech.trim().toLowerCase()
  }
}

export function sanitizeCategories(categories: string[]): string[] {
  return categories
    .map(cat => cat.trim().toLowerCase())
    .filter(cat => cat.length > 0)
    .filter((cat, index, arr) => arr.indexOf(cat) === index) // Remove duplicates
}

export function sanitizePartOfSpeech(partOfSpeech: string[]): string[] {
  const validPOS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection']
  return partOfSpeech
    .map(pos => pos.trim().toLowerCase())
    .filter(pos => validPOS.includes(pos))
    .filter((pos, index, arr) => arr.indexOf(pos) === index) // Remove duplicates
}

// VocabularyWord 전체 Sanitization
export function sanitizeVocabularyWord(
  word: Omit<VocabularyWord, 'id' | 'createdAt' | 'updatedAt'>
): Omit<VocabularyWord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ...word,
    word: sanitizeWord(word.word),
    definitions: word.definitions.map(sanitizeDefinition),
    partOfSpeech: sanitizePartOfSpeech(word.partOfSpeech),
    categories: sanitizeCategories(word.categories),
    examples: word.examples.map(ex => ex.trim()).filter(ex => ex.length > 0),
    sources: word.sources.map(src => src.trim()).filter(src => src.length > 0),
    pronunciation: word.pronunciation?.trim() || undefined,
    apiSource: word.apiSource?.trim() || undefined
  }
}

// SAT 레벨 단어 검증 (특별 규칙)
export function validateSATWord(word: VocabularyWord): boolean {
  if (!word.satLevel) return true // Non-SAT words don't need special validation

  // SAT 단어는 최소 난이도 5 이상
  if (word.difficulty < 5) return false

  // SAT 단어는 적어도 2개 이상의 정의가 있어야 함
  if (word.definitions.length < 2) return false

  // SAT 단어는 예시 문장이 있어야 함
  if (word.examples.length === 0) return false

  return true
}

// 배치 검증 함수
export function validateBatchWords(
  words: Omit<VocabularyWord, 'id' | 'createdAt' | 'updatedAt'>[]
): { valid: typeof words; invalid: Array<{ word: typeof words[0]; errors: string[] }> } {
  const valid: typeof words = []
  const invalid: Array<{ word: typeof words[0]; errors: string[] }> = []

  words.forEach(word => {
    const validation = validateVocabularyWord(word)
    if (validation.isValid) {
      valid.push(sanitizeVocabularyWord(word))
    } else {
      invalid.push({ word, errors: validation.errors })
    }
  })

  return { valid, invalid }
}
