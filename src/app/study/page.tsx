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
  Clock
} from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { getSelectedSources, filterWordsBySelectedSources } from '@/lib/settings/get-selected-sources'
import { createVocabularyQuery } from '@/lib/vocabulary/vocabulary-query-utils'

interface StudyStats {
  totalWords: number
  studiedWords: number
  masteredWords: number
  todayWords: number
}

export default function StudyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [stats, setStats] = useState<StudyStats>({
    totalWords: 0,
    studiedWords: 0,
    masteredWords: 0,
    todayWords: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  const loadStats = async () => {
    if (!user) return

    try {
      // 사용자의 단어와 관리자가 업로드한 단어 모두 가져오기
      const q = createVocabularyQuery('extracted_vocabulary', user.uid)
      
      const snapshot = await getDocs(q)
      let words = snapshot.docs.map(doc => doc.data())
      
      // Firestore에서 선택된 단어장 가져오기
      const selectedSources = await getSelectedSources(user.uid)
      
      // 선택된 단어장으로 필터링
      words = filterWordsBySelectedSources(words, selectedSources)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      setStats({
        totalWords: words.length,
        studiedWords: words.filter(w => w.studyStatus?.studied).length,
        masteredWords: words.filter(w => w.studyStatus?.masteryLevel >= 80).length,
        todayWords: words.filter(w => {
          const lastStudied = w.studyStatus?.lastStudied?.toDate ? w.studyStatus.lastStudied.toDate() : w.studyStatus?.lastStudied
          return lastStudied && lastStudied >= today
        }).length
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const studyModes = [
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">단어 학습</h1>
        <p className="text-gray-600">Veterans Vocabulary 단어장으로 효율적으로 학습하세요</p>
      </div>

      {/* 학습 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">전체 단어</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalWords}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">학습한 단어</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.studiedWords}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">마스터한 단어</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.masteredWords}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">오늘 학습</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{stats.todayWords}</p>
          </CardContent>
        </Card>
      </div>

      {/* 학습 모드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studyModes.map((mode) => {
          const Icon = mode.icon
          return (
            <Card 
              key={mode.href}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(mode.href)}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-3 rounded-lg ${mode.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm text-gray-500">{mode.stats}</span>
                </div>
                <CardTitle>{mode.title}</CardTitle>
                <CardDescription>{mode.description}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {/* 학습 진행률 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            전체 진행률
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>학습 진행도</span>
              <span>{Math.round((stats.studiedWords / stats.totalWords) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${(stats.studiedWords / stats.totalWords) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span>마스터 진행도</span>
              <span>{Math.round((stats.masteredWords / stats.totalWords) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${(stats.masteredWords / stats.totalWords) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}