/**
 * Unified Word Schema V3
 * 
 * 근본적 해결을 위한 단일 통합 스키마
 * - Flat structure 채택 (성능 및 단순성)
 * - 모든 필드 명확히 정의
 * - 확장 가능한 구조
 */

export interface UnifiedWordV3 {
  // ========== Core Fields ==========
  id: string
  word: string
  normalizedWord: string  // 검색용 정규화된 형태
  
  // ========== Definitions (Flat) ==========
  // 메인 정의는 flat으로 저장 (빠른 접근)
  definition: string | null        // 한국어 정의
  englishDefinition: string | null // 영어 정의
  
  // 추가 정의들 (필요시 확장)
  alternativeDefinitions?: {
    korean?: string[]
    english?: string[]
  }
  
  // ========== Language Info ==========
  pronunciation: string | null
  partOfSpeech: string[]  // ["n.", "v."] 등
  
  // ========== Examples & Usage ==========
  examples: string[]      // 예문 배열
  contextualExamples?: {  // 컨텍스트별 예문 (확장용)
    source: string
    text: string
    translation?: string
  }[]
  
  // ========== Related Words ==========
  synonyms: string[]
  antonyms: string[]
  relatedWords?: string[] // 관련 단어
  
  // ========== Etymology ==========
  etymology: string | null  // 어원 정보
  wordOrigin?: {           // 상세 어원 (확장용)
    language: string
    originalWord: string
    meaning: string
    period?: string
  }
  
  // ========== Metadata ==========
  difficulty: number      // 1-10
  frequency: number       // 사용 빈도 1-10
  importance: number      // 중요도 1-10
  
  // ========== Categories & Tags ==========
  categories: WordCategory[]  // 구조화된 카테고리
  tags: string[]              // 자유 태그
  
  // ========== Source Tracking ==========
  source: {
    type: WordSourceType
    collection: string      // 원본 컬렉션명
    originalId?: string    // 원본 ID
    extractedFrom?: string // PDF, 이미지 등
    addedBy?: string       // userId
    addedAt: Date
  }
  
  // ========== Quality & Validation ==========
  quality: {
    score: number          // 0-100 품질 점수
    validated: boolean     // 검증 여부
    validatedBy?: string   // 검증자
    validatedAt?: Date
    improvedBy?: string    // 개선자
    improvedAt?: Date
    issues?: string[]      // 발견된 문제들
  }
  
  // ========== AI Generation Tracking ==========
  aiGenerated?: {
    model: string
    version: string
    generatedFields: string[]  // AI가 생성한 필드들
    confidence: number         // 0-1
    generatedAt: Date
  }
  
  // ========== Timestamps ==========
  createdAt: Date
  updatedAt: Date
  
  // ========== Search Optimization ==========
  searchTokens?: string[]  // 검색 최적화용 토큰
  phoneticCode?: string    // 발음 기반 검색용
}

// ========== Type Definitions ==========

export type WordCategory = 
  | 'SAT' | 'TOEFL' | 'TOEIC' | 'GRE' | 'IELTS' 
  | '수능' | '공무원' | 'GMAT' | 'LSAT'
  | 'academic' | 'business' | 'daily' | 'technical'

export type WordSourceType = 
  | 'manual'           // 수동 입력
  | 'pdf_extraction'   // PDF 추출
  | 'photo_extraction' // 사진 추출
  | 'ai_generated'     // AI 생성
  | 'dictionary_api'   // 사전 API
  | 'user_submission'  // 사용자 제출
  | 'legacy_import'    // 기존 데이터 임포트

// ========== Migration Helper Types ==========

export interface MigrationMapping {
  // Old nested structure
  'definitions[0].definition'?: string
  'definitions[0].examples'?: string[]
  
  // Old flat structure
  'definition'?: string
  'examples'?: string[]
  
  // Common fields
  'englishDefinition'?: string
  'etymology'?: string
  'synonyms'?: string[]
  'antonyms'?: string[]
  
  // Quality markers
  'qualityImproved'?: boolean
  'qualityImprovedAt'?: Date
}

// ========== Validation Functions ==========

export function validateUnifiedWordV3(word: Partial<UnifiedWordV3>): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields
  if (!word.word) errors.push('word is required')
  if (!word.definition && !word.englishDefinition) {
    errors.push('At least one definition (Korean or English) is required')
  }
  
  // Validation rules
  if (word.difficulty && (word.difficulty < 1 || word.difficulty > 10)) {
    errors.push('difficulty must be between 1 and 10')
  }
  
  if (word.frequency && (word.frequency < 1 || word.frequency > 10)) {
    errors.push('frequency must be between 1 and 10')
  }
  
  // Warnings for missing recommended fields
  if (!word.examples || word.examples.length === 0) {
    warnings.push('No examples provided')
  }
  
  if (!word.pronunciation) {
    warnings.push('No pronunciation provided')
  }
  
  if (!word.etymology) {
    warnings.push('No etymology provided')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// ========== Quality Score Calculation ==========

export function calculateQualityScore(word: Partial<UnifiedWordV3>): number {
  let score = 0
  const weights = {
    definition: 20,
    englishDefinition: 15,
    examples: 15,
    pronunciation: 10,
    etymology: 10,
    synonyms: 10,
    antonyms: 5,
    partOfSpeech: 5,
    difficulty: 5,
    frequency: 5
  }
  
  // Check each field and add to score
  if (word.definition) score += weights.definition
  if (word.englishDefinition) score += weights.englishDefinition
  if (word.examples && word.examples.length > 0) {
    score += Math.min(weights.examples, word.examples.length * 5)
  }
  if (word.pronunciation) score += weights.pronunciation
  if (word.etymology) score += weights.etymology
  if (word.synonyms && word.synonyms.length > 0) {
    score += Math.min(weights.synonyms, word.synonyms.length * 2)
  }
  if (word.antonyms && word.antonyms.length > 0) {
    score += Math.min(weights.antonyms, word.antonyms.length * 2)
  }
  if (word.partOfSpeech && word.partOfSpeech.length > 0) {
    score += weights.partOfSpeech
  }
  if (word.difficulty) score += weights.difficulty
  if (word.frequency) score += weights.frequency
  
  return Math.min(100, score)
}

// ========== Export Helpers ==========

export function toUnifiedWordV3(data: any): UnifiedWordV3 {
  // Handle both old structures
  let definition = null
  let examples: string[] = []
  
  // Try flat structure first
  if (data.definition && typeof data.definition === 'string') {
    definition = data.definition
    examples = data.examples || []
  }
  // Try nested structure
  else if (data.definitions?.[0]) {
    definition = data.definitions[0].definition || null
    examples = data.definitions[0].examples || []
  }
  
  const word: UnifiedWordV3 = {
    id: data.id || data.word?.toLowerCase().replace(/\s+/g, '_'),
    word: data.word || '',
    normalizedWord: data.normalizedWord || data.word?.toLowerCase().trim() || '',
    
    definition,
    englishDefinition: data.englishDefinition || null,
    
    pronunciation: data.pronunciation || null,
    partOfSpeech: data.partOfSpeech || [],
    
    examples,
    synonyms: data.synonyms || [],
    antonyms: data.antonyms || [],
    etymology: data.etymology || data.realEtymology || null,
    
    difficulty: data.difficulty || 5,
    frequency: data.frequency || 5,
    importance: data.importance || 5,
    
    categories: extractCategories(data),
    tags: data.tags || [],
    
    source: {
      type: determineSourceType(data),
      collection: data.source?.collection || 'words',
      originalId: data.source?.originalId,
      extractedFrom: data.source?.extractedFrom,
      addedBy: data.source?.addedBy || data.createdBy,
      addedAt: data.source?.addedAt || data.createdAt || new Date()
    },
    
    quality: {
      score: calculateQualityScore(data),
      validated: data.quality?.validated || false,
      validatedBy: data.quality?.validatedBy,
      validatedAt: data.quality?.validatedAt,
      improvedBy: data.qualityImproved ? 'quality-script' : undefined,
      improvedAt: data.qualityImprovedAt
    },
    
    aiGenerated: data.aiGenerated,
    
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  }
  
  return word
}

function extractCategories(data: any): WordCategory[] {
  const categories: WordCategory[] = []
  
  if (data.isSAT || data.categories?.includes('SAT')) categories.push('SAT')
  if (data.isTOEFL || data.categories?.includes('TOEFL')) categories.push('TOEFL')
  if (data.category) {
    const cat = data.category as WordCategory
    if (!categories.includes(cat)) categories.push(cat)
  }
  
  return categories
}

function determineSourceType(data: any): WordSourceType {
  if (data.source?.type) return data.source.type
  if (data.qualityImproved) return 'ai_generated'
  if (data.source?.collection === 'photo_vocabulary_words') return 'photo_extraction'
  if (data.source?.collection === 'ai_generated_words') return 'ai_generated'
  if (data.source?.extractedFrom?.includes('.pdf')) return 'pdf_extraction'
  return 'legacy_import'
}