// Global TypeScript type definitions

export interface User {
  id: string
  email: string
  displayName?: string
  photoURL?: string
  createdAt: Date
  lastLoginAt: Date
}

export interface VocabularyWord {
  id: string
  word: string
  definitions: Definition[]
  examples: string[]
  partOfSpeech: string[]
  difficulty: number // 1-10 scale
  frequency: number // 1-10 scale
  satLevel: boolean
  pronunciation?: string
  etymology?: Etymology
  categories: string[]
  sources: string[]
  apiSource?: string
  createdAt: Date
  updatedAt: Date
  learningMetadata?: LearningMetadata
}

export interface Definition {
  text: string
  source: string
  partOfSpeech: string
}

export interface Etymology {
  origin: string
  language: string
  meaning: string
}

export interface LearningMetadata {
  timesStudied: number
  masteryLevel: number // 0-1 scale
  lastStudied: Date
  userProgress?: UserProgress
}

export interface UserProgress {
  userId: string
  wordId: string
  correctAttempts: number
  totalAttempts: number
  streak: number
  nextReviewDate: Date
}

export interface NewsArticle {
  id: string
  title: string
  content: string
  url: string
  source: string
  publishedAt: Date
  processedAt: Date
  satWords: string[]
  difficulty: number
}

export interface NewsHighlight {
  wordId: string
  word: string
  startIndex: number
  endIndex: number
  context: string // surrounding text
  definition: string
  difficulty: number
}

export interface Quiz {
  id: string
  type: 'multiple_choice' | 'fill_blank' | 'contextual'
  question: string
  options?: string[]
  correctAnswer: string
  explanation: string
  wordId: string
  difficulty: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Re-export news types for convenience
export type {
  NewsSource,
  RawNewsArticle,
  ProcessedNewsArticle,
  ContentFilter,
  CrawlingConfig,
  CrawlingSession,
  NewsCategory,
  ProcessingStage,
  CrawlingStatus
} from './news'
