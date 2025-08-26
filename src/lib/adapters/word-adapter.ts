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
import { cacheManager } from '../cache/local-cache-manager'

export class WordAdapter {
  private config: AdapterConfig
  private memoryCache = new Map<string, { word: UnifiedWord; timestamp: number }>()
  
  constructor(config: Partial<AdapterConfig> = {}) {
    this.config = { ...defaultAdapterConfig, ...config }
  }

  /**
   * 여러 ID로 단어 일괄 조회 (성능 최적화)
   */
  async getWordsByIds(ids: string[]): Promise<UnifiedWord[]> {
    const words: UnifiedWord[] = []
    const uncachedIds: string[] = []
    
    // 메모리 캐시와 로컬 스토리지 캐시에서 먼저 확인
    if (this.config.enableCache) {
      for (const id of ids) {
        // 메모리 캐시 확인
        const cached = this.getCachedWord(id)
        if (cached) {
          words.push(cached)
          continue
        }
        
        // 로컬 스토리지 캐시 확인
        const localCached = await cacheManager.get<UnifiedWord>(`word_${id}`)
        if (localCached) {
          words.push(localCached)
          // 메모리 캐시에도 저장
          this.setCachedWord(id, localCached)
        } else {
          uncachedIds.push(id)
        }
      }
    } else {
      uncachedIds.push(...ids)
    }
    
    // 캐시되지 않은 단어들을 컬렉션별로 일괄 조회
    if (uncachedIds.length > 0) {
      console.log(`[WordAdapter] 🔍 Batch fetching ${uncachedIds.length} uncached words`)
      console.log(`[WordAdapter] Target word IDs:`, uncachedIds)
      
      const newWordsToCache: Array<{ id: string; word: UnifiedWord }> = []
      
      for (const collectionName of this.config.collectionPriority) {
        console.log(`[WordAdapter] 🔍 Searching in collection: ${collectionName}`)
        
        // ✅ AI Generated 컬렉션도 클라이언트에서 접근 허용 (학습 기능을 위해)
        // if (typeof window !== 'undefined' && collectionName === 'ai_generated_words') {
        //   continue
        // }
        
        if (uncachedIds.length === 0) break // 모든 단어를 찾았으면 중단
        
        try {
          // Firestore는 'in' 쿼리에서 최대 30개까지 지원
          const chunks = []
          for (let i = 0; i < uncachedIds.length; i += 30) {
            chunks.push(uncachedIds.slice(i, i + 30))
          }
          
          for (const chunk of chunks) {
            const q = query(
              collection(db, collectionName),
              where('__name__', 'in', chunk)
            )
            
            const querySnapshot = await getDocs(q)
            console.log(`[WordAdapter] 🔍 Collection ${collectionName} returned ${querySnapshot.docs.length} documents`)
            
            querySnapshot.docs.forEach(doc => {
              console.log(`[WordAdapter] 🔍 Found document ID: ${doc.id} in ${collectionName}`)
              const result = this.convertToUnified(doc.data(), collectionName, doc.id)
              if (result.success && result.word) {
                console.log(`[WordAdapter] ✅ Successfully converted: ${result.word.word}`)
                words.push(result.word)
                // 메모리 캐시에 저장
                this.setCachedWord(doc.id, result.word)
                // 로컬 캐시 저장을 위해 배열에 추가
                newWordsToCache.push({ id: doc.id, word: result.word })
                // 찾은 ID를 제거
                const index = uncachedIds.indexOf(doc.id)
                if (index > -1) {
                  uncachedIds.splice(index, 1)
                  console.log(`[WordAdapter] ✅ Removed ${doc.id} from uncached list`)
                }
              } else {
                console.log(`[WordAdapter] ❌ Failed to convert document ${doc.id}:`, result)
              }
            })
          }
        } catch (error) {
          console.warn(`[WordAdapter] Error batch fetching from ${collectionName}:`, error)
        }
      }
      
      // 로컬 스토리지에 일괄 저장 (비동기로 처리)
      if (newWordsToCache.length > 0) {
        Promise.all(
          newWordsToCache.map(({ id, word }) => 
            cacheManager.set(`word_${id}`, word).catch(err => 
              console.warn(`[WordAdapter] Failed to cache word ${id}:`, err)
            )
          )
        ).then(() => {
          console.log(`[WordAdapter] Cached ${newWordsToCache.length} words to localStorage`)
        })
      }
    }
    
    console.log(`[WordAdapter] Batch fetch complete: ${words.length} words loaded`)
    return words
  }

  /**
   * ID로 단어 조회 (모든 컬렉션에서 검색)
   */
  async getWordById(id: string): Promise<UnifiedWord | null> {
    // 메모리 캐시 확인
    if (this.config.enableCache) {
      const cached = this.getCachedWord(id)
      if (cached) return cached
    }
    
    // 로컬 스토리지 캐시 확인
    const localCached = await cacheManager.get<UnifiedWord>(`word_${id}`)
    if (localCached) {
      console.log(`[WordAdapter] Cache hit for word ID: ${id}`)
      // 메모리 캐시에도 저장
      this.setCachedWord(id, localCached)
      return localCached
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
            // 양쪽 캐시에 저장
            this.setCachedWord(id, result.word)
            await cacheManager.set(`word_${id}`, result.word)
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
          englishDefinition: word.englishDefinition,
          etymology: word.etymology?.origin || word.etymology,
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
        
        case 'personal_collection_words':
          return this.convertFromPersonalCollection(data, id)
        
        case 'veterans_vocabulary':
          return this.convertFromVeteransVocabulary(data, id)
        
        case 'vocabulary':
          return this.convertFromLegacyVocabulary(data, id)
        
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

    // 정의 추출 - 두 가지 구조 모두 지원
    let definition: string
    let examples: string[] = []
    
    // Case 1: definition 필드가 직접 있는 경우 (새로운 구조)
    if (data.definition && typeof data.definition === 'string') {
      definition = data.definition
      examples = data.examples || []
    }
    // Case 2: definitions 배열이 있는 경우 (구 구조)
    else if (data.definitions?.[0]) {
      const firstDefinition = data.definitions[0]
      definition = firstDefinition.definition || firstDefinition.text || 'No definition available'
      examples = firstDefinition.examples || []
    }
    // Case 3: 둘 다 없는 경우
    else {
      definition = 'No definition available'
      examples = data.examples || []
    }

    // Determine source type based on data
    const sourceType = data.source?.type === 'ai_generated' ? 'ai_generated' : 'words_v2'

    const word: UnifiedWord = {
      id,
      word: data.word || '',
      definition,
      examples,
      partOfSpeech: data.partOfSpeech || ['n.'],
      pronunciation: data.pronunciation,
      englishDefinition: data.englishDefinition,
      etymology: data.etymology,
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
      englishDefinition: data.englishDefinition,  // English definition
      etymology: data.etymology,  // Actual etymology
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
      englishDefinition: data.englishDefinition,
      etymology: data.etymology,
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
   * Personal Collection Words → UnifiedWord 변환
   */
  private convertFromPersonalCollection(data: any, id: string): ConversionResult {
    const convertTimestamp = (ts: any): Date => {
      if (ts instanceof Timestamp) return ts.toDate()
      if (ts instanceof Date) return ts
      if (typeof ts === 'string') return new Date(ts)
      return new Date()
    }

    const word: UnifiedWord = {
      id,
      word: data.word || '',
      definition: data.definition || data.korean || 'No definition available',
      examples: data.example ? [data.example] : (data.examples || []),
      partOfSpeech: data.partOfSpeech || [],
      pronunciation: data.pronunciation || null,
      englishDefinition: data.englishDefinition || null,
      etymology: data.etymology || null,
      synonyms: data.synonyms || [],
      antonyms: data.antonyms || [],
      difficulty: data.difficulty || 5,
      frequency: data.frequency || 5,
      isSAT: false, // Personal collection words are not SAT words
      source: {
        type: 'manual',
        collection: 'personal_collection_words',
        originalId: id
      },
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    }

    return {
      success: true,
      word,
      sourceType: 'unknown' // personal collection doesn't have a specific source type yet
    }
  }

  /**
   * Veterans Vocabulary (레거시) → UnifiedWord 변환
   */
  private convertFromVeteransVocabulary(data: any, id: string): ConversionResult {
    const convertTimestamp = (ts: any): Date => {
      if (ts instanceof Timestamp) return ts.toDate()
      if (ts instanceof Date) return ts
      if (typeof ts === 'string') return new Date(ts)
      return new Date()
    }

    const word: UnifiedWord = {
      id,
      word: data.word || '',
      definition: data.korean || data.definition || 'No definition available',
      examples: data.example ? [data.example] : (data.examples || []),
      partOfSpeech: data.partOfSpeech || ['n.'],
      pronunciation: data.pronunciation || null,
      englishDefinition: data.english || data.englishDefinition || null,
      etymology: data.etymology || null,
      synonyms: data.synonyms || [],
      antonyms: data.antonyms || [],
      difficulty: data.difficulty || 5,
      frequency: data.frequency || 5,
      isSAT: true, // Veterans vocabulary is SAT vocabulary
      source: {
        type: 'manual',
        collection: 'veterans_vocabulary',
        originalId: id
      },
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    }

    return {
      success: true,
      word,
      sourceType: 'veterans_pdf'
    }
  }

  /**
   * Legacy Vocabulary → UnifiedWord 변환
   */
  private convertFromLegacyVocabulary(data: any, id: string): ConversionResult {
    const convertTimestamp = (ts: any): Date => {
      if (ts instanceof Timestamp) return ts.toDate()
      if (ts instanceof Date) return ts
      if (typeof ts === 'string') return new Date(ts)
      return new Date()
    }

    const word: UnifiedWord = {
      id,
      word: data.word || '',
      definition: data.korean || data.definition || 'No definition available',
      examples: data.example ? [data.example] : (data.examples || []),
      partOfSpeech: data.partOfSpeech || ['n.'],
      pronunciation: data.pronunciation || null,
      englishDefinition: data.english || data.englishDefinition || null,
      etymology: data.etymology || null,
      synonyms: data.synonyms || [],
      antonyms: data.antonyms || [],
      difficulty: data.difficulty || 5,
      frequency: data.frequency || 5,
      isSAT: data.isSAT !== false,
      source: {
        type: 'manual',
        collection: 'vocabulary',
        originalId: id
      },
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    }

    return {
      success: true,
      word,
      sourceType: 'manual'
    }
  }

  /**
   * 캐시 관리
   */
  private getCachedWord(id: string): UnifiedWord | null {
    const cached = this.memoryCache.get(id)
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.word
    }
    this.memoryCache.delete(id)
    return null
  }

  private setCachedWord(id: string, word: UnifiedWord): void {
    this.memoryCache.set(id, {
      word,
      timestamp: Date.now()
    })
  }

  /**
   * 캐시 초기화
   */
  async clearCache(): Promise<void> {
    // 메모리 캐시 초기화
    this.memoryCache.clear()
    // 로컬 스토리지 캐시 초기화
    await cacheManager.removePattern('word_.*')
    console.log('[WordAdapter] All caches cleared')
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
   * 특정 단어장의 단어들 가져오기
   */
  async getWordsByCollection(collectionId: string, wordbookType: string, limit: number = 2000): Promise<UnifiedWord[]> {
    try {
      console.log(`[WordAdapter] 📚 Loading words from collection: ${collectionId} (type: ${wordbookType}, limit: ${limit})`)
      
      if (wordbookType === 'official') {
        // 공식 단어장: vocabulary_collections에서 words 배열을 읽고 각 단어 ID로 words 컬렉션에서 가져오기
        const collectionDoc = await getDoc(doc(db, 'vocabulary_collections', collectionId))
        if (!collectionDoc.exists()) {
          console.warn(`[WordAdapter] Official collection not found: ${collectionId}`)
          return []
        }
        
        const collectionData = collectionDoc.data()
        const wordIds = collectionData.words || []
        
        console.log(`[WordAdapter] Official collection has ${wordIds.length} word IDs`)
        
        // 배치 쿼리 최적화: getWordsByIds 메서드 사용
        const limitedWordIds = wordIds.slice(0, limit)
        const words = await this.getWordsByIds(limitedWordIds)
        
        return words
        
      } else if (wordbookType === 'personal') {
        // 개인 단어장: personal_collections에서 words 배열을 읽고 각 단어 ID로 personal_collection_words 컬렉션에서 가져오기
        const collectionDoc = await getDoc(doc(db, 'personal_collections', collectionId))
        if (!collectionDoc.exists()) {
          console.warn(`[WordAdapter] Personal collection not found: ${collectionId}`)
          return []
        }
        
        const collectionData = collectionDoc.data()
        const wordIds = collectionData.words || []
        
        console.log(`[WordAdapter] Personal collection "${collectionData.name}" has ${wordIds.length} word IDs`)
        
        // 각 wordId로 단어 가져오기 (배치 처리)
        const words: UnifiedWord[] = []
        
        if (wordIds.length > 0) {
          const batchSize = 10 // Firestore 제한
          
          for (let i = 0; i < wordIds.length; i += batchSize) {
            const batch = wordIds.slice(i, i + batchSize)
            
            // Personal collections store IDs from personal_collection_words
            const q = query(
              collection(db, 'personal_collection_words'),
              where('__name__', 'in', batch)
            )
            const snapshot = await getDocs(q)
            
            console.log(`[WordAdapter] Batch ${i/batchSize + 1}: Found ${snapshot.docs.length} words in 'personal_collection_words' collection`)
            
            snapshot.docs.forEach(doc => {
              const result = this.convertToUnified(doc.data(), 'personal_collection_words', doc.id)
              if (result.success && result.word) {
                // Update source to indicate it's from a personal collection
                result.word.source.collection = `personal_${collectionId}`
                words.push(result.word)
              }
            })
            
            // If no results, try 'words' collection as fallback (for migrated collections)
            if (snapshot.docs.length === 0) {
              console.log(`[WordAdapter] Trying words collection for batch ${i/batchSize + 1}`)
              const q2 = query(
                collection(db, 'words'),
                where('__name__', 'in', batch)
              )
              const snapshot2 = await getDocs(q2)
              
              console.log(`[WordAdapter] Found ${snapshot2.docs.length} words in 'words' collection`)
              
              snapshot2.docs.forEach(doc => {
                const result = this.convertToUnified(doc.data(), 'words', doc.id)
                if (result.success && result.word) {
                  result.word.source.collection = `personal_${collectionId}`
                  words.push(result.word)
                }
              })
            }
          }
        } else {
          // If no word IDs, this might be a legacy personal collection
          // Try to load from veterans_vocabulary with a different approach
          console.log(`[WordAdapter] Personal collection has no word IDs, checking if it's a legacy collection`)
          
          // Check if the collection name matches certain patterns
          const collectionName = collectionData.name || ''
          if (collectionName.includes('V.ZIP') || collectionName.includes('veterans')) {
            // Load all veterans_vocabulary words
            const q = query(
              collection(db, 'veterans_vocabulary'),
              firestoreLimit(limit)
            )
            const snapshot = await getDocs(q)
            
            console.log(`[WordAdapter] Loading legacy collection: found ${snapshot.docs.length} words in veterans_vocabulary`)
            
            snapshot.docs.forEach(doc => {
              const result = this.convertToUnified(doc.data(), 'veterans_vocabulary', doc.id)
              if (result.success && result.word) {
                result.word.source.collection = `personal_${collectionId}`
                words.push(result.word)
              }
            })
          }
        }
        
        console.log(`[WordAdapter] Successfully loaded ${words.length} words from personal collection "${collectionData.name}"`)
        return words
        
      } else if (wordbookType === 'photo') {
        // 사진 단어장: photo_vocabulary_words에서 collectionId로 필터링
        const q = query(
          collection(db, 'photo_vocabulary_words'),
          where('collectionId', '==', collectionId),
          firestoreLimit(limit)
        )
        
        const snapshot = await getDocs(q)
        const words: UnifiedWord[] = []
        
        snapshot.docs.forEach(doc => {
          const result = this.convertToUnified(doc.data(), 'photo_vocabulary_words', doc.id)
          if (result.success && result.word) {
            words.push(result.word)
          }
        })
        
        return words
        
      } else if (wordbookType === 'ai-generated' || collectionId.startsWith('ai-generated-')) {
        // AI-generated 가상 단어장: ai_generated_words에서 userId로 필터링
        const userId = collectionId.replace('ai-generated-', '')
        const q = query(
          collection(db, 'ai_generated_words'),
          where('userId', '==', userId),
          firestoreLimit(limit)
        )
        
        const snapshot = await getDocs(q)
        const words: UnifiedWord[] = []
        
        console.log(`[WordAdapter] Loading ${snapshot.docs.length} AI-generated words for user ${userId}`)
        
        snapshot.docs.forEach(doc => {
          const result = this.convertToUnified(doc.data(), 'ai_generated_words', doc.id)
          if (result.success && result.word) {
            // Mark as AI-generated
            result.word.source.type = 'ai_generated'
            result.word.source.collection = collectionId
            words.push(result.word)
          }
        })
        
        return words
        
      } else {
        console.warn(`[WordAdapter] Unknown wordbook type: ${wordbookType}`)
        return []
      }
      
    } catch (error) {
      console.error(`[WordAdapter] Error getting words from collection ${collectionId}:`, error)
      return []
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
          englishDefinition: '',
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