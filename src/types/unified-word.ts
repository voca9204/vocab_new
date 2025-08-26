/**
 * 통합 단어 타입 - 모든 레거시 구조를 단일 형태로 통합
 * ExtractedVocabulary, VocabularyWord, Word 타입을 모두 지원
 */

export interface UnifiedWord {
  // 기본 정보
  id: string
  word: string
  
  // 정의 (항상 단일 문자열로 통합)
  definition: string
  
  // 예문 (항상 문자열 배열)
  examples: string[]
  
  // 품사 정보
  partOfSpeech: string[]
  
  // 발음 정보
  pronunciation?: string
  
  // 영어 정의
  englishDefinition?: string
  
  // 어원 (단어의 기원과 역사)
  etymology?: string
  
  // 유사어/반의어
  synonyms?: string[]
  antonyms?: string[]
  
  // 메타데이터
  difficulty: number  // 1-10
  frequency: number   // 1-10
  isSAT: boolean
  
  // 소스 정보
  source: {
    type: 'veterans_pdf' | 'vocabulary_api' | 'words_v2' | 'manual' | 'ai_generated'
    collection: string  // 원본 컬렉션명
    originalId: string  // 원본 문서 ID
  }
  
  // 타임스탬프
  createdAt: Date
  updatedAt: Date  
  
  // 사용자별 학습 상태 (옵셔널)
  studyStatus?: {
    studied: boolean
    masteryLevel: number  // 0-100
    reviewCount: number
    lastStudied?: Date
  }
}

/**
 * 소스별 원본 타입들
 */
export type SourceWordType = Word | PhotoVocabularyWord

// 타입 임포트
import type { Word } from './vocabulary-v2'
import type { PhotoVocabularyWord } from './photo-vocabulary-collection'

/**
 * 타입 가드 함수들
 */
export function isWordV2(word: any): word is Word {
  return word && 
    Array.isArray(word.definitions) && 
    word.definitions.length > 0 &&
    'definition' in word.definitions[0]
}

export function isPhotoVocabulary(word: any): boolean {
  return word && 
    ('context' in word || 'collectionId' in word)
}

/**
 * 변환 유틸리티 타입
 */
export interface ConversionResult {
  success: boolean
  word?: UnifiedWord
  error?: string
  sourceType: 'word_v2' | 'ai_generated' | 'photo_vocabulary' | 'unknown'
}

/**
 * 어댑터 설정
 */
export interface AdapterConfig {
  // 우선순위 (높을수록 먼저 확인)
  collectionPriority: string[]
  
  // 캐시 설정
  enableCache: boolean
  cacheTimeout: number // ms
  
  // 마이그레이션 설정
  enableBackgroundMigration: boolean
  migrationBatchSize: number
}

export const defaultAdapterConfig: AdapterConfig = {
  collectionPriority: [
    'words', 
    'ai_generated_words', 
    'photo_vocabulary_words', 
    'personal_collection_words',
    'veterans_vocabulary',  // Legacy V.ZIP 3K PDF words
    'vocabulary'  // Legacy SAT words
  ],
  enableCache: true,
  cacheTimeout: 5 * 60 * 1000, // 5분
  enableBackgroundMigration: true,
  migrationBatchSize: 10
}