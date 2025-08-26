// Collection Management Types

// 공식 단어장 카테고리
export type OfficialCategory = 'SAT' | 'TOEFL' | 'TOEIC' | '수능' | 'GRE' | 'IELTS' | '기본'

// 난이도 레벨
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

// 소스 타입
export type CollectionSourceType = 'pdf' | 'csv' | 'txt' | 'manual' | 'photo' | 'import'

// 공식 단어장 (관리자 전용)
export interface OfficialCollection {
  id: string
  name: string                    // 예: "TOEFL 공식 단어장"
  displayName: string              // UI 표시명
  category: OfficialCategory
  description: string
  words: string[]                  // 포함된 단어 ID 배열
  wordCount: number
  difficulty: DifficultyLevel
  isOfficial: true                 // 항상 true
  uploadedBy: string               // 관리자 ID
  uploadedByEmail?: string         // 관리자 이메일
  version: string                  // "1.0.0"
  tags: string[]                   // ["시험대비", "필수", "2024"]
  source: {
    type: CollectionSourceType
    originalFile?: string
    publisher?: string            // "ETS", "College Board" 등
  }
  statistics?: {
    totalUsers: number            // 학습 중인 사용자 수
    avgMastery: number            // 평균 숙련도
    completionRate: number        // 완료율
  }
  createdAt: Date
  updatedAt: Date
}

// 개인 단어장 (모든 사용자)
export interface PersonalCollection {
  id: string
  userId: string                   // 소유자 ID
  userEmail?: string               // 소유자 이메일
  name: string                     // 사용자 지정 이름
  description?: string
  words: string[]                  // 포함된 단어 ID 배열
  wordCount: number
  isPrivate: boolean               // true: 비공개, false: 공개
  isShared: boolean                // 공유 여부
  sharedWith?: string[]            // 공유된 사용자 ID 목록
  tags: string[]                   // 사용자 정의 태그
  source: {
    type: CollectionSourceType
    filename?: string
    uploadedAt: Date
  }
  statistics?: {
    studied: number                // 학습한 단어 수
    mastered: number               // 마스터한 단어 수
    lastStudiedAt?: Date
  }
  createdAt: Date
  updatedAt: Date
}

// 통합 컬렉션 타입 (읽기용)
export type VocabularyCollection = OfficialCollection | PersonalCollection

// 컬렉션 타입 구분 헬퍼
export function isOfficialCollection(
  collection: VocabularyCollection
): collection is OfficialCollection {
  return 'isOfficial' in collection && collection.isOfficial === true
}

// 사용자 플랜
export type UserPlan = 'free' | 'premium' | 'pro' | 'admin'

// 사용자 쿼터
export interface UserQuota {
  userId: string
  plan: UserPlan
  limits: {
    maxVocabularies: number         // free: 5, premium: 50, pro: unlimited
    maxWordsPerVocabulary: number   // free: 100, premium: 1000, pro: 10000
    maxTotalWords: number           // free: 500, premium: 10000, pro: unlimited
    maxFileSize: number             // free: 5MB, premium: 20MB, pro: 100MB
  }
  usage: {
    vocabularyCount: number
    totalWordCount: number
    storageUsed: number             // bytes
  }
  updatedAt: Date
}

// API Request/Response 타입들

// 공식 단어장 업로드 요청 (관리자 전용)
export interface UploadOfficialCollectionRequest {
  category: OfficialCategory
  name: string
  displayName: string
  description: string
  difficulty: DifficultyLevel
  words: Array<{
    word: string
    definition: string
    partOfSpeech?: string[]
    examples?: string[]
    etymology?: string
    pronunciation?: string
  }>
  metadata: {
    publisher?: string
    version: string
    tags: string[]
  }
}

// 개인 단어장 업로드 요청
export interface UploadPersonalCollectionRequest {
  name: string
  description?: string
  isPrivate: boolean
  file?: File
  words?: Array<{
    word: string
    definition: string
    partOfSpeech?: string[]
    examples?: string[]
  }>
  tags?: string[]
}

// 컬렉션 응답
export interface CollectionResponse {
  success: boolean
  collection?: VocabularyCollection
  error?: string
  quotaUsage?: {
    used: number
    limit: number
    remaining: number
  }
}

// 컬렉션 목록 응답
export interface CollectionsListResponse {
  collections: VocabularyCollection[]
  totalCount: number
  quota?: UserQuota
  hasMore: boolean
  nextCursor?: string
}

// 컬렉션 필터 옵션
export interface CollectionFilterOptions {
  category?: OfficialCategory
  difficulty?: DifficultyLevel
  isPrivate?: boolean
  tags?: string[]
  search?: string
  userId?: string
  sortBy?: 'name' | 'created' | 'updated' | 'wordCount'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  cursor?: string
}

// 컬렉션 공유 요청
export interface ShareCollectionRequest {
  collectionId: string
  shareType: 'link' | 'email' | 'public'
  userIds?: string[]
  expiresIn?: number               // hours
}

// 컬렉션 통계
export interface CollectionStatistics {
  totalCollections: number
  officialCollections: number
  personalCollections: number
  totalWords: number
  totalUsers: number
  categoryBreakdown: {
    [key in OfficialCategory]?: number
  }
  popularCollections: Array<{
    id: string
    name: string
    wordCount: number
    userCount: number
  }>
}