'use client'

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useCollectionV2 } from '@/contexts/collection-context-v2'
import { Button, StudyHeader } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Keyboard, CheckCircle, Volume2 } from 'lucide-react'
// Removed: import { vocabularyService } from '@/lib/api' - NO LONGER USING OLD SYSTEM
import { prepareWordsForTyping } from '@/lib/typing-utils'
import { useTypingPractice, normalizeTypedAnswer } from '@/hooks/use-typing-practice'
import { useTypingTimer } from '@/hooks/use-typing-timer'
import { 
  TypingStatsGrid, 
  WordDisplayCard, 
  TypingResultDisplay, 
  PracticeCompleteScreen 
} from '@/components/typing'
import { LoadingSkeleton } from '@/components/typing/loading-skeleton'
import { ErrorFallback } from '@/components/typing/error-fallback'
import { WordDetailModal } from '@/components/vocabulary/word-detail-modal'
import { useWordDetailModal } from '@/hooks/use-word-detail-modal'

export default function TypingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { words: contextWords, selectedCollections } = useCollectionV2()
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionCountRef = useRef(0)
  const [showPreview, setShowPreview] = useState(true)
  const [practiceStarted, setPracticeStarted] = useState(false)
  
  // Word detail modal hook
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
      // Use words from UnifiedVocabularyContext - NO OLD SYSTEM
      if (!contextWords || contextWords.length === 0) {
        const errorMessage = !selectedCollections || selectedCollections.length === 0
          ? '단어장을 선택해주세요. 설정에서 학습할 단어장을 선택할 수 있습니다.'
          : '선택된 단어장에서 단어를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.'
        setError(errorMessage)
        setWords([])
        return
      }
      
      const wordsData = contextWords
      
      // 전체 단어를 필터링하고 정렬
      const filteredWords = wordsData.filter(w => w.word.length >= 3 && w.word.length <= 12)
      
      // 셔플하여 랜덤하게 선택 - 10개만 선택
      const shuffled = [...filteredWords].sort(() => Math.random() - 0.5)
      const selectedWords = shuffled.slice(0, 10)
      
      if (selectedWords.length === 0) {
        setError('타이핑 연습에 적합한 단어가 없습니다. (3-12글자 단어 필요)')
        setWords([])
        return
      }
      
      console.log(`세션 ${sessionCountRef.current}: ${selectedWords.length}개 단어 로드 (미리보기)`)
      
      setWords(selectedWords)
      resetTimer()
      
      // 미리보기 모드로 시작
      setShowPreview(true)
      setPracticeStarted(false)
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
  }, [user, contextWords, selectedCollections, setWords, resetTimer, startNewSession, setLoading, clearError, setError])

  useEffect(() => {
    if (user) {
      loadWords()
    }
  }, [user, loadWords])

  // Focus input field when appropriate
  useEffect(() => {
    if (words.length > 0 && !practiceComplete && inputRef.current && !showResult && practiceStarted && !showPreview) {
      inputRef.current.focus()
    }
  }, [words.length, practiceComplete, currentWordIndex, showResult, practiceStarted, showPreview])

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
    setShowPreview(true)
    setPracticeStarted(false)
    loadWords()
  }, [restartPractice, resetTimer, loadWords, clearError])

  const handleStartPractice = useCallback(() => {
    setShowPreview(false)
    setPracticeStarted(true)
    startNewSession()
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
  }, [startNewSession])

  const handleRetry = useCallback(() => {
    clearError()
    loadWords()
  }, [clearError, loadWords])

  // Memoized input className to prevent unnecessary re-renders
  const inputClassName = useMemo(() => {
    const baseClasses = 'text-center text-2xl py-6 font-mono'
    if (!showResult || !currentWord) return baseClasses
    
    const isCorrect = normalizeTypedAnswer(typedWord) === normalizeTypedAnswer(currentWord.word)
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
        <StudyHeader 
          title="타이핑 연습"
          subtitle="힌트 모드"
        />
        <ErrorFallback error={new Error(error)} resetError={handleRetry} />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <StudyHeader 
        title="타이핑 연습"
        subtitle="힌트 모드"
      />

      {showPreview && words.length > 0 ? (
        // 단어 미리보기 화면
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">오늘의 타이핑 연습 단어</h2>
              <p className="text-gray-600">아래 10개 단어를 연습합니다. 준비되셨나요?</p>
              <p className="text-sm text-gray-500 mt-1">💡 단어를 클릭하면 뜻과 발음을 확인할 수 있어요!</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 max-h-[400px] overflow-y-auto">
              {words.map((word, index) => (
                <div 
                  key={word.id} 
                  className="p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all cursor-pointer group"
                  onClick={() => openModal(word)}
                >
                  <div className="text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-gray-800 group-hover:text-blue-700">
                        {word.word}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        {word.word.length}글자
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {word.definition || word.definitions?.[0]?.definition || '정의 없음'}
                    </div>
                    {word.partOfSpeech && word.partOfSpeech.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {word.partOfSpeech.slice(0, 2).map(pos => (
                          <span 
                            key={pos}
                            className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600"
                          >
                            {pos}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center gap-4">
              <Button size="lg" onClick={handleStartPractice}>
                <Keyboard className="h-5 w-5 mr-2" />
                시작할까요?
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => router.push('/unified-dashboard')}
              >
                돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : practiceComplete ? (
        <PracticeCompleteScreen
          results={results}
          accuracy={accuracy}
          avgTime={avgTime}
          avgHints={avgHints}
          correctCount={correctCount}
          totalWords={words.length}
          onRestart={handleRestartPractice}
          onGoToStudy={() => router.push('/unified-dashboard')}
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
      ) : currentWord && practiceStarted && !showPreview ? (
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
      
      {/* Word Detail Modal */}
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
        onSynonymClick={(synonymWord) => {
          // Find the word in the current words list
          const synonymWordData = words.find(w => w.word.toLowerCase() === synonymWord.toLowerCase())
          if (synonymWordData) {
            closeModal()
            setTimeout(() => {
              openModal(synonymWordData)
            }, 100)
          }
        }}
      />
    </div>
  )
}