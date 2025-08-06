/**
 * Enhanced Photo Vocabulary Collection Types
 * For persistent storage and organization of photo-extracted vocabulary
 */

export interface PhotoVocabularyCollection {
  id: string
  userId: string
  
  // Collection metadata
  title: string
  description?: string
  date: string // YYYY-MM-DD 형태로 저장
  photoUrl: string
  thumbnailUrl?: string
  
  // Organization
  tags: string[]
  category?: string
  source?: string // "교재", "뉴스", "기사", "자료" 등
  
  // Statistics
  totalWords: number
  studiedWords: number
  masteredWords: number
  accuracyRate: number
  
  // Learning metadata  
  firstStudiedAt?: Date
  lastStudiedAt?: Date
  studyCount: number
  averageScore?: number
  
  // System metadata
  createdAt: Date
  updatedAt: Date
  isArchived: boolean
}

export interface PhotoVocabularyWord {
  id: string
  userId: string
  collectionId: string
  
  // Word core data
  word: string
  normalizedWord: string
  definition?: string
  context?: string
  partOfSpeech?: string[]
  
  // Position data from OCR
  position?: {
    x: number
    y: number
    width: number
    height: number
  }
  
  // Enhanced data
  pronunciation?: string
  difficulty?: number
  frequency?: number
  relatedWords?: string[]
  
  // AI-enhanced fields (added after initial creation)
  etymology?: string        // English definition/meaning
  realEtymology?: string    // Actual word origin/etymology
  examples?: string[]       // Example sentences
  synonyms?: string[]       // English synonyms
  antonyms?: string[]       // English antonyms
  
  // Learning progress
  studyStatus: {
    studied: boolean
    masteryLevel: number // 0-100
    reviewCount: number
    correctCount: number
    incorrectCount: number
    firstStudiedAt?: Date
    lastStudiedAt?: Date
    nextReviewAt?: Date // 스페이싱 복습용
  }
  
  // System metadata
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

// 날짜별 통계
export interface DailyVocabularyStats {
  id: string // userId_YYYY-MM-DD
  userId: string
  date: string // YYYY-MM-DD
  
  newWordsAdded: number
  wordsStudied: number
  testsTaken: number
  averageAccuracy: number
  studyTimeMinutes: number
  
  createdAt: Date
  updatedAt: Date
}

// 컬렉션 목록 뷰용 요약 타입
export interface PhotoVocabularyCollectionSummary {
  id: string
  title: string
  date: string
  photoUrl: string
  totalWords: number
  studiedWords: number
  accuracyRate: number
  lastStudiedAt?: Date
  category?: string
  tags: string[]
}

// 학습 세션 결과
export interface PhotoVocabularyTestSession {
  id: string
  userId: string
  collectionId: string
  
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  accuracy: number
  
  wordsCorrect: string[] // word IDs
  wordsIncorrect: string[] // word IDs
  wordsToReview: string[] // word IDs
  
  timeSpentSeconds: number
  completedAt: Date
  createdAt: Date
}

// 복습 스케줄링용
export interface ReviewSchedule {
  wordId: string
  collectionId: string
  userId: string
  
  currentInterval: number // days
  easeFactor: number
  reviewCount: number
  
  lastReviewedAt: Date
  nextReviewAt: Date
  
  createdAt: Date
  updatedAt: Date
}