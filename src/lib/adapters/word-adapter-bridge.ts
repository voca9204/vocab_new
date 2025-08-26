/**
 * Word Adapter Bridge
 * 
 * This bridge allows gradual migration from the old WordAdapter to the new UnifiedWordAdapter.
 * It first tries the new words_v3 collection, then falls back to the old multi-collection approach.
 */

import { UnifiedWordAdapter, getUnifiedWordAdapter } from './word-adapter-unified'
import { WordAdapter } from './word-adapter'
import type { UnifiedWord } from '@/types/unified-word'

import { adapterLogger as logger } from '@/lib/utils/logger'

export class WordAdapterBridge {
  private newAdapter: UnifiedWordAdapter
  private oldAdapter: WordAdapter
  private useNewAdapterFirst: boolean = true
  
  constructor() {
    // Use the getter function to ensure proper initialization
    this.newAdapter = getUnifiedWordAdapter()
    this.oldAdapter = new WordAdapter()
    logger.debug('Initialized with dual adapter support')
  }
  
  /**
   * Get word by ID - tries new adapter first, falls back to old
   */
  async getWordById(id: string): Promise<UnifiedWord | null> {
    if (this.useNewAdapterFirst) {
      // Try new adapter first
      const word = await this.newAdapter.getWordById(id)
      if (word) {
        logger.debug(`Found word in words_v3: ${word.word}`)
        return word
      }
    }
    
    // Fall back to old adapter
    logger.debug(`Falling back to old adapter for ID: ${id}`)
    const oldWord = await this.oldAdapter.getWordById(id)
    
    if (oldWord && !this.useNewAdapterFirst) {
      // If we found it in old but not new, try new adapter again
      const newWord = await this.newAdapter.getWordById(id)
      if (newWord) return newWord
    }
    
    return oldWord
  }
  
  /**
   * Get multiple words by IDs
   */
  async getWordsByIds(ids: string[]): Promise<UnifiedWord[]> {
    if (ids.length === 0) return []
    
    // Try new adapter first
    const newWords = await this.newAdapter.getWordsByIds(ids)
    
    if (newWords.length === ids.length) {
      // Got all words from new adapter
      logger.debug(`Got all ${newWords.length} words from words_v3`)
      return newWords
    }
    
    // Some words missing, get the missing ones from old adapter
    const foundIds = new Set(newWords.map(w => w.id))
    const missingIds = ids.filter(id => !foundIds.has(id))
    
    if (missingIds.length > 0) {
      logger.debug(`Getting ${missingIds.length} missing words from old adapter`)
      const oldWords = await this.oldAdapter.getWordsByIds(missingIds)
      return [...newWords, ...oldWords]
    }
    
    return newWords
  }
  
  /**
   * Get words by collection - PRIORITY: words_v3 first, then fallback to old
   */
  async getWordsByCollection(collectionId: string, collectionType?: string, limit?: number): Promise<UnifiedWord[]> {
    logger.debug(`Loading collection ${collectionId} - attempting words_v3 first`)
    
    // First, get word IDs from the old collection structure
    const words = await this.oldAdapter.getWordsByCollection(collectionId, collectionType, limit)
    
    if (words.length === 0) {
      console.log(`[WordAdapterBridge] No words found for collection ${collectionId}`)
      return []
    }
    
    const wordIds = words.map(w => w.id)
    console.log(`[WordAdapterBridge] Found ${wordIds.length} word IDs for collection ${collectionId}`)
    
    // ALWAYS prioritize words_v3 data
    const v3Words = await this.newAdapter.getWordsByIds(wordIds)
    
    if (v3Words.length > 0) {
      console.log(`[WordAdapterBridge] ✅ Retrieved ${v3Words.length} words from words_v3`)
      
      // If we got all words from v3, return them
      if (v3Words.length === wordIds.length) {
        return v3Words
      }
      
      // Otherwise, fill in missing words from old adapter
      const v3Map = new Map(v3Words.map(w => [w.id, w]))
      const missingIds = wordIds.filter(id => !v3Map.has(id))
      
      if (missingIds.length > 0) {
        console.log(`[WordAdapterBridge] ⚠️ ${missingIds.length} words not in v3, using old data`)
        // Return v3 words first, then old words for missing ones
        const result = [...v3Words]
        words.forEach(oldWord => {
          if (missingIds.includes(oldWord.id)) {
            result.push(oldWord)
          }
        })
        return result
      }
      
      return v3Words
    }
    
    // Fallback: if no v3 words at all, use old adapter data
    console.log(`[WordAdapterBridge] ⚠️ No words found in words_v3, falling back to old data`)
    return words
  }
  
  /**
   * Search word by text
   */
  async searchWordByText(wordText: string): Promise<UnifiedWord | null> {
    // Try new adapter first
    const word = await this.newAdapter.searchWordByText(wordText)
    if (word) {
      console.log(`[WordAdapterBridge] Found "${wordText}" in words_v3`)
      return word
    }
    
    // Fall back to old adapter
    console.log(`[WordAdapterBridge] Searching "${wordText}" in old collections`)
    return await this.oldAdapter.getWordByText(wordText)
  }
  
  /**
   * Get words by category (SAT, TOEFL, etc.)
   */
  async getWordsByCategory(category: string, limit: number = 100): Promise<UnifiedWord[]> {
    // New adapter has native category support
    const words = await this.newAdapter.getWordsByCategory(category, limit)
    
    if (words.length > 0) {
      console.log(`[WordAdapterBridge] Got ${words.length} words for category ${category}`)
      return words
    }
    
    // Old adapter doesn't have direct category support
    // Would need to implement collection-based category lookup
    console.log(`[WordAdapterBridge] No words found for category ${category}`)
    return []
  }
  
  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    await Promise.all([
      this.newAdapter.clearCache(),
      this.oldAdapter.clearCache()
    ])
    console.log('[WordAdapterBridge] All caches cleared')
  }
  
  /**
   * Get statistics about adapter usage
   */
  getStats() {
    return {
      mode: this.useNewAdapterFirst ? 'new-first' : 'old-first',
      newAdapter: this.newAdapter.getCacheStats(),
      oldAdapter: this.oldAdapter.getCacheStats()
    }
  }
  
  /**
   * Switch adapter priority (for testing)
   */
  setAdapterPriority(useNewFirst: boolean) {
    this.useNewAdapterFirst = useNewFirst
    console.log(`[WordAdapterBridge] Adapter priority set to: ${useNewFirst ? 'new-first' : 'old-first'}`)
  }
}

// Export singleton instance
export const wordAdapterBridge = new WordAdapterBridge()