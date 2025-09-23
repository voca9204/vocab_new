/**
 * DirectWordAdapter - Simplified direct access to words_v3 collection
 * V4 Refactoring: Removes bridge pattern, direct Firestore access only
 */

import { UnifiedWord } from '@/types/unified-word'
import { db } from '@/lib/firebase/config'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  QueryConstraint,
  writeBatch,
  updateDoc
} from 'firebase/firestore'

// 캐시 레이어 (메모리)
const memoryCache = new Map<string, UnifiedWord>()
const CACHE_TTL = 5 * 60 * 1000 // 5분

export class DirectWordAdapter {
  private readonly collectionName = 'words_v3'
  private cacheTimestamp = Date.now()

  constructor() {
    // 5분마다 캐시 클리어
    setInterval(() => {
      if (Date.now() - this.cacheTimestamp > CACHE_TTL) {
        memoryCache.clear()
        this.cacheTimestamp = Date.now()
      }
    }, CACHE_TTL)
  }

  /**
   * 단어 ID로 직접 조회
   */
  async getWordById(id: string): Promise<UnifiedWord | null> {
    // 1. 메모리 캐시 확인
    if (memoryCache.has(id)) {
      return memoryCache.get(id)!
    }

    // 2. Firestore 직접 조회
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      const word = this.convertToUnifiedWord(docSnap.id, docSnap.data())
      memoryCache.set(id, word)
      return word
    } catch (error) {
      console.error(`Error fetching word ${id}:`, error)
      return null
    }
  }

  /**
   * 여러 단어 한번에 조회 (배치)
   */
  async getWordsByIds(ids: string[]): Promise<UnifiedWord[]> {
    if (!ids.length) return []

    // 중복 제거
    const uniqueIds = [...new Set(ids)]
    const results: UnifiedWord[] = []
    const missingIds: string[] = []

    // 1. 캐시에서 찾기
    for (const id of uniqueIds) {
      if (memoryCache.has(id)) {
        results.push(memoryCache.get(id)!)
      } else {
        missingIds.push(id)
      }
    }

    // 2. 캐시에 없는 것만 Firestore에서 조회
    if (missingIds.length > 0) {
      // Firestore 'in' 쿼리는 최대 30개 제한
      const chunks = this.chunkArray(missingIds, 30)

      for (const chunk of chunks) {
        const q = query(
          collection(db, this.collectionName),
          where('__name__', 'in', chunk)
        )

        const snapshot = await getDocs(q)
        snapshot.forEach(doc => {
          const word = this.convertToUnifiedWord(doc.id, doc.data())
          results.push(word)
          memoryCache.set(doc.id, word)
        })
      }
    }

    return results
  }

  /**
   * 카테고리와 난이도로 단어 조회
   * 먼저 vocabulary_collections에서 컬렉션을 찾고, 그 컬렉션의 wordIds로 단어를 가져옴
   */
  async getWordsByCollection(category: string, difficulty: string): Promise<UnifiedWord[]> {
    const cacheKey = `${category}_${difficulty}`

    try {
      // 1. vocabulary_collections에서 해당 컬렉션 찾기
      const collectionName = `${category.toUpperCase()} ${
        difficulty === 'beginner' ? '초급' :
        difficulty === 'intermediate' ? '중급' : '고급'
      }`

      const collQuery = query(
        collection(db, 'vocabulary_collections'),
        where('name', '==', collectionName)
      )

      const collSnapshot = await getDocs(collQuery)

      if (collSnapshot.empty) {
        console.log(`No collection found for ${collectionName}`)
        return []
      }

      const collectionDoc = collSnapshot.docs[0]
      const collectionData = collectionDoc.data()

      // wordIds 또는 words 필드 확인
      const wordIds = collectionData.wordIds || collectionData.words || []

      if (wordIds.length === 0) {
        console.log(`No word IDs in collection ${collectionName}`)
        return []
      }

      // 2. wordIds로 단어들 가져오기
      const words = await this.getWordsByIds(wordIds)

      return words
    } catch (error) {
      console.error(`Error fetching collection ${category}/${difficulty}:`, error)
      return []
    }
  }

  /**
   * 검색
   */
  async searchWords(searchTerm: string, maxResults = 10): Promise<UnifiedWord[]> {
    const term = searchTerm.toLowerCase()

    try {
      // Firestore는 full-text search를 지원하지 않으므로 prefix search만 가능
      const q = query(
        collection(db, this.collectionName),
        where('word', '>=', term),
        where('word', '<=', term + '\uf8ff'),
        orderBy('word', 'asc'),
        limit(maxResults)
      )

      const snapshot = await getDocs(q)
      const words: UnifiedWord[] = []

      snapshot.forEach(doc => {
        const word = this.convertToUnifiedWord(doc.id, doc.data())
        words.push(word)
        memoryCache.set(doc.id, word)
      })

      return words
    } catch (error) {
      console.error('Search error:', error)
      return []
    }
  }

  /**
   * 학습 진도 업데이트 (사용자별)
   */
  async updateStudyProgress(
    userId: string,
    wordId: string,
    progress: { studied?: boolean; mastered?: boolean }
  ): Promise<void> {
    try {
      const userWordRef = doc(db, 'user_words', `${userId}_${wordId}`)
      await updateDoc(userWordRef, {
        ...progress,
        lastStudiedAt: new Date(),
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  /**
   * Firestore 문서를 UnifiedWord로 변환
   */
  private convertToUnifiedWord(id: string, data: DocumentData): UnifiedWord {
    return {
      id,
      word: data.word || '',
      definition: data.definition || '',
      partOfSpeech: data.partOfSpeech || [],
      level: data.level || data.difficulty || 'intermediate',
      examples: data.examples || [],
      synonyms: data.synonyms || [],
      antonyms: data.antonyms || [],
      etymology: data.etymology || '',
      pronunciation: data.pronunciation || '',
      category: data.category || 'SAT',
      difficulty: data.difficulty || 'intermediate',
      tags: data.tags || [],
      frequency: data.frequency,
      commonMistakes: data.commonMistakes || [],
      relatedWords: data.relatedWords || [],
      confusables: data.confusables || [],
      koreanTranslation: data.koreanTranslation,
      detailedExplanation: data.detailedExplanation,
      source: data.source || 'words_v3',
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date()
    }
  }

  /**
   * 배열을 청크로 분할 (Firestore 'in' 쿼리 제한 대응)
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    memoryCache.clear()
    this.cacheTimestamp = Date.now()
  }

  /**
   * 캐시 상태 확인
   */
  getCacheStats(): { size: number; timestamp: number } {
    return {
      size: memoryCache.size,
      timestamp: this.cacheTimestamp
    }
  }
}

// 싱글톤 인스턴스
export const directWordAdapter = new DirectWordAdapter()