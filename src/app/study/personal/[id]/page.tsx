'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useSettings, getTextSizeClass } from '@/components/providers/settings-provider'
import { useWordDetailModal } from '@/hooks/use-word-detail-modal'
import { useWordDiscovery } from '@/hooks/use-word-discovery'
import { useCache } from '@/contexts/cache-context'
import { WordDetailModal } from '@/components/vocabulary/word-detail-modal'
import { DiscoveryModal } from '@/components/vocabulary/discovery-modal'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowLeft,
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
  Loader2,
  Info,
  BookOpen,
  Brain,
  Target,
  TrendingUp,
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PersonalCollection } from '@/types/collections'
import type { UnifiedWord } from '@/types/unified-word'

// Learning algorithm constants (spaced repetition)
const DIFFICULTY_MULTIPLIERS = {
  easy: 2.5,
  medium: 2.0,
  hard: 1.3,
  again: 0.6
}

interface StudyProgress {
  wordId: string
  timesStudied: number
  lastStudied: Date | null
  correctCount: number
  incorrectCount: number
  easeFactor: number // For spaced repetition
  interval: number // Days until next review
  nextReview: Date | null
}

export default function PersonalCollectionStudyPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { textSize, showPronunciation, showEtymology, showExamples } = useSettings()
  const collectionId = params.id as string

  // Collection and words state
  const [collection, setCollection] = useState<PersonalCollection | null>(null)
  const [words, setWords] = useState<UnifiedWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Study state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [studyMode, setStudyMode] = useState<'flashcard' | 'quiz' | 'list' | 'review'>('flashcard')
  const [shuffled, setShuffled] = useState(false)
  const [wordOrder, setWordOrder] = useState<number[]>([])
  
  // Progress tracking
  const [studyProgress, setStudyProgress] = useState<Map<string, StudyProgress>>(new Map())
  const [sessionStats, setSessionStats] = useState({
    studied: 0,
    correct: 0,
    incorrect: 0,
    startTime: new Date()
  })

  // Modal states
  const wordDetailModal = useWordDetailModal()
  const discovery = useWordDiscovery()
  const { getSynonyms, setSynonyms: setCacheSynonyms } = useCache()

  // Convert personal collection words to UnifiedWord format
  const convertToUnifiedWords = useCallback((rawWords: any[]): UnifiedWord[] => {
    return rawWords.map(word => ({
      id: word.id,
      word: word.word,
      definition: word.definition || word.korean || '',
      korean: word.korean || word.definition || '',
      pronunciation: word.pronunciation || null,
      partOfSpeech: word.partOfSpeech || [],
      etymology: word.etymology || null,
      synonyms: (() => {
        const syns = word.synonyms || [];
        if (syns.length > 0) {
          console.log(`[PersonalStudy] Word "${word.word}" has ${syns.length} synonyms:`, syns);
        }
        return syns;
      })(),
      antonyms: word.antonyms || [],
      examples: word.example ? [word.example] : (word.examples || []),
      difficulty: word.difficulty || 5,
      frequency: word.frequency || 50,
      isSAT: false, // Personal collection words are not SAT words
      definitions: (word.definition || word.korean) ? [{
        id: 'def-0',
        definition: word.definition || word.korean || '',
        examples: word.example ? [word.example] : (word.examples || []),
        source: 'personal' as const,
        language: 'ko' as const,
        createdAt: word.createdAt || new Date()
      }] : [],
      source: {
        type: 'personal',
        collection: 'personal_collection_words',
        collectionId: collectionId
      },
      createdAt: word.createdAt || new Date(),
      updatedAt: word.updatedAt || new Date()
    }))
  }, [collectionId])

  // Load collection and words
  useEffect(() => {
    const loadCollection = async () => {
      if (!user || !collectionId) return

      try {
        setLoading(true)
        setError(null)
        
        const token = await user.getIdToken()
        
        // 1. Load collection info
        const collectionResponse = await fetch(`/api/collections/personal?id=${collectionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!collectionResponse.ok) {
          throw new Error('컬렉션을 불러올 수 없습니다')
        }

        const collectionData = await collectionResponse.json()
        
        if (!collectionData.success || !collectionData.collection) {
          throw new Error('컬렉션을 찾을 수 없습니다')
        }

        setCollection(collectionData.collection)

        // 2. Load words
        if (collectionData.collection.words?.length > 0) {
          const wordIds = collectionData.collection.words
          const wordsResponse = await fetch(`/api/collections/words?ids=${wordIds.join(',')}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })

          if (wordsResponse.ok) {
            const wordsData = await wordsResponse.json()
            
            if (wordsData.success && wordsData.words) {
              const unifiedWords = convertToUnifiedWords(wordsData.words)
              setWords(unifiedWords)
              setWordOrder(unifiedWords.map((_, i) => i))
              
              // Initialize progress for each word
              const initialProgress = new Map<string, StudyProgress>()
              unifiedWords.forEach(word => {
                initialProgress.set(word.id, {
                  wordId: word.id,
                  timesStudied: 0,
                  lastStudied: null,
                  correctCount: 0,
                  incorrectCount: 0,
                  easeFactor: 2.5,
                  interval: 0,
                  nextReview: null
                })
              })
              setStudyProgress(initialProgress)
            }
          }
        }

      } catch (err) {
        console.error('❌ 컬렉션 로드 실패:', err)
        setError(err instanceof Error ? err.message : '오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    loadCollection()
  }, [user, collectionId, convertToUnifiedWords])

  // Shuffle words
  const shuffleWords = useCallback(() => {
    const shuffledOrder = [...wordOrder]
    for (let i = shuffledOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledOrder[i], shuffledOrder[j]] = [shuffledOrder[j], shuffledOrder[i]]
    }
    setWordOrder(shuffledOrder)
    setShuffled(true)
    setCurrentIndex(0)
    setShowAnswer(false)
  }, [wordOrder])

  // Reset shuffle
  const resetShuffle = useCallback(() => {
    setWordOrder(words.map((_, i) => i))
    setShuffled(false)
    setCurrentIndex(0)
    setShowAnswer(false)
  }, [words])

  // Handle difficulty rating (spaced repetition)
  const handleDifficulty = useCallback((difficulty: 'easy' | 'medium' | 'hard' | 'again') => {
    const currentWord = words[wordOrder[currentIndex]]
    const progress = studyProgress.get(currentWord.id)
    
    if (progress) {
      const multiplier = DIFFICULTY_MULTIPLIERS[difficulty]
      const newEaseFactor = Math.max(1.3, progress.easeFactor * multiplier)
      const newInterval = difficulty === 'again' ? 0 : Math.ceil(progress.interval * multiplier)
      const nextReview = new Date()
      nextReview.setDate(nextReview.getDate() + newInterval)
      
      const updatedProgress: StudyProgress = {
        ...progress,
        timesStudied: progress.timesStudied + 1,
        lastStudied: new Date(),
        correctCount: difficulty !== 'again' ? progress.correctCount + 1 : progress.correctCount,
        incorrectCount: difficulty === 'again' ? progress.incorrectCount + 1 : progress.incorrectCount,
        easeFactor: newEaseFactor,
        interval: newInterval,
        nextReview
      }
      
      const newProgressMap = new Map(studyProgress)
      newProgressMap.set(currentWord.id, updatedProgress)
      setStudyProgress(newProgressMap)
      
      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        studied: prev.studied + 1,
        correct: difficulty !== 'again' ? prev.correct + 1 : prev.correct,
        incorrect: difficulty === 'again' ? prev.incorrect + 1 : prev.incorrect
      }))
    }
    
    // Move to next word
    handleNext()
  }, [words, wordOrder, currentIndex, studyProgress])

  // Navigation
  const handleNext = useCallback(() => {
    if (currentIndex < wordOrder.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowAnswer(false)
    }
  }, [currentIndex, wordOrder])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setShowAnswer(false)
    }
  }, [currentIndex])

  const handleRestart = useCallback(() => {
    setCurrentIndex(0)
    setShowAnswer(false)
    setSessionStats({
      studied: 0,
      correct: 0,
      incorrect: 0,
      startTime: new Date()
    })
  }, [])

  // Play pronunciation
  const playPronunciation = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    }
  }, [])

  // Handle synonym click
  const handleSynonymClick = useCallback((synonym: string) => {
    discovery.openDiscoveryModal(synonym, words[wordOrder[currentIndex]].word, 'synonym')
  }, [discovery, words, wordOrder, currentIndex])

  // Update synonyms for current word
  const updateWordSynonyms = useCallback(async (wordId: string, newSynonyms: string[]) => {
    const wordIndex = words.findIndex(w => w.id === wordId)
    if (wordIndex !== -1) {
      const updatedWords = [...words]
      updatedWords[wordIndex] = {
        ...updatedWords[wordIndex],
        synonyms: newSynonyms
      }
      setWords(updatedWords)
      
      // Cache synonyms
      setCacheSynonyms(updatedWords[wordIndex].word, newSynonyms)
    }
  }, [words, setCacheSynonyms])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">컬렉션을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !collection || words.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto" />
          <p className="mt-4 text-gray-600">{error || '학습할 단어가 없습니다'}</p>
          <Button
            onClick={() => router.push('/my-collections')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            내 단어장으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  const currentWord = words[wordOrder[currentIndex]]
  const currentProgress = studyProgress.get(currentWord.id)
  const progressPercentage = ((currentIndex + 1) / words.length) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/my-collections')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            내 단어장으로 돌아가기
          </Button>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
              <p className="text-gray-600 mt-1">{collection.description}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">진행률</p>
              <p className="text-lg font-semibold">{currentIndex + 1} / {words.length}</p>
              {sessionStats.studied > 0 && (
                <p className="text-xs text-gray-500">
                  정답률: {Math.round((sessionStats.correct / sessionStats.studied) * 100)}%
                </p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Study mode selector */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={studyMode === 'flashcard' ? 'primary' : 'ghost'}
            onClick={() => setStudyMode('flashcard')}
            size="sm"
          >
            <Brain className="h-4 w-4 mr-1" />
            플래시카드
          </Button>
          <Button
            variant={studyMode === 'quiz' ? 'primary' : 'ghost'}
            onClick={() => setStudyMode('quiz')}
            size="sm"
          >
            <Target className="h-4 w-4 mr-1" />
            퀴즈
          </Button>
          <Button
            variant={studyMode === 'review' ? 'primary' : 'ghost'}
            onClick={() => setStudyMode('review')}
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            복습
          </Button>
          <Button
            variant={studyMode === 'list' ? 'primary' : 'ghost'}
            onClick={() => setStudyMode('list')}
            size="sm"
          >
            <BookOpen className="h-4 w-4 mr-1" />
            목록
          </Button>
        </div>

        {/* Control buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={shuffled ? resetShuffle : shuffleWords}
          >
            <Shuffle className="h-4 w-4 mr-1" />
            {shuffled ? '원래 순서로' : '섞기'}
          </Button>
          {currentProgress && currentProgress.timesStudied > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Award className="h-4 w-4" />
              <span>학습 {currentProgress.timesStudied}회</span>
              {currentProgress.easeFactor && (
                <span>• 난이도 {currentProgress.easeFactor.toFixed(1)}</span>
              )}
            </div>
          )}
        </div>

        {/* Flashcard mode */}
        {studyMode === 'flashcard' && (
          <Card className="p-8">
            <div className="min-h-[400px] flex flex-col items-center justify-center">
              <div className="text-center w-full">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <h2 className={cn("font-bold text-gray-900", getTextSizeClass(textSize, 'title'))}>
                    {currentWord.word}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playPronunciation(currentWord.word)}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => wordDetailModal.openModal(currentWord)}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
                
                {showPronunciation && currentWord.pronunciation && (
                  <p className="text-lg text-gray-600 mb-4">
                    [{currentWord.pronunciation}]
                  </p>
                )}

                {currentWord.partOfSpeech && currentWord.partOfSpeech.length > 0 && (
                  <div className="flex justify-center gap-2 mb-4">
                    {currentWord.partOfSpeech.map(pos => (
                      <span key={pos} className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {pos}
                      </span>
                    ))}
                  </div>
                )}

                {showAnswer && (
                  <div className="mt-6 space-y-4 animate-fade-in">
                    <p className={cn("text-gray-800", getTextSizeClass(textSize))}>
                      {currentWord.korean || currentWord.definition}
                    </p>
                    
                    {showExamples && currentWord.examples && currentWord.examples.length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left max-w-2xl mx-auto">
                        <p className="text-sm text-gray-600 mb-2">예문:</p>
                        {currentWord.examples.map((example, idx) => (
                          <p key={idx} className="text-gray-800 mb-2">{example}</p>
                        ))}
                      </div>
                    )}

                    {showEtymology && currentWord.etymology && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left max-w-2xl mx-auto">
                        <p className="text-sm text-gray-600 mb-1">어원:</p>
                        <p className="text-gray-800 text-sm">{currentWord.etymology}</p>
                      </div>
                    )}

                    {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">유사어:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {currentWord.synonyms.map(synonym => (
                            <Button
                              key={synonym}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSynonymClick(synonym)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {synonym}
                              <Sparkles className="h-3 w-3 ml-1" />
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Difficulty rating buttons */}
                    <div className="mt-6 flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDifficulty('again')}
                        className="text-red-600"
                      >
                        <X className="h-4 w-4 mr-1" />
                        다시
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDifficulty('hard')}
                        className="text-orange-600"
                      >
                        어려움
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDifficulty('medium')}
                        className="text-yellow-600"
                      >
                        보통
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDifficulty('easy')}
                        className="text-green-600"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        쉬움
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                이전
              </Button>

              {!showAnswer ? (
                <Button
                  variant="primary"
                  onClick={() => setShowAnswer(true)}
                  size="lg"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  정답 보기
                </Button>
              ) : currentIndex === wordOrder.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={handleRestart}
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  다시 시작
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleNext}
                >
                  다음
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={handleNext}
                disabled={currentIndex === wordOrder.length - 1}
              >
                다음
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {/* List mode */}
        {studyMode === 'list' && (
          <Card className="p-6">
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {wordOrder.map((orderIndex, displayIndex) => {
                const word = words[orderIndex]
                const progress = studyProgress.get(word.id)
                
                return (
                  <div
                    key={word.id}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-colors",
                      displayIndex === currentIndex ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    )}
                    onClick={() => {
                      setCurrentIndex(displayIndex)
                      wordDetailModal.openModal(word)
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {word.word}
                          </h3>
                          {word.pronunciation && showPronunciation && (
                            <span className="text-sm text-gray-600">[{word.pronunciation}]</span>
                          )}
                          {progress && progress.timesStudied > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              학습 {progress.timesStudied}회
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800">
                          {word.korean || word.definition}
                        </p>
                        {showExamples && word.examples && word.examples[0] && (
                          <p className="mt-2 text-sm text-gray-600 italic">
                            {word.examples[0]}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <span className="text-sm text-gray-500">#{displayIndex + 1}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Modals */}
        <WordDetailModal 
          open={!!wordDetailModal.selectedWord}
          onClose={wordDetailModal.closeModal}
          word={wordDetailModal.selectedWord}
          onGenerateExamples={wordDetailModal.generateExamples}
          onGenerateEtymology={wordDetailModal.generateEtymology}
          onFetchPronunciation={wordDetailModal.fetchPronunciation}
          generatingExamples={wordDetailModal.generatingExamples}
          generatingEtymology={wordDetailModal.generatingEtymology}
          fetchingPronunciation={wordDetailModal.fetchingPronunciation}
          onPlayPronunciation={wordDetailModal.speakWord}
          onSynonymClick={handleSynonymClick}
        />
        <DiscoveryModal 
          open={discovery.discoveryModalOpen}
          onClose={discovery.closeDiscoveryModal}
          word={discovery.targetWord}
          sourceWord={discovery.sourceWord}
          relationship={discovery.relationship}
          onSave={discovery.saveDiscoveredWord}
          onStudy={discovery.handleWordStudy}
        />
      </div>
    </div>
  )
}