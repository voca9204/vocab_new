'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/card'
import { 
  BookOpen, 
  Target, 
  Clock,
  TrendingUp,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Camera,
  Brain,
  Trophy,
  Zap,
  GraduationCap,
  Globe,
  PenTool,
  BarChart3,
  Rocket,
  Star,
  ArrowRight,
  Calendar,
  Menu,
  Plus,
  Filter
} from 'lucide-react'
import { vocabularyService } from '@/lib/api'
import { WordDetailModal } from '@/components/vocabulary/word-detail-modal'
import { useWordDetailModal } from '@/hooks/use-word-detail-modal'
import { useVocabulary } from '@/contexts/collection-context-v2'
import type { VocabularyWord } from '@/types'
import type { UnifiedWord } from '@/types/unified-word'

// UnifiedWord를 VocabularyWord로 변환하는 헬퍼 함수
const unifiedToVocabularyWord = (word: UnifiedWord): VocabularyWord => ({
  id: word.id,
  word: word.word,
  definitions: [{
    text: word.definition,
    source: 'database',
    partOfSpeech: word.partOfSpeech[0] || 'n.'
  }],
  examples: word.examples,
  partOfSpeech: word.partOfSpeech,
  difficulty: word.difficulty,
  frequency: word.frequency,
  satLevel: word.isSAT,
  pronunciation: word.pronunciation,
  etymology: word.etymology ? {
    origin: word.etymology,
    language: 'unknown',
    meaning: word.realEtymology || ''
  } : undefined,
  categories: [],
  sources: [word.source.filename],
  apiSource: 'database',
  createdAt: word.createdAt,
  updatedAt: word.updatedAt,
  learningMetadata: {
    timesStudied: 0,
    masteryLevel: 0,
    lastStudied: new Date(),
    userProgress: {
      userId: '',
      wordId: word.id,
      correctAttempts: 0,
      totalAttempts: 0,
      streak: 0,
      nextReviewDate: new Date()
    }
  },
  synonyms: word.synonyms,
  antonyms: word.antonyms
})

// 주요 기능 카드 데이터 (모바일 최적화)
const quickActions = [
  {
    id: 'flashcards',
    title: '플래시카드',
    icon: Brain,
    color: 'bg-blue-500',
    route: '/study/flashcards',
  },
  {
    id: 'photo',
    title: '사진 단어',
    icon: Camera,
    color: 'bg-pink-500',
    route: '/study/photo-vocab',
  },
  {
    id: 'list',
    title: '단어 목록',
    icon: BookOpen,
    color: 'bg-green-500',
    route: '/study/list',
  },
  {
    id: 'quiz',
    title: '퀴즈',
    icon: Trophy,
    color: 'bg-purple-500',
    route: '/study/quiz',
  }
]

// 시험 카테고리 데이터 (간소화)
const examCategories = [
  {
    id: 'sat',
    title: 'SAT',
    count: '2000+',
    color: 'bg-blue-100 text-blue-600 border-blue-200'
  },
  {
    id: 'toeic',
    title: 'TOEIC',
    count: '1500+',
    color: 'bg-green-100 text-green-600 border-green-200'
  },
  {
    id: 'toefl',
    title: 'TOEFL',
    count: '1800+',
    color: 'bg-purple-100 text-purple-600 border-purple-200'
  },
  {
    id: 'csat',
    title: '수능',
    count: '1200+',
    color: 'bg-orange-100 text-orange-600 border-orange-200'
  }
]

export default function MobileDashboardPage() {
  const { user, appUser, loading } = useAuth()
  const router = useRouter()
  const { allWords: vocabularyWords, loading: vocabularyLoading } = useVocabulary()
  const [stats, setStats] = useState({
    todayWords: 0,
    studiedWords: 0,
    streak: 0
  })
  const [recentWords, setRecentWords] = useState<UnifiedWord[]>([])
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

  const loadStats = useCallback(async () => {
    if (!user) return

    try {
      const words = vocabularyWords
      
      // 사용자의 학습 통계 가져오기
      const { UserWordService } = await import('@/lib/vocabulary-v2/user-word-service')
      const userWordService = new UserWordService()
      const userStats = await userWordService.getUserStudyStats(user.uid)
      const userStudiedWords = await userWordService.getUserStudiedWords(user.uid)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // 오늘 학습한 단어 수 계산
      const todayWords = userStudiedWords.filter(userWord => {
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
        
        return studiedDate >= today
      }).length
      
      const streak = userStudiedWords.length > 0 ? Math.min(7, Math.floor(userStudiedWords.length / 10)) : 0
      
      setStats({
        todayWords: todayWords,
        studiedWords: userStats.totalStudied,
        streak: streak
      })
      
      // 추천 단어 4개만
      const studiedWordIds = new Set(userStudiedWords.map(uw => uw.wordId))
      const notStudiedWords = words
        .filter(w => !studiedWordIds.has(w.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 4)
      
      setRecentWords(notStudiedWords)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [user, vocabularyWords])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && vocabularyWords.length > 0) {
      loadStats()
    }
  }, [user, vocabularyWords, loadStats])

  if (loading || vocabularyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  const userName = appUser?.displayName || user?.email?.split('@')[0] || '학습자'
  const today = new Date()
  const dateStr = `${today.getMonth() + 1}월 ${today.getDate()}일`

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 모바일 헤더 - 고정 */}
      <div className="sticky top-0 z-40 bg-white border-b">
        <div className="px-4 py-3">
          {/* 상단 날짜/도움말 바 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{dateStr} ({['일','월','화','수','목','금','토'][today.getDay()]})</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/help')}
              className="p-1"
            >
              <HelpCircle className="h-5 w-5 text-gray-500" />
            </Button>
          </div>

          {/* 인사말 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                안녕하세요, {userName}님!
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                오늘도 화이팅! 💪
              </p>
            </div>
          </div>
        </div>

        {/* 학습 진행 상태 바 */}
        <div className="bg-blue-50 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-900">{stats.todayWords}</span>
              <span className="text-blue-700">/ 30</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-orange-700">{stats.streak}일</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-700">{stats.studiedWords}개</span>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="px-4 py-4">
        {/* 선택된 단어장 섹션 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              선택된 단어장
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/wordbooks')}
              className="text-blue-600 p-1"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {vocabularyWords.length === 0 ? (
            <Card className="border-dashed border-2 bg-yellow-50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600 mb-3">
                  학습할 단어장을 선택해주세요
                </p>
                <Button 
                  onClick={() => router.push('/wordbooks')}
                  className="w-full bg-blue-600 text-white"
                  size="sm"
                >
                  단어장 추가
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    총 {vocabularyWords.length}개 단어
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {examCategories.slice(0, 2).map((exam) => (
                      <span 
                        key={exam.id}
                        className={`px-2 py-0.5 rounded-full text-xs border ${exam.color}`}
                      >
                        {exam.title}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          )}
        </div>

        {/* 빠른 학습 메뉴 */}
        <div className="mb-6">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            빠른 학습
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => router.push(action.route)}
                  className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border hover:shadow-md transition-shadow"
                >
                  <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-gray-700">{action.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 시험 카테고리 */}
        <div className="mb-6">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            시험 준비
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {examCategories.map((exam) => (
              <Card 
                key={exam.id}
                className={`border cursor-pointer ${exam.color}`}
                onClick={() => router.push(`/study?exam=${exam.id}`)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{exam.title}</p>
                      <p className="text-xs opacity-80">{exam.count} 단어</p>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-60" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 추천 단어 */}
        {recentWords.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              오늘의 추천
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {recentWords.map((word) => (
                <Card 
                  key={word.id}
                  className="bg-white cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openModal(unifiedToVocabularyWord(word))}
                >
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm text-gray-900 mb-1">
                      {word.word}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {word.definition || '탭하여 학습'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 플로팅 버튼 */}
      <div className="fixed bottom-20 right-4 z-40">
        <Button
          size="lg"
          onClick={() => router.push('/study')}
          className="bg-blue-600 text-white shadow-lg hover:shadow-xl rounded-full h-14 w-14 p-0"
        >
          <Rocket className="h-6 w-6" />
        </Button>
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
        onSynonymClick={async (synonymWord) => {
          // 동의어 클릭 처리
        }}
      />
    </div>
  )
}