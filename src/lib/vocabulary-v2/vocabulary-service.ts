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
  deleteDoc,
  increment
} from 'firebase/firestore'
import type { Vocabulary, VocabularyType } from '@/types/vocabulary-v2'

export class VocabularyService {
  private readonly collectionName = 'vocabularies'

  /**
   * 단어장 생성
   */
  async createVocabulary(data: Omit<Vocabulary, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>): Promise<Vocabulary> {
    const vocabularyId = this.generateId()
    const now = new Date()
    
    const vocabulary: Vocabulary = {
      id: vocabularyId,
      ...data,
      wordCount: 0,
      createdAt: now,
      updatedAt: now,
      stats: {
        totalSubscribers: 0,
        averageMastery: 0,
        completionRate: 0
      }
    }
    
    const docRef = doc(db, this.collectionName, vocabularyId)
    await setDoc(docRef, this.toFirestore(vocabulary))
    
    return vocabulary
  }

  /**
   * 단어장 조회
   */
  async getVocabularyById(vocabularyId: string): Promise<Vocabulary | null> {
    const docRef = doc(db, this.collectionName, vocabularyId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    return this.fromFirestore({ ...docSnap.data(), id: docSnap.id })
  }

  /**
   * 사용자의 단어장 목록 조회
   */
  async getUserVocabularies(userId: string, includeSystem: boolean = true): Promise<Vocabulary[]> {
    const constraints: QueryConstraint[] = []
    
    if (includeSystem) {
      // 사용자 단어장 + 시스템 단어장
      constraints.push(
        where('ownerId', 'in', [userId, 'system'])
      )
    } else {
      // 사용자 단어장만
      constraints.push(
        where('ownerId', '==', userId)
      )
    }
    
    constraints.push(orderBy('createdAt', 'desc'))
    
    const q = query(collection(db, this.collectionName), ...constraints)
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => this.fromFirestore({ ...doc.data(), id: doc.id }))
  }

  /**
   * 공개 단어장 검색
   */
  async searchPublicVocabularies(options?: {
    searchTerm?: string
    category?: string
    level?: string
    type?: VocabularyType
    limit?: number
    sortBy?: 'popular' | 'recent' | 'name'
  }): Promise<Vocabulary[]> {
    const constraints: QueryConstraint[] = [
      where('visibility', '==', 'public')
    ]
    
    if (options?.type) {
      constraints.push(where('type', '==', options.type))
    }
    
    if (options?.category) {
      constraints.push(where('category', '==', options.category))
    }
    
    if (options?.level) {
      constraints.push(where('level', '==', options.level))
    }
    
    // 정렬
    switch (options?.sortBy) {
      case 'popular':
        constraints.push(orderBy('stats.totalSubscribers', 'desc'))
        break
      case 'recent':
        constraints.push(orderBy('createdAt', 'desc'))
        break
      case 'name':
      default:
        constraints.push(orderBy('name'))
        break
    }
    
    constraints.push(limit(options?.limit || 20))
    
    const q = query(collection(db, this.collectionName), ...constraints)
    const snapshot = await getDocs(q)
    
    let vocabularies = snapshot.docs.map(doc => 
      this.fromFirestore({ ...doc.data(), id: doc.id })
    )
    
    // 클라이언트 사이드 검색어 필터링
    if (options?.searchTerm) {
      const term = options.searchTerm.toLowerCase()
      vocabularies = vocabularies.filter(vocab => 
        vocab.name.toLowerCase().includes(term) ||
        vocab.description?.toLowerCase().includes(term) ||
        vocab.tags?.some(tag => tag.toLowerCase().includes(term))
      )
    }
    
    return vocabularies
  }

  /**
   * 단어장 업데이트
   */
  async updateVocabulary(vocabularyId: string, updates: Partial<Vocabulary>): Promise<void> {
    const docRef = doc(db, this.collectionName, vocabularyId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date())
    })
  }

  /**
   * 단어장 삭제
   */
  async deleteVocabulary(vocabularyId: string, userId: string): Promise<void> {
    // 소유자 확인
    const vocabulary = await this.getVocabularyById(vocabularyId)
    if (!vocabulary) {
      throw new Error('Vocabulary not found')
    }
    
    if (vocabulary.ownerId !== userId && vocabulary.ownerType !== 'system') {
      throw new Error('Unauthorized to delete this vocabulary')
    }
    
    // 단어장 삭제 (연관된 vocabulary_words는 별도로 처리해야 함)
    const docRef = doc(db, this.collectionName, vocabularyId)
    await deleteDoc(docRef)
  }

  /**
   * 단어 수 업데이트
   */
  async updateWordCount(vocabularyId: string, delta: number): Promise<void> {
    const docRef = doc(db, this.collectionName, vocabularyId)
    await updateDoc(docRef, {
      wordCount: increment(delta),
      updatedAt: Timestamp.fromDate(new Date())
    })
  }

  /**
   * 구독자 수 업데이트
   */
  async updateSubscriberCount(vocabularyId: string, delta: number): Promise<void> {
    const docRef = doc(db, this.collectionName, vocabularyId)
    await updateDoc(docRef, {
      'stats.totalSubscribers': increment(delta),
      updatedAt: Timestamp.fromDate(new Date())
    })
  }

  /**
   * 통계 업데이트
   */
  async updateStats(vocabularyId: string, stats: {
    averageMastery?: number
    completionRate?: number
  }): Promise<void> {
    const docRef = doc(db, this.collectionName, vocabularyId)
    const updates: any = {
      updatedAt: Timestamp.fromDate(new Date())
    }
    
    if (stats.averageMastery !== undefined) {
      updates['stats.averageMastery'] = stats.averageMastery
    }
    
    if (stats.completionRate !== undefined) {
      updates['stats.completionRate'] = stats.completionRate
    }
    
    await updateDoc(docRef, updates)
  }

  /**
   * 권한 확인
   */
  async checkPermission(vocabularyId: string, userId: string, action: 'read' | 'write' | 'delete'): Promise<boolean> {
    const vocabulary = await this.getVocabularyById(vocabularyId)
    if (!vocabulary) return false
    
    // 시스템 단어장
    if (vocabulary.type === 'system') {
      // 시스템 단어장은 모두 읽을 수 있음
      if (action === 'read') return true
      // 관리자만 수정/삭제 가능 (여기서는 간단히 false 반환)
      return false
    }
    
    // 공개 단어장
    if (vocabulary.visibility === 'public' && action === 'read') {
      return true
    }
    
    // 소유자 확인
    return vocabulary.ownerId === userId
  }

  /**
   * Firestore 데이터 변환
   */
  private toFirestore(vocabulary: Vocabulary): DocumentData {
    const data: any = {
      ...vocabulary,
      createdAt: Timestamp.fromDate(vocabulary.createdAt),
      updatedAt: Timestamp.fromDate(vocabulary.updatedAt)
    }
    
    // source.uploadedAt이 있으면 변환
    if (data.source?.uploadedAt) {
      data.source.uploadedAt = Timestamp.fromDate(data.source.uploadedAt)
    }
    
    return data
  }

  private fromFirestore(data: DocumentData): Vocabulary {
    const vocabulary: any = {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    }
    
    // source.uploadedAt이 있으면 변환
    if (vocabulary.source?.uploadedAt) {
      vocabulary.source.uploadedAt = vocabulary.source.uploadedAt.toDate()
    }
    
    return vocabulary as Vocabulary
  }

  private generateId(): string {
    return doc(collection(db, 'temp')).id
  }
}

export default VocabularyService