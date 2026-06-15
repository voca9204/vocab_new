'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useCollectionV2 } from '@/contexts/collection-context-v2'
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
import { getFieldString } from '@/lib/utils/word-field-normalizer'
import type { UnifiedWord } from '@/types/unified-word'
import { WordDetailModal } from '@/components/vocabulary/word-detail-modal'
import { useWordDetailModal } from '@/hooks/use-word-detail-modal'
import { useWordDiscovery } from '@/hooks/use-word-discovery'
import { DiscoveryModal } from '@/components/vocabulary/discovery-modal'
import { VirtualWordList } from '@/components/vocabulary/virtual-word-list'
import { getCollectionName } from '@/lib/utils/collection-name'

export default function VocabularyListPage() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    allWords: contextWords,
    wordLoading: contextLoading,
    selectedCollections,
    updateWordSynonyms,
    loadWords: loadAllWordsContext
  } = useCollectionV2()
  // Phase 3: Typesense 페이지네이션 기반 (초기 전체 Firestore 로드 제거)
  const [loadedWords, setLoadedWords] = useState<UnifiedWord[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const [studyMap, setStudyMap] = useState<Map<string, any>>(new Map())
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
    console.log('📋 Current loaded words count:', contextWords.length)
    
    try {
      // 약간의 지연을 추가하여 이전 모달이 완전히 정리되도록 함
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 1. 현재 로드된 단어 목록에서 먼저 찾기
      const localMatch = contextWords.find(w => 
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

  const collectionIds = selectedCollections.map(c => c.id).filter(Boolean).join(',')
  const PER_PAGE = 100

  // Typesense doc → UnifiedWord (렌더용 최소 필드)
  const docToWord = (d: any): UnifiedWord => ({
    id: d.id,
    word: d.word,
    definition: d.koreanDefinition || d.definition || '',
    englishDefinition: d.englishDefinition || '',
    partOfSpeech: Array.isArray(d.partOfSpeech) ? d.partOfSpeech : [],
    difficulty: d.difficulty,
  } as UnifiedWord)

  // 사용자 학습 상태 1회 로드 (studyStatus 매핑용; 학습한 단어만이라 보통 작음)
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch(`/api/user-words?userId=${user.uid}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d) return
        const m = new Map<string, any>()
        ;(d.userWords || []).forEach((uw: any) => {
          if (uw.wordId && uw.studyStatus) m.set(uw.wordId, uw.studyStatus)
        })
        setStudyMap(m)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user])

  // 한 페이지 조회 (Typesense; q 없으면 전체 브라우징)
  const fetchPage = useCallback(async (pageNum: number, term: string) => {
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(term)}&collectionIds=${encodeURIComponent(collectionIds)}&page=${pageNum}&perPage=${PER_PAGE}`
    )
    return res.json()
  }, [collectionIds])

  // 검색어/컬렉션 변경 → 1페이지 로드 (디바운스). 초기 전체 로드 없음.
  useEffect(() => {
    if (!user || selectedCollections.length === 0) {
      setLoadedWords([]); setLoading(false); return
    }
    let cancelled = false
    setLoading(true)
    const run = async () => {
      const term = searchTerm.trim()
      try {
        const data = await fetchPage(1, term)
        if (cancelled) return
        if (data && data.fallback) {
          // Typesense 미설정/다운 → Firestore 전체 로드 폴백 (기존 동작)
          setUsingFallback(true)
          await loadAllWordsContext(10000)
          if (!cancelled) setLoading(false)
          return
        }
        setUsingFallback(false)
        const docs: any[] = Array.isArray(data.docs) ? data.docs : []
        setLoadedWords(docs.map(docToWord))
        setTotal(data.found || docs.length)
        setPage(1)
        setHasMore(docs.length < (data.found || 0))
        setLoading(false)
      } catch {
        if (!cancelled) {
          setUsingFallback(true)
          await loadAllWordsContext(10000)
          setLoading(false)
        }
      }
    }
    const debounce = setTimeout(run, 250)
    return () => { cancelled = true; clearTimeout(debounce) }
  }, [collectionIds, searchTerm, user, selectedCollections.length, fetchPage, loadAllWordsContext])

  // 무한스크롤: 다음 페이지 누적
  const loadMore = useCallback(async () => {
    if (usingFallback || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const data = await fetchPage(next, searchTerm.trim())
      if (data && !data.fallback && Array.isArray(data.docs)) {
        setLoadedWords(prev => {
          const merged = [...prev, ...data.docs.map(docToWord)]
          setHasMore(merged.length < (data.found || total))
          return merged
        })
        setPage(next)
      }
    } finally {
      setLoadingMore(false)
    }
  }, [usingFallback, loadingMore, hasMore, page, searchTerm, fetchPage, total])

  // 표시 소스 (폴백 시 Firestore contextWords) + studyStatus 머지 + 상태 필터
  const filteredWords = useMemo(() => {
    const source = usingFallback ? contextWords : loadedWords
    let words = source.map(w => {
      const st = studyMap.get(w.id)
      return st ? ({ ...w, studyStatus: st } as UnifiedWord) : w
    })
    switch (filterType) {
      case 'studied': words = words.filter(w => (w.studyStatus?.reviewCount || 0) > 0); break
      case 'not-studied': words = words.filter(w => (w.studyStatus?.reviewCount || 0) === 0); break
      case 'mastered': words = words.filter(w => (w.studyStatus?.masteryLevel || 0) >= 80); break
    }
    return words
  }, [usingFallback, contextWords, loadedWords, studyMap, filterType])

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

  // ===== 가상화: 대량 단어를 한 번에 DOM에 렌더하지 않도록 행 단위 윈도우 가상화 =====
  // 반응형 컬럼 수 (md:2 lg:3 xl:4, 기본 1) — 기존 그리드와 동일한 브레이크포인트
  const [columns, setColumns] = useState(1)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      setColumns(w >= 1280 ? 4 : w >= 1024 ? 3 : w >= 768 ? 2 : 1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const listRef = useRef<HTMLDivElement>(null)
  const rowCount = Math.ceil(filteredWords.length / columns)
  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 180, // 카드 행 추정 높이 (실제 높이는 measureElement로 보정)
    overscan: 6,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  })

  const gridColsClass: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }

  // 무한스크롤: 마지막 행 근처에 도달하면 다음 페이지 로드
  const virtualItems = rowVirtualizer.getVirtualItems()
  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1]
    if (!last) return
    if (last.index >= rowCount - 2 && hasMore && !loadingMore && !usingFallback) {
      loadMore()
    }
  }, [virtualItems, rowCount, hasMore, loadingMore, usingFallback, loadMore])

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
        subtitle={`${selectedCollections.map(wb => getCollectionName(wb.name)).join(', ')} - ${usingFallback ? filteredWords.length : total}개 단어`}
        backPath="/unified-dashboard"
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

      {/* 단어 목록 - 행 단위 윈도우 가상화 (대량 단어도 보이는 만큼만 DOM 렌더) */}
      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : filteredWords.length === 0 ? (
        <div className="text-center py-12 text-gray-500">단어가 없습니다</div>
      ) : (
        <div ref={listRef}>
          <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const start = virtualRow.index * columns
              const rowWords = filteredWords.slice(start, start + columns)
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                  }}
                >
                  <div className={`grid ${gridColsClass[columns]} gap-4 pb-4`}>
                    {rowWords.map((word, idx) => {
                      const index = start + idx
                      return (
            <Card
              key={`${word.id}-${index}`}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openModal(word)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{word.word}</h3>
                  {Array.isArray(word.partOfSpeech) && word.partOfSpeech.map(pos => (
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
                  {/* Only show difficulty for non-personal collection words */}
                  {word.source?.collection !== 'personal_collection_words' && (
                    <span className={`text-sm font-medium ${getDifficultyColor(word.difficulty || 5)}`}>
                      Lv.{word.difficulty}
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mb-1 break-words whitespace-normal">
                {(() => {
                  if (!word.definition) return 'No definition available'
                  
                  // Etymology 정보가 포함된 경우 첫 줄만 표시
                  const lines = word.definition.split('\n')
                  const firstLine = lines[0].trim()
                  
                  // "From" 또는 "Etymology"로 시작하는 라인 제거
                  const cleanedLines = lines.filter(line => 
                    !line.trim().startsWith('From ') && 
                    !line.trim().toLowerCase().includes('etymology')
                  )
                  
                  return cleanedLines.length > 0 ? cleanedLines[0] : firstLine
                })()}
              </p>
              
              {word.englishDefinition && (
                <p className="text-xs text-gray-500 break-words whitespace-normal">
                  {getFieldString(word.englishDefinition)}
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
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
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