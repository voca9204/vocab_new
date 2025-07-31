import { getAdminFirestore, isAdminInitialized } from '../firebase/admin'
import type { Word, WordDefinition } from '@/types/vocabulary-v2'
import { Timestamp } from 'firebase-admin/firestore'

export class WordServiceAdmin {
  private readonly collectionName = 'words'

  /**
   * 단어 정규화 - 일관된 형식으로 변환
   */
  private normalizeWord(word: string): string {
    return word
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // 중복 공백 제거
      .replace(/[^\w\s\-']/g, '') // 특수문자 제거 (하이픈, 아포스트로피 제외)
  }

  /**
   * Firestore 문서를 Word 타입으로 변환
   */
  private fromFirestore(doc: any): Word {
    const data = doc.data()
    if (!data) {
      throw new Error('Document data is empty')
    }

    return {
      id: doc.id,
      word: data.word,
      pronunciation: data.pronunciation || null,
      partOfSpeech: data.partOfSpeech || [],
      etymology: data.etymology || null,
      difficulty: data.difficulty || 5,
      frequency: data.frequency || 5,
      definitions: data.definitions || [],
      origin: data.origin || null,
      languageOfOrigin: data.languageOfOrigin || null,
      isSAT: data.isSAT !== false,
      vocabularyIds: data.vocabularyIds || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy || 'system',
      userId: data.userId || null,
      realEtymology: data.realEtymology || null,
      aiGenerated: data.aiGenerated || { etymology: false, examples: false }
    }
  }

  /**
   * 단어 검색
   */
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
    if (!isAdminInitialized()) {
      console.error('Firebase Admin not initialized')
      return []
    }

    try {
      const db = getAdminFirestore()
      const wordsRef = db.collection(this.collectionName)
      let query = wordsRef

      // 검색어가 있는 경우
      const normalizedSearch = this.normalizeWord(searchQuery)
      if (normalizedSearch) {
        query = query
          .where('word', '>=', normalizedSearch)
          .where('word', '<=', normalizedSearch + '\uf8ff')
      }

      // 필터 적용
      if (options.vocabularyId) {
        query = query.where('vocabularyIds', 'array-contains', options.vocabularyId)
      }

      if (options.partOfSpeech) {
        query = query.where('partOfSpeech', 'array-contains', options.partOfSpeech)
      }

      if (options.difficulty) {
        query = query
          .where('difficulty', '>=', options.difficulty.min)
          .where('difficulty', '<=', options.difficulty.max)
      }

      if (options.onlySAT) {
        query = query.where('isSAT', '==', true)
      }

      // 정렬
      const orderBy = options.orderBy || 'word'
      const orderDirection = options.orderDirection || 'asc'
      query = query.orderBy(orderBy, orderDirection)

      // 제한
      if (options.limit) {
        query = query.limit(options.limit)
      }

      const snapshot = await query.get()
      
      return snapshot.docs.map(doc => this.fromFirestore(doc))
    } catch (error) {
      console.error('Error searching words:', error)
      throw error
    }
  }

  /**
   * ID로 여러 단어 가져오기
   */
  async getWordsByIds(wordIds: string[]): Promise<Word[]> {
    if (!isAdminInitialized() || wordIds.length === 0) {
      return []
    }

    try {
      const db = getAdminFirestore()
      const words: Word[] = []
      
      // Firestore는 한 번에 10개까지만 in 쿼리 가능
      for (let i = 0; i < wordIds.length; i += 10) {
        const batch = wordIds.slice(i, i + 10)
        const snapshot = await db
          .collection(this.collectionName)
          .where('__name__', 'in', batch)
          .get()
        
        snapshot.docs.forEach(doc => {
          try {
            words.push(this.fromFirestore(doc))
          } catch (error) {
            console.error(`Error converting document ${doc.id}:`, error)
          }
        })
      }
      
      return words
    } catch (error) {
      console.error('Error getting words by IDs:', error)
      throw error
    }
  }

  /**
   * 단어 업데이트
   */
  async updateWord(wordId: string, updates: Partial<Word>): Promise<void> {
    if (!isAdminInitialized()) {
      throw new Error('Firebase Admin not initialized')
    }

    try {
      const db = getAdminFirestore()
      const wordRef = db.collection(this.collectionName).doc(wordId)
      
      // updatedAt 자동 추가
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      }
      
      // undefined 값 제거
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })
      
      await wordRef.update(updateData)
    } catch (error) {
      console.error(`Error updating word ${wordId}:`, error)
      throw error
    }
  }

  /**
   * AI 생성 표시
   */
  async markAsAIGenerated(wordId: string, type: 'etymology' | 'examples'): Promise<void> {
    if (!isAdminInitialized()) {
      throw new Error('Firebase Admin not initialized')
    }

    try {
      const db = getAdminFirestore()
      const wordRef = db.collection(this.collectionName).doc(wordId)
      
      const updates = {
        [`aiGenerated.${type}`]: true,
        updatedAt: Timestamp.now()
      }
      
      await wordRef.update(updates)
    } catch (error) {
      console.error(`Error marking AI generated for ${wordId}:`, error)
      throw error
    }
  }
}