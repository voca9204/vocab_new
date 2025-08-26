/**
 * Unified Word Adapter - Uses the new words_v3 collection
 * 
 * This adapter works with the migrated unified word structure.
 * All words are now in a single 'words_v3' collection.
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
  Timestamp,
  DocumentData
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { UnifiedWord } from '@/types/unified-word'
import { LocalCacheManager } from '@/lib/cache/local-cache-manager'
import { logger } from '@/lib/utils/logger'

// Initialize cache manager
const cacheManager = new LocalCacheManager()

export class UnifiedWordAdapter {
  private readonly COLLECTION_NAME = 'words_v3'
  private readonly BATCH_SIZE = 30  // Firestore 'in' query limit
  private memoryCache: Map<string, UnifiedWord> = new Map()
  
  constructor() {
    logger.info('Initialized with words_v3 collection')
    // Check for stale cache on initialization
    this.checkAndClearStaleCache()
  }
  
  private async checkAndClearStaleCache() {
    const CACHE_VERSION_KEY = 'word_cache_version'
    const CURRENT_VERSION = '2.2.0' // Etymology field fixes
    
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY)
    if (storedVersion !== CURRENT_VERSION) {
      logger.info('Cache version mismatch, clearing cache...')
      await cacheManager.clear()
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_VERSION)
    }
  }
  
  /**
   * Convert Firestore document to UnifiedWord
   */
  private documentToWord(data: DocumentData, id: string): UnifiedWord {
    // Handle Timestamp conversion
    const convertTimestamp = (ts: any): Date => {
      if (ts instanceof Timestamp) return ts.toDate()
      if (ts instanceof Date) return ts
      if (typeof ts === 'string') return new Date(ts)
      return new Date()
    }
    
    // Derive isSAT from categories for backward compatibility
    const isSAT = data.categories?.includes('SAT') || false
    
    return {
      id,
      word: data.word || '',
      normalizedWord: data.normalizedWord || data.word?.toLowerCase() || '',
      
      definition: data.definition || 'No definition available',
      englishDefinition: data.englishDefinition || null,
      
      pronunciation: data.pronunciation || null,
      partOfSpeech: data.partOfSpeech || [],
      
      examples: data.examples || [],
      
      synonyms: data.synonyms || [],
      antonyms: data.antonyms || [],
      
      etymology: data.etymology || null,
      
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
      
      aiGenerated: data.aiGenerated || null,
      
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      
      // Backward compatibility
      isSAT
    }
  }
  
  /**
   * Get word by ID
   */
  async getWordById(id: string): Promise<UnifiedWord | null> {
    // Check memory cache first
    if (this.memoryCache.has(id)) {
      return this.memoryCache.get(id)!
    }
    
    // Check local storage cache
    const cached = await cacheManager.get<UnifiedWord>(`${id}`)
    if (cached) {
      this.memoryCache.set(id, cached)
      return cached
    }
    
    // Fetch from Firestore
    if (!db) {
      logger.error('Firestore database not initialized')
      return null
    }
    
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const word = this.documentToWord(docSnap.data(), id)
        
        // Cache the result
        this.memoryCache.set(id, word)
        await cacheManager.set(`${id}`, word)
        
        return word
      }
    } catch (error) {
      logger.error(`Error fetching word ${id}:`, error)
    }
    
    return null
  }
  
  /**
   * Get multiple words by IDs (batch fetch)
   */
  async getWordsByIds(ids: string[]): Promise<UnifiedWord[]> {
    if (ids.length === 0) return []
    
    const words: UnifiedWord[] = []
    const uncachedIds: string[] = []
    
    // Check caches first
    for (const id of ids) {
      const cached = this.memoryCache.get(id) || 
                    await cacheManager.get<UnifiedWord>(`${id}`)
      
      if (cached) {
        words.push(cached)
      } else {
        uncachedIds.push(id)
      }
    }
    
    // Batch fetch uncached words
    if (uncachedIds.length > 0) {
      logger.debug(`Batch fetching ${uncachedIds.length} uncached words`)
      
      // Ensure db is initialized
      if (!db) {
        logger.error('Firestore database not initialized')
        return words
      }
      
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
            cacheManager.set(`${word.id}`, word).catch(err => 
              logger.warn(`Failed to cache word ${word.id}:`, err)
            )
          })
        } catch (error) {
          logger.error('Batch fetch error:', error)
        }
      }
    }
    
    logger.info(`Returned ${words.length} words`)
    return words
  }
  
  /**
   * Get words by collection ID (for compatibility)
   */
  async getWordsByCollection(collectionId: string, collectionType?: string): Promise<UnifiedWord[]> {
    logger.debug(`Getting words for collection: ${collectionId} (type: ${collectionType})`)
    
    // Ensure db is initialized
    if (!db) {
      logger.error('Firestore database not initialized')
      return []
    }
    
    try {
      // First, get the collection document to find word IDs
      let collectionDoc;
      
      if (collectionType === 'personal' || collectionId.includes('personal_')) {
        collectionDoc = await getDoc(doc(db, 'personal_collections', collectionId))
      } else {
        // Try official collections first
        collectionDoc = await getDoc(doc(db, 'vocabulary_collections', collectionId))
        
        if (!collectionDoc.exists()) {
          // Try personal collections as fallback
          collectionDoc = await getDoc(doc(db, 'personal_collections', collectionId))
        }
      }
      
      if (!collectionDoc.exists()) {
        logger.warn(`Collection not found: ${collectionId}`)
        return []
      }
      
      const collectionData = collectionDoc.data()
      const wordIds = collectionData.wordIds || []
      
      if (wordIds.length === 0) {
        logger.info(`Collection ${collectionId} has no words`)
        return []
      }
      
      logger.info(`Collection ${collectionId} has ${wordIds.length} words`)
      
      // Use batch fetch to get all words
      return this.getWordsByIds(wordIds)
    } catch (error) {
      logger.error(`Error fetching collection words: ${error}`)
      return []
    }
  }
  
  /**
   * Search words by text
   */
  async searchWordByText(wordText: string): Promise<UnifiedWord | null> {
    const normalizedWord = wordText.toLowerCase().trim()
    
    // Ensure db is initialized
    if (!db) {
      logger.error('Firestore database not initialized')
      return null
    }
    
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('normalizedWord', '==', normalizedWord),
        firestoreLimit(1)
      )
      
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        const word = this.documentToWord(doc.data(), doc.id)
        
        // Cache the result
        this.memoryCache.set(word.id, word)
        await cacheManager.set(`${word.id}`, word)
        
        return word
      }
    } catch (error) {
      logger.error('Search error:', error)
    }
    
    return null
  }
  
  /**
   * Get words by category (SAT, TOEFL, etc.)
   */
  async getWordsByCategory(category: string, limit: number = 100): Promise<UnifiedWord[]> {
    // Ensure db is initialized
    if (!db) {
      logger.error('Firestore database not initialized')
      return []
    }
    
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('categories', 'array-contains', category),
        orderBy('importance', 'desc'),
        firestoreLimit(limit)
      )
      
      const snapshot = await getDocs(q)
      const words: UnifiedWord[] = []
      
      snapshot.forEach(doc => {
        words.push(this.documentToWord(doc.data(), doc.id))
      })
      
      return words
    } catch (error) {
      logger.error('Category query error:', error)
      return []
    }
  }
  
  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.memoryCache.clear()
    await cacheManager.clear()
    logger.info('All caches cleared')
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

// Create singleton instance lazily and only on client side
let _instance: UnifiedWordAdapter | null = null

export const getUnifiedWordAdapter = (): UnifiedWordAdapter => {
  if (typeof window === 'undefined') {
    // Return a dummy adapter on server side
    logger.warn('UnifiedWordAdapter accessed on server side, returning dummy adapter')
    return {
      getWordById: async () => null,
      getWordsByIds: async () => [],
      getWordsByCollection: async () => [],
      searchWordByText: async () => null,
      getWordsByCategory: async () => [],
      clearCache: async () => {},
      getCacheStats: () => ({ memoryCache: { size: 0, words: [] }, localStorage: { size: 0, entries: 0 } })
    } as UnifiedWordAdapter
  }
  
  if (!_instance) {
    _instance = new UnifiedWordAdapter()
  }
  return _instance
}

// Export for backward compatibility
export const unifiedWordAdapter = typeof window !== 'undefined' ? getUnifiedWordAdapter() : null as any