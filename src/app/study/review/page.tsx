'use client'

import { useEffect, useState } from 'react'
import { speakText } from '@/lib/utils/speech'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useCollectionV2 } from '@/contexts/collection-context-v2'
import { Button, StudyHeader } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChevronLeft,
  Clock,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  X,
  Check,
  Volume2,
  HelpCircle,
  Sparkles,
  BookOpen
} from 'lucide-react'
import type { VocabularyWord } from '@/types'
import { cn } from '@/lib/utils'
import { useSettings, getTextSizeClass } from '@/components/providers/settings-provider'

/**
 * Robustly parse a date that may arrive as a JS Date, epoch millis, ISO string,
 * or a Firestore Timestamp serialized over JSON ({ _seconds } / { seconds }).
 */
function toDate(value: any): Date | null {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') return new Date(value)
  if (typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') return value.toDate()
    const seconds = value._seconds ?? value.seconds
    if (typeof seconds === 'number') return new Date(seconds * 1000)
  }
  return null
}

export default function ReviewPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { allWords, selectedCollections, loadWords: loadAllWordsContext } = useCollectionV2()
  const { textSize } = useSettings()
  const [words, setWords] = useState<VocabularyWord[]>([])
  const [reviewWords, setReviewWords] = useState<VocabularyWord[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reviewType, setReviewType] = useState<'difficult' | 'scheduled'>('difficult')
  const [pronunciations, setPronunciations] = useState<Record<string, string>>({})
  const [showHelp, setShowHelp] = useState(false)
  const [translations, setTranslations] = useState<{ [key: number]: string }>({})
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null)
  const [userActivityData, setUserActivityData] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    if (user && selectedCollections.length > 0) {
      // 복습 페이지는 전체 단어를 로드해야 정확한 복습 대상을 찾을 수 있음
      loadAllWordsContext(10000) // 충분히 큰 limit으로 전체 로드
    }
  }, [user, selectedCollections, loadAllWordsContext])

  useEffect(() => {
    if (user && allWords && allWords.length > 0) {
      loadWords()
    }
  }, [user, allWords, reviewType])

  const loadWords = async () => {
    if (!user || !allWords) return

    try {
      console.log('[Review] Loading words from Firestore - Ver.4')

      // 컨텍스트에서 단어 가져오기
      if (allWords.length === 0) {
        setWords([])
        setReviewWords([])
        setLoading(false)
        return
      }

      // Ver.4: Firestore에서 사용자 학습 데이터 가져오기 (POST로 변경 - HTTP 431 방지)
      const wordIds = allWords.map(w => w.id).filter(Boolean)
      const response = await fetch('/api/study-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'fetch',
          userId: user.uid,
          wordIds: wordIds
        })
      })

      let activityData = new Map<string, any>()

      if (response.ok) {
        const { userWords } = await response.json()
        console.log(`[Review] Fetched ${userWords.length} user progress records from Firestore`)

        // Convert to Map for easy lookup
        userWords.forEach((userWord: any) => {
          if (userWord.wordId && userWord.studyStatus) {
            activityData.set(userWord.wordId, {
              correctCount: userWord.studyStatus.correctCount || 0,
              incorrectCount: userWord.studyStatus.incorrectCount || 0,
              lastStudied: userWord.studyStatus.lastStudied,
              nextReviewDate: userWord.studyStatus.nextReviewDate || null,
              masteryLevel: userWord.studyStatus.masteryLevel || 0,
              streak: userWord.studyStatus.streakCount || 0,
              totalReviews: userWord.studyStatus.totalReviews || 0
            })
          }
        })
      } else {
        console.error('[Review] Failed to fetch study progress from Firestore')
      }

      console.log(`[Review] Found activity data for ${activityData.size} words`)
      setUserActivityData(activityData)

      // 컨텍스트 단어에 활동 데이터 추가
      const wordsWithUserData = allWords.map(word => {
        const activityInfo = activityData.get(word.id)

        if (activityInfo) {
          // Ver.4: Firestore 데이터 사용
          const totalAttempts = activityInfo.totalReviews ||
                              ((activityInfo.correctCount || 0) + (activityInfo.incorrectCount || 0))
          const masteryLevel = activityInfo.masteryLevel
            ? activityInfo.masteryLevel / 100 // Convert from 0-100 to 0-1
            : (totalAttempts > 0 ? (activityInfo.correctCount || 0) / totalAttempts : 0)

          return {
            ...word,
            learningMetadata: {
              timesStudied: totalAttempts,
              masteryLevel: masteryLevel,
              lastStudied: toDate(activityInfo.lastStudied) || new Date(),
              userProgress: {
                userId: user.uid,
                wordId: word.id,
                correctAttempts: activityInfo.correctCount || 0,
                totalAttempts: totalAttempts,
                streak: activityInfo.streak || 0,
                // epoch (always "due") when the word was studied before scheduling
                // existed, so legacy words surface for review once
                nextReviewDate: toDate(activityInfo.nextReviewDate) || new Date(0)
              }
            }
          }
        }

        // 활동 데이터가 없는 단어는 기본값으로
        return {
          ...word,
          learningMetadata: {
            timesStudied: 0,
            masteryLevel: 0,
            lastStudied: new Date(),
            userProgress: {
              userId: user.uid,
              wordId: word.id,
              correctAttempts: 0,
              totalAttempts: 0,
              streak: 0,
              nextReviewDate: new Date(0)
            }
          }
        }
      })

      setWords(wordsWithUserData)
      
      // 복습할 단어 필터링
      let toReview: VocabularyWord[] = []
      
      if (reviewType === 'difficult') {
        // 어려운 단어 (숙련도 50% 미만)
        toReview = wordsWithUserData.filter(w => 
          (w.learningMetadata?.timesStudied || 0) > 0 && 
          (w.learningMetadata?.masteryLevel || 0) < 0.5
        )
      } else {
        // 복습 예정 단어: 학습한 적이 있고, 예정된 복습 날짜가 지난 단어
        // (스케줄은 /api/study-progress 저장 시 streak 기반으로 계산됨)
        const now = new Date()
        toReview = wordsWithUserData.filter(w => {
          if ((w.learningMetadata?.timesStudied || 0) === 0) return false

          const nextReviewDate = w.learningMetadata?.userProgress?.nextReviewDate
          // 스케줄이 아직 없는 단어(예전에 학습됨)는 한 번 복습 대상으로 노출
          if (!nextReviewDate) return true

          const reviewDate = nextReviewDate instanceof Date ? nextReviewDate : new Date(nextReviewDate)
          return reviewDate <= now
        })
      }
      
      console.log(`[Review] Found ${toReview.length} words to review (type: ${reviewType})`)
      console.log('[Review] Review words sample:', toReview.slice(0, 3).map(w => ({ 
        word: w.word, 
        masteryLevel: w.learningMetadata?.masteryLevel,
        timesStudied: w.learningMetadata?.timesStudied 
      })))
      
      // 난이도순으로 정렬 (어려운 것부터)
      toReview.sort((a, b) => (a.learningMetadata?.masteryLevel || 0) - (b.learningMetadata?.masteryLevel || 0))
      
      setReviewWords(toReview)
      setCurrentIndex(0)
      setShowAnswer(false)
      
      // 발음 정보 가져오기
      fetchPronunciations(toReview)
    } catch (error) {
      console.error('Error loading words:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPronunciations = async (words: VocabularyWord[]) => {
    // 이미 발음이 있는 단어들도 상태에 추가
    const existingPronunciations: Record<string, string> = {}
    words.forEach(word => {
      if (word.pronunciation) {
        existingPronunciations[word.word] = word.pronunciation
      }
    })
    setPronunciations(existingPronunciations)
    
    // 발음이 없는 단어들만 API로 가져오기
    const wordsNeedPronunciation = words.filter(w => !w.pronunciation && w.id)
    if (wordsNeedPronunciation.length === 0) return
    
    // 한 번에 처리할 단어 수 제한 (3개씩 - 복습용이므로 적게)
    const batchSize = 3
    const wordsToProcess = wordsNeedPronunciation.slice(0, batchSize)
    
    // 발음 정보를 임시로 저장
    const pronunciationUpdates: Record<string, string> = {}
    
    for (let i = 0; i < wordsToProcess.length; i++) {
      const word = wordsToProcess[i]
      
      // API 요청 사이에 지연 추가
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.word)}`)
        if (response.ok) {
          const data = await response.json()
          const phonetic = data[0]?.phonetic || 
                          data[0]?.phonetics?.[0]?.text ||
                          data[0]?.phonetics?.find((p: any) => p.text)?.text
                          
          if (phonetic && word.id) {
            pronunciationUpdates[word.word] = phonetic
          }
        }
      } catch (error) {
        console.log(`Skipping pronunciation for ${word.word}`)
      }
    }
    
    // 상태 업데이트
    if (Object.keys(pronunciationUpdates).length > 0) {
      setPronunciations(prev => ({
        ...prev,
        ...pronunciationUpdates
      }))
      console.log(`Cached pronunciation for ${Object.keys(pronunciationUpdates).length} words`)
    }
  }

  const speakWord = (text: string) => {
    speakText(text, { pitch: 1, volume: 1 })
  }

  const markAsReviewed = async (remembered: boolean) => {
    const currentWord = reviewWords[currentIndex]
    if (!currentWord || !currentWord.id || !user) return

    try {
      // localStorage에 학습 진도 업데이트
      const activityKey = `userActivityStats_${user.uid}`
      const savedActivity = localStorage.getItem(activityKey)
      let activityData: any = { words: {} }

      if (savedActivity) {
        try {
          activityData = JSON.parse(savedActivity)
          if (!activityData.words) {
            activityData.words = {}
          }
        } catch (err) {
          console.error('Error parsing activity data:', err)
        }
      }

      // 현재 단어의 활동 데이터 업데이트
      const wordActivity = activityData.words[currentWord.id] || {
        correctCount: 0,
        incorrectCount: 0,
        streak: 0,
        lastStudied: null,
        nextReviewDate: null
      }

      if (remembered) {
        wordActivity.correctCount = (wordActivity.correctCount || 0) + 1
        wordActivity.streak = (wordActivity.streak || 0) + 1

        // 다음 복습 날짜 계산 (간격 반복)
        const streakDays = [1, 3, 7, 14, 30, 60]
        const nextDays = streakDays[Math.min(wordActivity.streak - 1, streakDays.length - 1)]
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + nextDays)
        wordActivity.nextReviewDate = nextDate.toISOString()
      } else {
        wordActivity.incorrectCount = (wordActivity.incorrectCount || 0) + 1
        wordActivity.streak = 0

        // 다시 1일 후 복습
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + 1)
        wordActivity.nextReviewDate = nextDate.toISOString()
      }

      wordActivity.lastStudied = new Date().toISOString()
      activityData.words[currentWord.id] = wordActivity

      // localStorage에 저장
      localStorage.setItem(activityKey, JSON.stringify(activityData))

      // 서버 동기화: 다른 학습 모드와 동일한 경로로 저장해 Firestore의
      // nextReviewDate(간격 반복 스케줄)가 streak 기반으로 갱신되도록 함
      try {
        await fetch('/api/study-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            wordId: currentWord.id,
            result: remembered ? 'correct' : 'incorrect',
            studyType: 'review'
          })
        })
      } catch (err) {
        console.log('Server sync failed, but local progress saved')
      }

      console.log('Review progress updated:', currentWord.word, remembered)

      // 로컬 상태 업데이트 (learningMetadata.masteryLevel은 0~1 스케일)
      const currentMastery = currentWord.learningMetadata?.masteryLevel || 0
      const increment = remembered ? 0.1 : -0.05  // 기억하면 +10%p, 못하면 -5%p
      const newMasteryLevel = Math.max(0, Math.min(1, currentMastery + increment))
      
      const updatedWords = [...reviewWords]
      updatedWords[currentIndex] = {
        ...currentWord,
        learningMetadata: {
          ...currentWord.learningMetadata,
          masteryLevel: newMasteryLevel,
          timesStudied: (currentWord.learningMetadata?.timesStudied || 0) + 1,
          lastStudied: new Date()
        }
      }
      setReviewWords(updatedWords)

      // 다음 단어로
      if (currentIndex < reviewWords.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setShowAnswer(false)
        setTranslations({})
        setTranslatingIndex(null)
      } else {
        // 복습 완료
        alert('복습을 완료했습니다!')
        router.push('/unified-dashboard')
      }
    } catch (error) {
      console.error('Error updating word:', error)
    }
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

  const currentWord = reviewWords[currentIndex]

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 헤더 */}
      <StudyHeader 
        title="스마트 복습"
        rightContent={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
            className="p-2"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        }
      />
      
      {/* 복습 타입 선택 */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={reviewType === 'difficult' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setReviewType('difficult')}
          className="flex-1"
        >
          어려운 단어
        </Button>
        <Button
          variant={reviewType === 'scheduled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setReviewType('scheduled')}
          className="flex-1"
        >
          복습 예정
        </Button>
      </div>

      {/* 도움말 섹션 */}
      {showHelp && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">🧠 스마트 복습 시스템</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">📚 복습 모드</h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <div>
                    <span className="font-medium">• 어려운 단어:</span> 숙련도 50% 미만인 단어들
                  </div>
                  <div>
                    <span className="font-medium">• 복습 예정:</span> 간격 반복 학습법으로 선별된 단어들
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">⏰ 복습 주기</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  <div>연속 정답 1회 → <span className="font-medium">1일 후</span></div>
                  <div>연속 정답 2회 → <span className="font-medium">3일 후</span></div>
                  <div>연속 정답 3회 → <span className="font-medium">7일 후</span></div>
                  <div>연속 정답 4회+ → <span className="font-medium">14일, 30일, 60일...</span></div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">✅ 버튼 효과</h4>
              <div className="grid gap-3 md:grid-cols-2 text-sm text-blue-700">
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-1 mt-0.5">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="font-medium">기억해요:</span>
                  </div>
                  <div>
                    숙련도 +10%, 연속정답 +1, 다음 복습 간격 증가
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-1 mt-0.5">
                    <X className="h-4 w-4 text-red-600" />
                    <span className="font-medium">잘 모르겠어요:</span>
                  </div>
                  <div>
                    숙련도 -5%, 연속정답 초기화, 1일 후 다시 복습
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">복습할 단어</p>
                <p className="text-2xl font-bold">{reviewWords.length}개</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">진행률</p>
                <p className="text-2xl font-bold">
                  {reviewWords.length > 0 
                    ? Math.round(((currentIndex + 1) / reviewWords.length) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 숙련도</p>
                <p className="text-2xl font-bold">
                  {reviewWords.length > 0
                    ? Math.round(reviewWords.reduce((sum, w) => sum + (w.learningMetadata?.masteryLevel || 0) * 100, 0) / reviewWords.length)
                    : 0}%
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 복습 카드 */}
      {words.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
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
      ) : reviewWords.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">
              {reviewType === 'difficult' 
                ? '어려운 단어가 없습니다. 계속 학습해보세요!' 
                : '복습할 단어가 없습니다. 나중에 다시 확인해주세요!'}
            </p>
          </CardContent>
        </Card>
      ) : currentWord ? (
        <>
          <Card className="mb-6">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-sm text-gray-500">
                    {currentIndex + 1} / {reviewWords.length}
                  </span>
                  <span className="text-sm px-2 py-1 bg-orange-100 text-orange-800 rounded">
                    숙련도 {Math.round((currentWord.learningMetadata?.masteryLevel || 0) * 100)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-center gap-4 mb-4">
                  <h2 className="text-3xl font-bold">{currentWord.word}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      speakWord(currentWord.word)
                    }}
                    className="p-2"
                  >
                    <Volume2 className="h-5 w-5" />
                  </Button>
                </div>
                
                {(currentWord.pronunciation || pronunciations[currentWord.word]) && (
                  <p className="text-lg text-gray-600 mb-3">
                    [{currentWord.pronunciation || pronunciations[currentWord.word]}]
                  </p>
                )}
                
                <div className="flex justify-center gap-2 mb-6">
                  {currentWord.partOfSpeech.map(pos => (
                    <span 
                      key={pos}
                      className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-700"
                    >
                      {pos}
                    </span>
                  ))}
                </div>
                
                {showAnswer ? (
                  <div className="space-y-4 animate-fade-in">
                    <p className="text-xl text-gray-800">{currentWord.definitions?.[0]?.text || currentWord.definition || 'No definition available'}</p>
                    {currentWord.etymology?.origin && (
                      <p className="text-lg text-gray-600">{currentWord.etymology.origin}</p>
                    )}
                    {currentWord.examples && currentWord.examples.length > 0 && (
                      <div className="text-left max-w-xl mx-auto mt-6">
                        <p className="text-sm font-semibold text-gray-700 mb-2">예문:</p>
                        <div className="space-y-3">
                          {currentWord.examples.slice(0, 2).map((example, idx) => (
                            <div key={idx}>
                              <div className="flex gap-2">
                                <span className="text-gray-600 mt-0.5">•</span>
                                <div className="flex-1">
                                  <div>
                                    <p className={cn("text-gray-600 inline", getTextSizeClass(textSize))}>
                                      {example}
                                    </p>
                                    <span className="inline-flex items-center gap-1 ml-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          speakWord(example)
                                        }}
                                        className="p-1 h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100 inline-flex"
                                        title="예문 듣기"
                                      >
                                        <Volume2 className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={async (e) => {
                                          e.stopPropagation()
                                          if (translatingIndex !== null || translations[idx]) return
                                          setTranslatingIndex(idx)
                                          try {
                                            const response = await fetch('/api/translate-example', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ example })
                                            })
                                            if (response.ok) {
                                              const { translation } = await response.json()
                                              setTranslations(prev => ({ ...prev, [idx]: translation }))
                                            }
                                          } catch (error) {
                                            console.error('Translation error:', error)
                                          } finally {
                                            setTranslatingIndex(null)
                                          }
                                        }}
                                        disabled={translatingIndex === idx}
                                        className="text-xs px-2 py-1 h-6 text-green-600 hover:text-green-700 hover:bg-green-100 inline-flex items-center"
                                      >
                                        {translatingIndex === idx ? (
                                          <Sparkles className="h-3 w-3 animate-pulse" />
                                        ) : (
                                          '번역'
                                        )}
                                      </Button>
                                    </span>
                                  </div>
                                  {translations[idx] && (
                                    <p className={cn("text-green-600 text-sm mt-1", getTextSizeClass(textSize))}>
                                      → {translations[idx]}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button onClick={() => setShowAnswer(true)} size="lg">
                    답 보기
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          {showAnswer && (
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => markAsReviewed(false)}
              >
                <X className="h-4 w-4 mr-2 text-red-600" />
                잘 모르겠어요
              </Button>
              <Button
                className="flex-1"
                onClick={() => markAsReviewed(true)}
              >
                <Check className="h-4 w-4 mr-2 text-green-600" />
                기억해요
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}