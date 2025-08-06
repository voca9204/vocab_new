'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useSettings, getTextSizeClass } from '@/components/providers/settings-provider'
import { Button } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ChevronLeft,
  Brain,
  CheckCircle,
  XCircle,
  Target,
  Trophy,
  Clock,
  RotateCcw,
  Volume2,
  Sparkles
} from 'lucide-react'
import { vocabularyService } from '@/lib/api'
import { photoVocabularyCollectionService } from '@/lib/api/photo-vocabulary-collection-service'
import type { VocabularyWord } from '@/types'
import type { Word } from '@/types/vocabulary-v2'
import type { PhotoVocabularyWord } from '@/types/photo-vocabulary-collection'
import { cn } from '@/lib/utils'

interface QuizQuestion {
  word: VocabularyWord
  options: string[]
  optionWords: VocabularyWord[] // 각 선택지에 해당하는 단어 정보
  correctAnswer: number
}

interface QuizResult {
  questionIndex: number
  correct: boolean
  selectedAnswer: number
}

export default function QuizPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { textSize } = useSettings()
  
  // Check if we're loading from photo collection
  const source = searchParams.get('source')
  const collectionId = searchParams.get('collectionId')
  const isPhotoCollection = source === 'photo-collection' && collectionId
  
  const [words, setWords] = useState<VocabularyWord[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [results, setResults] = useState<QuizResult[]>([])
  const [loading, setLoading] = useState(true)
  const [quizComplete, setQuizComplete] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [quizSize, setQuizSize] = useState(10) // 기본 10문제
  const [pronunciations, setPronunciations] = useState<Record<string, string>>({}) // 단어별 발음 캐시
  const [generatingExamples, setGeneratingExamples] = useState(false)
  const [translations, setTranslations] = useState<{ [key: number]: string }>({})
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      loadWords()
    }
  }, [user])

  const loadWords = async () => {
    if (!user) return

    try {
      let wordsForQuiz: VocabularyWord[] = []
      
      if (isPhotoCollection && collectionId) {
        // Load photo collection words
        console.log('Loading photo collection words for quiz:', collectionId)
        const photoWords = await photoVocabularyCollectionService.getCollectionWords(collectionId)
        
        // Convert photo words to vocabulary words format
        wordsForQuiz = photoWords.map(pw => ({
          id: pw.id,
          word: pw.word,
          definition: pw.definition || pw.context || '',  // Use context as fallback for older data
          definitions: (pw.definition || pw.context) ? [{ 
            id: 'def-0',
            definition: pw.definition || pw.context || '', 
            examples: pw.examples || [],
            source: 'manual' as const,
            language: 'ko' as const,
            createdAt: pw.createdAt || new Date()
          }] : [],
          pronunciation: pw.pronunciation,
          difficulty: pw.difficulty || 5,
          frequency: pw.frequency || 50,
          isSAT: true,
          partOfSpeech: [],
          etymology: null,
          examples: [],
          synonyms: [],
          learningMetadata: {
            timesStudied: pw.studyStatus.reviewCount || 0,
            lastStudied: pw.studyStatus.lastStudiedAt,
            confidence: pw.studyStatus.masteryLevel / 100,
            source: 'photo-collection'
          }
        } as VocabularyWord))
        
        console.log(`Loaded ${wordsForQuiz.length} photo words for quiz`)
      } else {
        // Load regular vocabulary words
        console.log('Loading words for quiz using new vocabulary service')
        const { words: allWords } = await vocabularyService.getAll(undefined, 2000, user.uid)
        
        // 학습하지 않은 단어들을 우선적으로 선택
        const notStudiedWords = allWords.filter(w => (w.learningMetadata?.timesStudied || 0) === 0)
        wordsForQuiz = notStudiedWords.length >= 20 ? notStudiedWords : allWords
      }
      
      // 단어 로드 확인
      if (wordsForQuiz.length > 0) {
        console.log(`[loadWords] Successfully loaded ${wordsForQuiz.length} words`)
        const firstWord = wordsForQuiz[0]
        console.log(`[loadWords] Sample word: ${firstWord.word} - ${firstWord.definitions?.[0]?.definition || firstWord.definitions?.[0]?.text || 'No definition'}`)
      } else {
        console.warn('[loadWords] No words loaded')
      }
      
      setWords(wordsForQuiz)
      
      // 퀴즈 문제 생성
      generateQuiz(wordsForQuiz)
    } catch (error) {
      console.error('Error loading words:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQuiz = (allWords: VocabularyWord[]) => {
    if (allWords.length < 4) {
      alert('퀴즈를 만들기 위해서는 최소 4개 이상의 단어가 필요합니다.')
      return
    }

    // 랜덤하게 단어 선택
    const shuffled = [...allWords].sort(() => Math.random() - 0.5)
    const quizWords = shuffled.slice(0, Math.min(quizSize, allWords.length))
    
    // 각 단어에 대해 문제 생성
    const newQuestions: QuizQuestion[] = quizWords.map(word => {
      // 정답 포함 4개 선택지 만들기
      const otherWords = allWords.filter(w => w.id !== word.id)
      const randomOptionWords = otherWords
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
      
      // 선택지 단어 배열 만들고 섞기
      const allOptionWords = [word, ...randomOptionWords]
      const shuffledOptionWords = allOptionWords.sort(() => Math.random() - 0.5)
      const correctIndex = shuffledOptionWords.findIndex(w => w.id === word.id)
      
      // 각 선택지의 정의 생성
      const options = shuffledOptionWords.map((w) => {
        return w.definitions?.[0]?.definition || w.definitions?.[0]?.text || w.definition || '정의 없음'
      })
      
      return {
        word,
        options,
        optionWords: shuffledOptionWords,
        correctAnswer: correctIndex
      }
    })
    
    setQuestions(newQuestions)
    setStartTime(new Date())
    
    // 발음이 없는 단어들의 발음 정보 가져오기
    fetchPronunciations(quizWords)
  }

  const fetchPronunciations = async (words: VocabularyWord[]) => {
    const wordsNeedPronunciation = words.filter(w => !w.pronunciation && w.id)
    if (wordsNeedPronunciation.length === 0) return
    
    // 한 번에 처리할 단어 수 제한 (5개씩)
    const batchSize = 5
    const wordsToProcess = wordsNeedPronunciation.slice(0, batchSize)
    
    // 배치 업데이트는 새 서비스로 처리 예정
    const pronunciationUpdates: Record<string, string> = {}
    
    for (let i = 0; i < wordsToProcess.length; i++) {
      const word = wordsToProcess[i]
      
      // API 요청 사이에 지연 추가 (첫 번째 요청은 지연 없음)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500)) // 500ms 지연
      }
      
      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.word)}`)
        if (response.ok) {
          const data = await response.json()
          const phonetic = data[0]?.phonetic || 
                          data[0]?.phonetics?.[0]?.text ||
                          data[0]?.phonetics?.find((p: any) => p.text)?.text
                          
          if (phonetic && word.id) {
            // 메모리에 캐싱
            pronunciationUpdates[word.word] = phonetic
            
            // 호환성 레이어는 읽기 전용이므로 DB 업데이트 생략
            // 나중에 새 서비스로 처리할 예정
          }
        }
      } catch (error) {
        // 에러는 무시하고 계속 진행 (콘솔에만 기록)
        console.log(`Skipping pronunciation for ${word.word}`)
      }
    }
    
    // 상태 업데이트
    if (Object.keys(pronunciationUpdates).length > 0) {
      setPronunciations(prev => ({
        ...prev,
        ...pronunciationUpdates
      }))
      
      // 새 서비스로 처리 예정
      console.log(`Fetched pronunciation for ${Object.keys(pronunciationUpdates).length} words`)
    }
  }

  const handleAnswerSelect = (optionIndex: number) => {
    if (showResult) return
    setSelectedAnswer(optionIndex)
  }

  const generateExampleForWord = async (wordId: string) => {
    if (!user || !wordId) return
    
    setGeneratingExamples(true)
    
    try {
      const response = await fetch('/api/generate-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          wordIds: [wordId],
          singleWord: true
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Generate examples API response:', result)
        if (result.updated > 0) {
          // 현재 퀴즈 단어들 다시 로드
          const updatedWords = await reloadWords()
          console.log('Reloaded words:', updatedWords.length)
          console.log('Looking for word ID:', wordId)
          console.log('Updated word IDs:', updatedWords.map(w => w.id))
          
          const currentQuestion = questions[currentQuestionIndex]
          const updatedWord = updatedWords.find(w => w.id === wordId)
          
          if (updatedWord) {
            console.log('Updated word found:', updatedWord)
            console.log('Updated word definitions:', updatedWord.definitions)
            
            // 예문이 definitions 안에 있는지 확인
            const hasExamples = updatedWord.definitions?.some(def => 
              def.examples && def.examples.length > 0
            )
            console.log('Has examples:', hasExamples)
            
            if (hasExamples) {
              // 현재 문제의 단어 업데이트
              const newQuestions = [...questions]
              newQuestions[currentQuestionIndex] = {
                ...currentQuestion,
                word: updatedWord
              }
              setQuestions(newQuestions)
              console.log('Questions updated with new word data')
            }
          } else {
            console.log('Updated word not found in reloaded words')
          }
        }
      }
    } catch (error) {
      console.error('Error generating example:', error)
    } finally {
      setGeneratingExamples(false)
    }
  }

  const reloadWords = async () => {
    if (!user) return []
    
    // 현재 퀴즈에 있는 단어들의 ID 목록
    const currentWordIds = questions.map(q => q.word.id).filter(id => id) as string[]
    
    if (currentWordIds.length === 0) {
      return []
    }
    
    // WordService를 사용하여 최신 단어 데이터 가져오기
    const { WordService } = await import('@/lib/vocabulary-v2/word-service')
    const wordService = new WordService()
    
    try {
      // 각 단어의 최신 데이터를 개별적으로 가져오기
      const updatedWords = await Promise.all(
        currentWordIds.map(async (wordId) => {
          const word = await wordService.getWordById(wordId)
          return word
        })
      )
      
      // null 제거하고 VocabularyWord 형식으로 변환
      const validWords = updatedWords.filter(w => w !== null) as Word[]
      
      // Word 타입을 VocabularyWord 타입으로 변환
      return validWords.map(word => ({
        id: word.id,
        word: word.word,
        definitions: word.definitions,
        examples: word.definitions[0]?.examples || [],
        partOfSpeech: word.partOfSpeech,
        pronunciation: word.pronunciation,
        etymology: word.etymology,
        difficulty: word.difficulty,
        frequency: word.frequency,
        learningMetadata: word.learningMetadata,
        source: word.source,
        createdAt: word.createdAt,
        updatedAt: word.updatedAt
      })) as VocabularyWord[]
    } catch (error) {
      console.error('Error reloading words:', error)
      // 실패 시 기존 방식으로 fallback
      const { words } = await vocabularyService.getAll(undefined, 2000, user.uid)
      return words
    }
  }

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null) return
    
    const currentQuestion = questions[currentQuestionIndex]
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    
    // 결과 저장
    setResults([...results, {
      questionIndex: currentQuestionIndex,
      correct: isCorrect,
      selectedAnswer
    }])
    
    // 단어 숙련도 업데이트
    if (currentQuestion.word.id) {
      const increment = isCorrect ? 10 : -5 // 백분율로 변경
      const currentMastery = currentQuestion.word.learningMetadata?.masteryLevel || 0
      const newMasteryLevel = Math.max(0, Math.min(100, currentMastery + increment))
      
      try {
        // vocabularyService의 updateStudyProgress 메서드 호출
        await vocabularyService.updateStudyProgress(
          currentQuestion.word.id,
          'quiz',
          isCorrect,
          increment
        )
        console.log('Quiz progress updated:', currentQuestion.word.word, isCorrect, newMasteryLevel)
      } catch (error) {
        console.error('Failed to update quiz progress:', error)
      }
    }
    
    setShowResult(true)
    
    // 예문이 없으면 자동으로 생성
    const hasExamples = currentQuestion.word.definitions?.some(def => 
      def.examples && def.examples.length > 0
    )
    if (!hasExamples && currentQuestion.word.id) {
      setTimeout(() => generateExampleForWord(currentQuestion.word.id!), 500)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowResult(false)
      setTranslations({})
      setTranslatingIndex(null)
    } else {
      // 퀴즈 완료
      setQuizComplete(true)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setResults([])
    setQuizComplete(false)
    generateQuiz(words)
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

  const currentQuestion = questions[currentQuestionIndex]
  const correctCount = results.filter(r => r.correct).length
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0
  const timeElapsed = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : 0

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
          <h1 className="text-2xl font-bold">퀴즈 모드</h1>
        </div>
        {!quizComplete && questions.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}</span>
          </div>
        )}
      </div>

      {/* 진행률 표시 */}
      {!quizComplete && questions.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>문제 {currentQuestionIndex + 1} / {questions.length}</span>
            <span>{accuracy}% 정답률</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 퀴즈 완료 화면 */}
      {quizComplete ? (
        <Card>
          <CardHeader className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <CardTitle className="text-2xl">퀴즈 완료!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">정답률</p>
                  <p className="text-3xl font-bold text-blue-600">{accuracy}%</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">소요 시간</p>
                  <p className="text-3xl font-bold">
                    {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
              
              <div className="pt-4">
                <p className="text-center text-gray-600 mb-4">
                  {questions.length}문제 중 {correctCount}문제 정답
                </p>
                
                {/* 문제별 결과 */}
                <div className="grid grid-cols-10 gap-1 mb-6">
                  {results.map((result, idx) => (
                    <div
                      key={idx}
                      className={`h-8 w-8 rounded flex items-center justify-center text-xs font-medium ${
                        result.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {idx + 1}
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-4">
                  <Button className="flex-1" onClick={restartQuiz}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    다시 풀기
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => router.push('/study')}>
                    학습 메뉴로
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">퀴즈를 시작할 수 없습니다.</p>
            <p className="text-sm text-gray-500 mt-2">
              {words.length === 0 
                ? '로드된 단어가 없습니다. 단어장 설정을 확인해주세요.'
                : '단어가 충분하지 않거나 선택된 단어장이 없습니다.'
              }
            </p>
            <div className="mt-4 space-y-2">
              <Button 
                variant="outline" 
                onClick={() => router.push('/settings')}
              >
                단어장 설정하기
              </Button>
              <br />
              <Button 
                variant="ghost" 
                onClick={() => window.location.reload()}
              >
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : currentQuestion ? (
        <>
          {/* 문제 카드 */}
          <Card className="mb-6">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <h2 className="text-3xl font-bold">{currentQuestion.word.word}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speakWord(currentQuestion.word.word)}
                    className="p-2"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {(currentQuestion.word.pronunciation || pronunciations[currentQuestion.word.word]) && (
                  <p className="text-lg text-gray-600 mb-3">
                    [{currentQuestion.word.pronunciation || pronunciations[currentQuestion.word.word]}]
                  </p>
                )}
                
                <div className="flex justify-center gap-2">
                  {currentQuestion.word.partOfSpeech.map(pos => (
                    <span 
                      key={pos}
                      className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-700"
                    >
                      {pos}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(idx)}
                    disabled={showResult}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      selectedAnswer === idx
                        ? showResult
                          ? idx === currentQuestion.correctAnswer
                            ? 'border-green-500 bg-green-50'
                            : 'border-red-500 bg-red-50'
                          : 'border-blue-500 bg-blue-50'
                        : showResult && idx === currentQuestion.correctAnswer
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option}</span>
                        {showResult && (
                          <>
                            {idx === currentQuestion.correctAnswer && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                            {selectedAnswer === idx && idx !== currentQuestion.correctAnswer && (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </>
                        )}
                      </div>
                      {showResult && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold text-gray-700">
                            {currentQuestion.optionWords[idx].word}
                          </span>
                          {currentQuestion.optionWords[idx].pronunciation && (
                            <span className="text-sm text-gray-500">
                              [{currentQuestion.optionWords[idx].pronunciation}]
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {showResult && (
                <div className="space-y-4 mt-6">
                  {currentQuestion.word.etymology?.origin && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-semibold text-blue-800 mb-1">영어 정의:</p>
                      <p className={cn("text-blue-700", getTextSizeClass(textSize))}>{currentQuestion.word.etymology.origin}</p>
                    </div>
                  )}
                  
                  {currentQuestion.word.definitions?.[0]?.examples && currentQuestion.word.definitions[0].examples.length > 0 ? (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-semibold text-green-800 mb-2">예문:</p>
                      <div className="space-y-3">
                        {currentQuestion.word.definitions[0].examples.slice(0, 2).map((example, idx) => (
                          <div key={idx}>
                            <div className="flex gap-2">
                              <span className="text-green-700 mt-0.5">•</span>
                              <div className="flex-1">
                                <div>
                                  <p className={cn("text-green-700 inline", getTextSizeClass(textSize))}>
                                    {example}
                                  </p>
                                  <span className="inline-flex items-center gap-1 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => speakWord(example)}
                                      className="p-1 h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100 inline-flex"
                                      title="예문 듣기"
                                    >
                                      <Volume2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
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
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      {generatingExamples ? (
                        <p className="text-sm text-blue-600 flex items-center justify-center gap-1">
                          <Sparkles className="h-4 w-4 animate-pulse" />
                          AI가 예문을 생성하고 있습니다...
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">예문이 자동으로 생성됩니다</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* 버튼 */}
          <div className="flex gap-4">
            {!showResult ? (
              <Button 
                className="flex-1" 
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
              >
                답안 제출
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleNextQuestion}>
                {currentQuestionIndex < questions.length - 1 ? '다음 문제' : '결과 보기'}
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}