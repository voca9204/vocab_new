'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/components/providers/auth-provider'
import { photoVocabularyService } from '@/lib/api/photo-vocabulary-service'
import type { PhotoVocabularyEntry, PhotoTestQuestion } from '@/types/photo-vocabulary'

interface TestResults {
  correct: number
  incorrect: number
  total: number
  wordsToReview: string[]
}

export default function PhotoTestPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter()
  const { user } = useAuth()
  const { sessionId } = use(params)
  
  const [loading, setLoading] = useState(true)
  const [words, setWords] = useState<PhotoVocabularyEntry[]>([])
  const [questions, setQuestions] = useState<PhotoTestQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [results, setResults] = useState<TestResults>({
    correct: 0,
    incorrect: 0,
    total: 0,
    wordsToReview: []
  })
  const [testComplete, setTestComplete] = useState(false)

  const generateQuestions = useCallback((words: PhotoVocabularyEntry[]): PhotoTestQuestion[] => {
    return words.map(word => {
      const questionType = Math.random() > 0.5 ? 'multiple-choice' : 'context'
      
      if (questionType === 'multiple-choice') {
        // Generate fake definitions for wrong answers
        const fakeDefinitions = [
          '일시적인, 임시의',
          '영구적인, 지속적인',
          '명확한, 분명한',
          '복잡한, 난해한'
        ].filter(def => def !== word.definition)
        
        const options = [
          word.definition || '정의 없음',
          ...fakeDefinitions.slice(0, 3)
        ].sort(() => Math.random() - 0.5)
        
        return {
          id: word.id,
          type: 'multiple-choice',
          question: `"${word.word}"의 뜻은?`,
          options,
          answer: word.definition || '정의 없음',
          wordId: word.id
        }
      } else {
        // Context-based question
        if (word.context) {
          const blankedContext = word.context.replace(
            new RegExp(word.word, 'gi'), 
            '_____'
          )
          
          // Generate similar words for options
          const options = [
            word.word,
            'example',
            'instance',
            'sample'
          ].sort(() => Math.random() - 0.5)
          
          return {
            id: word.id,
            type: 'context',
            question: `다음 문장의 빈칸에 들어갈 단어는?\n\n"${blankedContext}"`,
            options,
            answer: word.word,
            wordId: word.id,
            context: word.context
          }
        } else {
          // Fallback to multiple choice if no context
          return generateQuestions([word])[0]
        }
      }
    })
  }, [])

  const loadSessionWords = useCallback(async () => {
    try {
      const sessionWords = await photoVocabularyService.getSessionWords(sessionId, user?.uid)
      setWords(sessionWords)
      
      // Generate questions
      const generatedQuestions = generateQuestions(sessionWords)
      setQuestions(generatedQuestions)
      setResults(prev => ({ ...prev, total: generatedQuestions.length }))
    } catch {
      // Error loading session - will show empty state
    } finally {
      setLoading(false)
    }
  }, [sessionId, user?.uid, generateQuestions])

  useEffect(() => {
    if (user && sessionId) {
      loadSessionWords()
    }
  }, [user, sessionId, loadSessionWords])

  const handleAnswer = async () => {
    const currentQuestion = questions[currentIndex]
    const correct = selectedAnswer === currentQuestion.answer
    
    setIsCorrect(correct)
    setShowResult(true)
    
    // Update results
    if (correct) {
      setResults(prev => ({ ...prev, correct: prev.correct + 1 }))
      await photoVocabularyService.updateWordTestResult(currentQuestion.wordId, true)
    } else {
      setResults(prev => ({
        ...prev,
        incorrect: prev.incorrect + 1,
        wordsToReview: [...prev.wordsToReview, currentQuestion.wordId]
      }))
      await photoVocabularyService.updateWordTestResult(currentQuestion.wordId, false)
    }
  }

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer('')
      setShowResult(false)
    } else {
      setTestComplete(true)
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
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">테스트 준비 중...</p>
        </div>
      </div>
    )
  }

  // Handle case where no words were extracted or no questions were generated
  if (words.length === 0 || questions.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/study/photo-vocab')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">사진 단어 테스트</h1>
        </div>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="space-y-4">
              <p className="text-gray-600">
                테스트할 단어가 없습니다.
              </p>
              <p className="text-sm text-gray-500">
                사진에서 단어를 추출하지 못했거나 세션이 만료되었을 수 있습니다.
              </p>
              <Button onClick={() => router.push('/study/photo-vocab')}>
                새 사진 업로드하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (testComplete) {
    const percentage = Math.round((results.correct / results.total) * 100)
    
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">테스트 완료!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">
                {percentage}%
              </div>
              <p className="text-gray-600">
                {results.total}문제 중 {results.correct}개 정답
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">정답</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {results.correct}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-500" />
                    <span className="font-semibold">오답</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {results.incorrect}
                  </p>
                </CardContent>
              </Card>
            </div>

            {results.wordsToReview.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {results.wordsToReview.length}개의 단어를 다시 복습하세요.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/study/photo-vocab')}
              >
                새 사진 업로드
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push('/study')}
              >
                학습 메뉴로
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/study/photo-vocab')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">사진 단어 테스트</h1>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>문제 {currentIndex + 1} / {questions.length}</span>
          <span>{Math.round(progress)}% 완료</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {currentQuestion.question}
              </h3>
              
              {currentQuestion.options && (
                <RadioGroup
                  value={selectedAnswer}
                  onValueChange={setSelectedAnswer}
                  disabled={showResult}
                >
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center space-x-2 p-3 rounded-lg border ${
                          showResult && option === currentQuestion.answer
                            ? 'border-green-500 bg-green-50'
                            : showResult && option === selectedAnswer && !isCorrect
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label 
                          htmlFor={`option-${index}`}
                          className="flex-1 cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>

            {showResult && (
              <div className={`p-4 rounded-lg ${
                isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <p className="font-semibold">
                  {isCorrect ? '정답입니다!' : '틀렸습니다.'}
                </p>
                {!isCorrect && (
                  <p className="text-sm mt-1">
                    정답: {currentQuestion.answer}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!showResult ? (
                <Button
                  className="flex-1"
                  onClick={handleAnswer}
                  disabled={!selectedAnswer}
                >
                  답변 확인
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={nextQuestion}
                >
                  {currentIndex < questions.length - 1 ? '다음 문제' : '결과 보기'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}