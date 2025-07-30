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
  Timestamp,
  DocumentData,
  deleteDoc,
  writeBatch
} from 'firebase/firestore'
import type { VocabularyWord } from '@/types/vocabulary-v2'
import { VocabularyService } from './vocabulary-service'

export class VocabularyWordService {
  private readonly collectionName = 'vocabulary_words'
  private vocabularyService: VocabularyService

  constructor() {
    this.vocabularyService = new VocabularyService()
  }

  /**
   * 단어장에 단어 추가
   */
  async addWordToVocabulary(
    vocabularyId: string,
    wordId: string,
    userId: string,
    options?: {
      notes?: string
      customDefinition?: string
      tags?: string[]
    }
  ): Promise<VocabularyWord> {
    // 이미 존재하는지 확인
    const existing = await this.getVocabularyWord(vocabularyId, wordId)
    if (existing) {
      throw new Error('Word already exists in vocabulary')
    }
    
    const mappingId = this.generateId()
    const now = new Date()
    
    // 현재 단어장의 최대 순서 가져오기
    const maxOrder = await this.getMaxOrder(vocabularyId)
    
    const vocabularyWord: VocabularyWord = {
      id: mappingId,
      vocabularyId,
      wordId,
      order: maxOrder + 1,
      addedAt: now,
      addedBy: userId,
      notes: options?.notes,
      customDefinition: options?.customDefinition,
      tags: options?.tags
    }
    
    // 트랜잭션으로 처리하면 더 좋지만, 일단 간단히 구현
    const docRef = doc(db, this.collectionName, mappingId)
    await setDoc(docRef, this.toFirestore(vocabularyWord))
    
    // 단어장의 wordCount 업데이트
    await this.vocabularyService.updateWordCount(vocabularyId, 1)
    
    return vocabularyWord
  }

  /**
   * 단어장에 여러 단어 일괄 추가
   */
  async addWordsToVocabulary(
    vocabularyId: string,
    wordIds: string[],
    userId: string
  ): Promise<VocabularyWord[]> {
    if (wordIds.length === 0) return []
    
    const batch = writeBatch(db)
    const vocabularyWords: VocabularyWord[] = []
    const now = new Date()
    let currentOrder = await this.getMaxOrder(vocabularyId)
    
    for (const wordId of wordIds) {
      // 중복 확인
      const existing = await this.getVocabularyWord(vocabularyId, wordId)
      if (existing) continue
      
      currentOrder++
      const mappingId = this.generateId()
      
      const vocabularyWord: VocabularyWord = {
        id: mappingId,
        vocabularyId,
        wordId,
        order: currentOrder,
        addedAt: now,
        addedBy: userId
      }
      
      const docRef = doc(db, this.collectionName, mappingId)
      batch.set(docRef, this.toFirestore(vocabularyWord))
      vocabularyWords.push(vocabularyWord)
    }
    
    if (vocabularyWords.length > 0) {
      await batch.commit()
      // 단어장의 wordCount 업데이트
      await this.vocabularyService.updateWordCount(vocabularyId, vocabularyWords.length)
    }
    
    return vocabularyWords
  }

  /**
   * 단어장에서 단어 제거
   */
  async removeWordFromVocabulary(
    vocabularyId: string,
    wordId: string
  ): Promise<void> {
    const vocabularyWord = await this.getVocabularyWord(vocabularyId, wordId)
    if (!vocabularyWord) {
      throw new Error('Word not found in vocabulary')
    }
    
    const docRef = doc(db, this.collectionName, vocabularyWord.id)
    await deleteDoc(docRef)
    
    // 단어장의 wordCount 업데이트
    await this.vocabularyService.updateWordCount(vocabularyId, -1)
  }

  /**
   * 단어장의 모든 단어 조회
   */
  async getVocabularyWords(vocabularyId: string): Promise<VocabularyWord[]> {
    const q = query(
      collection(db, this.collectionName),
      where('vocabularyId', '==', vocabularyId),
      orderBy('order', 'asc')
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => 
      this.fromFirestore({ ...doc.data(), id: doc.id })
    )
  }

  /**
   * 특정 단어가 포함된 단어장들 조회
   */
  async getVocabulariesContainingWord(wordId: string): Promise<string[]> {
    const q = query(
      collection(db, this.collectionName),
      where('wordId', '==', wordId)
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => doc.data().vocabularyId)
  }

  /**
   * 단어장의 특정 단어 조회
   */
  async getVocabularyWord(vocabularyId: string, wordId: string): Promise<VocabularyWord | null> {
    const q = query(
      collection(db, this.collectionName),
      where('vocabularyId', '==', vocabularyId),
      where('wordId', '==', wordId)
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return null
    }
    
    return this.fromFirestore({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id })
  }

  /**
   * 단어의 순서 업데이트
   */
  async updateWordOrder(
    vocabularyId: string,
    wordId: string,
    newOrder: number
  ): Promise<void> {
    const vocabularyWord = await this.getVocabularyWord(vocabularyId, wordId)
    if (!vocabularyWord) {
      throw new Error('Word not found in vocabulary')
    }
    
    const docRef = doc(db, this.collectionName, vocabularyWord.id)
    await setDoc(docRef, { order: newOrder }, { merge: true })
  }

  /**
   * 단어장의 단어 순서 재정렬
   */
  async reorderWords(
    vocabularyId: string,
    wordIds: string[]
  ): Promise<void> {
    const batch = writeBatch(db)
    
    for (let i = 0; i < wordIds.length; i++) {
      const vocabularyWord = await this.getVocabularyWord(vocabularyId, wordIds[i])
      if (!vocabularyWord) continue
      
      const docRef = doc(db, this.collectionName, vocabularyWord.id)
      batch.update(docRef, { order: i + 1 })
    }
    
    await batch.commit()
  }

  /**
   * 단어장 삭제 시 모든 매핑 삭제
   */
  async deleteAllWordsInVocabulary(vocabularyId: string): Promise<void> {
    const words = await this.getVocabularyWords(vocabularyId)
    
    if (words.length === 0) return
    
    const batch = writeBatch(db)
    
    for (const word of words) {
      const docRef = doc(db, this.collectionName, word.id)
      batch.delete(docRef)
    }
    
    await batch.commit()
  }

  /**
   * 사용자 정의 정보 업데이트
   */
  async updateCustomInfo(
    vocabularyId: string,
    wordId: string,
    updates: {
      notes?: string
      customDefinition?: string
      tags?: string[]
    }
  ): Promise<void> {
    const vocabularyWord = await this.getVocabularyWord(vocabularyId, wordId)
    if (!vocabularyWord) {
      throw new Error('Word not found in vocabulary')
    }
    
    const docRef = doc(db, this.collectionName, vocabularyWord.id)
    await setDoc(docRef, updates, { merge: true })
  }

  /**
   * 현재 단어장의 최대 순서 가져오기
   */
  private async getMaxOrder(vocabularyId: string): Promise<number> {
    const q = query(
      collection(db, this.collectionName),
      where('vocabularyId', '==', vocabularyId),
      orderBy('order', 'desc')
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return 0
    }
    
    return snapshot.docs[0].data().order || 0
  }

  /**
   * Firestore 데이터 변환
   */
  private toFirestore(vocabularyWord: VocabularyWord): DocumentData {
    const data: any = { ...vocabularyWord }
    data.addedAt = Timestamp.fromDate(vocabularyWord.addedAt)
    return data
  }

  private fromFirestore(data: DocumentData): VocabularyWord {
    return {
      ...data,
      addedAt: data.addedAt?.toDate() || new Date()
    } as VocabularyWord
  }

  private generateId(): string {
    return doc(collection(db, 'temp')).id
  }
}

export default VocabularyWordService