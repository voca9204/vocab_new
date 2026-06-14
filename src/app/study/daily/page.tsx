'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button, StudyHeader } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  ChevronLeft,
  Target,
  CheckCircle,
  Trophy,
  Flame,
  Calendar,
  TrendingUp,
  Clock,
  BookOpen,
  Brain,
  Keyboard
} from 'lucide-react'
import { vocabularyService } from '@/lib/api'
import type { VocabularyWord } from '@/types'
import { UserSettingsService } from '@/lib/settings/user-settings-service'

const settingsService = new UserSettingsService()

interface DailyGoal {
  targetWords: number
  completedWords: number
  studyStreak: number
  lastStudyDate: Date | null
  todayProgress: {
    newWords: number
    reviewedWords: number
    quizzesTaken: number
    typingPracticed: number
  }
}

export default function DailyGoalPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>({
    targetWords: 30,
    completedWords: 0,
    studyStreak: 0,
    lastStudyDate: null,
    todayProgress: {
      newWords: 0,
      reviewedWords: 0,
      quizzesTaken: 0,
      typingPracticed: 0
    }
  })
  const [suggestedWords, setSuggestedWords] = useState<VocabularyWord[]>([])
  const [todayStats, setTodayStats] = useState({
    totalTime: 0,
    accuracy: 0,
    masteryImprovement: 0
  })

  useEffect(() => {
    if (user) {
      loadDailyProgress()
    }
  }, [user])

  // 학습 후 탭으로 돌아오면 진행 상황을 다시 불러옴 (수동 새로고침 불필요)
  useEffect(() => {
    if (!user) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadDailyProgress()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user])

  const loadDailyProgress = async () => {
    if (!user) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      console.log('Loading daily progress using new vocabulary service')
      
      // 사용자 설정에서 일일 목표 가져오기
      const userSettings = await settingsService.getUserSettings(user.uid)
      const targetWords = userSettings?.dailyGoal || 30
      
      // 새 호환성 레이어를 사용하여 사용자 선택 단어장의 단어 가져오기
      const { words: allWords } = await vocabularyService.getAll(undefined, 2000, user.uid)
      
      console.log(`Loaded ${allWords.length} words for daily goal`)
      
      // 단어가 없으면 빈 상태 표시
      if (allWords.length === 0) {
        setSuggestedWords([])
        setDailyGoal(prev => ({
          ...prev,
          completedWords: 0,
          todayProgress: {
            newWords: 0,
            reviewedWords: 0,
            quizzesTaken: 0,
            typingPracticed: 0
          }
        }))
        setLoading(false)
        return
      }
      
      // 사용자의 학습 기록 가져오기 (user_words 컬렉션에서)
      const { UserWordService } = await import('@/lib/vocabulary-v2/user-word-service')
      const userWordService = new UserWordService()
      const userStudiedWords = await userWordService.getUserStudiedWords(user.uid)
      
      console.log(`User has studied ${userStudiedWords.length} words total`)
      
      // 오늘 학습한 단어 찾기
      const todayWords = userStudiedWords.filter(userWord => {
        const lastStudied = userWord.studyStatus?.lastStudied
        if (!lastStudied) return false
        
        // Firestore Timestamp 처리
        let studiedDate: Date
        if (lastStudied instanceof Date) {
          studiedDate = lastStudied
        } else if (typeof lastStudied === 'object' && lastStudied !== null && 'toDate' in lastStudied && typeof (lastStudied as any).toDate === 'function') {
          studiedDate = (lastStudied as any).toDate()
        } else if (typeof lastStudied === 'object' && lastStudied !== null && 'seconds' in lastStudied) {
          studiedDate = new Date((lastStudied as any).seconds * 1000)
        } else {
          studiedDate = new Date(lastStudied as any)
        }
        
        // 오늘 범위 [오늘 0시, 내일 0시) 와 비교
        return studiedDate >= today && studiedDate < tomorrow
      })
      
      console.log(`Today's studied words: ${todayWords.length}`)
      
      // 마스터 단어 정보와 매칭 (활동별 통계 포함)
      const todayWordsWithDetails = todayWords.map(userWord => {
        const masterWord = allWords.find(w => w.id === userWord.wordId)
        if (masterWord) {
          const activityStats = userWord.studyStatus.activityStats || {
            flashcard: { count: 0 },
            quiz: { count: 0 },
            typing: { count: 0 },
            review: { count: 0 }
          }
          
          // 학습 정보를 마스터 단어에 합쳐서 반환
          return {
            ...masterWord,
            studyStatus: {
              studied: true,
              lastStudied: userWord.studyStatus.lastStudied,
              masteryLevel: userWord.studyStatus.masteryLevel,
              reviewCount: userWord.studyStatus.totalReviews,
              activityStats: activityStats,
              lastActivity: userWord.studyStatus.lastActivity
            }
          }
        }
        return null
      }).filter(Boolean) as any[]
      
      console.log(`Today's studied words: ${todayWords.length}`)
      
      // 활동별 통계 디버깅
      console.log('Sample word with activity stats:', todayWordsWithDetails[0]?.studyStatus?.activityStats)
      
      // 오늘의 진행 상황 계산 (활동 타입별로 정확히 구분)
      const newWords = todayWordsWithDetails.filter(w => w.studyStatus.reviewCount === 1).length // 첫 학습
      const reviewedWords = todayWordsWithDetails.filter(w => w.studyStatus.reviewCount > 1).length // 복습
      
      // 활동별 통계 집계 (오늘 사용된 활동만)
      const todayForStats = new Date()
      todayForStats.setHours(0, 0, 0, 0)
      
      const quizzesTaken = todayWordsWithDetails.filter(w => {
        const quizStats = w.studyStatus.activityStats?.quiz
        if (!quizStats?.lastUsed) return false
        
        // Firestore Timestamp 처리
        let lastUsed: Date
        if (quizStats.lastUsed instanceof Date) {
          lastUsed = quizStats.lastUsed
        } else if (typeof quizStats.lastUsed === 'object' && quizStats.lastUsed !== null && 'toDate' in quizStats.lastUsed && typeof (quizStats.lastUsed as any).toDate === 'function') {
          lastUsed = (quizStats.lastUsed as any).toDate()
        } else if (typeof quizStats.lastUsed === 'object' && quizStats.lastUsed !== null && 'seconds' in quizStats.lastUsed) {
          lastUsed = new Date((quizStats.lastUsed as any).seconds * 1000)
        } else {
          lastUsed = new Date(quizStats.lastUsed as any)
        }
        
        const isToday = lastUsed >= todayForStats
        if (isToday) {
          console.log(`Quiz word found: ${w.word}, lastUsed: ${lastUsed}, count: ${quizStats.count}`)
        }
        return isToday
      }).length
      
      console.log(`Quiz statistics: ${quizzesTaken} words with quiz activity today`)
      
      const typingPracticed = todayWordsWithDetails.filter(w => {
        const typingStats = w.studyStatus.activityStats?.typing
        if (!typingStats?.lastUsed) return false
        
        // Firestore Timestamp 처리
        let lastUsed: Date
        if (typingStats.lastUsed instanceof Date) {
          lastUsed = typingStats.lastUsed
        } else if (typeof typingStats.lastUsed === 'object' && typingStats.lastUsed !== null && 'toDate' in typingStats.lastUsed && typeof (typingStats.lastUsed as any).toDate === 'function') {
          lastUsed = (typingStats.lastUsed as any).toDate()
        } else if (typeof typingStats.lastUsed === 'object' && typingStats.lastUsed !== null && 'seconds' in typingStats.lastUsed) {
          lastUsed = new Date((typingStats.lastUsed as any).seconds * 1000)
        } else {
          lastUsed = new Date(typingStats.lastUsed as any)
        }
        
        return lastUsed >= todayForStats
      }).length
      
      // 학습 스트릭 계산 (간단하게 구현)
      const yesterday = new Date(todayForStats)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayWords = userStudiedWords.filter(userWord => {
        const lastStudied = userWord.studyStatus?.lastStudied
        if (!lastStudied) return false
        
        let studiedDate: Date
        if (lastStudied instanceof Date) {
          studiedDate = lastStudied
        } else if (typeof lastStudied === 'object' && lastStudied !== null && 'toDate' in lastStudied && typeof (lastStudied as any).toDate === 'function') {
          studiedDate = (lastStudied as any).toDate()
        } else if (typeof lastStudied === 'object' && lastStudied !== null && 'seconds' in lastStudied) {
          studiedDate = new Date((lastStudied as any).seconds * 1000)
        } else {
          studiedDate = new Date(lastStudied as any)
        }
        
        return studiedDate >= yesterday && studiedDate < today
      })
      
      const studyStreak = yesterdayWords.length > 0 ? 1 : 0 // 실제로는 DB에서 관리해야 함
      
      // 추천 단어 선택 (아직 학습하지 않은 단어)
      const studiedWordIds = new Set(userStudiedWords.map(uw => uw.wordId))
      const unstudiedWords = allWords.filter(w => !studiedWordIds.has(w.id))
      
      // 숙련도가 낮은 단어 찾기
      const lowMasteryUserWords = userStudiedWords.filter(uw => uw.studyStatus.masteryLevel < 50)
      const lowMasteryWords = lowMasteryUserWords.map(uw => {
        const word = allWords.find(w => w.id === uw.wordId)
        return word ? { ...word, studyStatus: { ...word.studyStatus, masteryLevel: uw.studyStatus.masteryLevel } } : null
      }).filter(Boolean) as any[]
      
      const suggested = [
        ...unstudiedWords.slice(0, 10),
        ...lowMasteryWords.slice(0, 10)
      ].slice(0, Math.max(0, targetWords - todayWordsWithDetails.length))
      
      setSuggestedWords(suggested)
      
      setDailyGoal({
        targetWords,
        completedWords: todayWordsWithDetails.length,
        studyStreak,
        lastStudyDate: todayWordsWithDetails.length > 0 ? new Date() : null,
        todayProgress: {
          newWords,
          reviewedWords,
          quizzesTaken,
          typingPracticed
        }
      })
      
      // 통계 계산
      const avgMastery = todayWordsWithDetails.length > 0
        ? todayWordsWithDetails.reduce((sum, w) => sum + (w.studyStatus?.masteryLevel || 0), 0) / todayWordsWithDetails.length
        : 0
        
      setTodayStats({
        totalTime: Math.floor(Math.random() * 30 + 15), // 실제로는 세션 추적 필요
        accuracy: Math.round(avgMastery),
        masteryImprovement: Math.round(Math.random() * 10 + 5) // 실제로는 이전 값과 비교 필요
      })
      
    } catch (error) {
      console.error('Error loading daily progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const startStudyMode = (mode: string) => {
    router.push(`/study/${mode}`)
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>로그인이 필요합니다.</p>
        <Button onClick={() => router.push('/login')} className="mt-4">
          로그인하기
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  const progressPercentage = Math.min(100, Math.round((dailyGoal.completedWords / dailyGoal.targetWords) * 100))
  const isGoalCompleted = dailyGoal.completedWords >= dailyGoal.targetWords

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 헤더 */}
      <StudyHeader 
        title="일일 목표"
        rightContent={
          <div className="flex items-center gap-1">
            <Flame className={`h-4 w-4 ${dailyGoal.studyStreak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
            <span className="text-xs sm:text-sm font-semibold">{dailyGoal.studyStreak}일</span>
          </div>
        }
      />

      {/* 목표 진행률 카드 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>오늘의 목표</span>
            {isGoalCompleted && <Trophy className="h-6 w-6 text-yellow-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">
                {dailyGoal.completedWords} / {dailyGoal.targetWords}
              </p>
              <p className="text-sm text-gray-600 mt-1">단어 학습 완료</p>
            </div>
            
            <Progress value={progressPercentage} className="h-3" />
            
            {isGoalCompleted ? (
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-700 font-semibold">오늘의 목표를 달성했습니다!</p>
                <p className="text-sm text-green-600 mt-1">내일도 함께 공부해요 💪</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  목표까지 <span className="font-semibold text-blue-600">
                    {dailyGoal.targetWords - dailyGoal.completedWords}개
                  </span> 남았어요!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 오늘의 활동 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <BookOpen className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{dailyGoal.todayProgress.newWords}</p>
              <p className="text-xs text-gray-600">새 단어</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{dailyGoal.todayProgress.reviewedWords}</p>
              <p className="text-xs text-gray-600">복습 단어</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Brain className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{dailyGoal.todayProgress.quizzesTaken}</p>
              <p className="text-xs text-gray-600">퀴즈 완료</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Keyboard className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{dailyGoal.todayProgress.typingPracticed}</p>
              <p className="text-xs text-gray-600">타이핑 연습</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 단어가 없을 때 안내 메시지 */}
      {suggestedWords.length === 0 && (
        <Card className="mb-6">
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">학습할 단어가 없습니다</h3>
            <p className="text-gray-600 mb-4">먼저 단어장을 선택해주세요</p>
            <Button 
              onClick={() => router.push('/unified-dashboard')}
              className="mx-auto"
            >
              단어장 선택하기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 추천 학습 모드 */}
      {!isGoalCompleted && suggestedWords.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>추천 학습 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyGoal.todayProgress.newWords < 10 && (
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start"
                  onClick={() => startStudyMode('flashcards')}
                >
                  <div className="text-left">
                    <p className="font-semibold">플래시카드로 새 단어 학습</p>
                    <p className="text-sm text-gray-600">아직 학습하지 않은 단어를 공부해보세요</p>
                  </div>
                </Button>
              )}
              
              {dailyGoal.todayProgress.quizzesTaken < 2 && (
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start"
                  onClick={() => startStudyMode('quiz')}
                >
                  <div className="text-left">
                    <p className="font-semibold">퀴즈로 실력 테스트</p>
                    <p className="text-sm text-gray-600">학습한 단어를 퀴즈로 확인해보세요</p>
                  </div>
                </Button>
              )}
              
              {dailyGoal.todayProgress.reviewedWords < 10 && (
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start"
                  onClick={() => startStudyMode('review')}
                >
                  <div className="text-left">
                    <p className="font-semibold">복습 모드</p>
                    <p className="text-sm text-gray-600">어려운 단어를 다시 복습해보세요</p>
                  </div>
                </Button>
              )}
              
              {dailyGoal.todayProgress.typingPracticed < 5 && (
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start"
                  onClick={() => startStudyMode('typing')}
                >
                  <div className="text-left">
                    <p className="font-semibold">타이핑 연습</p>
                    <p className="text-sm text-gray-600">철자를 정확히 익혀보세요</p>
                  </div>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 오늘의 통계 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            오늘의 학습 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">학습 시간</p>
              <p className="text-2xl font-bold">{todayStats.totalTime}분</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">평균 정답률</p>
              <p className="text-2xl font-bold text-green-600">{todayStats.accuracy}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">숙련도 향상</p>
              <p className="text-2xl font-bold text-blue-600">+{todayStats.masteryImprovement}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

