/**
 * WordAdapter - 모든 레거시 단어 구조를 UnifiedWord로 변환
 * veterans_vocabulary, vocabulary, words 컬렉션을 통합 처리
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { 
  UnifiedWord, 
  SourceWordType, 
  ConversionResult, 
  AdapterConfig
} from '@/types/unified-word'
import { defaultAdapterConfig, isWordV2 } from '@/types/unified-word'

export class WordAdapter {
  private config: AdapterConfig
  private cache = new Map<string, { word: UnifiedWord; timestamp: number }>()
  
  constructor(config: Partial<AdapterConfig> = {}) {
    this.config = { ...defaultAdapterConfig, ...config }
  }

  /**
   * ID로 단어 조회 (모든 컬렉션에서 검색)
   */
  async getWordById(id: string): Promise<UnifiedWord | null> {
    // 캐시 확인
    if (this.config.enableCache) {
      const cached = this.getCachedWord(id)
      if (cached) return cached
    }

    // 컬렉션 우선순위에 따라 검색
    for (const collectionName of this.config.collectionPriority) {
      // 클라이언트 사이드에서는 ai_generated_words 컬렉션 검색 제외 (권한 문제)
      if (typeof window !== 'undefined' && collectionName === 'ai_generated_words') {
        continue
      }
      
      try {
        console.log(`[WordAdapter] Checking ${collectionName} for ID: ${id}`)
        const docRef = doc(db, collectionName, id)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          console.log(`[WordAdapter] Found document in ${collectionName}`)
          const result = this.convertToUnified(docSnap.data(), collectionName, id)
          if (result.success && result.word) {
            console.log(`[WordAdapter] Successfully converted word from ${collectionName}:`, result.word.word)
            this.setCachedWord(id, result.word)
            return result.word
          }
        }
      } catch (error) {
        console.warn(`[WordAdapter] Error reading from ${collectionName}:`, error)
      }
    }

    return null
  }

  /**
   * 단어 텍스트로 검색
   */
  async getWordByText(wordText: string): Promise<UnifiedWord | null> {
    const normalizedWord = wordText.toLowerCase().trim()
    
    // 각 컬렉션에서 검색 (클라이언트에서는 ai_generated_words 제외)
    for (const collectionName of this.config.collectionPriority) {
      // 클라이언트 사이드에서는 ai_generated_words 컬렉션 검색 제외 (권한 문제)
      if (typeof window !== 'undefined' && collectionName === 'ai_generated_words') {
        continue
      }
      
      try {
        const q = query(
          collection(db, collectionName),
          where('word', '==', normalizedWord),
          firestoreLimit(1)
        )
        
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0]
          const result = this.convertToUnified(doc.data(), collectionName, doc.id)
          if (result.success && result.word) {
            this.setCachedWord(doc.id, result.word)
            return result.word
          }
        }
      } catch (error) {
        console.warn(`[WordAdapter] Error searching in ${collectionName}:`, error)
      }
    }

    return null
  }

  /**
   * 유연한 단어 검색 (여러 변형 시도)
   */
  async searchWordFlexible(wordText: string): Promise<UnifiedWord | null> {
    const baseWord = wordText.toLowerCase().trim()
    
    // 다양한 변형 시도
    const variations = [
      baseWord,
      baseWord.replace(/s$/, ''), // 복수형 제거
      baseWord.replace(/ed$/, ''), // 과거형 제거  
      baseWord.replace(/ing$/, ''), // 현재분사 제거
      baseWord.replace(/ly$/, ''), // 부사형 제거
      baseWord.replace(/er$/, ''), // 비교급 제거
      baseWord.replace(/est$/, ''), // 최상급 제거
      baseWord + 's', // 복수형 추가
      baseWord + 'ed', // 과거형 추가
      baseWord + 'ing', // 현재분사 추가
    ]

    // 중복 제거
    const uniqueVariations = [...new Set(variations)]
    
    console.log(`[WordAdapter] Searching for "${wordText}" with variations:`, uniqueVariations)
    
    // 각 변형에 대해 검색 시도
    for (const variation of uniqueVariations) {
      const result = await this.getWordByText(variation)
      if (result) {
        console.log(`[WordAdapter] Found match with variation "${variation}":`, result.word)
        return result
      }
    }
    
    console.log(`[WordAdapter] No matches found for "${wordText}" and its variations`)
    return null
  }

  /**
   * 단어 목록 조회 (페이지네이션 지원)
   */
  async getWords(limit: number = 50, startAfter?: string): Promise<UnifiedWord[]> {
    // firestore-v2 서비스를 사용하여 사용자 설정에 따른 단어 가져오기
    try {
      const { auth } = await import('../firebase/config')
      const userId = auth.currentUser?.uid
      
      if (!userId) {
        console.log('[WordAdapter] No user logged in')
        return []
      }
      
      const { vocabularyServiceV2 } = await import('../firebase/firestore-v2')
      const { words } = await vocabularyServiceV2.getAll(undefined, limit, userId)
      
      console.log(`[WordAdapter] Loaded ${words.length} words from vocabularyServiceV2`)
      
      // 사용자의 학습 상태 가져오기
      const { UserWordService } = await import('../vocabulary-v2/user-word-service')
      const userWordService = new UserWordService()
      const userWords = await userWordService.getUserWords(userId)
      
      // userWords를 Map으로 변환하여 빠른 조회
      const userWordMap = new Map(userWords.map(uw => [uw.wordId, uw]))
      
      console.log(`[WordAdapter] Loaded ${userWords.length} user study records`)
      
      // VocabularyWord를 UnifiedWord로 변환 (사용자 학습 상태 포함)
      return words.map(word => {
        const userWord = userWordMap.get(word.id)
        
        return {
          id: word.id,
          word: word.word,
          definition: word.definitions[0]?.text || word.definition || '',
          etymology: word.etymology?.origin,
          realEtymology: word.realEtymology,
          partOfSpeech: word.partOfSpeech,
          examples: word.examples || word.definitions[0]?.examples || [],
          pronunciation: word.pronunciation,
          synonyms: word.synonyms || [],
          antonyms: word.antonyms || [],
          difficulty: word.difficulty,
          frequency: word.frequency,
          isSAT: word.satLevel,
          studyStatus: userWord ? {
            studied: true,
            masteryLevel: userWord.studyStatus?.masteryLevel || 0,
            reviewCount: userWord.studyStatus?.reviewCount || 0,
            lastStudied: userWord.studyStatus?.lastStudied
          } : {
            studied: false,
            masteryLevel: 0,
            reviewCount: 0
          },
          source: {
            type: word.source?.type === 'ai_generated' ? 'ai_generated' : 
                  word.source?.type === 'pdf' ? 'manual' : 
                  word.source?.type || 'manual',
            collection: 'words',
            originalId: word.id
          },
          createdAt: word.createdAt,
          updatedAt: word.updatedAt
        }
      })
    } catch (error) {
      console.error('[WordAdapter] Error in getWords:', error)
      return []
    }
  }

  /**
   * 데이터를 UnifiedWord로 변환
   */
  private convertToUnified(
    data: DocumentData, 
    collection: string, 
    id: string
  ): ConversionResult {
    try {
      // 타임스탬프 변환 헬퍼
      const convertTimestamp = (ts: any): Date => {
        if (ts instanceof Timestamp) return ts.toDate()
        if (ts instanceof Date) return ts
        if (typeof ts === 'string') return new Date(ts)
        return new Date()
      }

      // 컬렉션별 변환
      switch (collection) {
        case 'words':
          return this.convertFromWordV2(data, id)
        
        case 'ai_generated_words':
          return this.convertFromAIGenerated(data, id)
        
        case 'photo_vocabulary_words':
          return this.convertFromPhotoVocabulary(data, id)
        
        default:
          // 타입 추론으로 변환 시도
          if (isWordV2(data)) {
            return this.convertFromWordV2(data, id)
          }
          
          return {
            success: false,
            error: `Unknown data structure in collection: ${collection}`,
            sourceType: 'unknown'
          }
      }
    } catch (error) {
      return {
        success: false,
        error: `Conversion error: ${error}`,
        sourceType: 'unknown'
      }
    }
  }


  /**
   * Word (V2) → UnifiedWord 변환
   */
  private convertFromWordV2(data: any, id: string): ConversionResult {
    const convertTimestamp = (ts: any): Date => {
      if (ts instanceof Timestamp) return ts.toDate()
      if (ts instanceof Date) return ts
      return new Date()
    }

    // 첫 번째 정의 추출
    const firstDefinition = data.definitions?.[0]
    const definition = firstDefinition?.definition || 'No definition available'
    const examples = firstDefinition?.examples || []

    // Determine source type based on data
    const sourceType = data.source?.type === 'ai_generated' ? 'ai_generated' : 'words_v2'

    const word: UnifiedWord = {
      id,
      word: data.word || '',
      definition,
      examples,
      partOfSpeech: data.partOfSpeech || ['n.'],
      pronunciation: data.pronunciation,
      etymology: data.etymology,
      realEtymology: data.realEtymology,
      synonyms: data.synonyms || [],
      antonyms: data.antonyms || [],
      difficulty: data.difficulty || 5,
      frequency: data.frequency || 5,
      isSAT: data.isSAT !== false,
      source: {
        type: sourceType,
        collection: 'words',
        originalId: id
      },
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    }

    return {
      success: true,
      word,
      sourceType: 'word_v2'
    }
  }

  /**
   * AI Generated Words → UnifiedWord 변환
   */
  private convertFromAIGenerated(data: any, id: string): ConversionResult {
    const convertTimestamp = (ts: any): Date => {
      if (ts instanceof Timestamp) return ts.toDate()
      if (ts instanceof Date) return ts
      return new Date()
    }

    // AI generated words have definitions as an array with nested examples
    const firstDefinition = data.definitions?.[0]
    const definition = firstDefinition?.definition || 'No definition available'
    const examples = firstDefinition?.examples || []

    const word: UnifiedWord = {
      id,
      word: data.word || '',
      definition,
      examples,  // Extract examples from first definition
      partOfSpeech: data.partOfSpeech || ['n.'],
      pronunciation: data.pronunciation,
      etymology: data.etymology,  // English definition
      realEtymology: data.realEtymology,  // Actual etymology
      synonyms: data.synonyms || [],
      antonyms: data.antonyms || [],
      difficulty: data.difficulty || 5,
      frequency: data.frequency || 5,
      isSAT: data.isSAT !== false,
      source: {
        type: 'ai_generated',
        collection: 'ai_generated_words',
        originalId: id
      },
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    }

    return {
      success: true,
      word,
      sourceType: 'ai_generated'
    }
  }

  /**
   * Photo Vocabulary → UnifiedWord 변환
   */
  private convertFromPhotoVocabulary(data: any, id: string): ConversionResult {
    const convertTimestamp = (ts: any): Date => {
      if (ts instanceof Timestamp) return ts.toDate()
      if (ts instanceof Date) return ts
      return new Date()
    }

    const word: UnifiedWord = {
      id,
      word: data.word || '',
      definition: data.definition || data.context || 'No definition available',
      examples: data.examples || [],
      partOfSpeech: data.partOfSpeech || [],
      pronunciation: data.pronunciation,
      etymology: data.etymology,
      realEtymology: data.realEtymology,
      synonyms: data.synonyms || [],
      antonyms: data.antonyms || [],
      difficulty: data.difficulty || 5,
      frequency: data.frequency || 5,
      isSAT: data.isSAT || false,
      source: {
        type: 'manual',
        collection: 'photo_vocabulary_words',
        originalId: id
      },
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      studyStatus: data.studyStatus
    }

    return {
      success: true,
      word,
      sourceType: 'photo_vocabulary'
    }
  }

  /**
   * 캐시 관리
   */
  private getCachedWord(id: string): UnifiedWord | null {
    const cached = this.cache.get(id)
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.word
    }
    this.cache.delete(id)
    return null
  }

  private setCachedWord(id: string, word: UnifiedWord): void {
    this.cache.set(id, {
      word,
      timestamp: Date.now()
    })
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 통계 정보
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      config: this.config
    }
  }

  /**
   * 활성 사진 단어 가져오기 (최근 48시간)
   */
  async getActivePhotoWords(userId: string, limit: number = 100): Promise<UnifiedWord[]> {
    try {
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - 48)
      
      const q = query(
        collection(db, 'photo_vocabulary'),
        where('userId', '==', userId),
        where('isActive', '==', true),
        where('createdAt', '>', Timestamp.fromDate(cutoffTime)),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit)
      )

      const snapshot = await getDocs(q)
      const words: UnifiedWord[] = []

      snapshot.docs.forEach(doc => {
        const data = doc.data()
        words.push({
          id: doc.id,
          word: data.word,
          definition: data.definition || 'Definition pending...',
          etymology: '',
          partOfSpeech: [],
          examples: data.context ? [data.context] : [],
          pronunciation: '',
          synonyms: [],
          antonyms: [],
          difficulty: 5,
          frequency: 5,
          isSAT: false,
          source: {
            type: 'manual' as const,
            collection: 'photo_vocabulary',
            originalId: doc.id
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.createdAt?.toDate() || new Date(),
          studyStatus: {
            studied: data.tested || false,
            masteryLevel: data.correct ? 100 : 0,
            reviewCount: data.tested ? 1 : 0
          }
        })
      })

      return words
    } catch (error) {
      console.error('[WordAdapter] Error getting photo words:', error)
      return []
    }
  }
}