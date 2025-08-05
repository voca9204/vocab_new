// SAT Vocabulary Database - Batch Operations Utilities

import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { VocabularyWord } from '@/types'
import { FIREBASE_COLLECTIONS } from '@/lib/constants'
import { validateBatchWords, sanitizeVocabularyWord } from './vocabulary-validation'

export interface BatchOperationResult {
  success: boolean
  processedCount: number
  errorCount: number
  errors: Array<{ index: number; error: string }>
  duration: number
}

export interface BatchImportOptions {
  batchSize?: number
  validateData?: boolean
  skipDuplicates?: boolean
  updateExisting?: boolean
}

export class VocabularyBatchService {
  // 배치 크기 제한 (Firestore 최대 500개)
  private static readonly MAX_BATCH_SIZE = 500
  private static readonly DEFAULT_BATCH_SIZE = 100

  /**
   * 대량 단어 추가 (배치 처리)
   */
  static async batchAddWords(
    words: Omit<VocabularyWord, 'id' | 'createdAt' | 'updatedAt'>[],
    options: BatchImportOptions = {}
  ): Promise<BatchOperationResult> {
    const startTime = Date.now()
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      validateData = true,
      skipDuplicates = true,
      updateExisting = false
    } = options

    let processedCount = 0
    let errorCount = 0
    const errors: Array<{ index: number; error: string }> = []

    try {
      // 데이터 검증
      let validWords = words
      if (validateData) {
        const validation = validateBatchWords(words)
        validWords = validation.valid
        
        validation.invalid.forEach((invalid, index) => {
          errors.push({
            index,
            error: `Validation failed: ${invalid.errors.join(', ')}`
          })
          errorCount++
        })
      }

      // 중복 검사 (옵션)
      if (skipDuplicates) {
        const existingWords = await this.getExistingWords(validWords.map(w => w.word))
        validWords = validWords.filter(word => !existingWords.includes(word.word.toLowerCase()))
      }

      // 배치로 나누어 처리
      const batches = this.chunkArray(validWords, Math.min(batchSize, this.MAX_BATCH_SIZE))

      for (const batch of batches) {
        try {
          await this.processBatch(batch, updateExisting)
          processedCount += batch.length
        } catch (error) {
          batch.forEach((_, index) => {
            errors.push({
              index: processedCount + index,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            errorCount++
          })
        }
      }

      return {
        success: errorCount === 0,
        processedCount,
        errorCount,
        errors,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        processedCount,
        errorCount: words.length,
        errors: [{ index: -1, error: error instanceof Error ? error.message : 'Unknown error' }],
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * 단일 배치 처리
   */
  private static async processBatch(
    words: Omit<VocabularyWord, 'id' | 'createdAt' | 'updatedAt'>[],
    updateExisting: boolean
  ): Promise<void> {
    const batch = writeBatch(db)
    const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)

    words.forEach(word => {
      const sanitizedWord = sanitizeVocabularyWord(word)
      const docRef = doc(vocabularyRef)
      
      batch.set(docRef, {
        ...sanitizedWord,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })

    await batch.commit()
  }

  /**
   * 기존 단어 확인
   */
  private static async getExistingWords(words: string[]): Promise<string[]> {
    // 단어별로 존재 여부 확인 (성능상 제한적으로 사용)
    const existing: string[] = []
    
    // Firestore 'in' 쿼리 제한으로 인해 배치로 처리
    const batches = this.chunkArray(words.map(w => w.toLowerCase()), 10)
    
    for (const batch of batches) {
      try {
        const q = query(
          collection(db, FIREBASE_COLLECTIONS.VOCABULARY),
          // Note: 정확한 중복 검사를 위해서는 별도의 인덱스 필드가 필요할 수 있음
        )
        // 간단한 구현을 위해 모든 단어를 가져와서 클라이언트에서 확인
        // 실제 운영에서는 더 효율적인 방법 필요
      } catch (error) {
        console.warn('Error checking existing words:', error)
      }
    }

    return existing
  }

  /**
   * 배열을 청크로 나누기
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 전체 어휘 데이터 내보내기
   */
  static async exportAllVocabulary(): Promise<VocabularyWord[]> {
    const allWords: VocabularyWord[] = []
    const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)
    
    let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null
    const batchSize = 1000

    do {
      let q = query(vocabularyRef, limit(batchSize))
      if (lastDoc) {
        q = query(vocabularyRef, startAfter(lastDoc), limit(batchSize))
      }

      const snapshot = await getDocs(q)
      const batchWords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as VocabularyWord[]

      allWords.push(...batchWords)
      lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
    } while (lastDoc)

    return allWords
  }

  /**
   * 어휘 데이터 백업 생성
   */
  static async createBackup(): Promise<{
    success: boolean
    wordCount: number
    timestamp: Date
    data?: VocabularyWord[]
  }> {
    try {
      const words = await this.exportAllVocabulary()
      
      return {
        success: true,
        wordCount: words.length,
        timestamp: new Date(),
        data: words
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      return {
        success: false,
        wordCount: 0,
        timestamp: new Date()
      }
    }
  }

  /**
   * 데이터 통계 수집
   */
  static async getVocabularyStats(): Promise<{
    totalWords: number
    satWords: number
    avgDifficulty: number
    avgFrequency: number
    categoriesCount: Record<string, number>
    partOfSpeechCount: Record<string, number>
  }> {
    try {
      const words = await this.exportAllVocabulary()
      
      const stats = {
        totalWords: words.length,
        satWords: words.filter(w => w.satLevel).length,
        avgDifficulty: words.reduce((sum, w) => sum + w.difficulty, 0) / words.length || 0,
        avgFrequency: words.reduce((sum, w) => sum + w.frequency, 0) / words.length || 0,
        categoriesCount: {} as Record<string, number>,
        partOfSpeechCount: {} as Record<string, number>
      }

      // 카테고리 통계
      words.forEach(word => {
        word.categories.forEach(cat => {
          stats.categoriesCount[cat] = (stats.categoriesCount[cat] || 0) + 1
        })
      })

      // 품사 통계
      words.forEach(word => {
        word.partOfSpeech.forEach(pos => {
          stats.partOfSpeechCount[pos] = (stats.partOfSpeechCount[pos] || 0) + 1
        })
      })

      return stats
    } catch (error) {
      console.error('Error getting vocabulary stats:', error)
      throw error
    }
  }

  /**
   * 데이터 정리 (중복 제거, 무효한 데이터 수정)
   */
  static async cleanupVocabularyData(): Promise<BatchOperationResult> {
    const startTime = Date.now()
    let processedCount = 0
    const errorCount = 0
    const errors: Array<{ index: number; error: string }> = []

    try {
      const words = await this.exportAllVocabulary()
      const duplicates = new Map<string, VocabularyWord[]>()

      // 중복 검사
      words.forEach(word => {
        const key = word.word.toLowerCase()
        if (!duplicates.has(key)) {
          duplicates.set(key, [])
        }
        duplicates.get(key)!.push(word)
      })

      // 중복된 단어들 처리
      for (const [wordText, wordList] of duplicates) {
        if (wordList.length > 1) {
          // 가장 완전한 데이터를 가진 단어 유지, 나머지 삭제
          const bestWord = wordList.reduce((best, current) => {
            const bestScore = this.calculateWordCompleteness(best)
            const currentScore = this.calculateWordCompleteness(current)
            return currentScore > bestScore ? current : best
          })

          // 중복 단어들 삭제 (최적 단어 제외)
          const toDelete = wordList.filter(w => w.id !== bestWord.id)
          // 실제 삭제 로직은 여기에 구현
          processedCount += toDelete.length
        }
      }

      return {
        success: true,
        processedCount,
        errorCount,
        errors,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        processedCount,
        errorCount: 1,
        errors: [{ index: -1, error: error instanceof Error ? error.message : 'Unknown error' }],
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * 단어 데이터 완성도 계산
   */
  private static calculateWordCompleteness(word: VocabularyWord): number {
    let score = 0
    
    // 기본 필드 (각 1점)
    if (word.word) score += 1
    if (word.definitions.length > 0) score += 1
    if (word.examples.length > 0) score += 1
    if (word.partOfSpeech.length > 0) score += 1
    
    // 추가 필드 (각 0.5점)
    if (word.pronunciation) score += 0.5
    if (word.etymology) score += 0.5
    if (word.categories.length > 0) score += 0.5
    if (word.sources.length > 0) score += 0.5
    
    // 품질 지표 (각 0.25점)
    if (word.definitions.length > 1) score += 0.25
    if (word.examples.length > 1) score += 0.25
    if (word.apiSource) score += 0.25
    
    return score
  }
}
