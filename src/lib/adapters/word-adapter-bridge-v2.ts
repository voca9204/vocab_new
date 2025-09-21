/**
 * Word Adapter Bridge V2 - Post Migration
 * Simplified adapter that only uses words_v3 as primary source
 * Special collections handled by dedicated services
 */

import { UnifiedWordAdapter } from './word-adapter-v3'
import { AIGeneratedWordsService } from '@/lib/services/ai-generated-words-service'
import { PhotoVocabularyService } from '@/lib/services/photo-vocabulary-service'
import type { UnifiedWord } from '@/types/unified-word'

export class WordAdapterBridgeV2 {
  private wordsV3Adapter: UnifiedWordAdapter
  private aiWordsService: AIGeneratedWordsService
  private photoWordsService: PhotoVocabularyService
  
  constructor() {
    this.wordsV3Adapter = new UnifiedWordAdapter()
    this.aiWordsService = new AIGeneratedWordsService()
    this.photoWordsService = new PhotoVocabularyService()
  }
  
  /**
   * Get word by ID - Only from words_v3 (master database)
   */
  async getWordById(id: string): Promise<UnifiedWord | null> {
    return await this.wordsV3Adapter.getWordById(id)
  }
  
  /**
   * Get multiple words by IDs - Only from words_v3
   */
  async getWordsByIds(ids: string[]): Promise<UnifiedWord[]> {
    return await this.wordsV3Adapter.getWordsByIds(ids)
  }
  
  /**
   * Search word by text - Only from words_v3
   */
  async searchWordByText(wordText: string): Promise<UnifiedWord | null> {
    return await this.wordsV3Adapter.searchWordByText(wordText)
  }
  
  /**
   * Get words by collection - Uses words_v3 with collectionIds
   */
  async getWordsByCollection(collectionId: string): Promise<UnifiedWord[]> {
    return await this.wordsV3Adapter.getWordsByCollectionId(collectionId)
  }
  
  /**
   * Get AI generated words for user - Uses dedicated service
   */
  async getUserAIWords(userId: string): Promise<UnifiedWord[]> {
    return await this.aiWordsService.getUserAIWords(userId)
  }
  
  /**
   * Get photo extraction session words - Uses dedicated service
   */
  async getPhotoSessionWords(sessionId: string): Promise<UnifiedWord[]> {
    return await this.photoWordsService.getSessionWords(sessionId)
  }
  
  /**
   * Legacy method compatibility - Maps to words_v3 only
   */
  async getWordsByWordbookId(
    collectionId: string, 
    wordbookType?: string, 
    limit?: number
  ): Promise<UnifiedWord[]> {
    if (wordbookType === 'ai-generated') {
      const userId = collectionId.replace('ai-generated-', '')
      return await this.getUserAIWords(userId)
    }
    
    if (wordbookType === 'photo') {
      return await this.getPhotoSessionWords(collectionId)
    }
    
    // All other collections use words_v3
    return await this.getWordsByCollection(collectionId)
  }
}

export const wordAdapterBridgeV2 = new WordAdapterBridgeV2()
