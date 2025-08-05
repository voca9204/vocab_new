'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
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
  Sparkles
} from 'lucide-react'
import { vocabularyService } from '@/lib/api'
import type { VocabularyWord } from '@/types'
import { cn } from '@/lib/utils'
import { useSettings, getTextSizeClass } from '@/components/providers/settings-provider'

export default function ReviewPage() {
  const router = useRouter()
  const { user } = useAuth()
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

  useEffect(() => {
    if (user) {
      loadWords()
    }
  }, [user, reviewType])

  const loadWords = async () => {
    if (!user) return

    try {
      console.log('Loading words for review using new vocabulary service')
      
      // 새 호환성 레이어를 사용하여 사용자 선택 단어장의 단어 가져오기
      const { words: allWords } = await vocabularyService.getAll(undefined, 2000, user.uid)
      
      console.log(`Loaded ${allWords.length} words for review`)
      
      // 사용자의 학습 기록 가져오기 (user_words 컬렉션에서)
      const { UserWordService } = await import('@/lib/vocabulary-v2/user-word-service')
      const userWordService = new UserWordService()
      const userStudiedWords = await userWordService.getUserStudiedWords(user.uid)
      
      console.log(`User has studied ${userStudiedWords.length} words total`)
      
      // 마스터 단어 정보와 매칭
      const wordsWithUserData = userStudiedWords.map(userWord => {
        const masterWord = allWords.find(w => w.id === userWord.wordId)
        if (masterWord) {
          // 학습 정보를 마스터 단어에 합쳐서 반환
          return {
            ...masterWord,
            learningMetadata: {
              timesStudied: userWord.studyStatus.totalReviews,
              masteryLevel: userWord.studyStatus.masteryLevel / 100, // 백분율을 0-1로 변환
              lastStudied: userWord.studyStatus.lastStudied || new Date(),
              userProgress: {
                userId: userWord.userId,
                wordId: userWord.wordId,
                correctAttempts: userWord.studyStatus.correctCount,
                totalAttempts: userWord.studyStatus.totalReviews,
                streak: userWord.studyStatus.streakCount,
                nextReviewDate: userWord.studyStatus.nextReviewDate || new Date()
              }
            }
          }
        }
        return null
      }).filter(Boolean) as VocabularyWord[]
      
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
        // 복습 예정 단어 (다음 복습 날짜가 오늘 이전)
        const now = new Date()
        toReview = wordsWithUserData.filter(w => {
          const nextReviewDate = w.learningMetadata?.userProgress?.nextReviewDate
          if (!nextReviewDate) return false
          
          const reviewDate = nextReviewDate instanceof Date ? nextReviewDate : new Date(nextReviewDate)
          return reviewDate <= now
        })
        
        // 대안: 마지막 학습 후 일정 시간 경과한 단어들
        if (toReview.length === 0) {
          toReview = wordsWithUserData.filter(w => {
            if ((w.learningMetadata?.timesStudied || 0) === 0 || !w.learningMetadata?.lastStudied) return false
            
            const lastStudied = w.learningMetadata.lastStudied instanceof Date 
              ? w.learningMetadata.lastStudied 
              : new Date(w.learningMetadata.lastStudied)
            const daysSince = (now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24)
            
            // 숙련도에 따라 복습 주기 결정
            const masteryPercent = (w.learningMetadata.masteryLevel || 0) * 100
            const reviewInterval = masteryPercent >= 80 ? 7 :
                                 masteryPercent >= 60 ? 3 :
                                 masteryPercent >= 40 ? 2 : 1
            
            return daysSince >= reviewInterval
          })
        }
      }
      
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
    if ('speechSynthesis' in window) {
      // 이전 음성 정지
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      
      window.speechSynthesis.speak(utterance)
    }
  }

  const markAsReviewed = async (remembered: boolean) => {
    const currentWord = reviewWords[currentIndex]
    if (!currentWord || !currentWord.id) return

    try {
      // 학습 진도 업데이트
      const increment = remembered ? 10 : -5 // 백분율로 변경
      await vocabularyService.updateStudyProgress(
        currentWord.id,
        'review',
        remembered,
        increment
      )
      console.log('Review progress updated:', currentWord.word, remembered)
      
      // 로컬 상태 업데이트
      const currentMastery = currentWord.learningMetadata?.masteryLevel || 0
      const newMasteryLevel = Math.max(0, Math.min(100, currentMastery + increment))
      
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
        router.push('/study')
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
          <h1 className="text-2xl font-bold">스마트 복습</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle className="h-4 w-4 mr-1" />
            도움말
          </Button>
          <Button
            variant={reviewType === 'difficult' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setReviewType('difficult')}
          >
            어려운 단어
          </Button>
          <Button
            variant={reviewType === 'scheduled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setReviewType('scheduled')}
          >
            복습 예정
          </Button>
        </div>
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
      {reviewWords.length === 0 ? (
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
                    <p className="text-xl text-gray-800">{currentWord.definitions[0]?.text || 'No definition available'}</p>
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