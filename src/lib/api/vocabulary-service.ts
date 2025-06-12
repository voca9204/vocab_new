// Vocabulary Service - Integrates Dictionary APIs with Vocabulary Database
import { dictionaryClient, type StandardDictionaryResponse } from './dictionary-client'
import type { VocabularyWord } from '@/types'

export interface VocabularyFetchOptions {
  useCache?: boolean
  priority?: 'definition' | 'examples' | 'comprehensive'
  minDefinitionLength?: number
}

export interface VocabularyProcessResult {
  success: boolean
  word: VocabularyWord | null
  error?: string
  apiSource?: string
  cacheHit?: boolean
}

class VocabularyService {
  private readonly defaultOptions: VocabularyFetchOptions = {
    useCache: true,
    priority: 'comprehensive',
    minDefinitionLength: 10
  }

  async fetchAndProcessWord(
    word: string, 
    options: VocabularyFetchOptions = {}
  ): Promise<VocabularyProcessResult> {
    const opts = { ...this.defaultOptions, ...options }
    
    try {
      const start = Date.now()
      const apiResponse = await dictionaryClient.fetchWord(word, opts.useCache)
      const processingTime = Date.now() - start

      // Convert API response to our VocabularyWord format
      const vocabularyWord = this.convertToVocabularyWord(apiResponse, processingTime)
      
      // Validate the result
      const validation = this.validateVocabularyWord(vocabularyWord, opts)
      if (!validation.isValid) {
        return {
          success: false,
          word: null,
          error: validation.error
        }
      }

      return {
        success: true,
        word: vocabularyWord,
        apiSource: apiResponse.apiSource,
        cacheHit: processingTime < 50 // Assume cache if very fast response
      }
    } catch (error) {
      return {
        success: false,
        word: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private convertToVocabularyWord(
    apiResponse: StandardDictionaryResponse,
    processingTime: number
  ): VocabularyWord {
    const primaryDefinition = apiResponse.definitions[0]
    
    return {
      id: this.generateWordId(apiResponse.word),
      word: apiResponse.word.toLowerCase(),
      definition: primaryDefinition?.definition || '',
      partOfSpeech: primaryDefinition?.partOfSpeech || 'unknown',
      example: primaryDefinition?.example || '',
      pronunciation: apiResponse.pronunciation,
      difficulty: this.estimateDifficulty(apiResponse),
      frequency: this.estimateFrequency(apiResponse),
      satLevel: this.isSATLevel(apiResponse.word),
      synonyms: primaryDefinition?.synonyms || [],
      antonyms: primaryDefinition?.antonyms || [],
      audioUrl: apiResponse.audioUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: this.generateTags(apiResponse),
      masteryLevel: 0,
      studyCount: 0,
      correctCount: 0,
      lastStudied: null,
      metadata: {
        apiSource: apiResponse.apiSource,
        sourceUrls: apiResponse.sourceUrls,
        processingTime,
        fetchedAt: new Date().toISOString()
      }
    }
  }

  private validateVocabularyWord(
    word: VocabularyWord, 
    options: VocabularyFetchOptions
  ): { isValid: boolean; error?: string } {
    if (!word.word || word.word.length < 2) {
      return { isValid: false, error: 'Word is too short' }
    }

    if (!word.definition || word.definition.length < (options.minDefinitionLength || 10)) {
      return { isValid: false, error: 'Definition is too short or missing' }
    }

    if (!word.partOfSpeech || word.partOfSpeech === 'unknown') {
      return { isValid: false, error: 'Part of speech is missing' }
    }

    return { isValid: true }
  }

  private generateWordId(word: string): string {
    return `word_${word.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`
  }

  private estimateDifficulty(response: StandardDictionaryResponse): number {
    // Simple heuristic based on word length and definition complexity
    const wordLength = response.word.length
    const definitionLength = response.definitions[0]?.definition.length || 0
    const hasMultipleMeanings = response.definitions.length > 1
    
    let difficulty = Math.min(wordLength / 2, 5) // Base on word length
    difficulty += Math.min(definitionLength / 50, 3) // Add for definition complexity
    if (hasMultipleMeanings) difficulty += 1
    
    return Math.round(Math.min(difficulty, 10))
  }

  private estimateFrequency(response: StandardDictionaryResponse): number {
    // Simple heuristic - common words tend to have more meanings and examples
    const meaningCount = response.definitions.length
    const hasExamples = response.definitions.some(d => d.example)
    const hasAudio = !!response.audioUrl
    
    let frequency = meaningCount * 2
    if (hasExamples) frequency += 2
    if (hasAudio) frequency += 1
    
    return Math.round(Math.min(frequency, 10))
  }

  private isSATLevel(word: string): boolean {
    // Simple heuristic - longer words or less common words are more likely SAT level
    return word.length >= 6 || /[aeiou]{2,}/.test(word)
  }

  private generateTags(response: StandardDictionaryResponse): string[] {
    const tags: string[] = []
    
    // Add part of speech tags
    const parts = response.definitions.map(d => d.partOfSpeech)
    tags.push(...new Set(parts))
    
    // Add difficulty tags
    const difficulty = this.estimateDifficulty(response)
    if (difficulty >= 7) tags.push('advanced')
    else if (difficulty >= 4) tags.push('intermediate')
    else tags.push('basic')
    
    // Add feature tags
    if (response.audioUrl) tags.push('has-audio')
    if (response.definitions.some(d => d.example)) tags.push('has-examples')
    if (response.definitions.some(d => d.synonyms.length > 0)) tags.push('has-synonyms')
    
    return tags
  }

  // Utility methods
  getCacheStats() {
    return dictionaryClient.getCacheStats()
  }

  clearCache() {
    dictionaryClient.clearCache()
  }
}

export const vocabularyService = new VocabularyService()
