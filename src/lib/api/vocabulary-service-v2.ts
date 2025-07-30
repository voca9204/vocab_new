/**
 * 새로운 DB 구조를 사용하는 VocabularyService V2
 * 기존 API 인터페이스와 호환성 유지
 */

import { dictionaryClient, type StandardDictionaryResponse } from './dictionary-client'
import type { VocabularyWord as LegacyVocabularyWord } from '@/types'
import { WordService } from '../vocabulary-v2/word-service'
import { VocabularyService as NewVocabularyService } from '../vocabulary-v2/vocabulary-service'
import { VocabularyWordService } from '../vocabulary-v2/vocabulary-word-service'
import { UserVocabularyService } from '../vocabulary-v2/user-vocabulary-service'
import { UserWordService } from '../vocabulary-v2/user-word-service'
import type { Word, WordDefinition } from '@/types/vocabulary-v2'

export interface VocabularyFetchOptions {
  useCache?: boolean
  priority?: 'definition' | 'examples' | 'comprehensive'
  minDefinitionLength?: number
}

export interface VocabularyProcessResult {
  success: boolean
  word: LegacyVocabularyWord | null
  error?: string
  apiSource?: string
  cacheHit?: boolean
}

/**
 * 새로운 DB 구조를 사용하면서 기존 API와 호환되는 VocabularyService
 */
class VocabularyServiceV2 {
  private wordService: WordService
  private vocabularyService: NewVocabularyService
  private vocabularyWordService: VocabularyWordService
  private userVocabularyService: UserVocabularyService
  private userWordService: UserWordService

  private readonly defaultOptions: VocabularyFetchOptions = {
    useCache: true,
    priority: 'comprehensive',
    minDefinitionLength: 10
  }

  constructor() {
    this.wordService = new WordService()
    this.vocabularyService = new NewVocabularyService()
    this.vocabularyWordService = new VocabularyWordService()
    this.userVocabularyService = new UserVocabularyService()
    this.userWordService = new UserWordService()
  }

  /**
   * 단어를 가져오고 마스터 DB에 저장 (기존 API 호환)
   */
  async fetchAndProcessWord(
    word: string, 
    options: VocabularyFetchOptions = {}
  ): Promise<VocabularyProcessResult> {
    const opts = { ...this.defaultOptions, ...options }
    
    try {
      // 1. 먼저 마스터 DB에서 확인
      const existingWord = await this.wordService.findWordByText(word.toLowerCase())
      if (existingWord) {
        return {
          success: true,
          word: this.convertToLegacyFormat(existingWord),
          apiSource: 'database',
          cacheHit: true
        }
      }

      // 2. API에서 가져오기
      const start = Date.now()
      const apiResponse = await dictionaryClient.fetchWord(word, opts.useCache)
      const processingTime = Date.now() - start

      // 3. 새 DB 구조로 변환하여 저장
      const newWord = await this.convertAndSaveToNewStructure(apiResponse, processingTime)
      
      // 4. 기존 형식으로 변환하여 반환
      const legacyWord = this.convertToLegacyFormat(newWord)
      
      // 5. 검증
      const validation = this.validateVocabularyWord(legacyWord, opts)
      if (!validation.isValid) {
        return {
          success: false,
          word: null,
          error: validation.error
        }
      }

      return {
        success: true,
        word: legacyWord,
        apiSource: apiResponse.apiSource,
        cacheHit: processingTime < 50
      }
    } catch (error) {
      return {
        success: false,
        word: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * API 응답을 새 DB 구조로 변환하고 저장
   */
  private async convertAndSaveToNewStructure(
    apiResponse: StandardDictionaryResponse,
    processingTime: number
  ): Promise<Word> {
    const primaryDefinition = apiResponse.definitions[0]
    
    // WordDefinition 배열 생성
    const definitions: Omit<WordDefinition, 'id' | 'createdAt'>[] = apiResponse.definitions.map(def => ({
      definition: def.definition,
      examples: def.example ? [def.example] : [],
      source: 'dictionary',
      language: 'en'
    }))

    // Word 데이터 생성
    const wordData: Partial<Word> & { word: string, createdBy: string } = {
      word: apiResponse.word.toLowerCase(),
      pronunciation: apiResponse.pronunciation,
      partOfSpeech: apiResponse.definitions.map(d => d.partOfSpeech).filter(Boolean),
      definitions,
      synonyms: primaryDefinition?.synonyms || [],
      antonyms: primaryDefinition?.antonyms || [],
      difficulty: this.estimateDifficulty(apiResponse),
      frequency: this.estimateFrequency(apiResponse),
      isSAT: this.isSATLevel(apiResponse.word),
      createdBy: 'system',
      aiGenerated: {
        examples: false,
        etymology: false
      }
    }

    // 마스터 DB에 저장
    return await this.wordService.createOrUpdateWord(wordData)
  }

  /**
   * 새 DB 구조의 Word를 기존 VocabularyWord 형식으로 변환
   */
  private convertToLegacyFormat(word: Word): LegacyVocabularyWord {
    const primaryDefinition = word.definitions[0]

    return {
      id: word.id,
      word: word.word,
      definitions: word.definitions.map(def => ({
        text: def.definition,
        source: def.source,
        partOfSpeech: word.partOfSpeech[0] || 'unknown'
      })),
      examples: word.definitions.flatMap(def => def.examples),
      partOfSpeech: word.partOfSpeech,
      difficulty: word.difficulty,
      frequency: word.frequency,
      satLevel: word.isSAT,
      pronunciation: word.pronunciation,
      etymology: word.etymology ? {
        origin: word.etymology,
        language: 'unknown',
        meaning: word.realEtymology || word.etymology
      } : undefined,
      categories: this.generateCategories(word),
      sources: ['dictionary'],
      apiSource: 'api',
      createdAt: word.createdAt,
      updatedAt: word.updatedAt,
      learningMetadata: {
        timesStudied: 0,
        masteryLevel: 0,
        lastStudied: new Date(),
        userProgress: {
          userId: '',
          wordId: word.id,
          correctAttempts: 0,
          totalAttempts: 0,
          streak: 0,
          nextReviewDate: new Date()
        }
      }
    }
  }

  /**
   * 사용자별 단어 가져오기 (학습 진도 포함)
   */
  async getUserWord(userId: string, wordId: string): Promise<LegacyVocabularyWord | null> {
    try {
      // 1. 마스터 단어 정보 가져오기
      const word = await this.wordService.getWordById(wordId)
      if (!word) return null

      // 2. 사용자별 학습 정보 가져오기
      const userWord = await this.userWordService.findUserWord(userId, wordId)
      
      // 3. 기존 형식으로 변환
      const legacyWord = this.convertToLegacyFormat(word)
      
      // 4. 학습 정보 추가
      if (userWord) {
        legacyWord.learningMetadata = {
          timesStudied: userWord.studyStatus.totalReviews,
          masteryLevel: userWord.studyStatus.masteryLevel / 100, // 0-1 스케일로 변환
          lastStudied: userWord.studyStatus.lastStudied || new Date(),
          userProgress: {
            userId: userWord.userId,
            wordId: userWord.wordId,
            correctAttempts: userWord.studyStatus.correctCount,
            totalAttempts: userWord.studyStatus.totalReviews,
            streak: userWord.studyStatus.streakCount,
            nextReviewDate: userWord.studyStatus.nextReviewDate || new Date()
          }
        }
      }

      return legacyWord
    } catch (error) {
      console.error('Error getting user word:', error)
      return null
    }
  }

  /**
   * V.ZIP 시스템 단어장의 모든 단어 가져오기
   */
  async getSystemVocabularyWords(): Promise<LegacyVocabularyWord[]> {
    try {
      // 1. V.ZIP 시스템 단어장 찾기
      const vocabularies = await this.vocabularyService.searchPublicVocabularies({
        searchTerm: 'V.ZIP',
        type: 'system',
        limit: 1
      })

      if (vocabularies.length === 0) {
        console.warn('V.ZIP 시스템 단어장을 찾을 수 없습니다')
        return []
      }

      const systemVocabulary = vocabularies[0]

      // 2. 단어장의 모든 단어 ID 가져오기
      const vocabularyWords = await this.vocabularyWordService.getVocabularyWords(systemVocabulary.id)
      const wordIds = vocabularyWords.map(vw => vw.wordId)

      // 3. 단어 정보 가져오기
      const words = await this.wordService.getWordsByIds(wordIds)

      // 4. 기존 형식으로 변환
      return words.map(word => this.convertToLegacyFormat(word))
    } catch (error) {
      console.error('Error getting system vocabulary words:', error)
      return []
    }
  }

  // 기존 메서드들 유지
  private validateVocabularyWord(
    word: LegacyVocabularyWord, 
    options: VocabularyFetchOptions
  ): { isValid: boolean; error?: string } {
    if (!word.word || word.word.length < 2) {
      return { isValid: false, error: 'Word is too short' }
    }

    const primaryDefinition = word.definitions[0]?.text || ''
    if (!primaryDefinition || primaryDefinition.length < (options.minDefinitionLength || 10)) {
      return { isValid: false, error: 'Definition is too short or missing' }
    }

    if (!word.partOfSpeech || word.partOfSpeech.length === 0) {
      return { isValid: false, error: 'Part of speech is missing' }
    }

    return { isValid: true }
  }

  private estimateDifficulty(response: StandardDictionaryResponse): number {
    const wordLength = response.word.length
    const definitionLength = response.definitions[0]?.definition.length || 0
    const hasMultipleMeanings = response.definitions.length > 1
    
    let difficulty = Math.min(wordLength / 2, 5)
    difficulty += Math.min(definitionLength / 50, 3)
    if (hasMultipleMeanings) difficulty += 1
    
    return Math.round(Math.min(difficulty, 10))
  }

  private estimateFrequency(response: StandardDictionaryResponse): number {
    const meaningCount = response.definitions.length
    const hasExamples = response.definitions.some(d => d.example)
    const hasAudio = !!response.audioUrl
    
    let frequency = meaningCount * 2
    if (hasExamples) frequency += 2
    if (hasAudio) frequency += 1
    
    return Math.round(Math.min(frequency, 10))
  }

  private isSATLevel(word: string): boolean {
    return word.length >= 6 || /[aeiou]{2,}/.test(word)
  }

  private generateCategories(word: Word): string[] {
    const categories: string[] = []
    
    // 품사별 카테고리
    categories.push(...word.partOfSpeech)
    
    // 난이도별 카테고리
    if (word.difficulty >= 7) categories.push('advanced')
    else if (word.difficulty >= 4) categories.push('intermediate')
    else categories.push('basic')
    
    // SAT 여부
    if (word.isSAT) categories.push('sat')
    
    return categories
  }

  // 캐시 관련 메서드 유지
  getCacheStats() {
    return dictionaryClient.getCacheStats()
  }

  clearCache() {
    dictionaryClient.clearCache()
  }
}

export const vocabularyServiceV2 = new VocabularyServiceV2()
export { VocabularyServiceV2 }