/**
 * 통합 단어장 타입 시스템
 * 모든 단어장 타입 (공식, 개인, 사진, 공개)을 단일 인터페이스로 통합
 */

import type { WordbookType } from './user-settings'
import type { OfficialCollection, PersonalCollection } from './collections'

// 통합 단어장 인터페이스
export interface UnifiedWordbook {
  id: string
  name: string
  description?: string
  type: WordbookType
  category?: string           // SAT, TOEFL, etc.
  wordCount: number
  createdAt: Date
  updatedAt: Date
  
  // 선택 상태 (클라이언트 사이드에서만 사용)
  isSelected?: boolean
  
  // 학습 진도 정보
  progress?: WordbookProgress
  
  // 메타데이터
  metadata: WordbookMetadata
  
  // 소유권 정보
  ownership?: {
    userId?: string           // 개인 단어장의 소유자
    isPublic?: boolean        // 공개 여부
    canEdit?: boolean         // 편집 권한
  }
}

// 학습 진도 정보
export interface WordbookProgress {
  studied: number             // 학습한 단어 수
  mastered: number            // 마스터한 단어 수
  lastStudiedAt?: Date        // 마지막 학습 시간
  accuracyRate?: number       // 정답률 (0-100)
  averageTime?: number        // 평균 학습 시간 (초)
}

// 단어장 메타데이터
export interface WordbookMetadata {
  difficulty?: 'easy' | 'medium' | 'hard'
  estimatedTime?: number      // 완주 예상 시간 (분)
  tags?: string[]
  thumbnail?: string          // 썸네일 이미지 URL
  publisher?: string          // 출판사 또는 제작자
  version?: string            // 버전 정보
  language?: 'ko' | 'en'      // 주요 언어
  
  // 통계 정보
  statistics?: {
    totalUsers?: number       // 사용 중인 사용자 수 (공식 단어장)
    avgMastery?: number       // 평균 숙련도
    completionRate?: number   // 완료율
    rating?: number           // 평점 (1-5)
  }
}

// 단어장 필터 옵션
export interface WordbookFilter {
  type?: WordbookType | WordbookType[]
  category?: string[]
  difficulty?: ('easy' | 'medium' | 'hard')[]
  tags?: string[]
  search?: string             // 이름/설명 검색
  isSelected?: boolean        // 선택된 단어장만
  hasProgress?: boolean       // 학습 진도가 있는 것만
  sortBy?: 'name' | 'created' | 'updated' | 'wordCount' | 'progress'
  sortOrder?: 'asc' | 'desc'
}

// 단어장 목록 응답
export interface WordbookListResponse {
  wordbooks: UnifiedWordbook[]
  totalCount: number
  hasMore: boolean
  nextCursor?: string
}

// 단어장 선택/해제 액션
export interface WordbookAction {
  type: 'select' | 'unselect' | 'toggle'
  wordbookId: string
  priority?: number           // 선택 시 우선순위
}

// 타입 가드 함수들
export function isOfficialWordbook(wordbook: UnifiedWordbook): boolean {
  return wordbook.type === 'official'
}

export function isPersonalWordbook(wordbook: UnifiedWordbook): boolean {
  return wordbook.type === 'personal'
}

export function isPhotoWordbook(wordbook: UnifiedWordbook): boolean {
  return wordbook.type === 'photo'
}

export function isPublicWordbook(wordbook: UnifiedWordbook): boolean {
  return wordbook.type === 'public'
}

// 어댑터 함수: 기존 컬렉션을 UnifiedWordbook으로 변환
export function adaptOfficialCollection(
  collection: OfficialCollection,
  progress?: WordbookProgress
): UnifiedWordbook {
  return {
    id: collection.id,
    name: collection.displayName || collection.name,
    description: collection.description,
    type: 'official',
    category: collection.category,
    wordCount: collection.wordCount,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    progress,
    metadata: {
      difficulty: collection.difficulty,
      tags: collection.tags || [],
      publisher: collection.source?.publisher || '알 수 없음',
      version: collection.version || '1.0.0',
      statistics: collection.statistics
    }
  }
}

export function adaptPersonalCollection(
  collection: PersonalCollection,
  progress?: WordbookProgress
): UnifiedWordbook {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description || '',
    type: 'personal',
    wordCount: collection.wordCount,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    progress,
    metadata: {
      tags: collection.tags || [],
      estimatedTime: Math.ceil(collection.wordCount * 2) // 단어당 2분 추정
    },
    ownership: {
      userId: collection.userId,
      isPublic: !collection.isPrivate,
      canEdit: true
    }
  }
}

// 단어장 그룹핑 유틸리티
export function groupWordbooksByType(wordbooks: UnifiedWordbook[]): Record<WordbookType, UnifiedWordbook[]> {
  return wordbooks.reduce((groups, wordbook) => {
    if (!groups[wordbook.type]) {
      groups[wordbook.type] = []
    }
    groups[wordbook.type].push(wordbook)
    return groups
  }, {} as Record<WordbookType, UnifiedWordbook[]>)
}

// 단어장 정렬 유틸리티
export function sortWordbooks(
  wordbooks: UnifiedWordbook[],
  sortBy: WordbookFilter['sortBy'] = 'name',
  order: WordbookFilter['sortOrder'] = 'asc'
): UnifiedWordbook[] {
  const sorted = [...wordbooks].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'created':
        comparison = a.createdAt.getTime() - b.createdAt.getTime()
        break
      case 'updated':
        comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
        break
      case 'wordCount':
        comparison = a.wordCount - b.wordCount
        break
      case 'progress':
        const aProgress = a.progress?.studied || 0
        const bProgress = b.progress?.studied || 0
        comparison = aProgress - bProgress
        break
      default:
        comparison = 0
    }
    
    return order === 'asc' ? comparison : -comparison
  })
  
  return sorted
}

// 단어장 검색 유틸리티
export function searchWordbooks(
  wordbooks: UnifiedWordbook[],
  query: string
): UnifiedWordbook[] {
  if (!query.trim()) {
    return wordbooks
  }
  
  const lowercaseQuery = query.toLowerCase()
  
  return wordbooks.filter(wordbook => 
    wordbook.name.toLowerCase().includes(lowercaseQuery) ||
    wordbook.description?.toLowerCase().includes(lowercaseQuery) ||
    wordbook.metadata.tags?.some(tag => 
      tag.toLowerCase().includes(lowercaseQuery)
    )
  )
}

// 단어장 통계 계산 유틸리티
export function calculateWordbookStats(wordbooks: UnifiedWordbook[]): {
  totalWordbooks: number
  totalWords: number
  studiedWords: number
  masteredWords: number
  avgProgress: number
} {
  const totalWordbooks = wordbooks.length
  const totalWords = wordbooks.reduce((sum, wb) => sum + (wb.wordCount || 0), 0)
  const studiedWords = wordbooks.reduce((sum, wb) => sum + (wb.progress?.studied || 0), 0)
  const masteredWords = wordbooks.reduce((sum, wb) => sum + (wb.progress?.mastered || 0), 0)
  const avgProgress = totalWords > 0 ? (studiedWords / totalWords) * 100 : 0

  return {
    totalWordbooks,
    totalWords,
    studiedWords,
    masteredWords,
    avgProgress: Math.round(avgProgress * 10) / 10 // 소수점 첫째 자리
  }
}