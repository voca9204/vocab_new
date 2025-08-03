'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  User, 
  BookOpen, 
  Target, 
  Clock, 
  TrendingUp,
  ChevronRight,
  Edit2,
  Sparkles
} from 'lucide-react'
import { vocabularyService } from '@/lib/api'
import { WordDetailModal } from '@/components/vocabulary/word-detail-modal'
import { useWordDetailModal } from '@/hooks/use-word-detail-modal'
import type { VocabularyWord } from '@/types'

export default function DashboardPage() {
  const { user, appUser, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalWords: 0,
    studiedWords: 0,
    todayWords: 0,
    masteryAverage: 0
  })
  const [sources, setSources] = useState<{filename: string, count: number}[]>([])
  const [recentWords, setRecentWords] = useState<VocabularyWord[]>([])
  const {
    selectedWord,
    openModal,
    closeModal,
    generateExamples,
    generateEtymology,
    fetchPronunciation,
    generatingExamples,
    generatingEtymology,
    fetchingPronunciation,
    speakWord
  } = useWordDetailModal()

  // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // 통계 데이터 가져오기
  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  const updateFilename = async (oldFilename: string, newFilename: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/update-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          oldFilename,
          newFilename
        })
      })
      
      const result = await response.json()
      if (result.success) {
        alert(result.message)
        loadStats() // 통계 다시 로드
      }
    } catch (error) {
      console.error('Error updating filename:', error)
      alert('파일명 변경 중 오류가 발생했습니다.')
    }
  }

  const loadStats = async () => {
    if (!user) return

    try {
      // 새 호환성 레이어를 사용하여 사용자 선택 단어장의 단어 가져오기
      const { words } = await vocabularyService.getAll(undefined, 2000, user.uid) // 충분히 많은 수
      
      // 사용자의 학습 통계 가져오기 (user_words 컬렉션에서)
      const { UserWordService } = await import('@/lib/vocabulary-v2/user-word-service')
      const userWordService = new UserWordService()
      const userStats = await userWordService.getUserStudyStats(user.uid)
      const userStudiedWords = await userWordService.getUserStudiedWords(user.uid)
      
      console.log(`Dashboard stats: ${userStats.totalStudied} studied, ${userStats.totalMastered} mastered`)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // 오늘 학습한 단어 수 계산
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
        
        return studiedDate >= today
      }).length
      
      setStats({
        totalWords: words.length,
        studiedWords: userStats.totalStudied,
        todayWords: todayWords,
        masteryAverage: userStats.averageMastery
      })
      
      // V.ZIP 단어장 정보로 출처 설정
      setSources([{ filename: 'V.ZIP 3K 단어장', count: words.length }])
      
      // 최근 학습하지 않은 단어 10개 가져오기 (user_words에 없는 단어들)
      const studiedWordIds = new Set(userStudiedWords.map(uw => uw.wordId))
      const notStudiedWords = words
        .filter(w => !studiedWordIds.has(w.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
      
      setRecentWords(notStudiedWords)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const statsDisplay = [
    { label: '학습한 단어', value: `${stats.studiedWords}개`, icon: BookOpen, color: 'text-blue-600' },
    { label: '오늘의 목표', value: `${stats.todayWords}/30개`, icon: Target, color: 'text-green-600' },
    { label: '전체 단어', value: `${stats.totalWords}개`, icon: Clock, color: 'text-purple-600' },
    { label: '평균 숙련도', value: `${stats.masteryAverage}%`, icon: TrendingUp, color: 'text-orange-600' }
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 환영 메시지 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          안녕하세요, {appUser?.displayName || user.email?.split('@')[0]}님!
        </h1>
        <p className="text-gray-600">오늘도 SAT 단어 학습을 시작해볼까요?</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statsDisplay.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color} opacity-20`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 빠른 시작 섹션 */}
      <div className="mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/study')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              단어 학습 시작
              <ChevronRight className="h-5 w-5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">플래시카드, 리스트 등 다양한 방법으로 단어를 학습하세요.</p>
          </CardContent>
        </Card>
      </div>

      {/* 단어장 출처 */}
      {sources.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">업로드된 단어장</h3>
          <div className="space-y-2">
            {sources.map((source, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">{source.filename}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{source.count}개 단어</span>
                  {source.filename === '[SAT] 24FW V.ZIP 3K.pdf' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateFilename('[SAT] 24FW V.ZIP 3K.pdf', 'veterans_24FW.pdf')}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      이름 변경
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 단어 섹션 */}
      {recentWords.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            오늘의 추천 단어
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {recentWords.map((word) => (
              <Card 
                key={word.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openModal(word)}
              >
                <div className="text-center">
                  <p className="font-bold text-lg mb-1">{word.word}</p>
                  <p className="text-sm text-gray-600 line-clamp-2">{word.definitions[0]?.text || 'No definition available'}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 계정 정보 (작게) */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-gray-600" />
          <div className="text-sm text-gray-600">
            <span className="font-medium">{user.email}</span> • 
            가입일: {appUser?.createdAt?.toLocaleDateString('ko-KR') || '알 수 없음'}
          </div>
        </div>
      </div>

      {/* 단어 상세 모달 */}
      <WordDetailModal
        open={!!selectedWord}
        onClose={closeModal}
        word={selectedWord}
        onPlayPronunciation={speakWord}
        onGenerateExamples={generateExamples}
        onGenerateEtymology={generateEtymology}
        onFetchPronunciation={fetchPronunciation}
        generatingExamples={generatingExamples}
        generatingEtymology={generatingEtymology}
        fetchingPronunciation={fetchingPronunciation}
      />
    </div>
  )
}