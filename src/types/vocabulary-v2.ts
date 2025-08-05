/**
 * 새로운 단어 DB 구조를 위한 타입 정의
 */

// 1. 전체 단어 마스터 DB (words 컬렉션)
export interface Word {
  id: string
  word: string
  normalizedWord?: string  // Normalized version for search
  pronunciation?: string
  partOfSpeech: string[]
  
  // 여러 정의와 예문을 가질 수 있음
  definitions: WordDefinition[]
  
  etymology?: string  // 영어 정의
  realEtymology?: string  // 실제 어원
  
  synonyms?: string[]
  antonyms?: string[]
  
  // 메타데이터
  difficulty: number  // 1-10
  frequency: number
  isSAT: boolean
  source?: WordSource  // 단어 출처 정보
  
  // 생성/수정 정보
  createdAt: Date
  updatedAt: Date
  createdBy: string  // userId
  
  // AI 생성 정보 추적
  aiGenerated?: {
    examples?: boolean
    etymology?: boolean
    generatedAt?: Date
  }
}

export interface WordDefinition {
  id: string
  definition: string
  examples: string[]
  source: 'dictionary' | 'ai' | 'manual' | 'pdf'
  language: 'en' | 'ko'  // 영어 또는 한국어
  partOfSpeech?: string  // Optional part of speech for specific definitions
  createdAt: Date
}

// 단어 출처 정보
export interface WordSource {
  type: 'veterans_pdf' | 'online_dictionary' | 'user_upload' | 'community' | 'ai_generated'
  origin: string  // 구체적인 출처 (파일명, URL, 사용자 ID 등)
  addedAt: Date
  uploadedBy?: string  // 업로드한 사용자 ID
  metadata?: {
    fileName?: string
    url?: string
    version?: string
    [key: string]: any
  }
}

// 단어 간 관계 정보 (word_relationships 컬렉션)
export interface WordRelationship {
  id: string
  wordId: string  // 주 단어 ID
  relatedWordId: string  // 관련 단어 ID
  relationshipType: 'synonym' | 'antonym' | 'related' | 'derived' | 'root'
  strength: number  // 0-1, 관계의 강도
  bidirectional: boolean  // 양방향 관계 여부
  source: 'user' | 'ai' | 'dictionary' | 'manual'
  verifiedBy?: string[]  // 검증한 사용자 ID 목록
  createdAt: Date
  createdBy: string
}

// 다중 정의 변형 (definition_variants 컬렉션)
export interface DefinitionVariant {
  id: string
  wordId: string  // 단어 ID
  wordText: string  // 단어 텍스트 (빠른 조회용)
  definition: string
  language: 'en' | 'ko'
  source: {
    type: 'dictionary' | 'community' | 'ai' | 'manual'
    name: string  // 구체적인 출처 이름
    url?: string
    credibility: number  // 0-1, 신뢰도
  }
  votes: {
    up: number
    down: number
    voters: string[]  // 투표한 사용자 ID
  }
  isPreferred: boolean  // 선호 정의 여부
  createdAt: Date
  createdBy: string
  verifiedAt?: Date
  verifiedBy?: string
}

// 2. 단어장 (vocabularies 컬렉션)
export interface Vocabulary {
  id: string
  name: string
  description?: string
  
  // 단어장 타입
  type: 'system' | 'personal' | 'shared'
  visibility: 'public' | 'private'
  isPublic?: boolean  // Legacy support
  isOfficial?: boolean  // Official vocabulary marker
  language?: string  // Vocabulary language
  targetLevel?: string  // Target proficiency level
  
  // 소유자 정보
  ownerId: string  // 'system' for system vocabularies
  ownerType: 'system' | 'user'
  
  // 메타데이터
  wordCount: number
  tags?: string[]
  category?: string  // SAT, TOEFL, GRE, etc.
  level?: string  // beginner, intermediate, advanced
  
  source?: {
    type: 'pdf' | 'manual' | 'import' | 'api'
    filename?: string
    url?: string
  }
  
  // 단어장 이미지 (썸네일)
  imageUrl?: string
  
  createdAt: Date
  updatedAt: Date
  
  // 통계
  stats?: {
    totalSubscribers?: number
    averageMastery?: number
    completionRate?: number
  }
}

// 3. 단어장-단어 매핑 (vocabulary_words 컬렉션)
export interface VocabularyWord {
  id: string
  vocabularyId: string
  wordId: string
  
  // 단어장 내 추가 정보
  addedAt: Date
  addedBy: string
  
  // 확장 가능한 메타데이터
  metadata?: {
    order?: number  // 단어장 내 순서
    notes?: string  // 개인 메모
    customDefinition?: string  // 사용자 정의 뜻
    tags?: string[]  // 단어장별 태그
  }
}

// 4. 사용자 단어장 구독/학습 상태 (user_vocabularies 컬렉션)
export interface UserVocabulary {
  id: string
  userId: string
  vocabularyId: string
  
  // 구독/활성화 상태
  isActive: boolean
  isOwner: boolean  // 본인이 만든 단어장인지
  subscribedAt: Date
  lastAccessedAt?: Date
  
  // 학습 진도
  progress: {
    totalWords: number
    studiedWords: number
    masteredWords: number
    reviewingWords: number
  }
  
  // 학습 설정
  settings?: {
    dailyGoal?: number
    reminderEnabled?: boolean
    reminderTime?: string  // HH:MM
  }
  
  // 마지막 학습 정보
  lastStudy?: {
    date: Date
    wordsStudied: number
    duration: number  // minutes
  }
}

// 5. 사용자별 단어 학습 상태 (user_words 컬렉션)
export interface UserWord {
  id: string
  userId: string
  wordId: string
  
  // 학습 상태
  studyStatus: {
    studied: boolean
    masteryLevel: number  // 0-100
    confidence: 'low' | 'medium' | 'high'
    nextReviewDate?: Date
    
    // 학습 통계
    totalReviews: number
    correctCount: number
    incorrectCount: number
    streakCount: number
    
    // 활동별 통계
    activityStats?: {
      flashcard: { count: number, lastUsed?: Date }
      quiz: { count: number, lastUsed?: Date }
      typing: { count: number, lastUsed?: Date }
      review: { count: number, lastUsed?: Date }
    }
    
    // 마지막 학습
    lastStudied?: Date
    lastResult?: 'correct' | 'incorrect' | 'skipped'
    lastActivity?: StudyActivityType
  }
  
  // 개인 메모 및 커스터마이징
  personalNotes?: string
  customMnemonic?: string  // 암기법
  customExample?: string
  
  // 북마크/즐겨찾기
  isBookmarked?: boolean
  bookmarkedAt?: Date
  
  createdAt: Date
  updatedAt: Date
}

// 6. 학습 세션 기록 (study_sessions 컬렉션)
export interface StudySession {
  id: string
  userId: string
  vocabularyId?: string
  
  // 세션 정보
  startedAt: Date
  completedAt?: Date
  duration?: number  // minutes
  
  // 학습 유형
  sessionType: 'quiz' | 'flashcard' | 'typing' | 'review' | 'mixed'
  
  // 학습한 단어들
  wordsStudied: string[]  // wordIds
  
  // 결과
  results: {
    correct: number
    incorrect: number
    skipped: number
    accuracy: number  // percentage
  }
  
  // 세션 중 생성된 이벤트
  events?: StudyEvent[]
}

export interface StudyEvent {
  timestamp: Date
  wordId: string
  eventType: 'answered' | 'skipped' | 'hint_used' | 'reviewed'
  result?: 'correct' | 'incorrect'
  responseTime?: number  // seconds
  hintsUsed?: number
}

// Helper types
export type VocabularyType = 'system' | 'personal' | 'shared'
export type StudyActivityType = 'quiz' | 'flashcard' | 'typing' | 'review'
export type MasteryLevel = 'beginner' | 'learning' | 'familiar' | 'proficient' | 'mastered'

// Utility functions for mastery level
export function getMasteryLevel(score: number): MasteryLevel {
  if (score >= 90) return 'mastered'
  if (score >= 75) return 'proficient'
  if (score >= 50) return 'familiar'
  if (score >= 25) return 'learning'
  return 'beginner'
}

export function getMasteryColor(level: MasteryLevel): string {
  switch (level) {
    case 'mastered': return 'text-green-600'
    case 'proficient': return 'text-blue-600'
    case 'familiar': return 'text-yellow-600'
    case 'learning': return 'text-orange-600'
    case 'beginner': return 'text-gray-600'
  }
}