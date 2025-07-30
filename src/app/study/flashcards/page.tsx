'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
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
  Sparkles
} from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, writeBatch } from 'firebase/firestore'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import { getSelectedSources, filterWordsBySelectedSources } from '@/lib/settings/get-selected-sources'
import { createVocabularyQuery } from '@/lib/vocabulary/vocabulary-query-utils'

export default function FlashcardsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [words, setWords] = useState<ExtractedVocabulary[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [studyMode, setStudyMode] = useState<'all' | 'not-studied'>('not-studied')
  const [isShuffled, setIsShuffled] = useState(false)
  const [pronunciations, setPronunciations] = useState<Record<string, string>>({})
  const [generatingExamples, setGeneratingExamples] = useState(false)
  const [generatingEtymology, setGeneratingEtymology] = useState(false)

  useEffect(() => {
    if (user) {
      loadWords()
    }
  }, [user, studyMode])

  // 현재 단어가 변경될 때마다 예문 및 어원 확인 및 생성
  useEffect(() => {
    const currentWord = words[currentIndex]
    if (currentWord && showAnswer) {
      // 예문 먼저 생성하고, 완료되면 어원 생성
      if (!currentWord.examples?.length && !generatingExamples) {
        generateExampleForCurrentWord()
      } else if (currentWord.examples?.length > 0 && !currentWord.realEtymology && !generatingEtymology) {
        generateEtymologyForCurrentWord()
      }
    }
  }, [currentIndex, showAnswer, generatingExamples, generatingEtymology])

  const loadWords = async () => {
    if (!user) return

    try {
      // 사용자의 단어와 관리자가 업로드한 단어 모두 가져오기
      let q = createVocabularyQuery('extracted_vocabulary', user.uid)
      
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
      
      // 선택된 단어장으로 필터링
      wordsData = filterWordsBySelectedSources(wordsData, selectedSources)
      
      // 학습 모드에 따라 필터링
      if (studyMode === 'not-studied') {
        wordsData = wordsData.filter(w => !w.studyStatus.studied)
      }
      
      // 번호순으로 정렬 (번호가 없는 단어는 뒤로)
      wordsData.sort((a, b) => {
        if (a.number && b.number) {
          return a.number - b.number
        }
        if (a.number && !b.number) return -1
        if (!a.number && b.number) return 1
        return a.word.localeCompare(b.word)
      })
      
      setWords(wordsData)
      setCurrentIndex(0)
      
      // 발음 정보 가져오기
      fetchPronunciations(wordsData)
    } catch (error) {
      console.error('Error loading words:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPronunciations = async (words: ExtractedVocabulary[]) => {
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
    
    const batch = writeBatch(db)
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
            
            // DB 업데이트 준비
            const wordRef = doc(db, 'extracted_vocabulary', word.id)
            batch.update(wordRef, {
              pronunciation: phonetic,
              updatedAt: Timestamp.now()
            })
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
      
      // DB에 배치 업데이트
      try {
        await batch.commit()
        console.log(`Updated pronunciation for ${Object.keys(pronunciationUpdates).length} words`)
      } catch (error) {
        console.error('Error updating pronunciations in DB:', error)
      }
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
  }

  const generateExampleForCurrentWord = async () => {
    const currentWord = words[currentIndex]
    if (!currentWord || !currentWord.id || currentWord.examples?.length > 0 || generatingExamples) {
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
          // 현재 단어의 예문만 업데이트
          const q = query(
            collection(db, 'extracted_vocabulary'),
            where('userId', '==', user?.uid),
            where('__name__', '==', currentWord.id)
          )
          const snapshot = await getDocs(q)
          if (!snapshot.empty) {
            const updatedWord = snapshot.docs[0].data() as ExtractedVocabulary
            const newWords = [...words]
            newWords[currentIndex] = {
              ...currentWord,
              examples: updatedWord.examples
            }
            setWords(newWords)
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
    if (!currentWord || !currentWord.id || currentWord.realEtymology || generatingEtymology) {
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
          // 현재 단어의 어원만 업데이트
          const q = query(
            collection(db, 'extracted_vocabulary'),
            where('userId', '==', user?.uid),
            where('__name__', '==', currentWord.id)
          )
          const snapshot = await getDocs(q)
          if (!snapshot.empty) {
            const updatedWord = snapshot.docs[0].data() as ExtractedVocabulary
            const newWords = [...words]
            newWords[currentIndex] = {
              ...currentWord,
              realEtymology: updatedWord.realEtymology
            }
            setWords(newWords)
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

    try {
      const wordRef = doc(db, 'extracted_vocabulary', currentWord.id)
      const newMasteryLevel = mastered 
        ? Math.min(currentWord.studyStatus.masteryLevel + 20, 100)
        : Math.max(currentWord.studyStatus.masteryLevel - 10, 0)
      
      await updateDoc(wordRef, {
        'studyStatus.studied': true,
        'studyStatus.masteryLevel': newMasteryLevel,
        'studyStatus.reviewCount': currentWord.studyStatus.reviewCount + 1,
        'studyStatus.lastStudied': Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      // 로컬 상태 업데이트
      const updatedWords = [...words]
      updatedWords[currentIndex] = {
        ...currentWord,
        studyStatus: {
          ...currentWord.studyStatus,
          studied: true,
          masteryLevel: newMasteryLevel,
          reviewCount: currentWord.studyStatus.reviewCount + 1,
          lastStudied: new Date()
        }
      }
      setWords(updatedWords)

      // 다음 단어로
      nextWord()
    } catch (error) {
      console.error('Error updating word:', error)
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
            <div className="flex items-center justify-center gap-4 mb-4">
              <h2 className="text-3xl md:text-4xl font-bold">
                {currentWord.word}
              </h2>
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
                <p className="text-xl text-gray-800 font-medium">{currentWord.definition}</p>
                
                <div className="space-y-4 mt-6">
                  {currentWord.etymology && (
                    <div className="p-4 bg-blue-50 rounded-lg text-left max-w-xl mx-auto">
                      <p className="text-sm font-semibold text-blue-800 mb-1">영어 정의:</p>
                      <p className="text-sm text-blue-700">{currentWord.etymology}</p>
                    </div>
                  )}
                  
                  {currentWord.realEtymology ? (
                    <div className="p-4 bg-purple-50 rounded-lg text-left max-w-xl mx-auto">
                      <p className="text-sm font-semibold text-purple-800 mb-1">어원:</p>
                      <p className="text-sm text-purple-700">{currentWord.realEtymology}</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg text-center max-w-xl mx-auto">
                      <p className="text-sm text-purple-600 flex items-center justify-center gap-1">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        AI가 어원을 분석하고 있습니다...
                      </p>
                    </div>
                  )}
                  
                  {currentWord.examples && currentWord.examples.length > 0 && (
                    <div className="p-4 bg-green-50 rounded-lg text-left max-w-xl mx-auto">
                      <p className="text-sm font-semibold text-green-800 mb-2">예문:</p>
                      <div className="space-y-2">
                        {currentWord.examples.map((example, idx) => (
                          <p key={idx} className="text-sm text-green-700">
                            • {example}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!currentWord.examples?.length && (
                    <div className="p-4 bg-gray-50 rounded-lg text-center max-w-xl mx-auto">
                      <p className="text-sm text-blue-600 flex items-center justify-center gap-1">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        AI가 예문을 생성하고 있습니다...
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
        {currentWord.number && <p>단어 번호: #{currentWord.number}</p>}
        <p>난이도: Level {currentWord.difficulty}</p>
        <p>숙련도: {currentWord.studyStatus.masteryLevel}%</p>
        <p>복습 횟수: {currentWord.studyStatus.reviewCount}회</p>
      </div>
    </div>
  )
}