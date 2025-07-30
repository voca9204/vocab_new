// SAT Vocabulary Database - SAT-Specific Utilities

import type { VocabularyWord, UserProgress, Quiz } from '@/types'
import { VocabularySearchService } from './vocabulary-search'
import { vocabularyService, progressService } from './firestore-v2'

export interface SATStudySession {
  recommendedWords: VocabularyWord[]
  reviewWords: VocabularyWord[]
  newWords: VocabularyWord[]
  estimatedTime: number // minutes
}

export interface SATLearningStats {
  totalSATWords: number
  masteredWords: number
  inProgressWords: number
  averageScore: number
  streakDays: number
  estimatedCompletionDays: number
}

export class SATVocabularyUtils {
  // SAT 시험용 단어 카테고리
  static readonly SAT_CATEGORIES = [
    'academic',
    'literary',
    'scientific',
    'historical',
    'philosophical',
    'political',
    'economic',
    'social',
    'technical',
    'abstract'
  ]

  // SAT 시험에서 자주 나오는 품사별 단어 수
  static readonly SAT_POS_DISTRIBUTION = {
    noun: 0.4,      // 40%
    verb: 0.25,     // 25%
    adjective: 0.2, // 20%
    adverb: 0.15    // 15%
  }

  /**
   * 사용자별 맞춤 SAT 학습 세션 생성
   */
  static async createStudySession(
    userId: string,
    targetTime: number = 30, // minutes
    userLevel: number = 5
  ): Promise<SATStudySession> {
    try {
      // 사용자 진도 데이터 가져오기
      const userProgress = await progressService.getAllUserProgress(userId)
      const studiedWordIds = userProgress.map(p => p.wordId)

      // 복습 대상 단어 (마스터리 낮거나 오래된 단어)
      const reviewCandidates = userProgress.filter(progress => 
        progress.correctAttempts / Math.max(progress.totalAttempts, 1) < 0.8 ||
        Date.now() - progress.nextReviewDate.getTime() > 0
      )

      const reviewWords = await VocabularySearchService.getReviewWords(
        reviewCandidates.map(p => ({
          wordId: p.wordId,
          masteryLevel: p.correctAttempts / Math.max(p.totalAttempts, 1),
          lastStudied: p.nextReviewDate
        })),
        Math.min(10, Math.floor(targetTime * 0.4)) // 40% 복습
      )

      // 추천 새 단어 (사용자 레벨 기반)
      const recommendedWords = await VocabularySearchService.getRecommendedWords(
        userLevel,
        studiedWordIds,
        Math.min(15, Math.floor(targetTime * 0.6)) // 60% 새 단어
      )

      // 완전히 새로운 단어 (도전적 난이도)
      const newWords = await VocabularySearchService.getRecommendedWords(
        Math.min(10, userLevel + 1),
        [...studiedWordIds, ...recommendedWords.map(w => w.id)],
        Math.min(5, Math.floor(targetTime * 0.2)) // 20% 도전 단어
      )

      // 예상 학습 시간 계산 (단어당 평균 2분)
      const totalWords = reviewWords.length + recommendedWords.length + newWords.length
      const estimatedTime = totalWords * 2

      return {
        recommendedWords,
        reviewWords,
        newWords,
        estimatedTime
      }
    } catch (error) {
      console.error('Error creating study session:', error)
      throw error
    }
  }

  /**
   * SAT 학습 통계 계산
   */
  static async calculateLearningStats(userId: string): Promise<SATLearningStats> {
    try {
      // 전체 SAT 단어 수
      const satWords = await vocabularyService.getSATWords(2000)
      const totalSATWords = satWords.length

      // 사용자 진도 데이터
      const userProgress = await progressService.getAllUserProgress(userId)
      
      // 마스터된 단어 (정답률 80% 이상)
      const masteredWords = userProgress.filter(p => 
        p.correctAttempts / Math.max(p.totalAttempts, 1) >= 0.8
      ).length

      // 학습 중인 단어 (시도했지만 마스터하지 못한 단어)
      const inProgressWords = userProgress.filter(p => 
        p.totalAttempts > 0 && p.correctAttempts / Math.max(p.totalAttempts, 1) < 0.8
      ).length

      // 평균 점수
      const averageScore = userProgress.length > 0
        ? userProgress.reduce((sum, p) => sum + (p.correctAttempts / Math.max(p.totalAttempts, 1)), 0) / userProgress.length
        : 0

      // 연속 학습 일수 계산 (간단한 버전)
      const streakDays = this.calculateStreakDays(userProgress)

      // 예상 완료 일수 (하루 10단어 기준)
      const remainingWords = totalSATWords - masteredWords
      const estimatedCompletionDays = Math.ceil(remainingWords / 10)

      return {
        totalSATWords,
        masteredWords,
        inProgressWords,
        averageScore,
        streakDays,
        estimatedCompletionDays
      }
    } catch (error) {
      console.error('Error calculating learning stats:', error)
      throw error
    }
  }

  /**
   * 연속 학습 일수 계산
   */
  private static calculateStreakDays(userProgress: UserProgress[]): number {
    if (userProgress.length === 0) return 0

    // 최근 학습 날짜들을 정렬
    const studyDates = userProgress
      .map(p => new Date(p.nextReviewDate.getTime() - 24 * 60 * 60 * 1000)) // 마지막 학습일 추정
      .sort((a, b) => b.getTime() - a.getTime())

    let streakDays = 0
    let currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < studyDates.length; i++) {
      const studyDate = new Date(studyDates[i])
      studyDate.setHours(0, 0, 0, 0)

      const daysDiff = Math.floor((currentDate.getTime() - studyDate.getTime()) / (24 * 60 * 60 * 1000))

      if (daysDiff === streakDays) {
        streakDays++
      } else if (daysDiff > streakDays + 1) {
        break
      }
    }

    return streakDays
  }

  /**
   * SAT 단어 난이도 재조정
   */
  static async recalibrateDifficulty(wordId: string): Promise<number> {
    try {
      // 모든 사용자의 해당 단어 성과 데이터 수집
      // 실제로는 Analytics 컬렉션에서 가져와야 함
      
      // 임시 구현: 기본 난이도 반환
      const word = await vocabularyService.getById(wordId)
      return word?.difficulty || 5
    } catch (error) {
      console.error('Error recalibrating difficulty:', error)
      return 5
    }
  }

  /**
   * SAT 단어 우선순위 점수 계산
   */
  static calculatePriorityScore(word: VocabularyWord, userLevel: number): number {
    let score = 0

    // 기본 점수 (빈도 기반)
    score += word.frequency * 10

    // 난이도 적합성 (사용자 레벨과의 차이)
    const difficultyGap = Math.abs(word.difficulty - userLevel)
    score += Math.max(0, 50 - difficultyGap * 10)

    // SAT 레벨 보너스
    if (word.satLevel) score += 30

    // 정의 완성도 보너스
    score += Math.min(word.definitions.length * 5, 20)

    // 예시 문장 보너스
    score += Math.min(word.examples.length * 3, 15)

    // 발음 정보 보너스
    if (word.pronunciation) score += 10

    // 어원 정보 보너스
    if (word.etymology) score += 10

    return score
  }

  /**
   * SAT 카테고리별 단어 분포 분석
   */
  static async analyzeCategoryDistribution(): Promise<Record<string, number>> {
    try {
      const satWords = await vocabularyService.getSATWords(2000)
      const distribution: Record<string, number> = {}

      satWords.forEach(word => {
        word.categories.forEach(category => {
          distribution[category] = (distribution[category] || 0) + 1
        })
      })

      return distribution
    } catch (error) {
      console.error('Error analyzing category distribution:', error)
      return {}
    }
  }

  /**
   * 학습 효율성 분석 (사용자별)
   */
  static async analyzeUserEfficiency(userId: string): Promise<{
    wordsPerDay: number
    accuracyTrend: number[]
    strongCategories: string[]
    weakCategories: string[]
  }> {
    try {
      const userProgress = await progressService.getAllUserProgress(userId)
      
      // 일별 학습 단어 수 (최근 30일)
      const recentProgress = userProgress.filter(p => 
        Date.now() - p.nextReviewDate.getTime() < 30 * 24 * 60 * 60 * 1000
      )
      const wordsPerDay = recentProgress.length / 30

      // 정확도 트렌드 (간단한 버전)
      const accuracyTrend = [0.7, 0.75, 0.8, 0.78, 0.82] // 실제로는 시간순 데이터

      // 강한/약한 카테고리 분석 (실제로는 더 복잡한 로직 필요)
      const strongCategories = ['academic', 'literary']
      const weakCategories = ['scientific', 'technical']

      return {
        wordsPerDay,
        accuracyTrend,
        strongCategories,
        weakCategories
      }
    } catch (error) {
      console.error('Error analyzing user efficiency:', error)
      throw error
    }
  }
}
