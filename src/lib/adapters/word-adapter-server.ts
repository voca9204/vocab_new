/**
 * WordAdapter Server Version - For use in API routes
 * Can access all collections including ai_generated_words
 */

import { getAdminFirestore } from '../firebase/admin'
import type { 
  UnifiedWord, 
  SourceWordType, 
  ConversionResult, 
  AdapterConfig
} from '@/types/unified-word'
import { defaultAdapterConfig, isWordV2 } from '@/types/unified-word'

export class WordAdapterServer {
  private config: AdapterConfig
  
  constructor(config: Partial<AdapterConfig> = {}) {
    this.config = { ...defaultAdapterConfig, ...config }
  }

  /**
   * ID로 단어 조회 (모든 컬렉션에서 검색)
   */
  async getWordById(id: string): Promise<UnifiedWord | null> {
    const db = getAdminFirestore()
    
    // 컬렉션 우선순위에 따라 검색 - 서버에서는 모든 컬렉션 접근 가능
    for (const collectionName of this.config.collectionPriority) {
      try {
        console.log(`[WordAdapterServer] Checking ${collectionName} for ID: ${id}`)
        const docSnap = await db.collection(collectionName).doc(id).get()
        
        if (docSnap.exists) {
          console.log(`[WordAdapterServer] Found document in ${collectionName}`)
          const result = this.convertToUnified(docSnap.data(), collectionName, id)
          if (result.success && result.word) {
            console.log(`[WordAdapterServer] Successfully converted word from ${collectionName}:`, result.word.word)
            return result.word
          }
        }
      } catch (error) {
        console.warn(`[WordAdapterServer] Error reading from ${collectionName}:`, error)
      }
    }

    return null
  }

  /**
   * 유연한 단어 검색 (여러 변형 시도) - 서버에서 모든 컬렉션 검색
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
    
    console.log(`[WordAdapterServer] Searching for "${wordText}" with variations:`, uniqueVariations)
    
    // 각 변형에 대해 검색 시도
    for (const variation of uniqueVariations) {
      const result = await this.getWordByText(variation)
      if (result) {
        console.log(`[WordAdapterServer] Found match with variation "${variation}":`, result.word)
        return result
      }
    }
    
    console.log(`[WordAdapterServer] No matches found for "${wordText}" and its variations`)
    return null
  }

  /**
   * 텍스트로 단어 검색 (모든 컬렉션)
   */
  async getWordByText(wordText: string): Promise<UnifiedWord | null> {
    const db = getAdminFirestore()
    const normalizedWord = wordText.toLowerCase().trim()
    
    // 모든 컬렉션에서 검색
    for (const collectionName of this.config.collectionPriority) {
      try {
        console.log(`[WordAdapterServer] Searching "${wordText}" in ${collectionName}`)
        
        // word 필드로 직접 검색
        const querySnap = await db.collection(collectionName)
          .where('word', '==', wordText)
          .limit(1)
          .get()
        
        if (!querySnap.empty) {
          const doc = querySnap.docs[0]
          console.log(`[WordAdapterServer] Found "${wordText}" in ${collectionName}`)
          
          const result = this.convertToUnified(doc.data(), collectionName, doc.id)
          if (result.success && result.word) {
            return result.word
          }
        }
        
        // Case-insensitive 검색 시도
        if (wordText !== normalizedWord) {
          const caseInsensitiveSnap = await db.collection(collectionName)
            .where('word', '==', normalizedWord)
            .limit(1)
            .get()
          
          if (!caseInsensitiveSnap.empty) {
            const doc = caseInsensitiveSnap.docs[0]
            console.log(`[WordAdapterServer] Found "${normalizedWord}" in ${collectionName} (case-insensitive)`)
            
            const result = this.convertToUnified(doc.data(), collectionName, doc.id)
            if (result.success && result.word) {
              return result.word
            }
          }
        }
      } catch (error) {
        console.warn(`[WordAdapterServer] Error searching in ${collectionName}:`, error)
      }
    }

    return null
  }

  /**
   * 데이터를 UnifiedWord로 변환
   */
  private convertToUnified(
    data: any, 
    collection: string, 
    id: string
  ): ConversionResult {
    try {
      // 타임스탬프 변환 헬퍼
      const convertTimestamp = (ts: any): Date => {
        if (ts && ts.toDate) return ts.toDate()
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
      if (ts && ts.toDate) return ts.toDate()
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
      if (ts && ts.toDate) return ts.toDate()
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
      if (ts && ts.toDate) return ts.toDate()
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
   * Personal Collection Words → UnifiedWord 변환
   */
  private convertFromPersonalCollection(data: any, id: string): ConversionResult {
    const convertTimestamp = (ts: any): Date => {
      if (ts && ts.toDate) return ts.toDate()
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
      etymology: data.etymology || null,
      realEtymology: data.realEtymology || null,
      synonyms: (() => {
        const syns = data.synonyms || [];
        if (syns.length > 0) {
          console.log(`[WordAdapterServer] Personal collection word "${data.word}" has ${syns.length} synonyms:`, syns);
        }
        return syns;
      })(),
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
}