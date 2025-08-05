/**
 * 새로운 DB 구조를 사용하는 Firestore 서비스
 * 기존 firestore.ts와 동일한 인터페이스 제공
 */

import {
  QueryDocumentSnapshot,
  DocumentData,
  doc,
  getDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore'
import type { VocabularyWord as LegacyVocabularyWord, NewsArticle, UserProgress } from '@/types'
import { WordService } from '../vocabulary-v2/word-service'
import { VocabularyService } from '../vocabulary-v2/vocabulary-service'
import { VocabularyWordService } from '../vocabulary-v2/vocabulary-word-service'
import { UserVocabularyService } from '../vocabulary-v2/user-vocabulary-service'
import { UserWordService } from '../vocabulary-v2/user-word-service'
import type { Word } from '@/types/vocabulary-v2'
import { db } from './config'

// 서비스 인스턴스들
const wordService = new WordService()
const vocabularyService = new VocabularyService()
const vocabularyWordService = new VocabularyWordService()
const userVocabularyService = new UserVocabularyService()
const userWordService = new UserWordService()

let convertLogShown = false

/**
 * Word를 LegacyVocabularyWord로 변환
 */
function convertToLegacyFormat(word: Word): LegacyVocabularyWord {
  // 디버깅용 로그
  if (!convertLogShown) {
    console.log('[convertToLegacyFormat] Input word:', word)
    console.log('[convertToLegacyFormat] Word definitions:', word.definitions)
    convertLogShown = true
  }
  
  return {
    id: word.id,
    word: word.word,
    definitions: word.definitions?.map(def => ({
      text: def.definition || (def as any).text || '',  // 호환성을 위해 둘 다 확인
      source: def.source,
      partOfSpeech: word.partOfSpeech[0] || 'unknown'
    })) || [],
    examples: word.definitions?.flatMap(def => def.examples || []) || [],
    partOfSpeech: word.partOfSpeech,
    difficulty: word.difficulty,
    frequency: word.frequency,
    satLevel: word.isSAT,
    pronunciation: word.pronunciation,
    etymology: word.etymology || word.realEtymology ? {
      origin: word.etymology || '',
      language: 'unknown',
      meaning: word.realEtymology || ''
    } : undefined,
    categories: generateCategories(word),
    sources: ['database'],
    apiSource: 'database',
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
    },
    // Legacy fields for backward compatibility
    studyStatus: {
      studied: false,
      masteryLevel: 0,
      reviewCount: 0,
      lastStudied: new Date()
    },
    number: undefined,
    realEtymology: word.realEtymology
  }
}

function generateCategories(word: Word): string[] {
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

// 어휘 관련 함수들 (새 DB 구조 사용)
export const vocabularyServiceV2 = {
  // 모든 어휘 가져오기 (새 DB 구조에서, 사용자 선택 단어장 반영)
  async getAll(
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
    limitCount: number = 50,
    userId?: string
  ): Promise<{ words: LegacyVocabularyWord[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    try {
      console.log('[vocabularyServiceV2.getAll] Starting... limit:', limitCount, 'userId:', userId)
      
      // 사용자 설정 확인
      let userSettings = null
      if (userId) {
        const { UserSettingsService } = await import('@/lib/settings/user-settings-service')
        const settingsService = new UserSettingsService()
        userSettings = await settingsService.getUserSettings(userId)
        console.log('[vocabularyServiceV2.getAll] User settings:', userSettings?.selectedVocabularies)
      }
      
      // 사용자가 아무 단어장도 선택하지 않은 경우 빈 배열 반환
      if (userSettings?.selectedVocabularies?.includes('__none__')) {
        console.log('[vocabularyServiceV2.getAll] No vocabularies selected by user')
        return { words: [], lastDoc: null }
      }
      
      // 사용자 설정이 없거나 빈 배열이면 전체 선택으로 간주
      const selectedVocabs = userSettings?.selectedVocabularies || []
      const isAllSelected = selectedVocabs.length === 0
      
      if (isAllSelected) {
        console.log('[vocabularyServiceV2.getAll] All vocabularies selected, getting all words')
        
        // 1. 새 DB 구조(words 컬렉션)에서 단어 가져오기
        const newWords = await wordService.searchWords('', { limit: limitCount })
        console.log(`[vocabularyServiceV2.getAll] Found ${newWords.length} words from new DB structure`)
        
        // 2. 기존 컬렉션들에서도 단어 가져오기 (순서대로 확인)
        const legacyWords: LegacyVocabularyWord[] = []
        const legacyCollectionNames = ['veterans_vocabulary', 'vocabulary', 'words']
        
        for (const collectionName of legacyCollectionNames) {
          try {
            const { collection, getDocs } = await import('firebase/firestore')
            const { db } = await import('./config')
            
            const legacyQuery = collection(db, collectionName)
            const legacySnapshot = await getDocs(legacyQuery)
            
            if (legacySnapshot.docs.length > 0) {
              console.log(`[vocabularyServiceV2.getAll] Found ${legacySnapshot.docs.length} words in ${collectionName}`)
              
              const wordsFromCollection = legacySnapshot.docs.map(doc => {
                const data = doc.data()
                return {
                  id: doc.id,
                  word: data.word || '',
                  definitions: data.definitions && Array.isArray(data.definitions) 
                    ? data.definitions.map((def: any) => ({
                        text: def.text || def.definition || '',
                        source: collectionName === 'veterans_vocabulary' ? 'veterans_pdf' : 'database',
                        partOfSpeech: def.partOfSpeech || data.partOfSpeech?.[0] || 'n.',
                        examples: def.examples || []
                      }))
                    : data.definition
                    ? [{
                        text: data.definition,
                        source: collectionName === 'veterans_vocabulary' ? 'veterans_pdf' : 'database',
                        partOfSpeech: data.partOfSpeech?.[0] || 'n.',
                        examples: []
                      }]
                    : [{
                        text: 'Definition not available',
                        source: 'database',
                        partOfSpeech: data.partOfSpeech?.[0] || 'n.',
                        examples: []
                      }],
                  examples: data.examples || [],
                  partOfSpeech: data.partOfSpeech || ['n.'],
                  difficulty: data.difficulty || 5,
                  frequency: data.frequency || 1,
                  satLevel: data.isSAT || data.satLevel || false,
                  pronunciation: data.pronunciation || null,
                  etymology: data.etymology ? {
                    origin: typeof data.etymology === 'string' ? data.etymology : data.etymology.origin || '',
                    language: 'unknown',
                    meaning: data.realEtymology || ''
                  } : undefined,
                  categories: data.categories || [],
                  sources: [collectionName === 'veterans_vocabulary' ? 'veterans_pdf' : 'database'],
                  apiSource: collectionName === 'veterans_vocabulary' ? 'veterans_pdf' : 'database',
                  createdAt: data.createdAt || new Date(),
                  updatedAt: data.updatedAt || new Date(),
                  learningMetadata: {
                    timesStudied: 0,
                    masteryLevel: 0,
                    lastStudied: new Date(),
                    userProgress: {
                      userId: '',
                      wordId: doc.id,
                      correctAttempts: 0,
                      totalAttempts: 0,
                      streak: 0,
                      nextReviewDate: new Date()
                    }
                  },
                  studyStatus: data.studyStatus || {
                    studied: false,
                    masteryLevel: 0,
                    reviewCount: 0,
                    lastStudied: new Date()
                  },
                  number: data.number,
                  realEtymology: data.realEtymology || data.etymology
                } as LegacyVocabularyWord
              })
              
              legacyWords.push(...wordsFromCollection)
              break // 첫 번째로 데이터가 있는 컬렉션에서만 가져오기
            }
          } catch (error) {
            console.warn(`[vocabularyServiceV2.getAll] Failed to load ${collectionName}:`, error)
          }
        }
        
        // 3. 두 소스의 단어를 합치기 (중복 제거)
        const newWordsConverted = newWords.map(word => convertToLegacyFormat(word))
        const allWords = [...newWordsConverted, ...legacyWords]
        
        // 단어명으로 중복 제거
        const uniqueWords = allWords.reduce((acc, word) => {
          const existingIndex = acc.findIndex(w => w.word.toLowerCase() === word.word.toLowerCase())
          if (existingIndex === -1) {
            acc.push(word)
          } else {
            // 새 DB 구조의 단어를 우선시
            if (word.sources.includes('pdf') || word.apiSource === 'pdf') {
              acc[existingIndex] = word
            }
          }
          return acc
        }, [] as LegacyVocabularyWord[])
        
        console.log(`[vocabularyServiceV2.getAll] Total unique words: ${uniqueWords.length}`)
        return { words: uniqueWords, lastDoc: null }
      }
      
      // 특정 단어장이 선택된 경우
      console.log('[vocabularyServiceV2.getAll] Specific vocabularies selected:', selectedVocabs)
      
      // V.ZIP 3K 단어장이 선택된 경우 (또는 다른 기존 단어장들)  
      const legacyVocabNames = ['V.ZIP 3K 단어장', 'SAT 어휘 컬렉션', '마스터 단어 DB']
      const hasLegacySelection = selectedVocabs.some(vocab => legacyVocabNames.includes(vocab))
      
      if (hasLegacySelection) {
        console.log('[vocabularyServiceV2.getAll] Legacy vocabulary selected:', selectedVocabs)
        
        // 기존 컬렉션들에서 단어 가져오기
        const legacyWords: LegacyVocabularyWord[] = []
        const legacyCollectionNames = ['veterans_vocabulary', 'vocabulary', 'words']
        
        for (const collectionName of legacyCollectionNames) {
          try {
            const { collection, getDocs } = await import('firebase/firestore')
            const { db } = await import('./config')
            
            const legacyQuery = collection(db, collectionName)
            const legacySnapshot = await getDocs(legacyQuery)
            
            if (legacySnapshot.docs.length > 0) {
              console.log(`[vocabularyServiceV2.getAll] Found ${legacySnapshot.docs.length} words in ${collectionName}`)
              
              const wordsFromCollection = legacySnapshot.docs.map(doc => {
                const data = doc.data()
                return {
                  id: doc.id,
                  word: data.word || '',
                  definitions: data.definitions && Array.isArray(data.definitions) 
                    ? data.definitions.map((def: any) => ({
                        text: def.text || def.definition || '',
                        source: collectionName === 'veterans_vocabulary' ? 'veterans_pdf' : 'database',
                        partOfSpeech: def.partOfSpeech || data.partOfSpeech?.[0] || 'n.',
                        examples: def.examples || []
                      }))
                    : data.definition
                    ? [{
                        text: data.definition,
                        source: collectionName === 'veterans_vocabulary' ? 'veterans_pdf' : 'database',
                        partOfSpeech: data.partOfSpeech?.[0] || 'n.',
                        examples: []
                      }]
                    : [{
                        text: 'Definition not available',
                        source: 'database',
                        partOfSpeech: data.partOfSpeech?.[0] || 'n.',
                        examples: []
                      }],
                  examples: data.examples || [],
                  partOfSpeech: data.partOfSpeech || ['n.'],
                  difficulty: data.difficulty || 5,
                  frequency: data.frequency || 1,
                  satLevel: data.isSAT || data.satLevel || false,
                  pronunciation: data.pronunciation || null,
                  etymology: data.etymology ? {
                    origin: typeof data.etymology === 'string' ? data.etymology : data.etymology.origin || '',
                    language: 'unknown',
                    meaning: data.realEtymology || ''
                  } : undefined,
                  categories: data.categories || [],
                  sources: [collectionName === 'veterans_vocabulary' ? 'veterans_pdf' : 'database'],
                  apiSource: collectionName === 'veterans_vocabulary' ? 'veterans_pdf' : 'database',
                  createdAt: data.createdAt || new Date(),
                  updatedAt: data.updatedAt || new Date(),
                  learningMetadata: {
                    timesStudied: 0,
                    masteryLevel: 0,
                    lastStudied: new Date(),
                    userProgress: {
                      userId: '',
                      wordId: doc.id,
                      correctAttempts: 0,
                      totalAttempts: 0,
                      streak: 0,
                      nextReviewDate: new Date()
                    }
                  },
                  studyStatus: data.studyStatus || {
                    studied: false,
                    masteryLevel: 0,
                    reviewCount: 0,
                    lastStudied: new Date()
                  },
                  number: data.number,
                  realEtymology: data.realEtymology || data.etymology
                } as LegacyVocabularyWord
              })
              
              legacyWords.push(...wordsFromCollection)
              break // 첫 번째로 데이터가 있는 컬렉션에서만 가져오기
            }
          } catch (error) {
            console.warn(`[vocabularyServiceV2.getAll] Failed to load ${collectionName}:`, error)
          }
        }
        
        console.log(`[vocabularyServiceV2.getAll] Legacy vocabularies selected, returning ${legacyWords.length} words`)
        return { words: legacyWords, lastDoc: null }
      }
      
      // 일반 공식 단어장이 선택된 경우 (새 DB 구조)
      if (selectedVocabs.includes('일반 공식 단어장')) {
        console.log('[vocabularyServiceV2.getAll] 일반 공식 단어장 selected')
        
        // vocabulary_collections에서 "일반 공식 단어장" 찾기
        const { collection: firestoreCollection, getDocs: getDocsFirestore, query: queryFirestore, where: whereFirestore } = await import('firebase/firestore')
        const { db } = await import('./config')
        
        const collectionQuery = queryFirestore(
          firestoreCollection(db, 'vocabulary_collections'),
          whereFirestore('name', '==', '일반 공식 단어장')
        )
        
        const collectionSnapshot = await getDocsFirestore(collectionQuery)
        
        if (collectionSnapshot.empty) {
          console.log('[vocabularyServiceV2.getAll] 일반 공식 단어장 not found')
          return { words: [], lastDoc: null }
        }
        
        // 해당 컬렉션의 단어 ID들 가져오기
        const collectionData = collectionSnapshot.docs[0].data()
        const wordIds = collectionData.words || []
        
        console.log(`[vocabularyServiceV2.getAll] Found ${wordIds.length} word IDs in 일반 공식 단어장`)
        
        if (wordIds.length === 0) {
          return { words: [], lastDoc: null }
        }
        
        // 해당 단어들만 조회
        const words = await wordService.getWordsByIds(wordIds)
        const legacyWords = words.map(word => convertToLegacyFormat(word))
        console.log(`[vocabularyServiceV2.getAll] 일반 공식 단어장 selected, returning ${legacyWords.length} words`)
        return { words: legacyWords, lastDoc: null }
      }
      
      // 선택된 단어장이 없거나 알려지지 않은 단어장인 경우 빈 배열
      console.log('[vocabularyServiceV2.getAll] No matching vocabularies found')
      return { words: [], lastDoc: null }
      
    } catch (error) {
      console.error('[vocabularyServiceV2.getAll] Error:', error)
      throw error
    }
  },

  // SAT 레벨 어휘만 가져오기
  async getSATWords(limitCount: number = 50): Promise<LegacyVocabularyWord[]> {
    try {
      // SAT 단어 검색
      const words = await wordService.searchWords('', {
        limit: limitCount,
        isSAT: true
      })

      return words.map(word => convertToLegacyFormat(word))
    } catch (error) {
      console.error('Error fetching SAT words V2:', error)
      throw error
    }
  },

  // 난이도별 어휘 가져오기
  async getByDifficulty(
    difficulty: number,
    limitCount: number = 50
  ): Promise<LegacyVocabularyWord[]> {
    try {
      const words = await wordService.searchWords('', {
        limit: limitCount,
        difficulty: { min: difficulty, max: difficulty }
      })

      return words.map(word => convertToLegacyFormat(word))
    } catch (error) {
      console.error('Error fetching words by difficulty V2:', error)
      throw error
    }
  },

  // 특정 어휘 가져오기
  async getById(wordId: string): Promise<LegacyVocabularyWord | null> {
    try {
      const word = await wordService.getWordById(wordId)
      if (!word) return null

      return convertToLegacyFormat(word)
    } catch (error) {
      console.error('Error fetching word by ID V2:', error)
      throw error
    }
  },

  // 어휘 추가 (관리자용) - 새 DB 구조 사용
  async add(wordData: Omit<LegacyVocabularyWord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // LegacyVocabularyWord를 새 Word 형식으로 변환
      const newWordData = {
        word: wordData.word,
        pronunciation: wordData.pronunciation,
        partOfSpeech: wordData.partOfSpeech,
        definitions: wordData.definitions.map(def => ({
          definition: def.text,
          examples: [],
          source: def.source as 'dictionary' | 'ai' | 'manual' | 'pdf',
          language: 'en' as const
        })),
        etymology: wordData.etymology?.origin,
        realEtymology: wordData.etymology?.meaning,
        synonyms: [],
        antonyms: [],
        difficulty: wordData.difficulty,
        frequency: wordData.frequency,
        isSAT: wordData.satLevel,
        createdBy: 'admin'
      }

      const word = await wordService.createOrUpdateWord(newWordData)
      return word.id
    } catch (error) {
      console.error('Error adding vocabulary word V2:', error)
      throw error
    }
  },

  // 어휘 업데이트 (관리자용)
  async update(wordId: string, updates: Partial<LegacyVocabularyWord>): Promise<void> {
    try {
      // 업데이트할 필드들을 새 형식으로 변환
      const wordUpdates: Partial<Word> = {}
      
      if (updates.difficulty !== undefined) wordUpdates.difficulty = updates.difficulty
      if (updates.frequency !== undefined) wordUpdates.frequency = updates.frequency
      if (updates.satLevel !== undefined) wordUpdates.isSAT = updates.satLevel
      if (updates.pronunciation !== undefined) wordUpdates.pronunciation = updates.pronunciation

      await wordService.updateWord(wordId, wordUpdates)
    } catch (error) {
      console.error('Error updating vocabulary word V2:', error)
      throw error
    }
  },

  // 학습 진도 업데이트
  async updateStudyProgress(
    wordId: string,
    progressType: 'quiz' | 'typing' | 'review' | 'flashcard',
    isCorrect: boolean,
    masteryChange?: number
  ): Promise<void> {
    try {
      console.log(`[updateStudyProgress] Updating progress for word ${wordId}`)
      
      // 현재 사용자 ID 가져오기 (실제로는 auth에서 가져와야 함)
      const { auth } = await import('./config')
      const userId = auth.currentUser?.uid
      
      if (!userId) {
        console.error('No user logged in for study progress update')
        return
      }
      
      // UserWordService를 사용하여 학습 기록 업데이트
      const result = isCorrect ? 'correct' : 'incorrect'
      const studyType = progressType === 'quiz' ? 'quiz' : 
                       progressType === 'typing' ? 'typing' :
                       progressType === 'flashcard' ? 'flashcard' : 'review'
      
      await userWordService.recordStudyResult(userId, wordId, result, studyType)
      
      console.log(`Study progress updated for word ${wordId}: ${result} in ${studyType}`)
    } catch (error) {
      console.error('Error updating study progress:', error)
      throw error
    }
  },

  // 단어 검색 (새 기능 추가)
  async search(
    searchTerm: string,
    options?: {
      limit?: number
      difficulty?: { min: number, max: number }
      isSAT?: boolean
      partOfSpeech?: string[]
    }
  ): Promise<LegacyVocabularyWord[]> {
    try {
      const words = await wordService.searchWords(searchTerm, options)
      return words.map(word => convertToLegacyFormat(word))
    } catch (error) {
      console.error('Error searching words V2:', error)
      throw error
    }
  }
}

// 사용자 진도 관련 함수들 (새 DB 구조 사용)
export const progressServiceV2 = {
  // 사용자의 단어별 진도 가져오기
  async getUserProgress(userId: string, wordId: string): Promise<UserProgress | null> {
    try {
      const userWord = await userWordService.findUserWord(userId, wordId)
      if (!userWord) return null

      return {
        userId: userWord.userId,
        wordId: userWord.wordId,
        correctAttempts: userWord.studyStatus.correctCount,
        totalAttempts: userWord.studyStatus.totalReviews,
        streak: userWord.studyStatus.streakCount,
        nextReviewDate: userWord.studyStatus.nextReviewDate || new Date()
      }
    } catch (error) {
      console.error('Error fetching user progress V2:', error)
      throw error
    }
  },

  // 사용자 진도 업데이트
  async updateProgress(progress: UserProgress): Promise<void> {
    try {
      const result = progress.correctAttempts > (progress.totalAttempts - progress.correctAttempts) 
        ? 'correct' : 'incorrect'
      
      await userWordService.recordStudyResult(
        progress.userId,
        progress.wordId,
        result,
        'review'
      )
    } catch (error) {
      console.error('Error updating user progress V2:', error)
      throw error
    }
  },

  // 사용자의 모든 진도 가져오기
  async getAllUserProgress(userId: string): Promise<UserProgress[]> {
    try {
      const userWords = await userWordService.getUserStudiedWords(userId)
      
      return userWords.map(userWord => ({
        userId: userWord.userId,
        wordId: userWord.wordId,
        correctAttempts: userWord.studyStatus.correctCount,
        totalAttempts: userWord.studyStatus.totalReviews,
        streak: userWord.studyStatus.streakCount,
        nextReviewDate: userWord.studyStatus.nextReviewDate || new Date()
      }))
    } catch (error) {
      console.error('Error fetching all user progress V2:', error)
      throw error
    }
  },
}

// 뉴스 서비스는 그대로 유지 (기존 구조 사용)
export const newsService = {
  // 최신 뉴스 기사 가져오기
  async getLatest(limitCount: number = 20): Promise<NewsArticle[]> {
    // 기존 구현 유지 - 뉴스는 아직 마이그레이션하지 않음
    console.warn('News service not migrated yet')
    return []
  },

  // SAT 단어가 포함된 뉴스 기사 가져오기
  async getWithSATWords(limitCount: number = 20): Promise<NewsArticle[]> {
    // 기존 구현 유지 - 뉴스는 아직 마이그레이션하지 않음
    console.warn('News service not migrated yet')
    return []
  },
}

// 호환성을 위해 기존 이름으로 export  
export { vocabularyServiceV2 as vocabularyService }
export { progressServiceV2 as progressService }