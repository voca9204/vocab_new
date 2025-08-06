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
  increment,
  writeBatch
} from 'firebase/firestore'
import type { Word, WordDefinition } from '@/types/vocabulary-v2'

export class WordService {
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
   * 단어 생성 또는 업데이트
   * 동일한 단어가 이미 존재하면 정의를 추가
   */
  async createOrUpdateWord(wordData: Partial<Word> & { word: string, createdBy: string }): Promise<Word> {
    // 단어 정규화
    const normalizedWord = this.normalizeWord(wordData.word)
    
    if (!normalizedWord) {
      throw new Error('Invalid word: empty after normalization')
    }
    
    // 먼저 단어가 이미 존재하는지 확인
    const existingWord = await this.findWordByText(normalizedWord)
    
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
      word: normalizedWord,
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
    
    return this.fromFirestore({ ...docSnap.data(), id: wordId })
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
    
    console.log(`[WordService.getWordsByIds] Fetching ${wordIds.length} words`)
    const startTime = Date.now()
    
    // Firestore의 'in' 쿼리는 최대 10개까지만 가능하지만, 
    // 병렬로 처리하여 속도 개선
    const chunks = this.chunkArray(wordIds, 10)
    
    // 모든 청크를 병렬로 처리
    const promises = chunks.map(async (chunk) => {
      const q = query(
        collection(db, this.collectionName),
        where('__name__', 'in', chunk)
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => this.fromFirestore({ ...doc.data(), id: doc.id }))
    })
    
    const results = await Promise.all(promises)
    const allWords = results.flat()
    
    const endTime = Date.now()
    console.log(`[WordService.getWordsByIds] Fetched ${allWords.length} words in ${endTime - startTime}ms`)
    
    return allWords
  }

  /**
   * 단어 검색
   */
  async searchWords(searchTerm: string, options?: {
    limit?: number
    offset?: number
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
    
    console.log('[WordService.searchWords] Building query with constraints:', constraints.length)
    const q = query(collection(db, this.collectionName), ...constraints)
    
    console.log('[WordService.searchWords] Executing query...')
    const snapshot = await getDocs(q)
    
    console.log(`[WordService.searchWords] Found ${snapshot.docs.length} documents`)
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
   * 여러 단어를 배치로 추가 (중복 방지)
   */
  async addMultipleWords(words: Array<Partial<Word> & { word: string, createdBy: string }>): Promise<Word[]> {
    if (words.length === 0) return []
    
    // 먼저 모든 단어를 정규화하고 중복 제거
    const uniqueWords = new Map<string, typeof words[0]>()
    
    for (const word of words) {
      const normalized = this.normalizeWord(word.word)
      if (normalized && !uniqueWords.has(normalized)) {
        uniqueWords.set(normalized, { ...word, word: normalized })
      }
    }
    
    // 기존 단어 확인
    const existingWords = await this.checkExistingWords(Array.from(uniqueWords.keys()))
    
    // 새 단어만 추가
    const newWords = Array.from(uniqueWords.entries())
      .filter(([word]) => !existingWords.has(word))
      .map(([, wordData]) => wordData)
    
    if (newWords.length === 0) {
      console.log('모든 단어가 이미 존재합니다.')
      return []
    }
    
    // 배치로 추가
    return this.batchCreateWords(newWords)
  }

  /**
   * 기존 단어들 확인
   */
  private async checkExistingWords(words: string[]): Promise<Set<string>> {
    if (words.length === 0) return new Set()
    
    const existingWords = new Set<string>()
    
    // Firestore의 'in' 쿼리는 최대 30개까지만 가능
    const chunks = this.chunkArray(words, 30)
    
    for (const chunk of chunks) {
      const q = query(
        collection(db, this.collectionName),
        where('word', 'in', chunk)
      )
      
      const snapshot = await getDocs(q)
      snapshot.forEach(doc => {
        const data = doc.data()
        existingWords.add(data.word)
      })
    }
    
    return existingWords
  }

  /**
   * 배치로 단어 생성
   */
  private async batchCreateWords(words: Array<Partial<Word> & { word: string, createdBy: string }>): Promise<Word[]> {
    const createdWords: Word[] = []
    const BATCH_SIZE = 500
    const chunks = this.chunkArray(words, BATCH_SIZE)
    
    for (const chunk of chunks) {
      const batch = writeBatch(db)
      const chunkWords: Word[] = []
      
      for (const wordData of chunk) {
        const wordId = this.generateId()
        const now = new Date()
        
        const newWord: Word = {
          id: wordId,
          word: wordData.word,
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
        
        batch.set(doc(db, this.collectionName, wordId), this.toFirestore(newWord))
        chunkWords.push(newWord)
      }
      
      await batch.commit()
      createdWords.push(...chunkWords)
    }
    
    return createdWords
  }

  /**
   * 데이터베이스 무결성 검사
   */
  async checkDatabaseIntegrity(): Promise<{
    totalWords: number
    duplicates: Array<{ word: string, ids: string[] }>
    malformedWords: string[]
  }> {
    const snapshot = await getDocs(collection(db, this.collectionName))
    const wordMap = new Map<string, string[]>()
    const malformedWords: string[] = []
    
    snapshot.forEach(doc => {
      const data = doc.data()
      const word = data.word
      
      // 단어 형식 검사
      if (!word || typeof word !== 'string' || word.trim() === '') {
        malformedWords.push(doc.id)
        return
      }
      
      const normalized = this.normalizeWord(word)
      if (!wordMap.has(normalized)) {
        wordMap.set(normalized, [])
      }
      wordMap.get(normalized)!.push(doc.id)
    })
    
    const duplicates = Array.from(wordMap.entries())
      .filter(([, ids]) => ids.length > 1)
      .map(([word, ids]) => ({ word, ids }))
    
    return {
      totalWords: snapshot.size,
      duplicates,
      malformedWords
    }
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
    const word = {
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
    
    // 디버깅용 로그 (첫 번째 단어만)
    if (!this.loggedFirstWord) {
      console.log('[WordService.fromFirestore] Sample word data:', word)
      this.loggedFirstWord = true
    }
    
    return word
  }
  
  private loggedFirstWord = false

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