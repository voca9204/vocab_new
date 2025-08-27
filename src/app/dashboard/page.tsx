'use client'

import { useEffect, useState, useCallback } from 'react'
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
  Users,
  Rocket,
  Star,
  ArrowRight
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

// 시험 카테고리 데이터
const examCategories = [
  {
    id: 'sat',
    title: 'SAT',
    description: '미국 대학 입학시험',
    icon: GraduationCap,
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    available: true,
    wordCount: '2000+',
    difficulty: '고급'
  },
  {
    id: 'toeic',
    title: 'TOEIC',
    description: '비즈니스 영어 능력 평가',
    icon: Globe,
    color: 'from-green-500 to-green-600',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    available: true,
    wordCount: '1500+',
    difficulty: '중급'
  },
  {
    id: 'toefl',
    title: 'TOEFL',
    description: '학술 영어 능력 시험',
    icon: PenTool,
    color: 'from-purple-500 to-purple-600',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    available: true,
    wordCount: '1800+',
    difficulty: '고급'
  },
  {
    id: 'csat',
    title: '수능',
    description: '대학수학능력시험',
    icon: Trophy,
    color: 'from-orange-500 to-orange-600',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    available: true,
    wordCount: '1200+',
    difficulty: '중급'
  }
]

// 주요 기능 카드 데이터
const featureCards = [
  {
    id: 'smart-learning',
    title: '지능적인 학습',
    description: 'AI가 분석한 최적의 학습 순서와 복습 주기로 효율적인 암기',
    icon: Brain,
    color: 'from-indigo-500 to-purple-600',
    bgGradient: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    route: '/study/flashcards',
    features: ['맞춤형 난이도 조절', '망각 곡선 기반 복습', '학습 패턴 분석']
  },
  {
    id: 'photo-vocab',
    title: '사진 단어 학습',
    description: '교재나 문서를 촬영하면 AI가 단어를 추출하여 즉시 학습 가능',
    icon: Camera,
    color: 'from-pink-500 to-rose-600',
    bgGradient: 'bg-gradient-to-br from-pink-500 to-rose-600',
    route: '/study/photo-vocab',
    features: ['Google Vision AI', '즉시 단어 추출', '맥락 기반 학습']
  },
  {
    id: 'personal-vocab',
    title: '나만의 단어장',
    description: '관심 분야나 목표에 맞는 개인 맞춤 단어장 생성',
    icon: Star,
    color: 'from-amber-500 to-orange-600',
    bgGradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
    route: '/study/list',
    features: ['커스텀 단어 추가', '카테고리 분류', '진도 추적']
  }
]

export default function DashboardPage() {
  const { user, appUser, loading } = useAuth()
  const router = useRouter()
  const { allWords: vocabularyWords, loading: vocabularyLoading } = useVocabulary()
  const [isMobile, setIsMobile] = useState(false)
  const [stats, setStats] = useState({
    totalWords: 0,
    studiedWords: 0,
    todayWords: 0,
    masteryAverage: 0,
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
  const [allWords, setAllWords] = useState<UnifiedWord[]>([])

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // loadStats 함수 정의
  const loadStats = useCallback(async () => {
    if (!user) return

    try {
      const words = vocabularyWords
      setAllWords(words)
      
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
      
      // 연속 학습 일수 계산 (간단한 예시)
      const streak = userStudiedWords.length > 0 ? Math.min(7, Math.floor(userStudiedWords.length / 10)) : 0
      
      setStats({
        totalWords: words.length,
        studiedWords: userStats.totalStudied,
        todayWords: todayWords,
        masteryAverage: userStats.averageMastery,
        streak: streak
      })
      
      // 최근 학습하지 않은 단어 6개
      const studiedWordIds = new Set(userStudiedWords.map(uw => uw.wordId))
      const notStudiedWords = words
        .filter(w => !studiedWordIds.has(w.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 6)
      
      setRecentWords(notStudiedWords)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [user, vocabularyWords])

  // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // 통계 데이터 가져오기
  useEffect(() => {
    if (user) {
      if (vocabularyWords.length > 0) {
        loadStats()
      } else if (!vocabularyLoading) {
        setStats({
          totalWords: 0,
          studiedWords: 0,
          todayWords: 0,
          masteryAverage: 0,
          streak: 0
        })
      }
    }
  }, [user, vocabularyWords, vocabularyLoading, loadStats])

  if (loading || vocabularyLoading) {
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

  const noVocabularySelected = vocabularyWords.length === 0 && !loading && !vocabularyLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-4 md:py-8 px-4 max-w-7xl">
        {/* 헤더 섹션 */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-0 mb-4 md:mb-6">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
                안녕하세요, {appUser?.displayName || user.email?.split('@')[0]}님! 👋
              </h1>
              <p className="text-sm md:text-lg text-gray-600">오늘도 효율적인 단어 학습을 시작해보세요</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/help')}
              className="self-end md:self-auto flex items-center gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden md:inline">도움말</span>
            </Button>
          </div>

          {/* 학습 통계 섹션 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-8">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">오늘 학습</p>
                    <p className="text-xl md:text-2xl font-bold text-blue-600">{stats.todayWords}</p>
                    <p className="text-xs text-gray-400">/ 30 목표</p>
                  </div>
                  <Target className="h-6 w-6 md:h-8 md:w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">총 학습</p>
                    <p className="text-xl md:text-2xl font-bold text-green-600">{stats.studiedWords}</p>
                    <p className="text-xs text-gray-400">단어</p>
                  </div>
                  <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow col-span-2 md:col-span-1">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">전체 단어</p>
                    <p className="text-xl md:text-2xl font-bold text-purple-600">{stats.totalWords}</p>
                    <p className="text-xs text-gray-400">개</p>
                  </div>
                  <BarChart3 className="h-6 w-6 md:h-8 md:w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow hidden md:block">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">평균 숙련도</p>
                    <p className="text-xl md:text-2xl font-bold text-orange-600">{stats.masteryAverage}%</p>
                    <p className="text-xs text-gray-400">마스터</p>
                  </div>
                  <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow hidden md:block">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">연속 학습</p>
                    <p className="text-xl md:text-2xl font-bold text-red-600">{stats.streak}</p>
                    <p className="text-xs text-gray-400">일째</p>
                  </div>
                  <Zap className="h-6 w-6 md:h-8 md:w-8 text-red-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 주요 기능 카드 */}
        <div className="mb-8 md:mb-10">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
            <Rocket className="h-4 w-4 md:h-5 md:w-5" />
            핵심 기능
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {featureCards.map((feature) => {
              const Icon = feature.icon
              return (
                <Card 
                  key={feature.id}
                  className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group overflow-hidden"
                  onClick={() => router.push(feature.route)}
                >
                  <div className={`h-2 ${feature.bgGradient}`} />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${feature.bgGradient} text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
                    <div className="space-y-1">
                      {feature.features.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="w-1 h-1 bg-gray-400 rounded-full" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* 시험 카테고리 섹션 */}
        <div className="mb-8 md:mb-10">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 md:h-5 md:w-5" />
            시험 준비
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {examCategories.map((exam) => {
              const Icon = exam.icon
              return (
                <Card 
                  key={exam.id}
                  className={`border ${exam.borderColor} ${exam.bgColor} hover:shadow-lg transition-all cursor-pointer group`}
                  onClick={() => exam.available && router.push(`/study?exam=${exam.id}`)}
                >
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <Icon className={`h-6 w-6 md:h-8 md:w-8 ${exam.textColor}`} />
                      {exam.available && (
                        <ChevronRight className={`h-4 w-4 ${exam.textColor} opacity-50 group-hover:opacity-100 transition-opacity`} />
                      )}
                    </div>
                    <h3 className={`font-bold text-base md:text-lg ${exam.textColor} mb-1`}>{exam.title}</h3>
                    <p className="text-xs text-gray-600 mb-2 hidden md:block">{exam.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${exam.textColor}`}>{exam.wordCount} 단어</span>
                      <span className="text-gray-500">{exam.difficulty}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* 단어장 미선택 안내 */}
        {noVocabularySelected && (
          <Card className="mb-8 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-900 mb-2">학습을 시작하려면 단어장을 선택하세요</h3>
                  <p className="text-yellow-800 text-sm mb-4">
                    SAT, TOEIC, TOEFL 등 다양한 시험 대비 단어장을 준비했습니다.
                  </p>
                  <Button 
                    onClick={() => router.push('/wordbooks')}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                  >
                    단어장 선택하기
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 오늘의 추천 단어 */}
        {recentWords.length > 0 && (
          <div className="mb-8 md:mb-10">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
              오늘의 추천 단어
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
              {recentWords.map((word) => (
                <Card 
                  key={word.id}
                  className="group cursor-pointer hover:shadow-lg transition-all border-0 bg-white"
                  onClick={() => openModal(unifiedToVocabularyWord(word))}
                >
                  <CardContent className="p-3 md:p-4">
                    <p className="font-bold text-sm md:text-base mb-1 md:mb-2 group-hover:text-blue-600 transition-colors">
                      {word.word}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {word.definition || 'Click to learn'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 빠른 시작 버튼 - 모바일에서는 원형 */}
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50">
          <Button
            size="lg"
            onClick={() => router.push('/study')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all rounded-full md:rounded-md h-14 w-14 md:h-auto md:w-auto p-0 md:px-6 md:py-3"
          >
            <Rocket className="h-6 w-6 md:mr-2 md:h-5 md:w-5" />
            <span className="hidden md:inline">학습 시작하기</span>
          </Button>
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
        onSynonymClick={async (synonymWord) => {
          const synonymWordData = allWords.find(w => w.word.toLowerCase() === synonymWord.toLowerCase())
          
          if (synonymWordData) {
            closeModal()
            setTimeout(() => {
              openModal(unifiedToVocabularyWord(synonymWordData))
            }, 100)
          } else if (user) {
            try {
              const { words: searchResults } = await vocabularyService.search(synonymWord, user.uid)
              if (searchResults[0]) {
                closeModal()
                setTimeout(() => {
                  openModal(searchResults[0])
                }, 100)
              }
            } catch (error) {
              console.error('Error searching for synonym:', error)
            }
          }
        }}
      />
    </div>
  )
}