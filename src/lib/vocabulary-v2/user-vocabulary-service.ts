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
  updateDoc
} from 'firebase/firestore'
import type { UserVocabulary } from '@/types/vocabulary-v2'
import { VocabularyService } from './vocabulary-service'

export class UserVocabularyService {
  private readonly collectionName = 'user_vocabularies'
  private vocabularyService: VocabularyService

  constructor() {
    this.vocabularyService = new VocabularyService()
  }

  /**
   * 단어장 구독
   */
  async subscribeToVocabulary(
    userId: string,
    vocabularyId: string,
    isOwner: boolean = false
  ): Promise<UserVocabulary> {
    // 이미 구독 중인지 확인
    const existing = await this.getUserVocabulary(userId, vocabularyId)
    if (existing) {
      // 이미 구독 중이면 활성화만 업데이트
      if (!existing.isActive) {
        await this.updateSubscriptionStatus(userId, vocabularyId, true)
        return { ...existing, isActive: true }
      }
      return existing
    }
    
    // 단어장 정보 가져오기
    const vocabulary = await this.vocabularyService.getVocabularyById(vocabularyId)
    if (!vocabulary) {
      throw new Error('Vocabulary not found')
    }
    
    const subscriptionId = this.generateId()
    const now = new Date()
    
    const userVocabulary: UserVocabulary = {
      id: subscriptionId,
      userId,
      vocabularyId,
      isActive: true,
      isOwner,
      subscribedAt: now,
      lastAccessedAt: now,
      progress: {
        totalWords: vocabulary.wordCount,
        studiedWords: 0,
        masteredWords: 0,
        reviewingWords: 0
      },
      settings: {
        dailyGoal: 30,
        reminderEnabled: false
      }
    }
    
    const docRef = doc(db, this.collectionName, subscriptionId)
    await setDoc(docRef, this.toFirestore(userVocabulary))
    
    // 구독자 수 업데이트
    if (!isOwner) {
      await this.vocabularyService.updateSubscriberCount(vocabularyId, 1)
    }
    
    return userVocabulary
  }

  /**
   * 단어장 구독 취소
   */
  async unsubscribeFromVocabulary(
    userId: string,
    vocabularyId: string
  ): Promise<void> {
    const userVocabulary = await this.getUserVocabulary(userId, vocabularyId)
    if (!userVocabulary) {
      throw new Error('Subscription not found')
    }
    
    // 소유자는 구독 취소할 수 없음
    if (userVocabulary.isOwner) {
      throw new Error('Cannot unsubscribe from owned vocabulary')
    }
    
    // 비활성화
    await this.updateSubscriptionStatus(userId, vocabularyId, false)
    
    // 구독자 수 업데이트
    await this.vocabularyService.updateSubscriberCount(vocabularyId, -1)
  }

  /**
   * 사용자의 구독 단어장 목록 조회
   */
  async getUserSubscriptions(
    userId: string,
    options?: {
      activeOnly?: boolean
      includeOwned?: boolean
    }
  ): Promise<UserVocabulary[]> {
    const constraints = [
      where('userId', '==', userId),
      orderBy('lastAccessedAt', 'desc')
    ]
    
    if (options?.activeOnly) {
      constraints.splice(1, 0, where('isActive', '==', true))
    }
    
    const q = query(collection(db, this.collectionName), ...constraints)
    const snapshot = await getDocs(q)
    
    let subscriptions = snapshot.docs.map(doc => 
      this.fromFirestore({ ...doc.data(), id: doc.id })
    )
    
    // 소유한 단어장 필터링
    if (options?.includeOwned === false) {
      subscriptions = subscriptions.filter(sub => !sub.isOwner)
    }
    
    return subscriptions
  }

  /**
   * 특정 구독 정보 조회
   */
  async getUserVocabulary(
    userId: string,
    vocabularyId: string
  ): Promise<UserVocabulary | null> {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      where('vocabularyId', '==', vocabularyId)
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return null
    }
    
    return this.fromFirestore({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id })
  }

  /**
   * 학습 진도 업데이트
   */
  async updateProgress(
    userId: string,
    vocabularyId: string,
    progress: Partial<UserVocabulary['progress']>
  ): Promise<void> {
    const userVocabulary = await this.getUserVocabulary(userId, vocabularyId)
    if (!userVocabulary) {
      throw new Error('Subscription not found')
    }
    
    const updates: any = {}
    
    if (progress.studiedWords !== undefined) {
      updates['progress.studiedWords'] = progress.studiedWords
    }
    if (progress.masteredWords !== undefined) {
      updates['progress.masteredWords'] = progress.masteredWords
    }
    if (progress.reviewingWords !== undefined) {
      updates['progress.reviewingWords'] = progress.reviewingWords
    }
    if (progress.totalWords !== undefined) {
      updates['progress.totalWords'] = progress.totalWords
    }
    
    const docRef = doc(db, this.collectionName, userVocabulary.id)
    await updateDoc(docRef, updates)
  }

  /**
   * 학습 설정 업데이트
   */
  async updateSettings(
    userId: string,
    vocabularyId: string,
    settings: Partial<UserVocabulary['settings']>
  ): Promise<void> {
    const userVocabulary = await this.getUserVocabulary(userId, vocabularyId)
    if (!userVocabulary) {
      throw new Error('Subscription not found')
    }
    
    const updates: any = {}
    
    if (settings.dailyGoal !== undefined) {
      updates['settings.dailyGoal'] = settings.dailyGoal
    }
    if (settings.reminderEnabled !== undefined) {
      updates['settings.reminderEnabled'] = settings.reminderEnabled
    }
    if (settings.reminderTime !== undefined) {
      updates['settings.reminderTime'] = settings.reminderTime
    }
    
    const docRef = doc(db, this.collectionName, userVocabulary.id)
    await updateDoc(docRef, updates)
  }

  /**
   * 마지막 학습 정보 업데이트
   */
  async updateLastStudy(
    userId: string,
    vocabularyId: string,
    studyInfo: {
      date: Date
      wordsStudied: number
      duration: number
    }
  ): Promise<void> {
    const userVocabulary = await this.getUserVocabulary(userId, vocabularyId)
    if (!userVocabulary) {
      throw new Error('Subscription not found')
    }
    
    const docRef = doc(db, this.collectionName, userVocabulary.id)
    await updateDoc(docRef, {
      lastStudy: {
        date: Timestamp.fromDate(studyInfo.date),
        wordsStudied: studyInfo.wordsStudied,
        duration: studyInfo.duration
      },
      lastAccessedAt: Timestamp.fromDate(new Date())
    })
  }

  /**
   * 구독 상태 업데이트
   */
  private async updateSubscriptionStatus(
    userId: string,
    vocabularyId: string,
    isActive: boolean
  ): Promise<void> {
    const userVocabulary = await this.getUserVocabulary(userId, vocabularyId)
    if (!userVocabulary) {
      throw new Error('Subscription not found')
    }
    
    const docRef = doc(db, this.collectionName, userVocabulary.id)
    await updateDoc(docRef, { 
      isActive,
      lastAccessedAt: Timestamp.fromDate(new Date())
    })
  }

  /**
   * 단어장의 총 구독자 수 조회
   */
  async getVocabularySubscriberCount(vocabularyId: string): Promise<number> {
    const q = query(
      collection(db, this.collectionName),
      where('vocabularyId', '==', vocabularyId),
      where('isActive', '==', true),
      where('isOwner', '==', false)
    )
    
    const snapshot = await getDocs(q)
    return snapshot.size
  }

  /**
   * Firestore 데이터 변환
   */
  private toFirestore(userVocabulary: UserVocabulary): DocumentData {
    const data: any = { ...userVocabulary }
    
    data.subscribedAt = Timestamp.fromDate(userVocabulary.subscribedAt)
    
    if (data.lastAccessedAt) {
      data.lastAccessedAt = Timestamp.fromDate(userVocabulary.lastAccessedAt)
    }
    
    if (data.lastStudy?.date) {
      data.lastStudy.date = Timestamp.fromDate(data.lastStudy.date)
    }
    
    return data
  }

  private fromFirestore(data: DocumentData): UserVocabulary {
    const userVocabulary: any = {
      ...data,
      subscribedAt: data.subscribedAt?.toDate() || new Date()
    }
    
    if (userVocabulary.lastAccessedAt) {
      userVocabulary.lastAccessedAt = userVocabulary.lastAccessedAt.toDate()
    }
    
    if (userVocabulary.lastStudy?.date) {
      userVocabulary.lastStudy.date = userVocabulary.lastStudy.date.toDate()
    }
    
    return userVocabulary as UserVocabulary
  }

  private generateId(): string {
    return doc(collection(db, 'temp')).id
  }
}

export default UserVocabularyService