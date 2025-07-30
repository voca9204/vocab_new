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
  Timestamp,
  DocumentData,
  QueryConstraint,
  updateDoc,
  increment
} from 'firebase/firestore'
import type { Word, WordDefinition } from '@/types/vocabulary-v2'

export class WordService {
  private readonly collectionName = 'words'

  /**
   * 단어 생성 또는 업데이트
   * 동일한 단어가 이미 존재하면 정의를 추가
   */
  async createOrUpdateWord(wordData: Partial<Word> & { word: string, createdBy: string }): Promise<Word> {
    // 먼저 단어가 이미 존재하는지 확인
    const existingWord = await this.findWordByText(wordData.word)
    
    if (existingWord) {
      // 기존 단어에 새로운 정의 추가
      if (wordData.definitions && wordData.definitions.length > 0) {
        const updatedDefinitions = [...existingWord.definitions]
        
        // 중복되지 않는 정의만 추가
        for (const newDef of wordData.definitions) {
          const isDuplicate = updatedDefinitions.some(
            def => def.definition === newDef.definition && def.language === newDef.language
          )
          if (!isDuplicate) {
            updatedDefinitions.push({
              ...newDef,
              id: this.generateId(),
              createdAt: new Date()
            })
          }
        }
        
        await this.updateWord(existingWord.id, {
          definitions: updatedDefinitions,
          updatedAt: new Date()
        })
        
        return { ...existingWord, definitions: updatedDefinitions }
      }
      
      return existingWord
    }
    
    // 새로운 단어 생성
    const wordId = this.generateId()
    const now = new Date()
    
    const newWord: Word = {
      id: wordId,
      word: wordData.word.toLowerCase(),
      pronunciation: wordData.pronunciation,
      partOfSpeech: wordData.partOfSpeech || [],
      definitions: wordData.definitions?.map(def => ({
        ...def,
        id: this.generateId(),
        createdAt: def.createdAt || now
      })) || [],
      etymology: wordData.etymology,
      realEtymology: wordData.realEtymology,
      synonyms: wordData.synonyms || [],
      antonyms: wordData.antonyms || [],
      difficulty: wordData.difficulty || 5,
      frequency: wordData.frequency || 5,
      isSAT: wordData.isSAT || false,
      createdAt: now,
      updatedAt: now,
      createdBy: wordData.createdBy,
      aiGenerated: wordData.aiGenerated
    }
    
    const docRef = doc(db, this.collectionName, wordId)
    await setDoc(docRef, this.toFirestore(newWord))
    
    return newWord
  }

  /**
   * 단어 ID로 조회
   */
  async getWordById(wordId: string): Promise<Word | null> {
    const docRef = doc(db, this.collectionName, wordId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    return this.fromFirestore(docSnap.data())
  }

  /**
   * 단어 텍스트로 조회
   */
  async findWordByText(wordText: string): Promise<Word | null> {
    const q = query(
      collection(db, this.collectionName),
      where('word', '==', wordText.toLowerCase())
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return null
    }
    
    return this.fromFirestore(snapshot.docs[0].data())
  }

  /**
   * 여러 단어 ID로 조회
   */
  async getWordsByIds(wordIds: string[]): Promise<Word[]> {
    if (wordIds.length === 0) return []
    
    // Firestore의 'in' 쿼리는 최대 10개까지만 가능
    const chunks = this.chunkArray(wordIds, 10)
    const allWords: Word[] = []
    
    for (const chunk of chunks) {
      const q = query(
        collection(db, this.collectionName),
        where('__name__', 'in', chunk)
      )
      
      const snapshot = await getDocs(q)
      const words = snapshot.docs.map(doc => this.fromFirestore({ ...doc.data(), id: doc.id }))
      allWords.push(...words)
    }
    
    return allWords
  }

  /**
   * 단어 검색
   */
  async searchWords(searchTerm: string, options?: {
    limit?: number
    includeDefinitions?: boolean
    partOfSpeech?: string[]
    difficulty?: { min: number, max: number }
    isSAT?: boolean
  }): Promise<Word[]> {
    const constraints: QueryConstraint[] = [
      orderBy('word'),
      limit(options?.limit || 20)
    ]
    
    if (options?.isSAT !== undefined) {
      constraints.unshift(where('isSAT', '==', options.isSAT))
    }
    
    if (options?.partOfSpeech && options.partOfSpeech.length > 0) {
      constraints.unshift(where('partOfSpeech', 'array-contains-any', options.partOfSpeech))
    }
    
    const q = query(collection(db, this.collectionName), ...constraints)
    const snapshot = await getDocs(q)
    
    let words = snapshot.docs.map(doc => this.fromFirestore({ ...doc.data(), id: doc.id }))
    
    // 클라이언트 사이드 필터링 (검색어, 난이도)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      words = words.filter(word => 
        word.word.includes(term) ||
        (options?.includeDefinitions && word.definitions.some(def => 
          def.definition.toLowerCase().includes(term)
        ))
      )
    }
    
    if (options?.difficulty) {
      words = words.filter(word => 
        word.difficulty >= options.difficulty!.min && 
        word.difficulty <= options.difficulty!.max
      )
    }
    
    return words
  }

  /**
   * 단어 업데이트
   */
  async updateWord(wordId: string, updates: Partial<Word>): Promise<void> {
    const docRef = doc(db, this.collectionName, wordId)
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date())
    }
    
    // Date 객체를 Timestamp로 변환
    if (updateData.definitions) {
      updateData.definitions = updateData.definitions.map((def: WordDefinition) => ({
        ...def,
        createdAt: def.createdAt instanceof Date ? Timestamp.fromDate(def.createdAt) : def.createdAt
      }))
    }
    
    await updateDoc(docRef, updateData)
  }

  /**
   * AI로 생성된 콘텐츠 표시
   */
  async markAsAIGenerated(wordId: string, type: 'examples' | 'etymology'): Promise<void> {
    const docRef = doc(db, this.collectionName, wordId)
    await updateDoc(docRef, {
      [`aiGenerated.${type}`]: true,
      'aiGenerated.generatedAt': Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    })
  }

  /**
   * 단어에 정의 추가
   */
  async addDefinition(wordId: string, definition: Omit<WordDefinition, 'id' | 'createdAt'>): Promise<void> {
    const word = await this.getWordById(wordId)
    if (!word) throw new Error('Word not found')
    
    const newDefinition: WordDefinition = {
      ...definition,
      id: this.generateId(),
      createdAt: new Date()
    }
    
    await this.updateWord(wordId, {
      definitions: [...word.definitions, newDefinition]
    })
  }

  /**
   * Firestore 데이터 변환
   */
  private toFirestore(word: Word): DocumentData {
    return {
      ...word,
      createdAt: Timestamp.fromDate(word.createdAt),
      updatedAt: Timestamp.fromDate(word.updatedAt),
      definitions: word.definitions.map(def => ({
        ...def,
        createdAt: Timestamp.fromDate(def.createdAt)
      })),
      aiGenerated: word.aiGenerated ? {
        ...word.aiGenerated,
        generatedAt: word.aiGenerated.generatedAt ? 
          Timestamp.fromDate(word.aiGenerated.generatedAt) : null
      } : null
    }
  }

  private fromFirestore(data: DocumentData): Word {
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      definitions: (data.definitions || []).map((def: any) => ({
        ...def,
        createdAt: def.createdAt?.toDate() || new Date()
      })),
      aiGenerated: data.aiGenerated ? {
        ...data.aiGenerated,
        generatedAt: data.aiGenerated.generatedAt?.toDate() || null
      } : undefined
    } as Word
  }

  private generateId(): string {
    return doc(collection(db, 'temp')).id
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

export default WordService