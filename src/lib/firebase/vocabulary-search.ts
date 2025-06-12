// SAT Vocabulary Database - Advanced Search System

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Query,
  DocumentData,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from './config'
import type { VocabularyWord } from '@/types'
import { FIREBASE_COLLECTIONS } from '@/lib/constants'

export interface SearchFilters {
  // 텍스트 검색
  searchText?: string
  
  // 필터 조건
  difficulty?: {
    min?: number
    max?: number
  }
  frequency?: {
    min?: number
    max?: number
  }
  partOfSpeech?: string[]
  categories?: string[]
  satLevel?: boolean
  
  // 정렬 및 페이지네이션
  sortBy?: 'frequency' | 'difficulty' | 'word' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  limitCount?: number
  lastDoc?: QueryDocumentSnapshot<DocumentData>
}

export interface SearchResult {
  words: VocabularyWord[]
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
  totalCount?: number
  hasMore: boolean
}

export class VocabularySearchService {
  // 기본 검색 (단순 텍스트 매칭)
  static async basicSearch(
    searchText: string,
    limitCount: number = 20
  ): Promise<VocabularyWord[]> {
    try {
      const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)
      
      // Firestore는 full-text search를 지원하지 않으므로 
      // 단어의 시작 부분 매칭 사용
      const q = query(
        vocabularyRef,
        where('word', '>=', searchText.toLowerCase()),
        where('word', '<=', searchText.toLowerCase() + '\uf8ff'),
        orderBy('word'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as VocabularyWord[]
    } catch (error) {
      console.error('Error in basic search:', error)
      throw error
    }
  }

  // 고급 필터 검색
  static async advancedSearch(filters: SearchFilters): Promise<SearchResult> {
    try {
      const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)
      let q: Query<DocumentData> = vocabularyRef

      // 필터 조건 적용
      const constraints: any[] = []

      // SAT 레벨 필터
      if (filters.satLevel !== undefined) {
        constraints.push(where('satLevel', '==', filters.satLevel))
      }

      // 난이도 범위 필터
      if (filters.difficulty?.min !== undefined) {
        constraints.push(where('difficulty', '>=', filters.difficulty.min))
      }
      if (filters.difficulty?.max !== undefined) {
        constraints.push(where('difficulty', '<=', filters.difficulty.max))
      }

      // 빈도 범위 필터 (난이도와 함께 사용시 복합 인덱스 필요)
      if (filters.frequency?.min !== undefined && !filters.difficulty) {
        constraints.push(where('frequency', '>=', filters.frequency.min))
      }
      if (filters.frequency?.max !== undefined && !filters.difficulty) {
        constraints.push(where('frequency', '<=', filters.frequency.max))
      }

      // 카테고리 필터 (array-contains-any 사용)
      if (filters.categories && filters.categories.length > 0) {
        constraints.push(where('categories', 'array-contains-any', filters.categories))
      }

      // 품사 필터
      if (filters.partOfSpeech && filters.partOfSpeech.length > 0) {
        constraints.push(where('partOfSpeech', 'array-contains-any', filters.partOfSpeech))
      }

      // 정렬 설정
      const sortField = filters.sortBy || 'frequency'
      const sortDirection = filters.sortOrder || 'desc'
      constraints.push(orderBy(sortField, sortDirection))

      // 페이지네이션
      if (filters.lastDoc) {
        constraints.push(startAfter(filters.lastDoc))
      }

      const limitCount = filters.limitCount || 20
      constraints.push(limit(limitCount))

      // 쿼리 실행
      q = query(vocabularyRef, ...constraints)
      const snapshot = await getDocs(q)

      const words = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as VocabularyWord[]

      // 텍스트 검색이 있는 경우 클라이언트 사이드 필터링
      let filteredWords = words
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase()
        filteredWords = words.filter(word => 
          word.word.toLowerCase().includes(searchLower) ||
          word.definitions.some(def => def.text.toLowerCase().includes(searchLower)) ||
          word.examples.some(ex => ex.toLowerCase().includes(searchLower))
        )
      }

      // 빈도 범위 필터 (클라이언트 사이드 - 복합 쿼리 제한으로 인해)
      if (filters.frequency && filters.difficulty) {
        if (filters.frequency.min !== undefined) {
          filteredWords = filteredWords.filter(word => word.frequency >= filters.frequency!.min!)
        }
        if (filters.frequency.max !== undefined) {
          filteredWords = filteredWords.filter(word => word.frequency <= filters.frequency!.max!)
        }
      }

      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
      const hasMore = snapshot.docs.length === limitCount

      return {
        words: filteredWords,
        lastDoc,
        hasMore
      }
    } catch (error) {
      console.error('Error in advanced search:', error)
      throw error
    }
  }

  // 카테고리별 검색
  static async searchByCategories(
    categories: string[],
    limitCount: number = 20
  ): Promise<VocabularyWord[]> {
    try {
      const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)
      const q = query(
        vocabularyRef,
        where('categories', 'array-contains-any', categories),
        orderBy('frequency', 'desc'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as VocabularyWord[]
    } catch (error) {
      console.error('Error searching by categories:', error)
      throw error
    }
  }

  // 학습 추천 검색 (사용자 레벨 기반)
  static async getRecommendedWords(
    userLevel: number, // 1-10
    excludeWordIds: string[] = [],
    limitCount: number = 10
  ): Promise<VocabularyWord[]> {
    try {
      const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)
      
      // 사용자 레벨 ±1 범위의 단어 추천
      const minDifficulty = Math.max(1, userLevel - 1)
      const maxDifficulty = Math.min(10, userLevel + 1)

      const q = query(
        vocabularyRef,
        where('satLevel', '==', true),
        where('difficulty', '>=', minDifficulty),
        where('difficulty', '<=', maxDifficulty),
        orderBy('difficulty'),
        orderBy('frequency', 'desc'),
        limit(limitCount * 2) // 여분으로 가져와서 필터링
      )

      const snapshot = await getDocs(q)
      let words = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as VocabularyWord[]

      // 이미 학습한 단어 제외
      words = words.filter(word => !excludeWordIds.includes(word.id))

      return words.slice(0, limitCount)
    } catch (error) {
      console.error('Error getting recommended words:', error)
      throw error
    }
  }

  // 복습 대상 단어 검색 (진도 기반)
  static async getReviewWords(
    userProgressData: Array<{ wordId: string; masteryLevel: number; lastStudied: Date }>,
    limitCount: number = 15
  ): Promise<VocabularyWord[]> {
    try {
      // 마스터리 레벨이 낮거나 오래 전에 학습한 단어들을 우선
      const reviewCandidates = userProgressData
        .filter(progress => 
          progress.masteryLevel < 0.8 || // 마스터리 80% 미만
          Date.now() - progress.lastStudied.getTime() > 7 * 24 * 60 * 60 * 1000 // 7일 이상 지남
        )
        .sort((a, b) => a.masteryLevel - b.masteryLevel) // 낮은 마스터리부터
        .slice(0, limitCount)
        .map(p => p.wordId)

      if (reviewCandidates.length === 0) return []

      // Firestore에서 해당 단어들 가져오기
      const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)
      const words: VocabularyWord[] = []

      // Firestore의 'in' 쿼리는 최대 10개까지만 지원하므로 배치로 처리
      const batches = []
      for (let i = 0; i < reviewCandidates.length; i += 10) {
        batches.push(reviewCandidates.slice(i, i + 10))
      }

      for (const batch of batches) {
        const q = query(vocabularyRef, where('__name__', 'in', batch))
        const snapshot = await getDocs(q)
        
        const batchWords = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as VocabularyWord[]
        
        words.push(...batchWords)
      }

      return words
    } catch (error) {
      console.error('Error getting review words:', error)
      throw error
    }
  }
}
