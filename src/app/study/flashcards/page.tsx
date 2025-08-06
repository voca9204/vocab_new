'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useSettings, getTextSizeClass } from '@/components/providers/settings-provider'
import { useWordDetailModal } from '@/hooks/use-word-detail-modal'
import { useWordDiscovery } from '@/hooks/use-word-discovery'
import { useVocabulary } from '@/contexts/vocabulary-context'
import { useCache } from '@/contexts/cache-context'
import { WordAdapter } from '@/lib/adapters/word-adapter'
import { WordDetailModal } from '@/components/vocabulary/word-detail-modal'
import { DiscoveryModal } from '@/components/vocabulary/discovery-modal'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/card'
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
  Loader2,
  Info,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { photoVocabularyCollectionService } from '@/lib/api/photo-vocabulary-collection-service'
import type { PhotoVocabularyWord } from '@/types/photo-vocabulary-collection'
import type { VocabularyWord } from '@/types/vocabulary'

function FlashcardsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { textSize } = useSettings()
  const { words: vocabularyWords, loading: wordsLoading, filter, setFilter, updateWordSynonyms } = useVocabulary()
  const { getSynonyms, setSynonyms: setCacheSynonyms } = useCache()
  
  // Check if we're loading from photo collection
  const source = searchParams.get('source')
  const collectionId = searchParams.get('collectionId')
  const isPhotoCollection = source === 'photo-collection' && collectionId
  
  // State for photo collection words
  const [photoWords, setPhotoWords] = useState<PhotoVocabularyWord[]>([])
  const [loadingPhotoWords, setLoadingPhotoWords] = useState(false)
  
  // Combined words based on source - ensure examples are properly mapped
  const words = isPhotoCollection ? 
    photoWords.map(pw => {
      console.log('[Flashcards] Converting photo word:', pw.word, {
        id: pw.id,
        hasDefinition: !!pw.definition,
        hasContext: !!pw.context,
        hasEtymology: 'etymology' in pw,
        hasRealEtymology: 'realEtymology' in pw,
        hasExamples: 'examples' in pw && pw.examples?.length > 0,
        examples: pw.examples,
        hasSynonyms: 'synonyms' in pw && pw.synonyms?.length > 0
      })
      
      return {
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
        pronunciation: pw.pronunciation || null,
        difficulty: pw.difficulty || 5,
        frequency: pw.frequency || 50,
        isSAT: true,
        partOfSpeech: pw.partOfSpeech || [],
        etymology: pw.etymology || null,
        realEtymology: pw.realEtymology || null,
        // IMPORTANT: Map examples consistently for WordDetailModal
        examples: pw.examples || [],
        synonyms: pw.synonyms || [],  // Preserve existing synonyms
        antonyms: pw.antonyms || [],
        // Add source information for proper identification
        source: {
          type: 'manual',
          collection: 'photo_vocabulary_words',
          originalId: pw.id
        },
        createdAt: pw.createdAt || new Date(),
        updatedAt: pw.updatedAt || new Date(),
        learningMetadata: {
          timesStudied: pw.studyStatus.reviewCount || 0,
          lastStudied: pw.studyStatus.lastStudiedAt || null,
          confidence: pw.studyStatus.masteryLevel ? pw.studyStatus.masteryLevel / 100 : 0,
          source: 'photo-collection'
        },
        studyStatus: pw.studyStatus
      } as VocabularyWord
    }).map(word => {
      // Log the converted word for debugging
      console.log('[Flashcards] Converted photo word:', word.word, {
        id: word.id,
        hasExamples: word.examples?.length > 0,
        examples: word.examples,
        hasDefinitions: word.definitions?.length > 0,
        definitionExamples: word.definitions?.[0]?.examples,
        source: word.source
      })
      return word
    }) : 
    vocabularyWords
  
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flashcard-progress')
      return saved ? parseInt(saved, 10) : 0
    }
    return 0
  })
  const [showAnswer, setShowAnswer] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [showWordDetail, setShowWordDetail] = useState(false)
  const [generatingSynonyms, setGeneratingSynonyms] = useState(false)
  const [synonyms, setSynonyms] = useState<string[]>([])
  const [pronunciations, setPronunciations] = useState<Record<string, string>>({})
  const [synonymRequestInProgress, setSynonymRequestInProgress] = useState<Set<string>>(new Set())
  const [searchingSynonym, setSearchingSynonym] = useState<string | null>(null)

  // WordAdapter 인스턴스
  const [wordAdapter] = useState(() => new WordAdapter())

  // Hooks for word detail and discovery
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
    discoveryModalOpen,
    targetWord,
    sourceWord,
    relationship,
    openDiscoveryModal,
    closeDiscoveryModal,
    saveDiscoveredWord,
    handleWordStudy
  } = useWordDiscovery()

  // Load photo collection words if needed
  useEffect(() => {
    const loadPhotoWords = async () => {
      if (isPhotoCollection && collectionId) {
        setLoadingPhotoWords(true)
        try {
          const collectionWords = await photoVocabularyCollectionService.getCollectionWords(collectionId)
          setPhotoWords(collectionWords)
        } catch (error) {
          console.error('Failed to load photo collection words:', error)
        } finally {
          setLoadingPhotoWords(false)
        }
      }
    }
    
    loadPhotoWords()
  }, [isPhotoCollection, collectionId])

  useEffect(() => {
    if (typeof window !== 'undefined' && words.length > 0) {
      const validIndex = Math.min(currentIndex, words.length - 1)
      // currentIndex가 범위를 벗어나면 수정
      if (currentIndex !== validIndex) {
        setCurrentIndex(validIndex)
      }
      localStorage.setItem('flashcard-progress', validIndex.toString())
    }
  }, [currentIndex, words.length])

  useEffect(() => {
    setSynonyms([])
  }, [currentIndex])

  // 필터가 변경되면 인덱스를 0으로 리셋
  useEffect(() => {
    setCurrentIndex(0)
    setShowAnswer(false)
    localStorage.setItem('flashcard-progress', '0')
  }, [filter.studyMode])

  // Fetch pronunciation for current word if not available
  useEffect(() => {
    const fetchPronunciationForWord = async () => {
      const currentWord = words[currentIndex]
      if (currentWord && !currentWord.pronunciation && !pronunciations[currentWord.word] && user) {
        try {
          const response = await fetch('/api/fetch-pronunciation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              word: currentWord.word,
              userId: user.uid 
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.pronunciation) {
              setPronunciations(prev => ({
                ...prev,
                [currentWord.word]: data.pronunciation
              }))
            }
          }
        } catch (error) {
          console.error('Failed to fetch pronunciation:', error)
        }
      }
    }
    
    fetchPronunciationForWord()
  }, [currentIndex, words, user, pronunciations])

  // Generate synonyms for current word
  useEffect(() => {
    const currentWord = words[currentIndex]
    if (currentWord && showAnswer) {
      // 먼저 DB에 저장된 유사어가 있는지 확인
      if (currentWord.synonyms && currentWord.synonyms.length > 0) {
        console.log('[Flashcards-v2] Using DB synonyms for:', currentWord.word, currentWord.synonyms)
        setSynonyms(currentWord.synonyms)
        return // Exit early if we have DB synonyms
      }
      
      // 캐시 확인
      const cachedSynonyms = getSynonyms(currentWord.word)
      if (cachedSynonyms) {
        setSynonyms(cachedSynonyms)
        return // Exit early if we have cached synonyms
      }
      
      // 이미 요청 중인지 확인
      if (synonymRequestInProgress.has(currentWord.word)) {
        console.log('[Flashcards] Synonym request already in progress for:', currentWord.word)
        return
      }
      
      // AI로 생성
      if (!user) {
        console.log('[Flashcards] Cannot generate synonyms - user not logged in')
        return
      }
      
      console.log('[Flashcards] Generating synonyms for:', currentWord.word)
      setGeneratingSynonyms(true)
      
      // 요청 중임을 표시
      setSynonymRequestInProgress(prev => new Set(prev).add(currentWord.word))
      
      // Inline the fetch logic to avoid dependency issues
      fetch('/api/generate-synonyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: currentWord.word,
          definition: currentWord.definition || ''
        })
      })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text()
          console.error('[Flashcards] API error response:', response.status, errorText)
          throw new Error(`API error: ${response.status} ${response.statusText}`)
        }
        return response.json()
      })
      .then((result) => {
        console.log('[Flashcards] API response:', result)
        
        if (result.synonyms && result.synonyms.length > 0) {
          setSynonyms(result.synonyms)
          
          // CacheContext에 저장
          setCacheSynonyms(currentWord.word, result.synonyms)
          
          // DB에 유사어 업데이트 (백그라운드에서 실행)
          updateWordSynonyms(currentWord.id, result.synonyms).catch(err => {
            console.error('[Flashcards] Failed to update synonyms in DB:', err)
          })
        } else {
          console.log('[Flashcards] No synonyms returned from API')
        }
      })
      .catch((error) => {
        console.error('[Flashcards] Error generating synonyms:', error)
        // 네트워크 에러나 기타 에러 시 빈 배열로 설정
        setSynonyms([])
      })
      .finally(() => {
        setGeneratingSynonyms(false)
        // 요청 완료 표시
        setSynonymRequestInProgress(prev => {
          const newSet = new Set(prev)
          newSet.delete(currentWord.word)
          return newSet
        })
      })
    }
  }, [currentIndex, showAnswer, words, getSynonyms, user, setCacheSynonyms, updateWordSynonyms])

  // generateSynonymsForCurrentWord 함수는 useEffect 내부로 인라인되었음

  const handleSynonymClick = async (synonym: string) => {
    console.log('🔍 [Flashcards] Synonym clicked:', synonym)
    
    // 로딩 상태 표시
    setSearchingSynonym(synonym)
    
    try {
      // 1. 현재 로드된 단어 목록에서 먼저 찾기 (빠른 응답을 위해)
      const localMatch = words.find(w => 
        w.word.toLowerCase() === synonym.toLowerCase()
      )
      
      if (localMatch) {
        console.log('✅ Found synonym in current words:', localMatch.word)
        openModal(localMatch)
        setShowWordDetail(true)
        setSearchingSynonym(null)
        return
      }

      // 2. 통합 검색 API 사용 (모든 컬렉션 검색)
      console.log('🔍 Searching all collections for:', synonym)
      const response = await fetch('/api/vocabulary/search-unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: synonym,
          userId: user?.uid
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success && result.exists && result.word) {
          console.log('✅ Found synonym word via unified search:', result.word.word)
          openModal(result.word)
          setShowWordDetail(true)
        } else {
          // 3. 어떤 컬렉션에도 없으면 Discovery Modal 열기
          console.log('❌ Synonym word not found anywhere, opening Discovery Modal:', synonym)
          const currentWord = words[currentIndex]
          openDiscoveryModal(synonym, currentWord?.word, 'synonym')
        }
      } else {
        // API 호출 실패 시 Discovery Modal 열기
        console.error('❌ Unified search API failed')
        const currentWord = words[currentIndex]
        openDiscoveryModal(synonym, currentWord?.word, 'synonym')
      }
    } catch (error) {
      console.error('❌ Error in unified search:', error)
      // 에러 발생 시 Discovery Modal 열기
      const currentWord = words[currentIndex]
      openDiscoveryModal(synonym, currentWord?.word, 'synonym')
    } finally {
      setSearchingSynonym(null)
    }
  }

  // WordDetailModal에서 유사어 클릭 시 해당 단어의 모달 열기
  const handleWordModalSynonymClick = async (synonymWord: string) => {
    console.log('🔍 [FlashcardsV2] WordModal synonym clicked:', synonymWord)
    console.log('📋 Current loaded words count:', words.length)
    
    try {
      // 약간의 지연을 추가하여 이전 모달이 완전히 정리되도록 함
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 1. 현재 로드된 단어 목록에서 먼저 찾기
      const localMatch = words.find(w => 
        w.word.toLowerCase() === synonymWord.toLowerCase()
      )
      
      if (localMatch) {
        console.log('✅ Found synonym in current words:', localMatch.word)
        openModal(localMatch)
        setShowWordDetail(true)
        return
      }

      // 2. 통합 검색 API 사용 (모든 컬렉션 검색)
      console.log('🔍 Searching all collections for:', synonymWord)
      const response = await fetch('/api/vocabulary/search-unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: synonymWord,
          userId: user?.uid
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success && result.exists && result.word) {
          console.log('✅ Found synonym word via unified search:', result.word.word)
          openModal(result.word)
          setShowWordDetail(true)
        } else {
          console.log('❌ Synonym word not found anywhere:', synonymWord)
          // AI Discovery Modal을 열어서 자동으로 찾기
          console.log('🤖 Opening AI Discovery Modal for:', synonymWord)
          openDiscoveryModal(synonymWord, selectedWord?.word || '', 'synonym')
          setShowWordDetail(false) // 현재 모달 닫기
        }
      } else {
        console.error('❌ Unified search API failed for:', synonymWord)
        openDiscoveryModal(synonymWord, selectedWord?.word || '', 'synonym')
        setShowWordDetail(false)
      }
    } catch (error) {
      console.error('❌ Error in unified search for synonym:', error)
      openDiscoveryModal(synonymWord, selectedWord?.word || '', 'synonym')
      setShowWordDetail(false)
    }
  }

  const handleCardClick = () => {
    setShowAnswer(!showAnswer)
  }

  const nextWord = () => {
    setCurrentIndex((prev) => (prev + 1) % words.length)
    setShowAnswer(false)
  }

  const prevWord = () => {
    setCurrentIndex((prev) => (prev - 1 + words.length) % words.length)
    setShowAnswer(false)
  }

  const shuffleWords = () => {
    // VocabularyContext에서는 직접 words를 수정할 수 없으므로
    // 로컬에서 셔플된 인덱스 배열을 관리하는 방식으로 변경 필요
    // 현재는 간단히 주석 처리
    console.log('Shuffle feature needs to be reimplemented with VocabularyContext')
    setIsShuffled(true)
    setShowAnswer(false)
  }

  const markAsStudied = async () => {
    nextWord()
  }

  const markAsNotStudied = () => {
    nextWord()
  }

  const resetProgress = () => {
    setCurrentIndex(0)
    localStorage.setItem('flashcard-progress', '0')
    setShowAnswer(false)
  }

  const openWordDetailModal = () => {
    const currentWord = words[currentIndex]
    if (currentWord) {
      console.log('[Flashcards] Opening modal with word:', currentWord.word, 'synonyms:', currentWord.synonyms)
      openModal(currentWord)
      setShowWordDetail(true)
    }
  }


  // Combined loading state
  const loading = isPhotoCollection ? loadingPhotoWords : wordsLoading
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">단어를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/study')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              뒤로
            </Button>
            <h1 className="text-2xl font-bold">플래시카드 학습</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter.studyMode}
              onChange={(e) => setFilter({ studyMode: e.target.value as 'all' | 'not-studied' | 'studied' })}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">모든 단어</option>
              <option value="not-studied">학습하지 않은 단어</option>
              <option value="studied">학습한 단어</option>
            </select>
          </div>
        </div>

        {/* Empty State */}
        <Card className="mt-8">
          <CardContent className="p-12 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <BookOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter.studyMode === 'studied' 
                  ? '아직 학습한 단어가 없습니다' 
                  : filter.studyMode === 'not-studied'
                  ? '모든 단어를 학습하셨습니다!'
                  : '학습할 단어가 없습니다'}
              </h3>
              <p className="text-gray-600 mb-6">
                {filter.studyMode === 'studied' 
                  ? '단어를 학습하면 여기에 표시됩니다.' 
                  : filter.studyMode === 'not-studied'
                  ? '축하합니다! 모든 단어를 학습하셨습니다.'
                  : '설정에서 단어장을 선택해주세요.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {filter.studyMode !== 'all' && (
                <Button
                  onClick={() => setFilter({ studyMode: 'all' })}
                  variant="outline"
                >
                  모든 단어 보기
                </Button>
              )}
              {filter.studyMode === 'studied' && (
                <Button
                  onClick={() => setFilter({ studyMode: 'not-studied' })}
                >
                  학습하지 않은 단어 보기
                </Button>
              )}
              <Button
                onClick={() => router.push('/dashboard')}
                variant={filter.studyMode !== 'all' ? 'outline' : 'default'}
              >
                대시보드로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentWord = words[currentIndex]
  
  // currentWord가 없으면 에러 방지
  if (!currentWord) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <p className="text-gray-600">로딩 중이거나 표시할 단어가 없습니다.</p>
          <Button onClick={() => router.push('/study')} className="mt-4">
            학습 메뉴로 돌아가기
          </Button>
        </div>
      </div>
    )
  }
  
  const getPartOfSpeechColor = (pos: string) => {
    switch (pos.toLowerCase()) {
      case 'n.':
      case 'noun':
        return 'bg-blue-100 text-blue-700'
      case 'v.':
      case 'verb':
        return 'bg-green-100 text-green-700'
      case 'adj.':
      case 'adjective':
        return 'bg-purple-100 text-purple-700'
      case 'adv.':
      case 'adverb':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/study')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            뒤로
          </Button>
          <h1 className="text-2xl font-bold">플래시카드 학습</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter.studyMode}
            onChange={(e) => setFilter({ studyMode: e.target.value as 'all' | 'not-studied' | 'studied' })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">모든 단어</option>
            <option value="not-studied">학습하지 않은 단어</option>
            <option value="studied">학습한 단어</option>
          </select>
          <Button
            variant="outline"
            onClick={shuffleWords}
            title="단어 섞기"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={resetProgress}
            title="진도 초기화"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>{currentIndex + 1} / {words.length}</span>
          <span>{Math.round(((currentIndex + 1) / words.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <Card 
        className="mb-6 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={handleCardClick}
        data-testid="flashcard"
      >
        <div className="p-8 sm:p-12 min-h-[400px] flex items-center justify-center">
          <div className="text-center w-full">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className={cn("text-3xl sm:text-4xl font-bold", getTextSizeClass(textSize))}>
                {currentWord.word}
              </h2>
              {currentWord.partOfSpeech && currentWord.partOfSpeech.length > 0 && currentWord.partOfSpeech.map(pos => (
                <span 
                  key={pos}
                  className={`text-sm px-2 py-0.5 rounded ${getPartOfSpeechColor(pos)}`}
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
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  openWordDetailModal()
                }}
                className="p-2"
                title="상세 정보 보기"
              >
                <Info className="h-5 w-5" />
              </Button>
            </div>
            
            {(currentWord.pronunciation || pronunciations[currentWord.word]) && (
              <p className="text-lg text-gray-600 mb-6">
                [{currentWord.pronunciation || pronunciations[currentWord.word]}]
              </p>
            )}

            {showAnswer ? (
              <div className="space-y-4 animate-fade-in">
                {/* 한글 뜻 */}
                <div className="text-center">
                  <p className={cn("text-3xl text-gray-800 font-semibold", getTextSizeClass(textSize))}>
                    {currentWord.definition || 'Definition not available'}
                  </p>
                </div>
                
                {/* 영어 설명 */}
                {currentWord.etymology && (
                  <div className="text-center">
                    <p className={cn("text-lg text-gray-600", getTextSizeClass(textSize))}>
                      {currentWord.etymology}
                    </p>
                  </div>
                )}
                
                {/* 유사어 */}
                <div className="mt-6">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-sm px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                      유사어
                    </span>
                    {generatingSynonyms ? (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        AI가 유사어를 생성하고 있습니다...
                      </span>
                    ) : synonyms.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {synonyms.map((synonym, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSynonymClick(synonym)
                            }}
                            disabled={searchingSynonym === synonym}
                            className={cn(
                              "px-3 py-1 rounded-full text-sm transition-colors cursor-pointer",
                              searchingSynonym === synonym
                                ? "bg-green-100 text-green-600 cursor-wait opacity-70"
                                : "bg-green-50 text-green-700 hover:bg-green-100"
                            )}
                          >
                            {searchingSynonym === synonym ? (
                              <span className="flex items-center gap-1">
                                <span className="animate-pulse">검색중...</span>
                              </span>
                            ) : (
                              synonym
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </div>
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

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 flex-1">
          <Button
            variant="outline"
            onClick={prevWord}
            disabled={currentIndex === 0}
            className="py-3"
          >
            <ChevronLeft className="h-5 w-5" />
            이전
          </Button>
          <Button
            variant="outline"
            onClick={nextWord}
            disabled={currentIndex === words.length - 1}
            className="flex-1 py-3"
          >
            다음
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={markAsNotStudied}
            className="flex-1 sm:flex-initial py-3 px-6"
          >
            <X className="h-5 w-5 mr-1" />
            모름
          </Button>
          <Button
            onClick={markAsStudied}
            className="flex-1 sm:flex-initial py-3 px-6"
          >
            <Check className="h-5 w-5 mr-1" />
            알고 있음
          </Button>
        </div>
      </div>

      {/* Word Detail Modal */}
      <WordDetailModal
        open={showWordDetail && !!selectedWord}
        onClose={() => {
          console.log('[Flashcards] Closing WordDetailModal')
          setShowWordDetail(false)
          closeModal()
        }}
        word={selectedWord}
        onPlayPronunciation={speakWord}
        onGenerateExamples={generateExamples}
        onGenerateEtymology={generateEtymology}
        onFetchPronunciation={fetchPronunciation}
        generatingExamples={generatingExamples}
        generatingEtymology={generatingEtymology}
        fetchingPronunciation={fetchingPronunciation}
        onSynonymClick={handleWordModalSynonymClick}
      />

      {/* Discovery Modal */}
      <DiscoveryModal
        open={discoveryModalOpen}
        onClose={closeDiscoveryModal}
        word={targetWord}
        sourceWord={sourceWord}
        relationship={relationship}
        onSave={saveDiscoveredWord}
        onStudy={handleWordStudy}
        onViewExisting={async (existingWord) => {
          console.log('🔍 [FlashcardsV2] onViewExisting called with raw data:', existingWord)
          
          try {
            // Convert raw database format to UnifiedWord using WordAdapter
            if (existingWord.id) {
              // If we have an ID, fetch the properly converted word
              const unifiedWord = await wordAdapter.getWordById(existingWord.id)
              if (unifiedWord) {
                console.log('✅ [FlashcardsV2] Converted to UnifiedWord:', unifiedWord)
                openModal(unifiedWord)
                setShowWordDetail(true)
              } else {
                console.error('❌ [FlashcardsV2] Failed to convert word')
                // Fallback: try to open with raw data
                openModal(existingWord)
                setShowWordDetail(true)
              }
            } else {
              // If no ID, try to convert manually
              const convertedWord: UnifiedWord = {
                id: existingWord.id || '',
                word: existingWord.word || '',
                definition: existingWord.definition || existingWord.definitions?.[0]?.definition || '',
                etymology: existingWord.etymology || existingWord.englishDefinition || null,
                realEtymology: existingWord.realEtymology || null,
                partOfSpeech: existingWord.partOfSpeech || [],
                examples: existingWord.examples || existingWord.definitions?.[0]?.examples || [],
                pronunciation: existingWord.pronunciation || null,
                synonyms: existingWord.synonyms || [],
                antonyms: existingWord.antonyms || [],
                difficulty: existingWord.difficulty || 5,
                frequency: existingWord.frequency || 5,
                isSAT: existingWord.isSAT || false,
                source: existingWord.source || {
                  type: 'manual',
                  collection: 'unknown',
                  originalId: existingWord.id || ''
                },
                createdAt: existingWord.createdAt || new Date(),
                updatedAt: existingWord.updatedAt || new Date(),
                studyStatus: existingWord.studyStatus
              }
              console.log('✅ [FlashcardsV2] Manually converted to UnifiedWord:', convertedWord)
              openModal(convertedWord)
              setShowWordDetail(true)
            }
          } catch (error) {
            console.error('❌ [FlashcardsV2] Error in onViewExisting:', error)
            // Fallback: open with raw data
            openModal(existingWord)
            setShowWordDetail(true)
          }
        }}
      />
    </div>
  )
}

export default function FlashcardsV2Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">플래시카드를 로드하는 중...</p>
        </div>
      </div>
    }>
      <FlashcardsContent />
    </Suspense>
  )
}