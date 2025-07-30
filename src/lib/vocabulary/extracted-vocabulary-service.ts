import { db } from '../firebase/config'
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore'
import { ExtractedVocabulary, VocabularyCollection } from '@/types/extracted-vocabulary'
import { DictionaryService } from '../api/dictionary-service'
import { MockDictionaryService } from '../api/mock-dictionary'
import { WordDifficultyCalculator } from './word-difficulty-calculator'

/**
 * @deprecated 이 서비스는 구 DB 구조를 사용합니다.
 * 새 DB 구조는 WordService, VocabularyService를 사용하세요.
 */
export class ExtractedVocabularyService {
  private readonly collectionName = 'extracted_vocabulary' // TODO: 삭제 예정
  private readonly collectionsName = 'vocabulary_collections'
  private dictionaryService: DictionaryService | MockDictionaryService
  private useMockDictionary = true // 개발 중에는 Mock 사용

  constructor() {
    this.dictionaryService = this.useMockDictionary 
      ? new MockDictionaryService()
      : new DictionaryService()
  }

  /**
   * PDF에서 추출한 단어들을 처리하고 저장
   */
  async processExtractedWords(
    words: string[], 
    userId: string, 
    source: { filename: string }
  ): Promise<ExtractedVocabulary[]> {
    const processedWords: ExtractedVocabulary[] = []
    
    // 중복 제거 및 정리
    const uniqueWords = [...new Set(
      words
        .map(w => w.toLowerCase().trim())
        .filter(w => w.length > 2 && /^[a-zA-Z]+$/.test(w))
    )]

    // 배치로 처리 (API 호출 제한 고려)
    const batchSize = 3 // API rate limit 때문에 줄임
    for (let i = 0; i < uniqueWords.length; i += batchSize) {
      const batch = uniqueWords.slice(i, i + batchSize)
      
      const promises = batch.map(async (word) => {
        try {
          // 이미 존재하는 단어인지 확인
          const existing = await this.getWordByText(word, userId)
          if (existing) {
            console.log(`Word "${word}" already exists for user`)
            return existing
          }

          // Dictionary API로 단어 정보 가져오기
          const wordData = await this.dictionaryService.getWordData(word)
          
          if (wordData) {
            const vocabulary: ExtractedVocabulary = {
              word: word,
              definition: wordData.meanings[0]?.definitions[0]?.definition || 'No definition found',
              partOfSpeech: wordData.meanings.map(m => m.partOfSpeech).filter(Boolean),
              examples: wordData.meanings
                .flatMap(m => m.definitions || [])
                .map(d => d.example)
                .filter(Boolean) as string[],
              pronunciation: wordData.phonetic || undefined,
              synonyms: wordData.meanings
                .flatMap(m => m.synonyms || [])
                .filter(Boolean)
                .slice(0, 5),
              antonyms: wordData.meanings
                .flatMap(m => m.antonyms || [])
                .filter(Boolean)
                .slice(0, 5),
              difficulty: this.estimateDifficulty(word),
              frequency: Math.floor(Math.random() * 10) + 1,
              source: {
                type: 'pdf' as const,
                filename: source.filename,
                uploadedAt: new Date()
              },
              userId,
              createdAt: new Date(),
              updatedAt: new Date(),
              isSAT: this.checkIfSATWord(word),
              studyStatus: {
                studied: false,
                masteryLevel: 0,
                reviewCount: 0
              }
            }

            // Firestore에 저장
            const savedWord = await this.saveWord(vocabulary)
            processedWords.push(savedWord)
          }
        } catch (error) {
          console.error(`Error processing word "${word}":`, error)
        }
      })

      await Promise.all(promises)
      
      // API rate limiting을 위한 딜레이
      if (i + batchSize < uniqueWords.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2초 대기
      }
    }

    return processedWords
  }

  /**
   * 단어 저장
   */
  async saveWord(vocabulary: ExtractedVocabulary): Promise<ExtractedVocabulary> {
    const docRef = doc(collection(db, this.collectionName))
    const wordData = {
      ...vocabulary,
      id: docRef.id,
      createdAt: Timestamp.fromDate(vocabulary.createdAt),
      updatedAt: Timestamp.fromDate(vocabulary.updatedAt),
      source: {
        ...vocabulary.source,
        uploadedAt: Timestamp.fromDate(vocabulary.source.uploadedAt)
      }
    }
    
    await setDoc(docRef, wordData)
    return { ...vocabulary, id: docRef.id }
  }

  /**
   * 모든 단어 조회 (모든 사용자)
   */
  async getAllWords(limitCount?: number): Promise<ExtractedVocabulary[]> {
    let q = query(collection(db, this.collectionName))
    
    if (limitCount) {
      q = query(q, limit(limitCount))
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
      source: {
        ...doc.data().source,
        uploadedAt: doc.data().source?.uploadedAt?.toDate ? doc.data().source.uploadedAt.toDate() : doc.data().source?.uploadedAt
      }
    } as ExtractedVocabulary))
  }

  /**
   * 사용자의 단어 조회
   */
  async getUserWords(
    userId: string, 
    options?: {
      limit?: number
      onlySAT?: boolean
      orderBy?: 'createdAt' | 'word' | 'difficulty'
    }
  ): Promise<ExtractedVocabulary[]> {
    let q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId)
    )

    if (options?.onlySAT) {
      q = query(q, where('isSAT', '==', true))
    }

    if (options?.orderBy) {
      q = query(q, orderBy(options.orderBy, 'desc'))
    }

    if (options?.limit) {
      q = query(q, limit(options.limit))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
      source: {
        ...doc.data().source,
        uploadedAt: doc.data().source.uploadedAt.toDate()
      }
    } as ExtractedVocabulary))
  }

  /**
   * 특정 단어 조회
   */
  async getWordByText(word: string, userId: string): Promise<ExtractedVocabulary | null> {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      where('word', '==', word.toLowerCase())
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return {
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
      source: {
        ...doc.data().source,
        uploadedAt: doc.data().source.uploadedAt.toDate()
      }
    } as ExtractedVocabulary
  }

  /**
   * 단어 학습 상태 업데이트
   */
  async updateStudyStatus(
    wordId: string, 
    status: Partial<ExtractedVocabulary['studyStatus']>
  ): Promise<void> {
    const docRef = doc(db, this.collectionName, wordId)
    
    // studyStatus 필드를 부분적으로 업데이트하기 위해 dot notation 사용
    const updateData: any = {
      updatedAt: Timestamp.now()
    }
    
    // status 객체의 각 필드를 dot notation으로 변환
    Object.entries(status).forEach(([key, value]) => {
      updateData[`studyStatus.${key}`] = value
    })
    
    await updateDoc(docRef, updateData)
  }

  /**
   * 컬렉션 생성 (단어 묶음)
   */
  async createCollection(
    name: string,
    wordIds: string[],
    userId: string,
    description?: string
  ): Promise<VocabularyCollection> {
    const docRef = doc(collection(db, this.collectionsName))
    const collectionData: VocabularyCollection = {
      id: docRef.id,
      name,
      description,
      words: wordIds,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await setDoc(docRef, {
      ...collectionData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })

    return collectionData
  }

  /**
   * 난이도 추정 (학술적 방법론 기반)
   */
  private estimateDifficulty(word: string): number {
    return WordDifficultyCalculator.calculateDifficulty(word)
  }

  /**
   * SAT 단어 여부 확인
   */
  private checkIfSATWord(word: string): boolean {
    // 확장된 SAT 단어 목록 (실제로는 더 큰 DB 필요)
    const satWords = [
      'aberration', 'abhor', 'abstruse', 'acquiesce', 'acrimony', 'admonish',
      'adroit', 'aesthetic', 'affable', 'alacrity', 'alleviate', 'altruistic',
      'ambiguous', 'ambivalent', 'ameliorate', 'amiable', 'amorphous', 'anachronism',
      'anarchy', 'anomaly', 'antagonist', 'antipathy', 'apathy', 'appease',
      'arbitrary', 'arcane', 'archaic', 'arduous', 'articulate', 'ascetic',
      // ... 더 많은 SAT 단어들
    ]
    
    return satWords.includes(word.toLowerCase())
  }
}

export default ExtractedVocabularyService