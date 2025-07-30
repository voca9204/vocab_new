'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  ChevronLeft,
  Keyboard,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trophy,
  Zap
} from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import { getSelectedSources, filterWordsBySelectedSources } from '@/lib/settings/get-selected-sources'
import { createVocabularyQuery } from '@/lib/vocabulary/vocabulary-query-utils'

interface TypingResult {
  word: ExtractedVocabulary
  typed: string
  correct: boolean
  time: number
}

export default function TypingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [words, setWords] = useState<ExtractedVocabulary[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [typedWord, setTypedWord] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [results, setResults] = useState<TypingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [practiceComplete, setPracticeComplete] = useState(false)
  const [wordStartTime, setWordStartTime] = useState<Date | null>(null)
  const [practiceSize, setPracticeSize] = useState(20) // 기본 20단어
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      loadWords()
    }
  }, [user])

  useEffect(() => {
    // 새 단어가 시작될 때 입력 필드에 포커스
    if (!loading && !practiceComplete && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentWordIndex, loading, practiceComplete])

  const loadWords = async () => {
    if (!user) return

    try {
      // 사용자의 단어와 관리자가 업로드한 단어 모두 가져오기
      const q = createVocabularyQuery('extracted_vocabulary', user.uid)
      
      const snapshot = await getDocs(q)
      let wordsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        source: {
          ...doc.data().source,
          uploadedAt: doc.data().source?.uploadedAt?.toDate() || new Date()
        }
      })) as ExtractedVocabulary[]
      
      // Firestore에서 선택된 단어장 가져오기
      const selectedSources = await getSelectedSources(user.uid)
      wordsData = filterWordsBySelectedSources(wordsData, selectedSources)
      
      // 난이도가 낮은 단어부터 연습 (철자가 어려운 단어 우선)
      const practiceWords = wordsData
        .sort((a, b) => a.studyStatus.masteryLevel - b.studyStatus.masteryLevel)
        .slice(0, Math.min(practiceSize, wordsData.length))
      
      setWords(practiceWords)
      setWordStartTime(new Date())
    } catch (error) {
      console.error('Error loading words:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (showResult) return
    setTypedWord(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wordStartTime || showResult) return
    
    const currentWord = words[currentWordIndex]
    const timeSpent = (new Date().getTime() - wordStartTime.getTime()) / 1000
    const isCorrect = typedWord.trim().toLowerCase() === currentWord.word.toLowerCase()
    
    // 결과 저장
    setResults([...results, {
      word: currentWord,
      typed: typedWord,
      correct: isCorrect,
      time: timeSpent
    }])
    
    // 단어 숙련도 업데이트
    if (currentWord.id) {
      const wordRef = doc(db, 'extracted_vocabulary', currentWord.id)
      const increment = isCorrect ? 15 : -10 // 타이핑은 더 어려우므로 점수 높게
      const newMasteryLevel = Math.max(0, Math.min(100, 
        currentWord.studyStatus.masteryLevel + increment
      ))
      
      await updateDoc(wordRef, {
        'studyStatus.masteryLevel': newMasteryLevel,
        'studyStatus.typingCount': (currentWord.studyStatus.typingCount || 0) + 1,
        'studyStatus.lastStudied': Timestamp.now(),
        'studyStatus.studied': true,
        updatedAt: Timestamp.now()
      })
    }
    
    setShowResult(true)
  }

  const handleNextWord = () => {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1)
      setTypedWord('')
      setShowResult(false)
      setWordStartTime(new Date())
    } else {
      // 연습 완료
      setPracticeComplete(true)
    }
  }

  const restartPractice = () => {
    setCurrentWordIndex(0)
    setTypedWord('')
    setShowResult(false)
    setResults([])
    setPracticeComplete(false)
    setWordStartTime(new Date())
    loadWords()
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

  const currentWord = words[currentWordIndex]
  const correctCount = results.filter(r => r.correct).length
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0
  const avgTime = results.length > 0 
    ? (results.reduce((sum, r) => sum + r.time, 0) / results.length).toFixed(1)
    : '0'

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
          <h1 className="text-2xl font-bold">타이핑 연습</h1>
        </div>
      </div>

      {/* 통계 카드 */}
      {!practiceComplete && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">진행률</p>
                  <p className="text-2xl font-bold">
                    {currentWordIndex + 1}/{words.length}
                  </p>
                </div>
                <Keyboard className="h-8 w-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">정확도</p>
                  <p className="text-2xl font-bold text-green-600">{accuracy}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">평균 시간</p>
                  <p className="text-2xl font-bold">{avgTime}초</p>
                </div>
                <Zap className="h-8 w-8 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 연습 완료 화면 */}
      {practiceComplete ? (
        <Card>
          <CardHeader className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <CardTitle className="text-2xl">타이핑 연습 완료!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">정확도</p>
                  <p className="text-3xl font-bold text-blue-600">{accuracy}%</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">평균 시간</p>
                  <p className="text-3xl font-bold">{avgTime}초</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">완료 단어</p>
                  <p className="text-3xl font-bold">{correctCount}/{words.length}</p>
                </div>
              </div>
              
              {/* 틀린 단어 목록 */}
              {results.filter(r => !r.correct).length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">틀린 단어</h3>
                  <div className="space-y-2">
                    {results.filter(r => !r.correct).map((result, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded">
                        <div>
                          <span className="font-medium">{result.word.word}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            (입력: {result.typed || '(비어있음)'})
                          </span>
                        </div>
                        <span className="text-sm text-red-600">{result.time.toFixed(1)}초</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-4 mt-6">
                <Button className="flex-1" onClick={restartPractice}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  다시 연습
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => router.push('/study')}>
                  학습 메뉴로
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
          {/* 타이핑 카드 */}
          <Card className="mb-6">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <p className="text-gray-600 mb-4">다음 단어를 입력하세요:</p>
                <h2 className="text-xl font-semibold mb-2">{currentWord.definition}</h2>
                {currentWord.etymology && (
                  <p className="text-sm text-gray-500">{currentWord.etymology}</p>
                )}
                <div className="flex justify-center gap-2 mt-4">
                  {currentWord.partOfSpeech.map(pos => (
                    <span 
                      key={pos}
                      className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-700"
                    >
                      {pos}
                    </span>
                  ))}
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    ref={inputRef}
                    type="text"
                    value={typedWord}
                    onChange={handleInputChange}
                    placeholder="단어를 입력하세요"
                    className={`text-center text-2xl py-6 ${
                      showResult
                        ? typedWord.trim().toLowerCase() === currentWord.word.toLowerCase()
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : ''
                    }`}
                    disabled={showResult}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                </div>
                
                {showResult && (
                  <div className="text-center">
                    {typedWord.trim().toLowerCase() === currentWord.word.toLowerCase() ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span>정답입니다!</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                          <XCircle className="h-5 w-5" />
                          <span>틀렸습니다</span>
                        </div>
                        <p className="text-lg font-medium">정답: {currentWord.word}</p>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
          
          {/* 버튼 */}
          <div className="flex gap-4">
            {!showResult ? (
              <Button 
                className="flex-1" 
                onClick={handleSubmit}
                disabled={typedWord.trim().length === 0}
              >
                제출
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleNextWord}>
                {currentWordIndex < words.length - 1 ? '다음 단어' : '결과 보기'}
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}