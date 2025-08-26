'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { 
  BookOpen, 
  Brain, 
  CheckCircle, 
  BarChart, 
  FileText,
  Shuffle,
  Target,
  Clock,
  HelpCircle,
  Camera
} from 'lucide-react'

export default function StudyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalWords: 0,
    studiedWords: 0,
    masteredWords: 0,
    todayWords: 0
  })

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  const loadStats = async () => {
    if (!user) return

    try {
      // 새 DB 구조에서 단어 가져오기
      const { vocabularyService } = await import('@/lib/api')
      const result = await vocabularyService.getAll(undefined, 2000, user.uid) // 사용자 선택 단어장의 단어 가져오기
      const words = result.words
      
      // 사용자의 학습 통계 가져오기
      const { UserWordService } = await import('@/lib/vocabulary-v2/user-word-service')
      const userWordService = new UserWordService()
      const userStats = await userWordService.getUserStudyStats(user.uid)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // 오늘 학습한 단어 수 계산
      const userStudiedWords = await userWordService.getUserStudiedWords(user.uid)
      const todayWordsCount = userStudiedWords.filter(userWord => {
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
        
        return studiedDate >= today
      }).length
      
      setStats({
        totalWords: words.length,
        studiedWords: userStats.totalStudied,
        masteredWords: userStats.totalMastered,
        todayWords: todayWordsCount
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const studyModes: Array<{
    title: string
    description: string
    icon: any
    href: string
    color: string
    stats: string
    badge?: string
  }> = [
    {
      title: '단어 목록',
      description: '모든 단어를 한눈에 보고 검색',
      icon: BookOpen,
      href: '/study/list',
      color: 'bg-blue-500',
      stats: `${stats.totalWords}개 단어`
    },
    {
      title: '플래시카드',
      description: '카드를 넘기며 단어 암기',
      icon: Shuffle,
      href: '/study/flashcards',
      color: 'bg-green-500',
      stats: `${stats.totalWords - stats.studiedWords}개 학습 필요`
    },
    {
      title: '퀴즈 모드',
      description: '4지선다로 단어 테스트',
      icon: Brain,
      href: '/study/quiz',
      color: 'bg-purple-500',
      stats: '실력 테스트'
    },
    {
      title: '타이핑 연습',
      description: '단어 철자 입력 연습',
      icon: FileText,
      href: '/study/typing',
      color: 'bg-orange-500',
      stats: '철자 마스터'
    },
    {
      title: '일일 목표',
      description: '오늘의 학습 목표 달성',
      icon: Target,
      href: '/study/daily',
      color: 'bg-red-500',
      stats: `${stats.todayWords}/30개 완료`
    },
    {
      title: '복습 모드',
      description: '틀렸거나 어려운 단어 복습',
      icon: Clock,
      href: '/study/review',
      color: 'bg-indigo-500',
      stats: '스마트 복습'
    },
    {
      title: '사진 단어',
      description: '사진에서 단어 추출하여 학습',
      icon: Camera,
      href: '/study/photo-vocab',
      color: 'bg-teal-500',
      stats: '즉시 학습',
      badge: 'BETA'
    }
  ]

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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">학습 모드 선택</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/help')}
            className="flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            도움말
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/unified-dashboard')}
            className="flex items-center gap-2"
          >
            <BarChart className="w-4 h-4" />
            대시보드
          </Button>
        </div>
      </div>

      {/* 학습 통계 */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 단어</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWords}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">학습한 단어</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studiedWords}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">마스터한 단어</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.masteredWords}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 학습</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayWords}</div>
          </CardContent>
        </Card>
      </div>

      {/* 학습 모드 그리드 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {studyModes.map((mode) => {
          const Icon = mode.icon
          return (
            <Card 
              key={mode.href}
              className="cursor-pointer transition-all hover:shadow-lg"
              onClick={() => router.push(mode.href)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-lg ${mode.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {mode.badge && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {mode.badge}
                    </span>
                  )}
                </div>
                <CardTitle>{mode.title}</CardTitle>
                <CardDescription>{mode.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{mode.stats}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}