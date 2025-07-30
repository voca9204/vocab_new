'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Keyboard, CheckCircle } from 'lucide-react'
import { vocabularyService } from '@/lib/api'
import { prepareWordsForTyping } from '@/lib/typing-utils'
import { useTypingPractice } from '@/hooks/use-typing-practice'
import { useTypingTimer } from '@/hooks/use-typing-timer'
import { 
  TypingStatsGrid, 
  WordDisplayCard, 
  TypingResultDisplay, 
  PracticeCompleteScreen 
} from '@/components/typing'
import { LoadingSkeleton } from '@/components/typing/loading-skeleton'
import { ErrorFallback } from '@/components/typing/error-fallback'

export default function TypingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionCountRef = useRef(0)
  
  const {
    words,
    currentWordIndex,
    typedWord,
    showResult,
    currentResult,
    results,
    practiceComplete,
    wordStartTime,
    isLoading,
    error,
    setWords,
    setTypedWord,
    submitWord,
    nextWord,
    restartPractice,
    startNewSession,
    clearError,
    setLoading,
    setError,
    currentWord,
    accuracy,
    avgTime,
    avgHints,
    correctCount,
  } = useTypingPractice()
  
  const {
    timeElapsed,
    hintLevel,
    nextHintIn,
    resetTimer,
    startNewWord,
  } = useTypingTimer({
    currentWord,
    showResult,
    practiceComplete,
    wordStartTime,
  })

  const loadWords = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      clearError()
      
      // 세션 카운터 증가하여 다른 단어들을 가져오도록 함
      sessionCountRef.current += 1
      const offset = (sessionCountRef.current - 1) * 20
      
      // 사용자 선택 단어장의 모든 단어들을 가져옴 (타이핑 연습에 적합한 단어 필터링 후 선택)
      const { words: wordsData } = await vocabularyService.getAll(undefined, 3000, user.uid) // 모든 단어 가져온 후 필터링
      
      if (wordsData.length === 0) {
        setError('연습할 단어를 찾을 수 없습니다. 단어장을 확인해주세요.')
        setWords([])
        return
      }
      
      // 전체 단어를 필터링하고 정렬
      const filteredWords = wordsData.filter(w => w.word.length >= 3 && w.word.length <= 12)
      
      // 셔플하여 랜덤하게 선택
      const shuffled = [...filteredWords].sort(() => Math.random() - 0.5)
      const selectedWords = shuffled.slice(0, 20)
      
      if (selectedWords.length === 0) {
        setError('타이핑 연습에 적합한 단어가 없습니다. (3-12글자 단어 필요)')
        setWords([])
        return
      }
      
      console.log(`세션 ${sessionCountRef.current}: ${selectedWords.length}개 단어 로드`)
      
      setWords(selectedWords)
      resetTimer()
      
      // Start new session after words are loaded
      setTimeout(() => {
        startNewSession()
      }, 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '단어를 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading words:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [user, setWords, resetTimer, startNewSession, setLoading, clearError, setError])

  useEffect(() => {
    if (user) {
      loadWords()
    }
  }, [user, loadWords])

  // Focus input field when appropriate
  useEffect(() => {
    if (words.length > 0 && !practiceComplete && inputRef.current && !showResult) {
      inputRef.current.focus()
    }
  }, [words.length, practiceComplete, currentWordIndex, showResult])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!showResult) {
      setTypedWord(e.target.value)
    }
  }, [showResult, setTypedWord])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    submitWord(hintLevel)
  }, [submitWord, hintLevel])

  const handleNextWord = useCallback(() => {
    nextWord()
    startNewWord()
  }, [nextWord, startNewWord])

  const handleRestartPractice = useCallback(() => {
    restartPractice()
    resetTimer()
    clearError()
    loadWords()
  }, [restartPractice, resetTimer, loadWords, clearError])

  const handleRetry = useCallback(() => {
    clearError()
    loadWords()
  }, [clearError, loadWords])

  // Memoized input className to prevent unnecessary re-renders
  const inputClassName = useMemo(() => {
    const baseClasses = 'text-center text-2xl py-6 font-mono'
    if (!showResult || !currentWord) return baseClasses
    
    const isCorrect = typedWord.trim().toLowerCase() === currentWord.word.toLowerCase()
    const resultClasses = isCorrect 
      ? 'border-green-500 bg-green-50' 
      : 'border-red-500 bg-red-50'
    
    return `${baseClasses} ${resultClasses}`
  }, [showResult, typedWord, currentWord])

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

  // Show loading skeleton while words are being loaded
  if (isLoading) {
    return <LoadingSkeleton />
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/study')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            돌아가기
          </Button>
          <h1 className="text-2xl font-bold">타이핑 연습 (힌트 모드)</h1>
        </div>
        <ErrorFallback error={new Error(error)} resetError={handleRetry} />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
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
          <h1 className="text-2xl font-bold">타이핑 연습 (힌트 모드)</h1>
        </div>
      </div>

      {practiceComplete ? (
        <PracticeCompleteScreen
          results={results}
          accuracy={accuracy}
          avgTime={avgTime}
          avgHints={avgHints}
          correctCount={correctCount}
          totalWords={words.length}
          onRestart={handleRestartPractice}
          onGoToStudy={() => router.push('/study')}
        />
      ) : words.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Keyboard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">연습할 단어가 없습니다.</p>
            <p className="text-sm text-gray-500 mt-2">
              단어장을 선택하거나 업로드해주세요.
            </p>
          </CardContent>
        </Card>
      ) : currentWord ? (
        <>
          <TypingStatsGrid
            currentWordIndex={currentWordIndex}
            totalWords={words.length}
            accuracy={accuracy}
            timeElapsed={timeElapsed}
            nextHintIn={nextHintIn}
          />

          <Card className="mb-6">
            <CardContent className="p-8">
              <WordDisplayCard
                word={currentWord}
                hintLevel={hintLevel}
                timeElapsed={timeElapsed}
                nextHintIn={nextHintIn}
              />
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    ref={inputRef}
                    type="text"
                    value={typedWord}
                    onChange={handleInputChange}
                    placeholder={`단어를 입력하세요 (${currentWord.word.length}글자)`}
                    className={inputClassName}
                    disabled={showResult}
                    maxLength={currentWord.word.length + 5}
                  />
                </div>

                {showResult && currentResult && currentResult.word.word === currentWord?.word && (
                  <TypingResultDisplay result={currentResult} />
                )}

                <div className="flex gap-4">
                  {!showResult ? (
                    <Button type="submit" className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      확인
                    </Button>
                  ) : (
                    <Button className="flex-1" onClick={handleNextWord}>
                      {currentWordIndex < words.length - 1 ? '다음 단어' : '결과 보기'}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}