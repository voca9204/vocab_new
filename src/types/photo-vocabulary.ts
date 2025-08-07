/**
 * Photo Vocabulary Types
 */

export interface PhotoSession {
  id: string
  userId: string
  title: string
  photoUrl: string
  thumbnailUrl?: string
  
  // Extraction metadata
  extractedAt: Date
  extractionMethod: 'ocr' | 'ai_vision' | 'manual'
  sourceLanguage?: string
  
  // Session metadata
  isTemporary: boolean
  expiresAt?: Date
  tags: string[]
  
  // Statistics
  wordCount: number
  testedCount: number
  masteredCount: number
  
  createdAt: Date
  updatedAt: Date
}

export interface PhotoWord {
  id: string
  sessionId: string
  userId: string
  
  // Word data
  word: string
  context?: string
  position?: {
    x: number
    y: number
    width: number
    height: number
  }
  
  // Enhanced data
  definition?: string
  partOfSpeech?: string[]
  difficulty?: number
  
  // Learning status
  studied: boolean
  masteryLevel: number
  testResults: {
    correct: number
    incorrect: number
    lastTested?: Date
  }
  
  createdAt: Date
  updatedAt: Date
}

export interface PhotoVocabularyEntry {
  // Identification
  id: string
  userId: string
  sessionId: string
  
  // Photo data
  photoUrl?: string
  uploadedAt: Date
  
  // Word data
  word: string
  context?: string
  definition?: string
  
  // Quick metadata
  isActive: boolean
  expiresAt: Date
  
  // Learning status
  tested: boolean
  correct: boolean
  
  createdAt: Date
}

export interface ExtractedWord {
  word: string
  context?: string  // Full definition text
  koreanDefinition?: string  // Parsed Korean definition
  englishDefinition?: string  // Parsed English definition
  position?: {
    x: number
    y: number
    width: number
    height: number
  }
  confidence?: number
}

export interface PhotoTestQuestion {
  id: string
  type: 'multiple-choice' | 'fill-blank' | 'context' | 'visual'
  question: string
  options?: string[]
  answer: string
  wordId: string
  context?: string
  imageUrl?: string
}

export interface PhotoTestResults {
  sessionId: string
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  wordsToReview: string[]
  completedAt: Date
}