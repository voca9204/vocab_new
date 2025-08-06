'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { WordAdapter } from '@/lib/adapters/word-adapter'
import type { UnifiedWord } from '@/types/unified-word'

interface VocabularyContextType {
  // Data (UnifiedWord 사용)
  words: UnifiedWord[]
  allWords: UnifiedWord[] // 필터링되지 않은 전체 단어
  loading: boolean
  error: string | null
  
  // Operations
  loadWords: (limit?: number) => Promise<void>
  updateWordSynonyms: (wordId: string, synonyms: string[]) => Promise<void>
  getWordById: (id: string) => UnifiedWord | undefined
  getWordByText: (word: string) => Promise<UnifiedWord | null>
  refreshWords: () => Promise<void>
  
  // Filters
  filter: {
    studyMode: 'all' | 'not-studied' | 'studied'
    partOfSpeech?: string[]
    difficulty?: { min: number; max: number }
    source?: string[] // 소스별 필터링 추가
  }
  setFilter: (filter: Partial<VocabularyContextType['filter']>) => void
  
  // Adapter stats
  getAdapterStats: () => any
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined)

export function useVocabulary() {
  const context = useContext(VocabularyContext)
  if (!context) {
    throw new Error('useVocabulary must be used within VocabularyProvider')
  }
  return context
}

interface VocabularyProviderProps {
  children: React.ReactNode
}

export function VocabularyProvider({ children }: VocabularyProviderProps) {
  const { user } = useAuth()
  const CACHE_DURATION = 10 * 60 * 1000 // 10분 캐시
  const CACHE_KEY = 'vocabulary-cache-v2' // 버전 업데이트로 캐시 무효화
  
  // 캐시된 데이터 복원
  const getCachedData = useCallback(() => {
    if (typeof window === 'undefined') return null
    
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (!cached) return null
      
      const data = JSON.parse(cached)
      const now = Date.now()
      
      // 캐시 유효성 검사
      if (data.timestamp && (now - data.timestamp) < CACHE_DURATION && data.userId === user?.uid) {
        console.log('[VocabularyContext] Restoring from sessionStorage cache')
        return data
      }
      
      // 캐시 만료 또는 다른 사용자
      sessionStorage.removeItem(CACHE_KEY)
      return null
    } catch (error) {
      console.error('[VocabularyContext] Error reading cache:', error)
      return null
    }
  }, [user?.uid, CACHE_DURATION])
  
  // 캐시 데이터로 초기화
  const cachedData = getCachedData()
  
  const [allWords, setAllWords] = useState<UnifiedWord[]>(cachedData?.allWords || [])
  const [words, setWords] = useState<UnifiedWord[]>([]) // 필터링된 단어는 나중에 설정
  const [loading, setLoading] = useState(!cachedData) // 캐시가 있으면 로딩 false
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilterState] = useState<VocabularyContextType['filter']>(
    cachedData?.filter || { studyMode: 'all' }
  )
  const [lastLoadTime, setLastLoadTime] = useState<number>(cachedData?.timestamp || 0)
  const [cachedVocabularies, setCachedVocabularies] = useState<string[]>(cachedData?.vocabularies || [])
  const [isInitialized, setIsInitialized] = useState(!!cachedData)
  
  // WordAdapter 인스턴스 (메모이제이션)
  const [wordAdapter] = useState(() => new WordAdapter({
    enableCache: true,
    enableBackgroundMigration: true
  }))
  
  // Refs for stable values in callbacks
  const allWordsRef = useRef<UnifiedWord[]>(allWords)
  const lastLoadTimeRef = useRef<number>(lastLoadTime)
  const cachedVocabulariesRef = useRef<string[]>(cachedVocabularies)
  
  // 캐시 저장
  const saveCacheData = useCallback(() => {
    if (typeof window === 'undefined' || !user?.uid) return
    
    try {
      const cacheData = {
        allWords: allWordsRef.current,
        filter,
        timestamp: lastLoadTimeRef.current,
        vocabularies: cachedVocabulariesRef.current,
        userId: user.uid
      }
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      console.log('[VocabularyContext] Saved to sessionStorage cache:', {
        allWordsCount: allWordsRef.current.length,
        filter,
        vocabularies: cachedVocabulariesRef.current
      })
    } catch (error) {
      console.error('[VocabularyContext] Error saving cache:', error)
    }
  }, [user?.uid, filter])
  
  // 필터 적용 함수 (loadWords보다 먼저 정의)
  const applyFilters = useCallback((words: UnifiedWord[], currentFilter: typeof filter): UnifiedWord[] => {
    let filtered = [...words]

    // 품사 필터
    if (currentFilter.partOfSpeech && currentFilter.partOfSpeech.length > 0) {
      filtered = filtered.filter(word => 
        word.partOfSpeech.some(pos => currentFilter.partOfSpeech!.includes(pos))
      )
    }

    // 난이도 필터
    if (currentFilter.difficulty) {
      filtered = filtered.filter(word => 
        word.difficulty >= currentFilter.difficulty!.min && 
        word.difficulty <= currentFilter.difficulty!.max
      )
    }

    // 소스 필터
    if (currentFilter.source && currentFilter.source.length > 0) {
      filtered = filtered.filter(word => 
        currentFilter.source!.includes(word.source.type)
      )
    }

    // 학습 상태 필터
    if (currentFilter.studyMode !== 'all') {
      filtered = filtered.filter(word => {
        const studied = word.studyStatus?.studied || false
        return currentFilter.studyMode === 'studied' ? studied : !studied
      })
    }

    return filtered
  }, [])
  
  // Update refs when state changes
  useEffect(() => {
    allWordsRef.current = allWords
  }, [allWords])
  
  useEffect(() => {
    lastLoadTimeRef.current = lastLoadTime
  }, [lastLoadTime])
  
  useEffect(() => {
    cachedVocabulariesRef.current = cachedVocabularies
  }, [cachedVocabularies])
  
  // 데이터 변경 시 캐시 저장
  useEffect(() => {
    if (isInitialized && allWords.length > 0) {
      saveCacheData()
    }
  }, [isInitialized, allWords.length, saveCacheData])
  
  // 캐시된 데이터가 있을 때 초기 필터 적용
  useEffect(() => {
    if (cachedData && allWords.length > 0 && words.length === 0) {
      console.log('[VocabularyContext] Applying initial filter to cached data')
      const filteredWords = applyFilters(allWords, filter)
      setWords(filteredWords)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 초기 마운트 시에만 실행

  // 단어 로드 (캐싱 포함) - useCallback 의존성 최소화
  const loadWords = useCallback(async (limit: number = 50, forceReload: boolean = false) => {
    if (!user) return
    
    // 사용자 설정 확인
    const { UserSettingsService } = await import('@/lib/settings/user-settings-service')
    const settingsService = new UserSettingsService()
    const userSettings = await settingsService.getUserSettings(user.uid)
    const selectedVocabularies = userSettings?.selectedVocabularies || []
    
    // 캐시 유효성 검사 - Refs 사용
    const now = Date.now()
    const cacheValid = !forceReload && 
                      (now - lastLoadTimeRef.current) < CACHE_DURATION && 
                      JSON.stringify(selectedVocabularies) === JSON.stringify(cachedVocabulariesRef.current) &&
                      allWordsRef.current.length > 0
    
    if (cacheValid) {
      console.log('[VocabularyContext] Using cached words:', {
        wordsCount: allWordsRef.current.length,
        timeSinceLastLoad: Math.round((now - lastLoadTimeRef.current) / 1000) + 's',
        vocabularies: cachedVocabulariesRef.current
      })
      const filteredWords = applyFilters(allWordsRef.current, filter)
      setWords(filteredWords)
      setLoading(false) // 캐시 사용 시에도 로딩 상태 업데이트
      
      // 캐시 데이터 업데이트 (필터 변경 반영)
      saveCacheData()
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('[VocabularyContext] Loading words with adapter...')
      const loadedWords = await wordAdapter.getWords(limit)
      
      console.log(`[VocabularyContext] Loaded ${loadedWords.length} words`)
      console.log('[VocabularyContext] Sample word:', loadedWords[0])
      
      // 캐시 정보 업데이트
      setLastLoadTime(now)
      setCachedVocabularies(selectedVocabularies)
      
      // 모든 단어 저장
      setAllWords(loadedWords)
      
      // 필터 적용
      const filteredWords = applyFilters(loadedWords, filter)
      setWords(filteredWords)
      console.log(`[VocabularyContext] After filter: ${filteredWords.length} words`)
      
      // 초기화 완료 표시
      setIsInitialized(true)
      
      // 데이터 로드 완료 후 캐시 저장
      saveCacheData()
      
    } catch (err) {
      console.error('[VocabularyContext] Error loading words:', err)
      setError(err instanceof Error ? err.message : 'Failed to load words')
    } finally {
      setLoading(false)
    }
  }, [user, wordAdapter, filter, applyFilters, CACHE_DURATION, saveCacheData]) // 의존성 최소화, refs 사용

  // 필터 설정
  const setFilter = useCallback((newFilter: Partial<VocabularyContextType['filter']>) => {
    console.log('[VocabularyContext] setFilter called:', {
      currentFilter: filter,
      newFilter,
      allWordsCount: allWords.length
    })
    
    const updatedFilter = { ...filter, ...newFilter }
    setFilterState(updatedFilter)
    
    // 전체 단어에 필터 재적용
    if (allWords.length > 0) {
      const filteredWords = applyFilters(allWords, updatedFilter)
      console.log('[VocabularyContext] Filter applied:', {
        totalWords: allWords.length,
        filteredWords: filteredWords.length,
        filter: updatedFilter
      })
      setWords(filteredWords)
      
      // 필터 변경 시 캐시 업데이트 - 약간의 지연 추가
      setTimeout(() => {
        saveCacheData()
      }, 100)
    }
  }, [filter, allWords, applyFilters, saveCacheData])

  // ID로 단어 조회
  const getWordById = useCallback((id: string): UnifiedWord | undefined => {
    return words.find(word => word.id === id)
  }, [words])

  // 텍스트로 단어 조회 (어댑터 사용)
  const getWordByText = useCallback(async (wordText: string): Promise<UnifiedWord | null> => {
    try {
      return await wordAdapter.getWordByText(wordText)
    } catch (error) {
      console.error('[VocabularyContext] Error getting word by text:', error)
      return null
    }
  }, [wordAdapter])

  // 유사어 업데이트
  const updateWordSynonyms = useCallback(async (wordId: string, synonyms: string[]) => {
    try {
      // 메모리 업데이트
      setWords(prevWords => 
        prevWords.map(word => 
          word.id === wordId 
            ? { ...word, synonyms }
            : word
        )
      )
      
      // DB 업데이트 - 단어가 어느 컬렉션에 있는지 확인
      const word = await wordAdapter.getWordById(wordId)
      if (word && word.source) {
        const { auth } = await import('@/lib/firebase/config')
        const userId = auth.currentUser?.uid
        
        if (!userId) {
          console.error('[VocabularyContext] No user logged in')
          return
        }
        
        // API를 통해 서버에서 업데이트 (권한 문제 해결)
        const response = await fetch('/api/update-synonyms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            wordId,
            synonyms,
            collection: word.source.collection
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to update synonyms in DB')
        }
        
        console.log(`[VocabularyContext] Updated synonyms in DB for ${wordId}:`, synonyms)
      }
      
      console.log(`[VocabularyContext] Updated synonyms for ${wordId}:`, synonyms)
    } catch (error) {
      console.error('[VocabularyContext] Error updating synonyms:', error)
      throw error
    }
  }, [wordAdapter])

  // 단어 새로고침
  const refreshWords = useCallback(async () => {
    console.log('[VocabularyContext] Refresh words called')
    
    // 캐시 초기화
    wordAdapter.clearCache()
    sessionStorage.removeItem(CACHE_KEY) // 세션 캐시도 삭제
    
    // 캐시 관련 상태 초기화
    setLastLoadTime(0)
    setCachedVocabularies([])
    setIsInitialized(false)
    
    // 강제 새로고침
    await loadWords(2000, true)
    
    // 컴포넌트 업데이트를 위한 이벤트 발생
    window.dispatchEvent(new Event('vocabulary-refreshed'))
    
    console.log('[VocabularyContext] Refresh words completed')
  }, [loadWords, wordAdapter]) // CACHE_KEY는 상수이므로 의존성에서 제외

  // 어댑터 통계
  const getAdapterStats = useCallback(() => {
    return wordAdapter.getStats()
  }, [wordAdapter])

  // 초기 로드 처리
  useEffect(() => {
    if (user && !isInitialized && allWords.length === 0) {
      console.log('[VocabularyContext] Initial load for user:', user.uid)
      loadWords(2000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInitialized, allWords.length]) // loadWords는 의도적으로 제외
  
  // 로딩 상태 업데이트
  useEffect(() => {
    if (isInitialized && allWords.length > 0 && loading) {
      console.log('[VocabularyContext] Data ready, updating loading state')
      setLoading(false)
    }
  }, [isInitialized, allWords.length, loading])
  
  // 필터 변경 시 words 업데이트
  useEffect(() => {
    if (isInitialized && allWords.length > 0) {
      console.log('[VocabularyContext] Filter change detected, reapplying filter')
      const filteredWords = applyFilters(allWords, filter)
      setWords(filteredWords)
    }
  }, [filter, isInitialized, allWords, applyFilters])

  // 단어 업데이트 이벤트 리스너
  useEffect(() => {
    const handleWordUpdate = (event: CustomEvent) => {
      const { wordId, type } = event.detail
      console.log(`[VocabularyContext] Word updated: ${wordId} (${type})`)
      
      // 해당 단어 다시 로드
      wordAdapter.getWordById(wordId).then(updatedWord => {
        if (updatedWord) {
          // allWords 업데이트
          setAllWords(prevWords => 
            prevWords.map(word => 
              word.id === wordId ? updatedWord : word
            )
          )
          // words도 업데이트
          setWords(prevWords => 
            prevWords.map(word => 
              word.id === wordId ? updatedWord : word
            )
          )
        }
      })
    }

    window.addEventListener('word-updated', handleWordUpdate as EventListener)
    return () => window.removeEventListener('word-updated', handleWordUpdate as EventListener)
  }, [wordAdapter])

  const value: VocabularyContextType = {
    words,
    allWords,
    loading,
    error,
    loadWords,
    updateWordSynonyms,
    getWordById,
    getWordByText,
    refreshWords,
    filter,
    setFilter,
    getAdapterStats
  }

  return (
    <VocabularyContext.Provider value={value}>
      {children}
    </VocabularyContext.Provider>
  )
}