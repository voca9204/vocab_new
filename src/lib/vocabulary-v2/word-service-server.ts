// Server-side WordService that works in both development and production
import { WordService } from './word-service'
import { WordServiceAdmin } from './word-service-admin'
import type { Word } from '@/types/vocabulary-v2'

export class WordServiceServer {
  private service: WordService | WordServiceAdmin

  constructor() {
    // Use admin SDK when credentials are available
    if (process.env.FIREBASE_ADMIN_PROJECT_ID && 
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
        process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      console.log('Using admin SDK for WordService')
      this.service = new WordServiceAdmin()
    } else {
      console.log('Using client SDK for WordService')
      this.service = new WordService()
    }
  }

  async searchWords(
    searchQuery: string = '', 
    options: {
      limit?: number
      vocabularyId?: string
      partOfSpeech?: string
      difficulty?: { min: number, max: number }
      onlySAT?: boolean
      orderBy?: 'word' | 'difficulty' | 'frequency' | 'createdAt'
      orderDirection?: 'asc' | 'desc'
    } = {}
  ): Promise<Word[]> {
    return this.service.searchWords(searchQuery, options)
  }

  async getWordsByIds(wordIds: string[]): Promise<Word[]> {
    return this.service.getWordsByIds(wordIds)
  }

  async updateWord(wordId: string, updates: Partial<Word>): Promise<void> {
    return this.service.updateWord(wordId, updates)
  }

  async markAsAIGenerated(wordId: string, type: 'etymology' | 'examples'): Promise<void> {
    return this.service.markAsAIGenerated(wordId, type)
  }
}