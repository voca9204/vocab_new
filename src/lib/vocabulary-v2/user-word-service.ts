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
  updateDoc,
  increment
} from 'firebase/firestore'
import type { UserWord, StudyActivityType } from '@/types/vocabulary-v2'

export class UserWordService {
  private readonly collectionName = 'user_words'

  /**
   * 사용자의 단어 학습 상태 가져오기 (없으면 생성)
   */
  async getUserWord(userId: string, wordId: string): Promise<UserWord> {
    const existing = await this.findUserWord(userId, wordId)
    if (existing) {
      return existing
    }
    
    // 새로 생성
    return this.createUserWord(userId, wordId)
  }

  /**
   * 사용자의 단어 학습 상태 조회
   */
  async findUserWord(userId: string, wordId: string): Promise<UserWord | null> {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      where('wordId', '==', wordId)
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return null
    }
    
    return this.fromFirestore({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id })
  }

  /**
   * 새로운 사용자 단어 학습 상태 생성
   */
  private async createUserWord(userId: string, wordId: string): Promise<UserWord> {
    const userWordId = this.generateId()
    const now = new Date()
    
    const userWord: UserWord = {
      id: userWordId,
      userId,
      wordId,
      studyStatus: {
        studied: false,
        masteryLevel: 0,
        confidence: 'low',
        totalReviews: 0,
        correctCount: 0,
        incorrectCount: 0,
        streakCount: 0
      },
      isBookmarked: false,
      createdAt: now,
      updatedAt: now
    }
    
    const docRef = doc(db, this.collectionName, userWordId)
    await setDoc(docRef, this.toFirestore(userWord))
    
    return userWord
  }

  /**
   * 학습 결과 기록
   */
  async recordStudyResult(
    userId: string,
    wordId: string,
    result: 'correct' | 'incorrect' | 'skipped',
    activityType: StudyActivityType
  ): Promise<void> {
    const userWord = await this.getUserWord(userId, wordId)
    
    const updates: any = {
      'studyStatus.studied': true,
      'studyStatus.lastStudied': Timestamp.fromDate(new Date()),
      'studyStatus.lastResult': result,
      'studyStatus.totalReviews': increment(1),
      updatedAt: Timestamp.fromDate(new Date())
    }
    
    if (result === 'correct') {
      updates['studyStatus.correctCount'] = increment(1)
      updates['studyStatus.streakCount'] = increment(1)
      
      // 정답률에 따른 숙련도 업데이트
      const newMastery = this.calculateMastery(
        userWord.studyStatus.correctCount + 1,
        userWord.studyStatus.totalReviews + 1
      )
      updates['studyStatus.masteryLevel'] = newMastery
      updates['studyStatus.confidence'] = this.getConfidenceLevel(newMastery)
      
      // 다음 복습 날짜 계산
      updates['studyStatus.nextReviewDate'] = Timestamp.fromDate(
        this.calculateNextReviewDate(userWord.studyStatus.streakCount + 1)
      )
    } else if (result === 'incorrect') {
      updates['studyStatus.incorrectCount'] = increment(1)
      updates['studyStatus.streakCount'] = 0
      
      // 틀렸을 때 숙련도 약간 감소
      const newMastery = Math.max(0, userWord.studyStatus.masteryLevel - 5)
      updates['studyStatus.masteryLevel'] = newMastery
      updates['studyStatus.confidence'] = this.getConfidenceLevel(newMastery)
      
      // 곧 다시 복습하도록 설정
      updates['studyStatus.nextReviewDate'] = Timestamp.fromDate(
        new Date(Date.now() + 24 * 60 * 60 * 1000) // 1일 후
      )
    }
    
    const docRef = doc(db, this.collectionName, userWord.id)
    await updateDoc(docRef, updates)
  }

  /**
   * 북마크 토글
   */
  async toggleBookmark(userId: string, wordId: string): Promise<boolean> {
    const userWord = await this.getUserWord(userId, wordId)
    
    const newBookmarkStatus = !userWord.isBookmarked
    const updates: any = {
      isBookmarked: newBookmarkStatus,
      updatedAt: Timestamp.fromDate(new Date())
    }
    
    if (newBookmarkStatus) {
      updates.bookmarkedAt = Timestamp.fromDate(new Date())
    } else {
      updates.bookmarkedAt = null
    }
    
    const docRef = doc(db, this.collectionName, userWord.id)
    await updateDoc(docRef, updates)
    
    return newBookmarkStatus
  }

  /**
   * 사용자 메모 업데이트
   */
  async updatePersonalInfo(
    userId: string,
    wordId: string,
    info: {
      personalNotes?: string
      customMnemonic?: string
      customExample?: string
    }
  ): Promise<void> {
    const userWord = await this.getUserWord(userId, wordId)
    
    const updates: any = {
      ...info,
      updatedAt: Timestamp.fromDate(new Date())
    }
    
    const docRef = doc(db, this.collectionName, userWord.id)
    await updateDoc(docRef, updates)
  }

  /**
   * 사용자의 학습한 단어 목록 조회
   */
  async getUserStudiedWords(
    userId: string,
    options?: {
      bookmarkedOnly?: boolean
      masteryLevel?: { min: number, max: number }
      confidence?: UserWord['studyStatus']['confidence']
      sortBy?: 'recent' | 'mastery' | 'review'
      limit?: number
    }
  ): Promise<UserWord[]> {
    const constraints = [
      where('userId', '==', userId),
      where('studyStatus.studied', '==', true)
    ]
    
    if (options?.bookmarkedOnly) {
      constraints.push(where('isBookmarked', '==', true))
    }
    
    if (options?.confidence) {
      constraints.push(where('studyStatus.confidence', '==', options.confidence))
    }
    
    // 정렬
    switch (options?.sortBy) {
      case 'recent':
        constraints.push(orderBy('studyStatus.lastStudied', 'desc'))
        break
      case 'mastery':
        constraints.push(orderBy('studyStatus.masteryLevel', 'desc'))
        break
      case 'review':
        constraints.push(orderBy('studyStatus.nextReviewDate', 'asc'))
        break
      default:
        constraints.push(orderBy('updatedAt', 'desc'))
    }
    
    if (options?.limit) {
      constraints.push(limit(options.limit))
    }
    
    const q = query(collection(db, this.collectionName), ...constraints)
    const snapshot = await getDocs(q)
    
    let userWords = snapshot.docs.map(doc => 
      this.fromFirestore({ ...doc.data(), id: doc.id })
    )
    
    // 클라이언트 사이드 필터링 (숙련도 범위)
    if (options?.masteryLevel) {
      userWords = userWords.filter(uw => 
        uw.studyStatus.masteryLevel >= options.masteryLevel!.min &&
        uw.studyStatus.masteryLevel <= options.masteryLevel!.max
      )
    }
    
    return userWords
  }

  /**
   * 복습이 필요한 단어 목록 조회
   */
  async getWordsForReview(userId: string, limit: number = 20): Promise<UserWord[]> {
    const now = Timestamp.fromDate(new Date())
    
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      where('studyStatus.studied', '==', true),
      where('studyStatus.nextReviewDate', '<=', now),
      orderBy('studyStatus.nextReviewDate', 'asc'),
      limit(limit)
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => 
      this.fromFirestore({ ...doc.data(), id: doc.id })
    )
  }

  /**
   * 사용자의 학습 통계 조회
   */
  async getUserStudyStats(userId: string): Promise<{
    totalStudied: number
    totalMastered: number
    totalBookmarked: number
    averageMastery: number
    streakWords: number
  }> {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId)
    )
    
    const snapshot = await getDocs(q)
    const userWords = snapshot.docs.map(doc => 
      this.fromFirestore({ ...doc.data(), id: doc.id })
    )
    
    const stats = {
      totalStudied: userWords.filter(uw => uw.studyStatus.studied).length,
      totalMastered: userWords.filter(uw => uw.studyStatus.masteryLevel >= 80).length,
      totalBookmarked: userWords.filter(uw => uw.isBookmarked).length,
      averageMastery: 0,
      streakWords: userWords.filter(uw => uw.studyStatus.streakCount >= 3).length
    }
    
    if (stats.totalStudied > 0) {
      const totalMastery = userWords
        .filter(uw => uw.studyStatus.studied)
        .reduce((sum, uw) => sum + uw.studyStatus.masteryLevel, 0)
      stats.averageMastery = Math.round(totalMastery / stats.totalStudied)
    }
    
    return stats
  }

  /**
   * 숙련도 계산
   */
  private calculateMastery(correctCount: number, totalReviews: number): number {
    if (totalReviews === 0) return 0
    const accuracy = correctCount / totalReviews
    const reviewBonus = Math.min(totalReviews * 2, 20) // 최대 20점
    return Math.min(Math.round(accuracy * 80 + reviewBonus), 100)
  }

  /**
   * 자신감 레벨 결정
   */
  private getConfidenceLevel(mastery: number): UserWord['studyStatus']['confidence'] {
    if (mastery >= 80) return 'high'
    if (mastery >= 50) return 'medium'
    return 'low'
  }

  /**
   * 다음 복습 날짜 계산 (간단한 spaced repetition)
   */
  private calculateNextReviewDate(streakCount: number): Date {
    const intervals = [1, 3, 7, 14, 30, 60, 120] // 일 단위
    const index = Math.min(streakCount - 1, intervals.length - 1)
    const daysUntilReview = intervals[index]
    
    return new Date(Date.now() + daysUntilReview * 24 * 60 * 60 * 1000)
  }

  /**
   * Firestore 데이터 변환
   */
  private toFirestore(userWord: UserWord): DocumentData {
    const data: any = { ...userWord }
    
    data.createdAt = Timestamp.fromDate(userWord.createdAt)
    data.updatedAt = Timestamp.fromDate(userWord.updatedAt)
    
    if (data.bookmarkedAt) {
      data.bookmarkedAt = Timestamp.fromDate(userWord.bookmarkedAt)
    }
    
    if (data.studyStatus.lastStudied) {
      data.studyStatus.lastStudied = Timestamp.fromDate(userWord.studyStatus.lastStudied)
    }
    
    if (data.studyStatus.nextReviewDate) {
      data.studyStatus.nextReviewDate = Timestamp.fromDate(userWord.studyStatus.nextReviewDate)
    }
    
    return data
  }

  private fromFirestore(data: DocumentData): UserWord {
    const userWord: any = {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    }
    
    if (userWord.bookmarkedAt) {
      userWord.bookmarkedAt = userWord.bookmarkedAt.toDate()
    }
    
    if (userWord.studyStatus?.lastStudied) {
      userWord.studyStatus.lastStudied = userWord.studyStatus.lastStudied.toDate()
    }
    
    if (userWord.studyStatus?.nextReviewDate) {
      userWord.studyStatus.nextReviewDate = userWord.studyStatus.nextReviewDate.toDate()
    }
    
    return userWord as UserWord
  }

  private generateId(): string {
    return doc(collection(db, 'temp')).id
  }
}

export default UserWordService