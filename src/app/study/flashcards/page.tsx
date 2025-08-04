'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useSettings, getTextSizeClass } from '@/components/providers/settings-provider'
import { Button } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { 
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Check,
  X,
  Eye,
  EyeOff,
  Shuffle,
  Volume2,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { vocabularyService } from '@/lib/api'
import type { Word } from '@/types/vocabulary-v2'
import { cn } from '@/lib/utils'
// Firebase imports 제거 - 새 서비스 사용

export default function FlashcardsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { textSize } = useSettings()
  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(() => {
    // localStorage에서 마지막 학습 위치 가져오기
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flashcard-progress')
      const savedIndex = saved ? parseInt(saved, 10) : 0
      return savedIndex
    }
    return 0
  })
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [studyMode, setStudyMode] = useState<'all' | 'not-studied'>('not-studied')
  const [isShuffled, setIsShuffled] = useState(false)
  const [pronunciations, setPronunciations] = useState<Record<string, string>>({})
  const [generatingExamples, setGeneratingExamples] = useState(false)
  const [generatingEtymology, setGeneratingEtymology] = useState(false)
  const [showEtymology, setShowEtymology] = useState(false)
  const [translations, setTranslations] = useState<{ [key: number]: string }>({})
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      loadWords()
    }
  }, [user, studyMode])

  // 현재 인덱스를 localStorage에 저장
  useEffect(() => {
    if (typeof window !== 'undefined' && words.length > 0) {
      // 유효한 범위 내의 인덱스만 저장
      const validIndex = Math.min(currentIndex, words.length - 1)
      localStorage.setItem('flashcard-progress', validIndex.toString())
    }
  }, [currentIndex, words.length])

  // 카드가 바뀔 때 상태 초기화
  useEffect(() => {
    setShowEtymology(false)
    setTranslations({})
    setTranslatingIndex(null)
  }, [currentIndex])

  // 현재 단어가 변경될 때마다 예문 및 어원 확인 및 생성
  useEffect(() => {
    const currentWord = words[currentIndex]
    if (currentWord && showAnswer) {
      // 예문 생성 (한 번만 시도)
      const hasExamples = currentWord.definitions?.some(def => def.examples?.length > 0)
      if (!hasExamples && !generatingExamples) {
        generateExampleForCurrentWord()
      }
      // 어원 생성 (한 번만 시도)
      if (!currentWord.realEtymology && !generatingEtymology) {
        generateEtymologyForCurrentWord()
      }
    }
  }, [currentIndex, showAnswer]) // generatingExamples, generatingEtymology 제거

  const loadWords = async () => {
    if (!user) return

    try {
      // 새 호환성 레이어를 사용하여 사용자 선택 단어장의 단어 가져오기
      const { words: allWords } = await vocabularyService.getAll(undefined, 2000, user.uid)
      
      // 발음 정보 로드됨
      
      // 학습 모드에 따라 필터링
      let wordsData = allWords
      if (studyMode === 'not-studied') {
        // Word 타입에는 learningMetadata가 없으므로 필터링 비활성화
        wordsData = allWords
      }
      
      // 알파벳순으로 정렬
      wordsData.sort((a, b) => a.word.localeCompare(b.word))
      
      setWords(wordsData as any)
      
      // localStorage에서 저장된 진행 상황 복원
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('flashcard-progress')
        const savedIndex = saved ? parseInt(saved, 10) : 0
        // 유효한 범위 내의 인덱스로 설정
        const validIndex = Math.min(savedIndex, wordsData.length - 1)
        setCurrentIndex(Math.max(0, validIndex))
      } else {
        setCurrentIndex(0)
      }
      
      // 발음 정보 가져오기
      fetchPronunciations(wordsData)
    } catch (error) {
      console.error('Error loading words:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPronunciations = async (words: any[]) => {
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
    
    // 한 번에 처리할 단어 수 제한 (5개씩)
    const batchSize = 5
    const wordsToProcess = wordsNeedPronunciation.slice(0, batchSize)
    
    // 발음 정보를 임시로 저장
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
            
            // TODO: 새 서비스의 words 컬렉션에 발음 정보 업데이트
            // 현재는 호환성 레이어가 읽기 전용이므로 DB 업데이트 생략
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
      
      // TODO: 새 서비스로 발음 정보 업데이트
      // 현재는 메모리 캐싱만 수행
      console.log(`Cached pronunciation for ${Object.keys(pronunciationUpdates).length} words`)
    }
    
    // 처리하지 못한 단어가 있으면 안내
    if (wordsNeedPronunciation.length > batchSize) {
      console.log(`${wordsNeedPronunciation.length - batchSize} words need pronunciation update. Use settings page to update all.`)
    }
  }

  const shuffleWords = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5)
    setWords(shuffled)
    setCurrentIndex(0)
    setShowAnswer(false)
    setIsShuffled(true)
    // 셔플 시 진행 상황 초기화
    if (typeof window !== 'undefined') {
      localStorage.setItem('flashcard-progress', '0')
    }
  }

  const generateExampleForCurrentWord = async () => {
    const currentWord = words[currentIndex]
    const hasExamples = currentWord?.examples && currentWord.examples.length > 0
    if (!currentWord || !currentWord.id || hasExamples || generatingExamples) {
      return
    }
    
    console.log(`Generating examples for: ${currentWord.word}`)
    setGeneratingExamples(true)
    
    try {
      const response = await fetch('/api/generate-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          wordIds: [currentWord.id],
          singleWord: true
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`Examples generated:`, result)
        
        if (result.updated > 0) {
          // 새 DB 구조에서 예문 업데이트 구현
          // API가 성공적으로 예문을 생성했으므로, 단어를 다시 로드
          if (result.updated > 0 && currentWord.id) {
            // 짧은 지연 후 현재 단어 다시 가져오기 (DB 업데이트 대기)
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            console.log('Fetching updated word with ID:', currentWord.id)
            const updatedWord = await vocabularyService.getById(currentWord.id)
            console.log('Updated word:', updatedWord)
            if (updatedWord) {
              console.log('Updated word examples:', updatedWord.examples)
              const newWords = [...words]
              newWords[currentIndex] = updatedWord as any
              setWords([...newWords]) // Create new array to trigger re-render
              console.log('UI updated with new examples')
            } else {
              console.error('Failed to fetch updated word')
            }
          }
        }
      } else {
        const error = await response.json()
        console.error('API error:', error)
      }
    } catch (error) {
      console.error('Error generating example:', error)
    } finally {
      setGeneratingExamples(false)
    }
  }

  const generateEtymologyForCurrentWord = async () => {
    const currentWord = words[currentIndex]
    // Check both etymology.meaning and realEtymology
    const hasRealEtymology = currentWord.realEtymology
    if (!currentWord || !currentWord.id || hasRealEtymology || generatingEtymology) {
      return
    }
    
    console.log(`Generating etymology for: ${currentWord.word}`)
    setGeneratingEtymology(true)
    
    try {
      const response = await fetch('/api/generate-etymology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          wordIds: [currentWord.id],
          singleWord: true
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`Etymology generated:`, result)
        
        if (result.updated > 0) {
          // 새 DB 구조에서 어원 업데이트 구현
          // API가 성공적으로 어원을 생성했으므로, 단어를 다시 로드
          if (result.updated > 0 && currentWord.id) {
            // 짧은 지연 후 현재 단어 다시 가져오기
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            const updatedWord = await vocabularyService.getById(currentWord.id)
            if (updatedWord) {
              const newWords = [...words]
              newWords[currentIndex] = updatedWord as any
              setWords([...newWords]) // Create new array to trigger re-render
              console.log('UI updated with new etymology')
            }
          }
        }
      } else {
        const error = await response.json()
        console.error('API error:', error)
      }
    } catch (error) {
      console.error('Error generating etymology:', error)
    } finally {
      setGeneratingEtymology(false)
    }
  }

  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowAnswer(false)
    }
  }

  const prevWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setShowAnswer(false)
    }
  }

  const markAsStudied = async (mastered: boolean) => {
    const currentWord = words[currentIndex]
    if (!currentWord || !currentWord.id) return

    // 먼저 UI 업데이트 (즉시 반응)
    const updatedWords = [...words]
    // Word 타입에는 learningMetadata가 없으므로 제거
    updatedWords[currentIndex] = {
      ...currentWord
    } as any
    setWords(updatedWords)

    // 다음 단어로 즉시 이동 (마지막 단어가 아닌 경우만)
    if (currentIndex < words.length - 1) {
      nextWord()
    } else {
      // 마지막 단어인 경우 답 숨기기만 함
      setShowAnswer(false)
    }

    // DB 업데이트는 백그라운드에서 처리 (await 없이)
    const increment = mastered ? 20 : 5 // 알고 있음: +20, 모름: +5
    vocabularyService.updateStudyProgress(
      currentWord.id,
      'flashcard',
      mastered,
      increment
    ).then(() => {
      console.log('Flashcard progress updated:', currentWord.word, mastered)
    }).catch((error) => {
      console.error('Error updating word:', error)
    })
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

  const currentWord = words[currentIndex]
  const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0

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

  if (words.length === 0) {
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
        </div>
        <div className="text-center py-16">
          <p className="text-gray-600 mb-4">
            {studyMode === 'not-studied' 
              ? '학습할 새로운 단어가 없습니다.' 
              : '단어가 없습니다.'}
          </p>
          <Button 
            onClick={() => setStudyMode(studyMode === 'all' ? 'not-studied' : 'all')}
          >
            {studyMode === 'all' ? '미학습 단어만 보기' : '모든 단어 보기'}
          </Button>
        </div>
      </div>
    )
  }

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
          <h1 className="text-2xl font-bold">플래시카드</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={shuffleWords}
          >
            <Shuffle className="h-4 w-4 mr-1" />
            섞기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStudyMode(studyMode === 'all' ? 'not-studied' : 'all')}
          >
            {studyMode === 'all' ? '미학습만' : '전체'}
          </Button>
        </div>
      </div>

      {/* 진행률 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{currentIndex + 1} / {words.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 플래시카드 */}
      <Card className="mb-6">
        <div 
          className="p-8 md:p-12 min-h-[400px] flex flex-col items-center justify-center cursor-pointer"
          onClick={() => setShowAnswer(!showAnswer)}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-bold">
                {currentWord.word}
              </h2>
              {currentWord.partOfSpeech.map(pos => (
                <span 
                  key={pos}
                  className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-700"
                >
                  {pos}
                </span>
              ))}
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
              <p className="text-lg text-gray-600 mb-6">
                [{currentWord.pronunciation || pronunciations[currentWord.word]}]
              </p>
            )}

            {showAnswer ? (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xl text-gray-800 font-medium">{
                  'definition' in currentWord 
                    ? currentWord.definition 
                    : currentWord.definitions && currentWord.definitions.length > 0
                      ? currentWord.definitions[0]?.definition || currentWord.definitions[0]?.text || 'Definition not available'
                      : 'Definition not available'
                }</p>
                
                <div className="space-y-4 mt-6">
                  {/* 영어 설명 표시 */}
                  {currentWord.etymology && (
                    <div className="p-4 bg-yellow-50 rounded-lg text-left max-w-xl mx-auto">
                      <p className="text-sm font-semibold text-yellow-800 mb-1">영어 설명:</p>
                      <p className={cn("text-yellow-700", getTextSizeClass(textSize))}>
                        {typeof currentWord.etymology === 'string' 
                          ? currentWord.etymology 
                          : currentWord.etymology.origin || currentWord.etymology.meaning || ''}
                      </p>
                    </div>
                  )}
                  
                  {/* 어원 - 클릭하면 표시 */}
                  <div className="border border-purple-200 rounded-lg overflow-hidden max-w-xl mx-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowEtymology(!showEtymology)
                      }}
                      className="w-full p-4 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center justify-between text-left"
                    >
                      <h3 className="font-semibold text-purple-800">어원</h3>
                      {showEtymology ? (
                        <ChevronUp className="h-4 w-4 text-purple-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-purple-600" />
                      )}
                    </button>
                    {showEtymology && (
                      <div className="p-4 bg-white border-t border-purple-200">
                        {currentWord.realEtymology && currentWord.realEtymology.trim() ? (
                          <p className={cn("text-purple-700", getTextSizeClass(textSize))}>
                            {currentWord.realEtymology.trim()}
                          </p>
                        ) : generatingEtymology ? (
                          <p className="text-sm text-purple-600 flex items-center gap-1">
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            AI가 어원을 분석하고 있습니다...
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">어원 정보가 없습니다</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {currentWord.examples && currentWord.examples.length > 0 && (
                    <div className="p-4 bg-green-50 rounded-lg text-left max-w-xl mx-auto">
                      <p className="text-sm font-semibold text-green-800 mb-2">예문:</p>
                      <div className="space-y-3">
                        {currentWord.examples.slice(0, 2).map((example: string, idx: number) => (
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
                  
                  {(!currentWord.examples || currentWord.examples.length === 0) && (
                    <div className="p-4 bg-gray-50 rounded-lg text-center max-w-xl mx-auto">
                      <p className="text-sm text-blue-600 flex items-center justify-center gap-1">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        AI가 예문을 생성하고 있습니다...
                      </p>
                    </div>
                  )}
                  
                  {/* 어원이 없고 영어 설명만 있는 경우 AI 생성 표시 */}
                  {!currentWord.realEtymology && currentWord.etymology && (
                    <div className="p-4 bg-gray-50 rounded-lg text-center max-w-xl mx-auto">
                      <p className="text-sm text-purple-600 flex items-center justify-center gap-1">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        AI가 어원을 분석하고 있습니다...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-400">
                <EyeOff className="h-8 w-8 mx-auto mb-2" />
                <p>클릭하여 답 보기</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 컨트롤 버튼 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 flex-1">
          <Button
            variant="outline"
            onClick={prevWord}
            disabled={currentIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            이전
          </Button>
          <Button
            variant="outline"
            onClick={nextWord}
            disabled={currentIndex === words.length - 1}
            className="flex-1"
          >
            다음
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {showAnswer && (
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              onClick={() => markAsStudied(false)}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-1 text-red-600" />
              어려움
            </Button>
            <Button
              onClick={() => markAsStudied(true)}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-1 text-green-600" />
              쉬움
            </Button>
          </div>
        )}
      </div>

      {/* 현재 단어 정보 */}
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>난이도: Level {currentWord.difficulty}</p>
      </div>
    </div>
  )
}