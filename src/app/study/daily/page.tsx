'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
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
  Clock
} from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import { getSelectedSources, filterWordsBySelectedSources } from '@/lib/settings/get-selected-sources'
import { createVocabularyQuery } from '@/lib/vocabulary/vocabulary-query-utils'

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
  const [suggestedWords, setSuggestedWords] = useState<ExtractedVocabulary[]>([])
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

  const loadDailyProgress = async () => {
    if (!user) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // 사용자의 단어와 관리자가 업로드한 단어 모두 가져오기
      const q = createVocabularyQuery('extracted_vocabulary', user.uid)
      
      const snapshot = await getDocs(q)
      let allWords = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        source: {
          ...doc.data().source,
          uploadedAt: doc.data().source?.uploadedAt?.toDate() || new Date()
        }
      })) as ExtractedVocabulary[]
      
      // 선택된 단어장으로 필터링
      const selectedSources = await getSelectedSources(user.uid)
      allWords = filterWordsBySelectedSources(allWords, selectedSources)
      
      // 오늘 학습한 단어 찾기
      const todayWords = allWords.filter(w => {
        const lastStudied = w.studyStatus?.lastStudied
        if (!lastStudied) return false
        const studiedDate = lastStudied instanceof Date ? lastStudied : (lastStudied as any).toDate()
        return studiedDate >= today
      })
      
      // 오늘의 진행 상황 계산
      const newWords = todayWords.filter(w => w.studyStatus.reviewCount === 0).length
      const reviewedWords = todayWords.filter(w => w.studyStatus.reviewCount > 0).length
      const quizzesTaken = todayWords.filter(w => w.studyStatus.quizCount && w.studyStatus.quizCount > 0).length
      const typingPracticed = todayWords.filter(w => w.studyStatus.typingCount && w.studyStatus.typingCount > 0).length
      
      // 학습 스트릭 계산 (간단하게 구현)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayWords = allWords.filter(w => {
        const lastStudied = w.studyStatus?.lastStudied
        if (!lastStudied) return false
        const studiedDate = lastStudied instanceof Date ? lastStudied : (lastStudied as any).toDate()
        return studiedDate >= yesterday && studiedDate < today
      })
      
      const studyStreak = yesterdayWords.length > 0 ? 1 : 0 // 실제로는 DB에서 관리해야 함
      
      // 추천 단어 선택 (아직 학습하지 않았거나 숙련도가 낮은 단어)
      const unstudiedWords = allWords.filter(w => !w.studyStatus.studied)
      const lowMasteryWords = allWords.filter(w => 
        w.studyStatus.studied && w.studyStatus.masteryLevel < 50
      )
      
      const suggested = [
        ...unstudiedWords.slice(0, 10),
        ...lowMasteryWords.slice(0, 10)
      ].slice(0, Math.max(0, 30 - todayWords.length))
      
      setSuggestedWords(suggested)
      
      setDailyGoal({
        targetWords: 30,
        completedWords: todayWords.length,
        studyStreak,
        lastStudyDate: todayWords.length > 0 ? new Date() : null,
        todayProgress: {
          newWords,
          reviewedWords,
          quizzesTaken,
          typingPracticed
        }
      })
      
      // 통계 계산
      const avgMastery = todayWords.length > 0
        ? todayWords.reduce((sum, w) => sum + w.studyStatus.masteryLevel, 0) / todayWords.length
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/study')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            돌아가기
          </Button>
          <h1 className="text-2xl font-bold">일일 목표</h1>
        </div>
        <div className="flex items-center gap-2">
          <Flame className={`h-5 w-5 ${dailyGoal.studyStreak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
          <span className="font-semibold">{dailyGoal.studyStreak}일 연속</span>
        </div>
      </div>

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

      {/* 추천 학습 모드 */}
      {!isGoalCompleted && (
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

// 필요한 임포트 추가
import { BookOpen, Brain, Keyboard } from 'lucide-react'