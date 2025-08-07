'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button, Input, StudyHeader } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { 
  Search, 
  Filter, 
  ChevronLeft,
  BookOpen,
  Check,
  X,
  Volume2,
  Sparkles
} from 'lucide-react'
import { WordAdapter } from '@/lib/adapters/word-adapter'
import type { UnifiedWord } from '@/types/unified-word'
import { WordDetailModal } from '@/components/vocabulary/word-detail-modal'
import { useWordDetailModal } from '@/hooks/use-word-detail-modal'
import { useWordDiscovery } from '@/hooks/use-word-discovery'
import { DiscoveryModal } from '@/components/vocabulary/discovery-modal'

export default function VocabularyListPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [words, setWords] = useState<UnifiedWord[]>([])
  const [filteredWords, setFilteredWords] = useState<UnifiedWord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'studied' | 'not-studied' | 'mastered'>('all')
  
  // WordAdapter 인스턴스
  const [wordAdapter] = useState(() => new WordAdapter())
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

  // Discovery modal for AI search
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

  // 유사어 클릭 핸들러 - 해당 단어를 찾아서 모달 열기
  const handleSynonymClick = async (synonymWord: string) => {
    console.log('🔍 [VocabularyListPage] Synonym clicked:', synonymWord)
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
        return
      }

      // 2. WordAdapter를 사용하여 유연한 검색으로 데이터베이스에서 찾기
      console.log('🔍 Searching in database for:', synonymWord)
      const foundWord = await wordAdapter.searchWordFlexible(synonymWord)
      
      if (foundWord) {
        console.log('✅ Found synonym word in database:', foundWord.word)
        openModal(foundWord)
      } else {
        console.log('❌ Synonym word not found in database after flexible search:', synonymWord)
        // WordAdapter의 컬렉션 우선순위 확인
        console.log('📊 WordAdapter config:', wordAdapter.getStats())
        
        // AI Discovery Modal을 열어서 자동으로 찾기
        console.log('🤖 Opening AI Discovery Modal for:', synonymWord)
        openDiscoveryModal(synonymWord, selectedWord?.word || '', 'synonym')
      }
    } catch (error) {
      console.error('❌ Error searching for synonym:', error)
      alert('단어 검색 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    if (user) {
      loadWords()
    }
  }, [user])

  // 페이지가 다시 포커스를 받았을 때 데이터 새로고침
  useEffect(() => {
    const handleFocus = () => {
      if (user && !loading) {
        console.log('Page regained focus, reloading words...')
        loadWords()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !loading) {
        console.log('Page became visible, reloading words...')
        loadWords()
      }
    }

    // 커스텀 이벤트 리스너 추가 (AI 생성 완료 시)
    const handleWordUpdated = (event: Event) => {
      const customEvent = event as CustomEvent
      console.log('Word updated event received:', customEvent.detail)
      if (user && !loading) {
        loadWords()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('word-updated', handleWordUpdated)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('word-updated', handleWordUpdated)
    }
  }, [user, loading])

  useEffect(() => {
    filterWords()
  }, [searchTerm, filterType, words])

  const loadWords = async () => {
    if (!user) return

    try {
      console.log('Loading words using WordAdapter')
      
      // WordAdapter를 사용하여 통합된 단어 데이터 가져오기
      const wordsData = await wordAdapter.getWords(3000)
      
      console.log(`Loaded ${wordsData.length} words from WordAdapter`)
      
      if (wordsData.length === 0) {
        console.log('No words found')
        setWords([])
        setFilteredWords([])
        setLoading(false)
        return
      }
      
      // 알파벳순으로 정렬
      const sortedWords = wordsData.sort((a, b) => a.word.localeCompare(b.word))
      
      console.log('Processed words:', sortedWords.length)
      setWords(sortedWords)
      setFilteredWords(sortedWords)
    } catch (error) {
      console.error('Error loading words:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterWords = () => {
    let filtered = words

    // 검색어 필터링 (UnifiedWord 구조에 맞게 수정)
    if (searchTerm) {
      filtered = filtered.filter(word => 
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (word.definition && word.definition.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (word.etymology && word.etymology.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // 학습 상태 필터링 (UnifiedWord의 studyStatus 구조 사용)
    switch (filterType) {
      case 'studied':
        filtered = filtered.filter(w => (w.studyStatus?.reviewCount || 0) > 0)
        break
      case 'not-studied':
        filtered = filtered.filter(w => (w.studyStatus?.reviewCount || 0) === 0)
        break
      case 'mastered':
        filtered = filtered.filter(w => (w.studyStatus?.masteryLevel || 0) >= 80) // UnifiedWord uses 0-100 scale
        break
    }

    setFilteredWords(filtered)
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return 'text-green-600'
    if (difficulty <= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPartOfSpeechColor = (pos: string) => {
    switch (pos) {
      case 'n.': return 'bg-blue-100 text-blue-800'
      case 'v.': return 'bg-green-100 text-green-800'
      case 'adj.': return 'bg-purple-100 text-purple-800'
      case 'adv.': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }


  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>로그인이 필요합니다.</p>
        <Button onClick={() => router.push('/login')} className="mt-4">
          로그인하기
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 헤더 */}
      <StudyHeader 
        title="단어 목록"
        subtitle={`총 ${filteredWords.length}개 단어`}
      />

      {/* 검색 및 필터 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="단어 또는 뜻 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            전체
          </Button>
          <Button
            variant={filterType === 'not-studied' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('not-studied')}
          >
            미학습
          </Button>
          <Button
            variant={filterType === 'studied' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('studied')}
          >
            학습완료
          </Button>
          <Button
            variant={filterType === 'mastered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('mastered')}
          >
            마스터
          </Button>
        </div>
      </div>

      {/* 단어 목록 */}
      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map((word) => (
            <Card 
              key={word.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openModal(word)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{word.word}</h3>
                  {word.partOfSpeech.map(pos => (
                    <span 
                      key={pos}
                      className={`text-xs px-2 py-1 rounded ${getPartOfSpeechColor(pos)}`}
                    >
                      {pos}
                    </span>
                  ))}
                  {word.isSAT && (
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                      SAT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(word.studyStatus?.reviewCount || 0) > 0 && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                  <span className={`text-sm font-medium ${getDifficultyColor(word.difficulty || 5)}`}>
                    Lv.{word.difficulty}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mb-1 break-words whitespace-normal">
                {word.definition || 'No definition available'}
              </p>
              
              {word.etymology && (
                <p className="text-xs text-gray-500 break-words whitespace-normal">
                  {word.etymology}
                </p>
              )}
              
              {(word.studyStatus?.masteryLevel || 0) > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>숙련도</span>
                    <span>{word.studyStatus?.masteryLevel || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${word.studyStatus?.masteryLevel || 0}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 단어 상세 모달 */}
      <WordDetailModal
        open={!!selectedWord}
        onClose={closeModal}
        word={selectedWord}
        onPlayPronunciation={speakWord}
        onGenerateExamples={generateExamples}
        onGenerateEtymology={generateEtymology}
        onFetchPronunciation={fetchPronunciation}
        onSynonymClick={handleSynonymClick}
        generatingExamples={generatingExamples}
        generatingEtymology={generatingEtymology}
        fetchingPronunciation={fetchingPronunciation}
      />

      {/* Discovery Modal for AI word search */}
      <DiscoveryModal
        open={discoveryModalOpen}
        onClose={closeDiscoveryModal}
        word={targetWord}
        sourceWord={sourceWord}
        relationship={relationship}
        onSave={async (word) => {
          await saveDiscoveredWord(word)
          closeDiscoveryModal()
          // 저장된 단어를 다시 검색해서 모달 열기
          const foundWord = await wordAdapter.searchWordFlexible(word.word)
          if (foundWord) {
            openModal(foundWord)
          }
        }}
        onStudy={handleWordStudy}
      />
    </div>
  )
}