/**
 * Simplified WordAdapter V3
 * 
 * 단일 통합 구조(UnifiedWordV3)만 처리하는 간소화된 어댑터
 * - 복잡한 변환 로직 제거
 * - 단일 컬렉션에서 읽기/쓰기
 * - 성능 최적화 (배치 처리, 캐싱)
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  limit as firestoreLimit,
  orderBy,
  startAfter,
  DocumentData,
  Timestamp,
  writeBatch,
  updateDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase/firestore-v2'
import { UnifiedWordV3, validateUnifiedWordV3, calculateQualityScore } from '@/types/unified-word-v3'
import { LocalCacheManager } from '@/lib/cache/local-cache-manager'

// Cache manager instance
const cacheManager = new LocalCacheManager({
  prefix: 'word_v3_',
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 10 * 1024 * 1024  // 10MB
})

export class WordAdapterV3 {
  private readonly COLLECTION_NAME = 'words_v3'
  private readonly BATCH_SIZE = 30  // Firestore 'in' query limit
  private memoryCache: Map<string, UnifiedWordV3> = new Map()
  
  constructor() {
    // Initialize adapter
    this.initializeCache()
  }
  
  private async initializeCache() {
    // Pre-load frequently used words into memory cache
    try {
      const frequentWords = await this.getFrequentWords(100)
      frequentWords.forEach(word => {
        this.memoryCache.set(word.id, word)
      })
      console.log(`[WordAdapterV3] Pre-loaded ${frequentWords.length} frequent words`)
    } catch (error) {
      console.warn('[WordAdapterV3] Failed to pre-load cache:', error)
    }
  }
  
  /**
   * Get word by ID (with multi-level caching)
   */
  async getWordById(id: string): Promise<UnifiedWordV3 | null> {
    // 1. Check memory cache
    if (this.memoryCache.has(id)) {
      return this.memoryCache.get(id)!
    }
    
    // 2. Check local storage cache
    const cached = await cacheManager.get<UnifiedWordV3>(`word_${id}`)
    if (cached) {
      this.memoryCache.set(id, cached) // Add to memory cache
      return cached
    }
    
    // 3. Fetch from Firestore
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const word = this.documentToWord(docSnap.data(), id)
        
        // Cache the result
        this.memoryCache.set(id, word)
        await cacheManager.set(`word_${id}`, word)
        
        return word
      }
    } catch (error) {
      console.error(`[WordAdapterV3] Error fetching word ${id}:`, error)
    }
    
    return null
  }
  
  /**
   * Get multiple words by IDs (optimized batch fetch)
   */
  async getWordsByIds(ids: string[]): Promise<UnifiedWordV3[]> {
    const words: UnifiedWordV3[] = []
    const uncachedIds: string[] = []
    
    // 1. Check caches first
    for (const id of ids) {
      const cached = this.memoryCache.get(id) || 
                    await cacheManager.get<UnifiedWordV3>(`word_${id}`)
      
      if (cached) {
        words.push(cached)
      } else {
        uncachedIds.push(id)
      }
    }
    
    // 2. Batch fetch uncached words
    if (uncachedIds.length > 0) {
      for (let i = 0; i < uncachedIds.length; i += this.BATCH_SIZE) {
        const batch = uncachedIds.slice(i, i + this.BATCH_SIZE)
        
        try {
          const q = query(
            collection(db, this.COLLECTION_NAME),
            where('__name__', 'in', batch)
          )
          
          const snapshot = await getDocs(q)
          
          snapshot.forEach(doc => {
            const word = this.documentToWord(doc.data(), doc.id)
            words.push(word)
            
            // Cache the result
            this.memoryCache.set(word.id, word)
            cacheManager.set(`word_${word.id}`, word) // async, no await
          })
        } catch (error) {
          console.error('[WordAdapterV3] Batch fetch error:', error)
        }
      }
    }
    
    return words
  }
  
  /**
   * Search words by text
   */
  async searchWords(searchText: string, limit: number = 10): Promise<UnifiedWordV3[]> {
    const normalizedSearch = searchText.toLowerCase().trim()
    
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('normalizedWord', '>=', normalizedSearch),
        where('normalizedWord', '<=', normalizedSearch + '\uf8ff'),
        orderBy('normalizedWord'),
        firestoreLimit(limit)
      )
      
      const snapshot = await getDocs(q)
      const words: UnifiedWordV3[] = []
      
      snapshot.forEach(doc => {
        words.push(this.documentToWord(doc.data(), doc.id))
      })
      
      return words
    } catch (error) {
      console.error('[WordAdapterV3] Search error:', error)
      return []
    }
  }
  
  /**
   * Get words by category
   */
  async getWordsByCategory(category: string, limit: number = 100): Promise<UnifiedWordV3[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('categories', 'array-contains', category),
        orderBy('importance', 'desc'),
        firestoreLimit(limit)
      )
      
      const snapshot = await getDocs(q)
      const words: UnifiedWordV3[] = []
      
      snapshot.forEach(doc => {
        words.push(this.documentToWord(doc.data(), doc.id))
      })
      
      return words
    } catch (error) {
      console.error('[WordAdapterV3] Category query error:', error)
      return []
    }
  }
  
  /**
   * Get frequently used words (for pre-caching)
   */
  private async getFrequentWords(limit: number): Promise<UnifiedWordV3[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('frequency', 'desc'),
        firestoreLimit(limit)
      )
      
      const snapshot = await getDocs(q)
      const words: UnifiedWordV3[] = []
      
      snapshot.forEach(doc => {
        words.push(this.documentToWord(doc.data(), doc.id))
      })
      
      return words
    } catch (error) {
      console.error('[WordAdapterV3] Frequent words query error:', error)
      return []
    }
  }
  
  /**
   * Save or update a word
   */
  async saveWord(word: Partial<UnifiedWordV3>): Promise<boolean> {
    try {
      // Validate word
      const validation = validateUnifiedWordV3(word)
      if (!validation.valid) {
        console.error('[WordAdapterV3] Validation failed:', validation.errors)
        return false
      }
      
      // Calculate quality score
      if (!word.quality) {
        word.quality = {
          score: calculateQualityScore(word),
          validated: false
        }
      } else if (!word.quality.score) {
        word.quality.score = calculateQualityScore(word)
      }
      
      // Set timestamps
      const now = Timestamp.now()
      if (!word.createdAt) word.createdAt = now.toDate()
      word.updatedAt = now.toDate()
      
      // Save to Firestore
      const docRef = doc(db, this.COLLECTION_NAME, word.id || word.word!)
      await setDoc(docRef, word, { merge: true })
      
      // Update caches
      const savedWord = { ...word, id: docRef.id } as UnifiedWordV3
      this.memoryCache.set(docRef.id, savedWord)
      await cacheManager.set(`word_${docRef.id}`, savedWord)
      
      return true
    } catch (error) {
      console.error('[WordAdapterV3] Save error:', error)
      return false
    }
  }
  
  /**
   * Delete a word
   */
  async deleteWord(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, id))
      
      // Remove from caches
      this.memoryCache.delete(id)
      await cacheManager.remove(`word_${id}`)
      
      return true
    } catch (error) {
      console.error('[WordAdapterV3] Delete error:', error)
      return false
    }
  }
  
  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.memoryCache.clear()
    await cacheManager.clear()
    console.log('[WordAdapterV3] All caches cleared')
  }
  
  /**
   * Convert Firestore document to UnifiedWordV3
   */
  private documentToWord(data: DocumentData, id: string): UnifiedWordV3 {
    // Handle Timestamp conversion
    const convertTimestamp = (ts: any): Date => {
      if (ts instanceof Timestamp) return ts.toDate()
      if (ts instanceof Date) return ts
      if (typeof ts === 'string') return new Date(ts)
      return new Date()
    }
    
    return {
      id,
      word: data.word || '',
      normalizedWord: data.normalizedWord || '',
      
      definition: data.definition || null,
      englishDefinition: data.englishDefinition || null,
      alternativeDefinitions: data.alternativeDefinitions,
      
      pronunciation: data.pronunciation || null,
      partOfSpeech: data.partOfSpeech || [],
      
      examples: data.examples || [],
      contextualExamples: data.contextualExamples,
      
      synonyms: data.synonyms || [],
      antonyms: data.antonyms || [],
      relatedWords: data.relatedWords,
      
      etymology: data.etymology || null,
      wordOrigin: data.wordOrigin,
      
      difficulty: data.difficulty || 5,
      frequency: data.frequency || 5,
      importance: data.importance || 5,
      
      categories: data.categories || [],
      tags: data.tags || [],
      
      source: data.source || {
        type: 'legacy_import',
        collection: 'unknown',
        addedAt: new Date()
      },
      
      quality: data.quality || {
        score: 0,
        validated: false
      },
      
      aiGenerated: data.aiGenerated,
      
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      
      searchTokens: data.searchTokens,
      phoneticCode: data.phoneticCode
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      memoryCache: {
        size: this.memoryCache.size,
        words: Array.from(this.memoryCache.keys()).slice(0, 10)
      },
      localStorage: cacheManager.getStats()
    }
  }
}

// Export singleton instance
export const wordAdapterV3 = new WordAdapterV3()