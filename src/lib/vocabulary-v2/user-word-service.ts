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
        streakCount: 0,
        activityStats: {
          flashcard: { count: 0 },
          quiz: { count: 0 },
          typing: { count: 0 },
          review: { count: 0 }
        }
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
   * 사용자의 모든 학습 기록 조회
   */
  async getUserWords(userId: string): Promise<UserWord[]> {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId)
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()))
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
      const currentCorrect = userWord.studyStatus.correctCount || 0
      const currentTotal = userWord.studyStatus.totalReviews || 0
      const newMastery = this.calculateMastery(
        currentCorrect + 1,
        currentTotal + 1
      )
      updates['studyStatus.masteryLevel'] = newMastery
      updates['studyStatus.confidence'] = this.getConfidenceLevel(newMastery)
      
      // 다음 복습 날짜 계산
      const currentStreak = userWord.studyStatus.streakCount || 0
      updates['studyStatus.nextReviewDate'] = Timestamp.fromDate(
        this.calculateNextReviewDate(currentStreak + 1)
      )
    }
    
    // 활동별 통계 업데이트 (Firestore 중첩 필드 업데이트 방식)
    const currentActivityStats = userWord.studyStatus.activityStats || {}
    const currentActivityCount = currentActivityStats[activityType]?.count || 0
    
    // activityStats가 없으면 초기화
    if (!userWord.studyStatus.activityStats) {
      updates['studyStatus.activityStats'] = {
        flashcard: { count: 0 },
        quiz: { count: 0 },
        typing: { count: 0 },
        review: { count: 0 }
      }
    }
    
    // 각 활동 타입별로 필드 개별 업데이트
    updates[`studyStatus.activityStats.${activityType}.count`] = currentActivityCount + 1
    updates[`studyStatus.activityStats.${activityType}.lastUsed`] = Timestamp.fromDate(new Date())
    updates['studyStatus.lastActivity'] = activityType
    
    if (result === 'correct') {
      // 정답 처리는 이미 위에서 완료
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
    // 복합 인덱스를 피하기 위해 userId로만 먼저 쿼리
    const constraints = [
      where('userId', '==', userId)
    ]
    
    // 정렬 (인덱스가 있는 필드로만)
    switch (options?.sortBy) {
      case 'recent':
        constraints.push(orderBy('updatedAt', 'desc'))
        break
      case 'mastery':
        constraints.push(orderBy('updatedAt', 'desc'))
        break
      case 'review':
        constraints.push(orderBy('updatedAt', 'desc'))
        break
      default:
        constraints.push(orderBy('updatedAt', 'desc'))
    }
    
    if (options?.limit && !options?.bookmarkedOnly && !options?.confidence && !options?.masteryLevel) {
      constraints.push(limit(options.limit))
    }
    
    const q = query(collection(db, this.collectionName), ...constraints)
    const snapshot = await getDocs(q)
    
    let userWords = snapshot.docs.map(doc => 
      this.fromFirestore({ ...doc.data(), id: doc.id })
    )
    
    // 클라이언트 사이드 필터링
    // studied = true인 단어만
    userWords = userWords.filter(uw => uw.studyStatus.studied === true)
    
    if (options?.bookmarkedOnly) {
      userWords = userWords.filter(uw => uw.isBookmarked === true)
    }
    
    if (options?.confidence) {
      userWords = userWords.filter(uw => uw.studyStatus.confidence === options.confidence)
    }
    
    if (options?.masteryLevel) {
      userWords = userWords.filter(uw => 
        uw.studyStatus.masteryLevel >= options.masteryLevel!.min &&
        uw.studyStatus.masteryLevel <= options.masteryLevel!.max
      )
    }
    
    // 클라이언트 사이드 정렬
    switch (options?.sortBy) {
      case 'recent':
        userWords.sort((a, b) => {
          const aDate = a.studyStatus.lastStudied || a.updatedAt
          const bDate = b.studyStatus.lastStudied || b.updatedAt
          return new Date(bDate).getTime() - new Date(aDate).getTime()
        })
        break
      case 'mastery':
        userWords.sort((a, b) => b.studyStatus.masteryLevel - a.studyStatus.masteryLevel)
        break
      case 'review':
        userWords.sort((a, b) => {
          const aDate = a.studyStatus.nextReviewDate || new Date(9999, 11, 31)
          const bDate = b.studyStatus.nextReviewDate || new Date(9999, 11, 31)
          return new Date(aDate).getTime() - new Date(bDate).getTime()
        })
        break
    }
    
    // 클라이언트 사이드 limit
    if (options?.limit) {
      userWords = userWords.slice(0, options.limit)
    }
    
    return userWords
  }

  /**
   * 복습이 필요한 단어 목록 조회
   */
  async getWordsForReview(userId: string, limit: number = 20): Promise<UserWord[]> {
    const now = new Date()
    
    // 복합 인덱스를 피하기 위해 userId로만 쿼리
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    )
    
    const snapshot = await getDocs(q)
    let userWords = snapshot.docs.map(doc => 
      this.fromFirestore({ ...doc.data(), id: doc.id })
    )
    
    // 클라이언트 사이드 필터링
    userWords = userWords.filter(uw => {
      if (!uw.studyStatus.studied) return false
      if (!uw.studyStatus.nextReviewDate) return false
      
      const reviewDate = uw.studyStatus.nextReviewDate instanceof Date 
        ? uw.studyStatus.nextReviewDate 
        : new Date(uw.studyStatus.nextReviewDate)
        
      return reviewDate <= now
    })
    
    // 복습 날짜 순으로 정렬
    userWords.sort((a, b) => {
      const aDate = a.studyStatus.nextReviewDate || new Date(9999, 11, 31)
      const bDate = b.studyStatus.nextReviewDate || new Date(9999, 11, 31)
      return new Date(aDate).getTime() - new Date(bDate).getTime()
    })
    
    // limit 적용
    return userWords.slice(0, limit)
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
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
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
    
    // Date 타입을 Timestamp로 변환 (유효성 검사 포함)
    const safeDate = (date: any) => {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return new Date()
      }
      return date
    }
    
    data.createdAt = Timestamp.fromDate(safeDate(userWord.createdAt))
    data.updatedAt = Timestamp.fromDate(safeDate(userWord.updatedAt))
    
    if (data.bookmarkedAt) {
      data.bookmarkedAt = Timestamp.fromDate(safeDate(userWord.bookmarkedAt))
    }
    
    if (data.studyStatus?.lastStudied) {
      data.studyStatus.lastStudied = Timestamp.fromDate(safeDate(userWord.studyStatus.lastStudied))
    }
    
    if (data.studyStatus?.nextReviewDate) {
      data.studyStatus.nextReviewDate = Timestamp.fromDate(safeDate(userWord.studyStatus.nextReviewDate))
    }
    
    return data
  }

  private fromFirestore(data: DocumentData): UserWord {
    const userWord: any = {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    }
    
    if (userWord.bookmarkedAt && userWord.bookmarkedAt.toDate) {
      userWord.bookmarkedAt = userWord.bookmarkedAt.toDate()
    }
    
    if (userWord.studyStatus?.lastStudied && userWord.studyStatus.lastStudied.toDate) {
      userWord.studyStatus.lastStudied = userWord.studyStatus.lastStudied.toDate()
    }
    
    if (userWord.studyStatus?.nextReviewDate && userWord.studyStatus.nextReviewDate.toDate) {
      userWord.studyStatus.nextReviewDate = userWord.studyStatus.nextReviewDate.toDate()
    }
    
    // studyStatus 필드 기본값 보장
    if (!userWord.studyStatus) {
      userWord.studyStatus = {
        studied: false,
        masteryLevel: 0,
        confidence: 'low',
        totalReviews: 0,
        correctCount: 0,
        incorrectCount: 0,
        streakCount: 0,
        activityStats: {
          flashcard: { count: 0 },
          quiz: { count: 0 },
          typing: { count: 0 },
          review: { count: 0 }
        }
      }
    } else {
      // 기존 studyStatus가 있어도 필수 필드 확인
      userWord.studyStatus.correctCount = userWord.studyStatus.correctCount || 0
      userWord.studyStatus.incorrectCount = userWord.studyStatus.incorrectCount || 0
      userWord.studyStatus.streakCount = userWord.studyStatus.streakCount || 0
      userWord.studyStatus.totalReviews = userWord.studyStatus.totalReviews || 0
    }
    
    return userWord as UserWord
  }

  private generateId(): string {
    return doc(collection(db, 'temp')).id
  }
}

export default UserWordService