'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { directWordAdapter } from '@/lib/adapters/direct-word-adapter'
import { UnifiedWord } from '@/types/unified-word'
import { OfficialCategory, DifficultyLevel, categoryIcons, categoryColors } from '@/types/collections-simplified'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Volume2,
  Eye,
  EyeOff,
  RotateCw,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Trophy,
  Zap
} from 'lucide-react'

interface StudyPageClientProps {
  category: OfficialCategory
  difficulty: DifficultyLevel
}

// 카드 표시 모드
type CardMode = 'word' | 'definition' | 'both'

export default function StudyPageClient({ category, difficulty }: StudyPageClientProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // 상태 관리
  const [words, setWords] = useState<UnifiedWord[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cardMode, setCardMode] = useState<CardMode>('word')
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 학습 통계
  const [studied, setStudied] = useState(0)
  const [mastered, setMastered] = useState(0)
  const [skipped, setSkipped] = useState(0)

  // 단어 로드
  useEffect(() => {
    const loadWords = async () => {
      try {
        setLoading(true)
        setError(null)

        // DirectWordAdapter 사용하여 단어 로드
        const loadedWords = await directWordAdapter.getWordsByCollection(category, difficulty)

        if (loadedWords.length === 0) {
          setError('이 레벨에는 아직 단어가 준비되지 않았습니다.')
        } else {
          setWords(loadedWords)
        }
      } catch (err) {
        console.error('Error loading words:', err)
        setError('단어를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadWords()
  }, [category, difficulty])

  // 현재 단어
  const currentWord = words[currentIndex]

  // 다음 단어로 이동
  const nextWord = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setIsFlipped(false)
    }
  }, [currentIndex, words.length])

  // 이전 단어로 이동
  const prevWord = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setIsFlipped(false)
    }
  }, [currentIndex])

  // 카드 뒤집기
  const flipCard = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  // 단어 마스터 처리
  const markAsMastered = useCallback(async () => {
    setMastered(prev => prev + 1)
    setStudied(prev => prev + 1)

    // 사용자가 로그인한 경우 진도 저장
    if (user && currentWord) {
      await directWordAdapter.updateStudyProgress(
        user.uid,
        currentWord.id,
        { studied: true, mastered: true }
      )
    }

    nextWord()
  }, [user, currentWord, nextWord])

  // 단어 건너뛰기
  const skipWord = useCallback(() => {
    setSkipped(prev => prev + 1)
    setStudied(prev => prev + 1)
    nextWord()
  }, [nextWord])

  // 발음 재생
  const playPronunciation = useCallback(() => {
    if (currentWord?.pronunciation) {
      const utterance = new SpeechSynthesisUtterance(currentWord.word)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }, [currentWord])

  // 로딩 중
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">단어를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">오류 발생</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.push('/')}>
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 모든 단어 학습 완료
  if (words.length > 0 && currentIndex >= words.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">학습 완료!</h2>
            <div className="space-y-2 mb-6">
              <p className="text-gray-600">총 학습: {studied}개</p>
              <p className="text-green-600">마스터: {mastered}개</p>
              <p className="text-gray-400">건너뜀: {skipped}개</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/')}>
                홈으로
              </Button>
              <Button onClick={() => window.location.reload()}>
                다시 학습하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>홈</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{categoryIcons[category]}</span>
                <h1 className="text-lg font-bold text-gray-900">
                  {category} {difficulty === 'beginner' ? '초급' : difficulty === 'intermediate' ? '중급' : '고급'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span>{currentIndex + 1} / {words.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{mastered}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 학습 영역 */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {currentWord && (
          <>
            {/* 진도 바 */}
            <div className="mb-8">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
                />
              </div>
            </div>

            {/* 단어 카드 */}
            <Card className="mb-8 cursor-pointer" onClick={flipCard}>
              <CardContent className="p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                {!isFlipped ? (
                  // 앞면: 단어
                  <div>
                    <h2 className="text-5xl font-bold text-gray-900 mb-4">
                      {currentWord.word}
                    </h2>
                    {currentWord.pronunciation && (
                      <div className="flex items-center justify-center gap-2 mb-6">
                        <span className="text-lg text-gray-600">
                          [{currentWord.pronunciation}]
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            playPronunciation()
                          }}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Volume2 className="h-5 w-5 text-gray-600" />
                        </button>
                      </div>
                    )}
                    {currentWord.partOfSpeech && currentWord.partOfSpeech.length > 0 && (
                      <div className="flex gap-2 justify-center mb-4">
                        {currentWord.partOfSpeech.map((pos, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                          >
                            {pos}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-gray-400 text-sm">클릭해서 뜻 보기</p>
                  </div>
                ) : (
                  // 뒷면: 정의
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      {currentWord.definition}
                    </h3>
                    {currentWord.examples && currentWord.examples.length > 0 && (
                      <div className="text-left max-w-2xl mx-auto">
                        <h4 className="text-sm font-semibold text-gray-600 mb-2">예문:</h4>
                        {currentWord.examples.slice(0, 2).map((example, idx) => (
                          <p key={idx} className="text-gray-700 mb-2 italic">
                            "{example}"
                          </p>
                        ))}
                      </div>
                    )}
                    {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                      <div className="mt-4">
                        <span className="text-sm text-gray-600">동의어: </span>
                        <span className="text-sm text-blue-600">
                          {currentWord.synonyms.slice(0, 3).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 액션 버튼 */}
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={skipWord}
                className="min-w-[120px]"
              >
                <XCircle className="mr-2 h-5 w-5" />
                모름
              </Button>
              <Button
                size="lg"
                onClick={markAsMastered}
                className="min-w-[120px] bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                알아요!
              </Button>
            </div>

            {/* 네비게이션 */}
            <div className="flex justify-between mt-8">
              <Button
                variant="ghost"
                onClick={prevWord}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                이전
              </Button>
              <Button
                variant="ghost"
                onClick={nextWord}
                disabled={currentIndex === words.length - 1}
              >
                다음
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}