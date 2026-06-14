'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { wordAdapterBridge as WordAdapter } from '@/lib/adapters/word-adapter-bridge'
import { UserSettingsService } from '@/lib/settings/user-settings-service'
import { CollectionService } from '@/lib/services/collection-service'
import { getCollectionName } from '@/lib/utils/collection-name'
import type { UnifiedWord } from '@/types/unified-word'
import type {
  OfficialCollection,
  PersonalCollection,
  VocabularyCollection,
  CollectionFilterOptions
} from '@/types/collections'
import type {
  UserSettings,
  SelectedWordbook,
  DEFAULT_USER_SETTINGS
} from '@/types/user-settings'

// ============= 새로운 통합 타입 정의 =============

// Collection으로 용어 통일
export interface Collection {
  id: string
  name: string
  displayName?: string
  description?: string
  type: 'official' | 'personal' | 'ai-generated' | 'photo'
  category?: string // SAT, TOEFL, etc.
  difficulty?: 'beginner' | 'intermediate' | 'advanced' // 난이도 필드 추가
  wordCount: number
  words: string[] // Word IDs
  createdAt: Date
  updatedAt: Date
  
  // 메타데이터
  metadata?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    tags?: string[]
    publisher?: string
    version?: string
  }
  
  // 소유권 정보
  ownership?: {
    userId?: string
    userEmail?: string
    isPublic?: boolean
    canEdit?: boolean
  }
  
  // 학습 진도 (클라이언트 사이드)
  progress?: {
    studied: number
    mastered: number
    lastStudiedAt?: Date
    accuracyRate?: number
  }
  
  // UI 상태 (클라이언트 사이드)
  isSelected?: boolean
}

// 선택된 컬렉션 정보
export interface SelectedCollection {
  id: string
  type: Collection['type']
  name: string
  selectedAt: Date
  priority?: number
}

// Context 타입 정의
interface CollectionContextV2Type {
  // ===== Collections (단어장) =====
  collections: Collection[]
  selectedCollections: Collection[]
  collectionLoading: boolean
  collectionError: string | null
  
  // Collection 작업
  loadCollections: () => Promise<void>
  selectCollection: (collectionId: string, priority?: number) => Promise<void>
  selectSingleCollection: (collectionId: string) => Promise<void> // 단일 선택 모드
  unselectCollection: (collectionId: string) => Promise<void>
  toggleCollection: (collectionId: string) => Promise<void>
  refreshCollections: () => Promise<void>
  getCollectionById: (id: string) => Collection | undefined
  
  // ===== Words (단어 데이터) =====
  words: UnifiedWord[] // 필터링된 단어
  allWords: UnifiedWord[] // 전체 단어
  wordLoading: boolean
  wordError: string | null
  
  // Word 작업
  loadWords: (limit?: number) => Promise<void>
  loadMoreWords: (limit?: number) => Promise<void>
  refreshWords: () => Promise<void>
  getWordById: (id: string) => UnifiedWord | undefined
  hasMoreWords: boolean
  currentPage: number
  totalAvailableWords: number
  getWordByText: (word: string) => Promise<UnifiedWord | null>
  updateWordSynonyms: (wordId: string, synonyms: string[]) => Promise<void>
  
  // ===== Filters (필터링) =====
  filter: {
    studyMode: 'all' | 'not-studied' | 'studied'
    partOfSpeech?: string[]
    difficulty?: { min: number; max: number }
    source?: string[]
    collectionId?: string // 특정 컬렉션만
  }
  setFilter: (filter: Partial<CollectionContextV2Type['filter']>) => void
  
  collectionFilter: {
    type?: Collection['type'] | Collection['type'][]
    category?: string[]
    search?: string
    sortBy?: 'name' | 'created' | 'updated' | 'wordCount'
    sortOrder?: 'asc' | 'desc'
  }
  setCollectionFilter: (filter: Partial<CollectionContextV2Type['collectionFilter']>) => void
  
  // ===== User Settings =====
  userSettings: UserSettings | null
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>
  
  // ===== Statistics =====
  getStats: () => {
    totalCollections: number
    selectedCollections: number
    totalWords: number
    studiedWords: number
    masteredWords: number
    overallProgress: number
  }
  
  // ===== Legacy Compatibility (하위 호환성) =====
  // VocabularyContext 호환
  loading: boolean // wordLoading alias
  error: string | null // wordError alias
  
  // UnifiedVocabularyContext 호환
  wordbooks: Collection[] // collections alias
  selectedWordbooks: Collection[] // selectedCollections alias
  selectWordbook: (id: string, priority?: number) => Promise<void> // selectCollection alias
  unselectWordbook: (id: string) => Promise<void> // unselectCollection alias
  
  // Adapter
  getAdapterStats: () => any
}

// Context 생성
const CollectionContextV2 = createContext<CollectionContextV2Type | undefined>(undefined)

// Hook
export function useCollectionV2() {
  const context = useContext(CollectionContextV2)
  if (!context) {
    throw new Error('useCollectionV2 must be used within CollectionProviderV2')
  }
  return context
}

// Legacy hooks for compatibility
export function useVocabulary() {
  return useCollectionV2()
}

export function useUnifiedVocabulary() {
  return useCollectionV2()
}

// Provider Props
interface CollectionProviderV2Props {
  children: React.ReactNode
}

// ============= Provider 구현 =============
export function CollectionProviderV2({ children }: CollectionProviderV2Props) {
  const { user } = useAuth()
  
  // ===== Services =====
  const [wordAdapter] = useState(() => WordAdapter)
  const [settingsService] = useState(() => new UserSettingsService())
  const [collectionService] = useState(() => new CollectionService())
  
  // ===== State: Collections =====
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>([])
  const [collectionLoading, setCollectionLoading] = useState(true)
  const [collectionError, setCollectionError] = useState<string | null>(null)
  
  // ===== State: Words =====
  const [allWords, setAllWords] = useState<UnifiedWord[]>([])
  const [words, setWords] = useState<UnifiedWord[]>([])
  const [wordLoading, setWordLoading] = useState(false) // Start as false since we load on demand
  const [wordError, setWordError] = useState<string | null>(null)

  // ===== State: Pagination =====
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreWords, setHasMoreWords] = useState(false)
  const [totalAvailableWords, setTotalAvailableWords] = useState(0)
  const WORDS_PER_PAGE = 50
  
  // ===== State: Filters =====
  const [filter, setFilterState] = useState<CollectionContextV2Type['filter']>({
    studyMode: 'all'
  })
  const [collectionFilter, setCollectionFilterState] = useState<CollectionContextV2Type['collectionFilter']>({
    sortBy: 'name',
    sortOrder: 'asc'
  })
  
  // ===== State: User Settings =====
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  
  // ===== Refs for stable values =====
  const allWordsRef = useRef(allWords)
  const selectedCollectionsRef = useRef(selectedCollections)
  const hasInitializedRef = useRef(false)
  
  useEffect(() => {
    allWordsRef.current = allWords
  }, [allWords])
  
  useEffect(() => {
    selectedCollectionsRef.current = selectedCollections
  }, [selectedCollections])
  
  // ===== Helper: Convert DB collections to unified Collection type =====
  const convertToCollection = useCallback((
    dbCollection: OfficialCollection | PersonalCollection,
    isSelected: boolean = false,
    aiWordIds?: string[]  // AI Generated 단어 ID 배열 추가
  ): Collection => {
    const isOfficial = 'isOfficial' in dbCollection && dbCollection.isOfficial === true
    
    // 🔍 "내가 발견한 단어" personal 컬렉션을 ai-generated 타입으로 처리
    let collectionType: Collection['type'] = isOfficial ? 'official' : 'personal'
    if (!isOfficial && dbCollection.name === '내가 발견한 단어') {
      console.log(`[convertToCollection] 🎯 Processing AI Generated collection!`)
      console.log(`  - Collection name: ${dbCollection.name}`)
      console.log(`  - Collection ID: ${dbCollection.id}`)
      console.log(`  - Original type: personal -> ai-generated`)
      console.log(`  - Original words:`, dbCollection.words)
      console.log(`  - Received aiWordIds:`, aiWordIds)
      
      collectionType = 'ai-generated'
      
      // ⚠️ Words 배열이 비어있으면 실제 AI 단어 ID로 채우기
      if (!dbCollection.words || dbCollection.words.length === 0) {
        console.warn(`[convertToCollection] ⚠️ AI Generated collection "${dbCollection.name}" has empty words array!`)
        
        if (aiWordIds && aiWordIds.length > 0) {
          console.log(`[convertToCollection] 🔧 Filling empty words array with ${aiWordIds.length} AI word IDs`)
          dbCollection.words = [...aiWordIds] // 새 배열 생성
        } else {
          console.warn(`[convertToCollection] ❌ No AI word IDs available - setting wordCount to 0`)
          // 🔧 실제 단어가 없으면 wordCount를 0으로 설정
          dbCollection.wordCount = 0
        }
      }
      
      console.log(`[convertToCollection] 🔧 Final words array after processing:`, dbCollection.words)
    }
    
    // AI Generated 컬렉션의 경우 실제 AI 단어 ID 사용
    let finalWords = dbCollection.words
    if (collectionType === 'ai-generated' && aiWordIds && aiWordIds.length > 0) {
      finalWords = aiWordIds
      console.log(`[CollectionV2] 🔧 Using actual AI word IDs for AI Generated collection:`, finalWords)
    }
    
    return {
      id: dbCollection.id,
      name: getCollectionName(dbCollection.name),
      displayName: isOfficial && (dbCollection as OfficialCollection).displayName
        ? getCollectionName((dbCollection as OfficialCollection).displayName)
        : undefined,
      description: dbCollection.description,
      type: collectionType,
      category: isOfficial ? (dbCollection as OfficialCollection).category : undefined,
      difficulty: isOfficial ? (dbCollection as OfficialCollection).difficulty : undefined, // 최상위 레벨에 difficulty 추가
      // AI 컬렉션은 실제 로드되는 단어 ID 수를 wordCount로 사용 (stale count 방지)
      wordCount: collectionType === 'ai-generated' && finalWords
        ? finalWords.length
        : dbCollection.wordCount,
      words: finalWords,
      createdAt: dbCollection.createdAt,
      updatedAt: dbCollection.updatedAt,
      metadata: {
        difficulty: isOfficial ? (dbCollection as OfficialCollection).difficulty : undefined,
        tags: dbCollection.tags,
        publisher: isOfficial ? (dbCollection as OfficialCollection).source?.publisher : undefined,
        version: isOfficial ? (dbCollection as OfficialCollection).version : undefined
      },
      ownership: !isOfficial ? {
        userId: (dbCollection as PersonalCollection).userId,
        userEmail: (dbCollection as PersonalCollection).userEmail,
        isPublic: !(dbCollection as PersonalCollection).isPrivate,
        canEdit: true
      } : undefined,
      progress: dbCollection.statistics ? {
        studied: (dbCollection.statistics as any).studied || 0,
        mastered: (dbCollection.statistics as any).mastered || 0
      } : undefined,
      isSelected
    }
  }, [])
  
  // ===== Load User Settings =====
  const loadUserSettings = useCallback(async () => {
    if (!user) return null
    
    try {
      const settings = await settingsService.getUserSettings(user.uid)
      
      if (!settings) {
        // Create default settings
        const defaultSettings: UserSettings = {
          ...DEFAULT_USER_SETTINGS,
          userId: user.uid,
          selectedVocabularies: [],
          selectedWordbooks: [],
          createdAt: new Date(),
          updatedAt: new Date()
        } as UserSettings
        
        await settingsService.updateUserSettings(user.uid, defaultSettings)
        setUserSettings(defaultSettings)
        return defaultSettings
      }
      
      setUserSettings(settings)
      return settings
    } catch (error) {
      console.error('[CollectionV2] Error loading user settings:', error)
      setCollectionError('Failed to load user settings')
      return null
    }
  }, [user, settingsService])
  
  // ===== Load Collections =====
  const loadCollections = useCallback(async () => {
    if (!user) return
    
    setCollectionLoading(true)
    setCollectionError(null)
    
    try {
      console.log('[CollectionV2] Loading collections...')
      
      // Load user settings first
      const settings = userSettings || await loadUserSettings()
      
      // Use CollectionService to load collections
      console.log('[CollectionV2] Loading official collections...')
      const officialResponse = await collectionService.getOfficialCollections({
        limit: 50,
        sortBy: 'category'
      })
      console.log('[CollectionV2] Official collections loaded:', officialResponse.collections.length)
      officialResponse.collections.forEach(c => {
        console.log(`[CollectionV2] Official: ${c.name} (${c.wordCount} words, category: ${c.category})`)
      })
      
      // TODO: Add getUserCollections method to CollectionService
      // For now, use direct fetch for personal collections
      // Get the current user's ID token for authentication
      let personalCollections = []
      try {
        const idToken = await user.getIdToken()
        const personalResponse = await fetch(`/api/collections/personal?userId=${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })
        
        if (!personalResponse.ok) {
          console.error('[CollectionV2] Failed to fetch personal collections:', personalResponse.status)
          // Continue with empty personal collections instead of throwing
        } else {
          const data = await personalResponse.json()
          personalCollections = data.collections || []
        }
      } catch (error) {
        console.error('[CollectionV2] Error fetching personal collections:', error)
        // Continue with empty personal collections
      }
      
      // 🔧 AI Generated 단어 ID 수집 (personal 컬렉션 words 배열이 비어있는 경우 대비)
      let aiWordIds: string[] = []
      
      try {
        const { collection: firestoreCollection, getDocs, query, where } = await import('firebase/firestore')
        const firebaseConfig = await import('@/lib/firebase/config')
        const db = firebaseConfig.db
        
        if (!db) {
          console.error('[CollectionV2] Firebase db is undefined!')
          throw new Error('Firebase db is not initialized')
        }
        
        const aiGeneratedRef = firestoreCollection(db, 'ai_generated_words')
        const aiGeneratedQuery = query(aiGeneratedRef, where('userId', '==', user.uid))
        const aiGeneratedSnapshot = await getDocs(aiGeneratedQuery)
        
        aiGeneratedSnapshot.docs.forEach(doc => aiWordIds.push(doc.id))
        console.log(`[CollectionV2] 🔍 Found ${aiWordIds.length} AI Generated word IDs:`, aiWordIds)
        
      } catch (error) {
        console.error('[CollectionV2] Error loading AI generated word IDs:', error)
      }
      
      console.log(`[CollectionV2] 🔍 About to convert collections. Personal collections count: ${personalCollections.length}`)
      
      // Personal 컬렉션 중 "내가 발견한 단어" 찾기
      const aiGeneratedPersonalCollection = personalCollections.find(c => c.name === '내가 발견한 단어')
      if (aiGeneratedPersonalCollection) {
        console.log(`[CollectionV2] 🔍 Found "내가 발견한 단어" personal collection BEFORE conversion:`)
        console.log(`  - ID: ${aiGeneratedPersonalCollection.id}`)
        console.log(`  - Name: ${aiGeneratedPersonalCollection.name}`)
        console.log(`  - WordCount: ${aiGeneratedPersonalCollection.wordCount}`)
        console.log(`  - Words array:`, aiGeneratedPersonalCollection.words)
        console.log(`  - Available AI word IDs:`, aiWordIds)
      }
      
      // Convert to unified Collection type - AI word IDs 전달
      const allCollections: Collection[] = [
        ...officialResponse.collections.map((c: OfficialCollection) => convertToCollection(c, false, aiWordIds)),
        ...personalCollections.map((c: PersonalCollection) => convertToCollection(c, false, aiWordIds))
      ]
      
      // 변환 후 AI Generated 컬렉션 확인
      const convertedAiCollection = allCollections.find(c => c.name === '내가 발견한 단어')
      if (convertedAiCollection) {
        console.log(`[CollectionV2] 🔍 "내가 발견한 단어" collection AFTER conversion:`)
        console.log(`  - Type: ${convertedAiCollection.type}`)
        console.log(`  - Words array:`, convertedAiCollection.words)
        console.log(`  - Words length: ${convertedAiCollection.words?.length || 0}`)
      }
      
      // ✅ "내가 발견한 단어" personal 컬렉션이 이미 ai-generated 타입으로 변환됨
      console.log(`[CollectionV2] Personal collections converted, AI collections handled via type conversion`)
      
      // Determine selected collections based on settings
      const selectedIds = new Set<string>()
      
      // Handle legacy selectedVocabularies
      if (settings?.selectedVocabularies && settings.selectedVocabularies.length > 0) {
        settings.selectedVocabularies.forEach(name => {
          const collection = allCollections.find(c => c.name === name || c.displayName === name)
          if (collection) {
            selectedIds.add(collection.id)
          }
        })
      }
      
      // Ver.4: selectedWordbooks 자동 적용 제거 - 사용자가 명시적으로 선택한 것만 사용
      // if (settings?.selectedWordbooks && settings.selectedWordbooks.length > 0) {
      //   settings.selectedWordbooks.forEach(wb => {
      //     selectedIds.add(wb.id)
      //   })
      // }
      
      // If nothing selected, select first official collection by default
      if (selectedIds.size === 0 && allCollections.length > 0) {
        const firstOfficial = allCollections.find(c => c.type === 'official')
        if (firstOfficial) {
          selectedIds.add(firstOfficial.id)
        }
      }
      
      // Mark selected collections
      const collectionsWithSelection = allCollections.map(c => ({
        ...c,
        isSelected: selectedIds.has(c.id)
      }))
      
      const selected = collectionsWithSelection.filter(c => c.isSelected)
      
      setCollections(collectionsWithSelection)
      setSelectedCollections(selected)
      
      console.log(`[CollectionV2] Loaded ${allCollections.length} collections, ${selected.length} selected`)
      
    } catch (error) {
      console.error('[CollectionV2] Error loading collections:', error)
      setCollectionError('Failed to load collections')
    } finally {
      setCollectionLoading(false)
    }
  }, [user, userSettings, loadUserSettings, convertToCollection])
  
  // ===== Load Words from selected collections =====
  const loadWords = useCallback(async (limit?: number, collectionsToLoad?: Collection[]) => {
    // Use provided collections or fall back to selectedCollections
    const targetCollections = collectionsToLoad || selectedCollections

    if (!user || !targetCollections || targetCollections.length === 0) {
      setWords([])
      setAllWords([])
      setWordLoading(false)
      setCurrentPage(1)
      setHasMoreWords(false)
      setTotalAvailableWords(0)
      return
    }

    setWordLoading(true)
    setWordError(null)

    // ✅ OPTIMIZATION: Enforce limit - default to WORDS_PER_PAGE (50)
    const effectiveLimit = limit || WORDS_PER_PAGE

    try {
      console.log(`[CollectionV2] 🚀 Loading words (limit: ${effectiveLimit}) from ${targetCollections.length} collections...`)

      // Separate collections by type for proper handling
      const aiGeneratedCollections = targetCollections.filter(c => c.type === 'ai-generated')
      const officialCollections = targetCollections.filter(c => c.type === 'official')
      const personalCollections = targetCollections.filter(c => c.type === 'personal')

      // ✅ Calculate total available words
      const totalWords = targetCollections.reduce((sum, c) => sum + c.wordCount, 0)
      setTotalAvailableWords(totalWords)

      console.log(`[CollectionV2] Collections breakdown:`)
      console.log(`  - Official: ${officialCollections.length}`)
      console.log(`  - Personal: ${personalCollections.length}`)
      console.log(`  - AI Generated: ${aiGeneratedCollections.length}`)
      console.log(`  - Total available words: ${totalWords}`)

      let loadedWords: UnifiedWord[] = []

      // Collect words per collection so the session draws evenly from each and
      // the limit is enforced on the TOTAL (previously the limit was applied per
      // collection, multiplying the session size).
      const perCollectionWords: UnifiedWord[][] = []

      // Load words from official collections using getWordsByCollection
      for (const collection of officialCollections) {
        console.log(`[CollectionV2] Loading official collection: ${collection.name} (limit: ${effectiveLimit})`)
        const collectionWords = await wordAdapter.getWordsByCollection(collection.id, 'official', effectiveLimit)
        perCollectionWords.push(collectionWords)
        console.log(`[CollectionV2] ✅ Loaded ${collectionWords.length} words from official collection ${collection.name}`)
      }

      // Load words from personal collections using getWordsByCollection
      for (const collection of personalCollections) {
        console.log(`[CollectionV2] Loading personal collection: ${collection.name} (limit: ${effectiveLimit})`)
        const collectionWords = await wordAdapter.getWordsByCollection(collection.id, 'personal', effectiveLimit)
        perCollectionWords.push(collectionWords)
        console.log(`[CollectionV2] ✅ Loaded ${collectionWords.length} words from personal collection ${collection.name}`)
      }

      // Load words from AI-generated collections - Use standard batch loading ONLY
      for (const aiCollection of aiGeneratedCollections) {
        console.log(`[CollectionV2] 🔍 AI Collection Loading Debug:`)
        console.log(`  - Collection ID: ${aiCollection.id}`)
        console.log(`  - Collection Name: ${aiCollection.name}`)
        console.log(`  - Collection Type: ${aiCollection.type}`)
        console.log(`  - Words array:`, aiCollection.words)
        console.log(`  - Words array length: ${aiCollection.words?.length || 0}`)

        if (aiCollection.words && aiCollection.words.length > 0) {
          console.log(`  - Calling wordAdapter.getWordsByIds with:`, aiCollection.words)

          // Use standard batch loading for AI collections
          const aiWords = await wordAdapter.getWordsByIds(aiCollection.words)
          perCollectionWords.push(aiWords)
          console.log(`  - WordAdapter returned ${aiWords.length} words`)
          console.log(`  - Sample returned words:`, aiWords.slice(0, 2).map(w => ({ id: w.id, word: w.word })))
        } else {
          console.log(`  - ❌ AI collection ${aiCollection.id} has no words - skipping`)
        }
      }

      // Round-robin interleave across collections, dedup by id, and cap to the
      // total session limit. Fixes: (1) per-collection limit multiplying the
      // session size, (2) a shared word appearing twice across collections.
      const seenWordIds = new Set<string>()
      const maxCollectionLen = perCollectionWords.reduce((max, arr) => Math.max(max, arr.length), 0)
      for (let i = 0; i < maxCollectionLen && loadedWords.length < effectiveLimit; i++) {
        for (const collectionWords of perCollectionWords) {
          if (loadedWords.length >= effectiveLimit) break
          const word = collectionWords[i]
          if (word && word.id && !seenWordIds.has(word.id)) {
            seenWordIds.add(word.id)
            loadedWords.push(word)
          }
        }
      }

      // Merge user study status into the final word set (only when AI collections
      // are involved, matching prior behavior; now runs once instead of per collection)
      if (user && aiGeneratedCollections.length > 0) {
        try {
          const response = await fetch(`/api/user-words?userId=${user.uid}`)
          if (response.ok) {
            const { userWords } = await response.json()

            // Merge study status into loaded words
            if (userWords && Array.isArray(userWords)) {
              const userWordMap = new Map(userWords.map((uw: any) => [uw.wordId, uw]))

              loadedWords = loadedWords.map(word => {
                const userWord = userWordMap.get(word.id)
                if (userWord && userWord.studyStatus) {
                  return {
                    ...word,
                    studyStatus: userWord.studyStatus
                  }
                }
                return word
              })

              console.log(`[CollectionV2] Merged study status for ${userWordMap.size} words`)
            }
          }
        } catch (error) {
          console.error('[CollectionV2] Failed to load user study status:', error)
        }
      }
      
      // ⚠️ 전체 DB 로딩 fallback 제거 - 선택된 컬렉션에 단어가 없으면 빈 상태 유지
      if (loadedWords.length === 0) {
        console.log('[CollectionV2] No words found from selected collections')
        console.log('[CollectionV2] This means selected collections are empty or have issues')
        // 빈 배열 유지 - 사용자에게 단어장을 다시 선택하도록 안내
      }
      
      setAllWords(loadedWords)
      setWords(loadedWords) // Initially show all words

      // ✅ Check if there are more words available
      const hasMore = loadedWords.length < totalWords
      setHasMoreWords(hasMore)
      setCurrentPage(1)

      console.log(`[CollectionV2] ✅ Loaded ${loadedWords.length} words`)
      console.log(`[CollectionV2] 📊 Has more words: ${hasMore} (${loadedWords.length}/${totalWords})`)
      
    } catch (error) {
      console.error('[CollectionV2] Error loading words:', error)
      setWordError('Failed to load words')
    } finally {
      setWordLoading(false)
    }
  }, [user, selectedCollections, wordAdapter, WORDS_PER_PAGE])

  // ===== Load More Words (Pagination) =====
  const loadMoreWords = useCallback(async (limit?: number) => {
    if (!user || !selectedCollections || selectedCollections.length === 0 || !hasMoreWords) {
      return
    }

    setWordLoading(true)

    const effectiveLimit = limit || WORDS_PER_PAGE
    const offset = currentPage * WORDS_PER_PAGE

    try {
      console.log(`[CollectionV2] 🔄 Loading more words (page ${currentPage + 1}, offset: ${offset}, limit: ${effectiveLimit})...`)

      const officialCollections = selectedCollections.filter(c => c.type === 'official')
      const personalCollections = selectedCollections.filter(c => c.type === 'personal')

      let moreWords: UnifiedWord[] = []

      // Load more words from official collections
      for (const collection of officialCollections) {
        const collectionWords = await wordAdapter.getWordsByCollection(
          collection.id,
          'official',
          effectiveLimit,
          offset
        )
        moreWords.push(...collectionWords)
      }

      // Load more words from personal collections
      for (const collection of personalCollections) {
        const collectionWords = await wordAdapter.getWordsByCollection(
          collection.id,
          'personal',
          effectiveLimit,
          offset
        )
        moreWords.push(...collectionWords)
      }

      // Append to existing words, deduping by id so pagination and shared
      // collections don't reintroduce words that are already loaded
      const seenIds = new Set<string>()
      const updatedWords = [...allWords, ...moreWords].filter(word => {
        if (!word.id || seenIds.has(word.id)) return false
        seenIds.add(word.id)
        return true
      })
      setAllWords(updatedWords)
      setWords(updatedWords)

      // Update pagination state
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      setHasMoreWords(updatedWords.length < totalAvailableWords)

      console.log(`[CollectionV2] ✅ Loaded ${moreWords.length} more words (total: ${updatedWords.length}/${totalAvailableWords})`)

    } catch (error) {
      console.error('[CollectionV2] Error loading more words:', error)
    } finally {
      setWordLoading(false)
    }
  }, [user, selectedCollections, currentPage, hasMoreWords, allWords, wordAdapter, WORDS_PER_PAGE, totalAvailableWords])

  // ===== Apply filters to words =====
  const applyFilters = useCallback(() => {
    let filtered = [...allWords]
    
    // Study mode filter
    if (filter.studyMode === 'studied') {
      filtered = filtered.filter(w => w.studyStatus?.studied === true)
    } else if (filter.studyMode === 'not-studied') {
      filtered = filtered.filter(w => !w.studyStatus?.studied)
    }
    
    // Part of speech filter
    if (filter.partOfSpeech && filter.partOfSpeech.length > 0) {
      filtered = filtered.filter(word => 
        word.partOfSpeech.some(pos => filter.partOfSpeech!.includes(pos))
      )
    }
    
    // Difficulty filter
    if (filter.difficulty) {
      filtered = filtered.filter(word => 
        word.difficulty >= filter.difficulty!.min && 
        word.difficulty <= filter.difficulty!.max
      )
    }
    
    // Source filter
    if (filter.source && filter.source.length > 0) {
      filtered = filtered.filter(word => 
        filter.source!.includes(word.source.type)
      )
    }
    
    // Collection filter
    if (filter.collectionId) {
      const collection = collections.find(c => c.id === filter.collectionId)
      if (collection) {
        filtered = filtered.filter(word => 
          collection.words.includes(word.id)
        )
      }
    }
    
    setWords(filtered)
  }, [allWords, filter, collections])
  
  // Apply filters when they change
  useEffect(() => {
    applyFilters()
  }, [applyFilters])
  
  // ===== User Settings Update =====
  const updateUserSettings = useCallback(async (settings: Partial<UserSettings>) => {
    if (!user) return
    
    try {
      const updated = {
        ...userSettings,
        ...settings,
        updatedAt: new Date()
      } as UserSettings
      
      await settingsService.updateUserSettings(user.uid, updated)
      setUserSettings(updated)
    } catch (error) {
      console.error('[CollectionV2] Error updating user settings:', error)
    }
  }, [user, userSettings, settingsService])

  // ===== Collection Actions =====
  const selectCollection = useCallback(async (collectionId: string, priority?: number) => {
    const collection = collections.find(c => c.id === collectionId)
    if (!collection || !user) return
    
    console.log(`[selectCollection] 🔍 Selecting collection: ${collection.name}`)
    console.log(`  - Type: ${collection.type}`)
    console.log(`  - Words array:`, collection.words)
    
    // 🔧 AI Generated 컬렉션의 경우 words 배열 강제 수정
    if (collection.type === 'ai-generated' && (!collection.words || collection.words.length === 0)) {
      console.log(`[selectCollection] 🔧 AI Generated collection has empty words array, fetching AI word IDs...`)
      
      try {
        const { collection: firestoreCollection, getDocs, query, where, doc, getDoc } = await import('firebase/firestore')
        const firebaseConfig = await import('@/lib/firebase/config')
        const db = firebaseConfig.db
        
        if (!db) {
          console.error('[selectCollection] Firebase db is undefined!')
          throw new Error('Firebase db is not initialized')
        }
        
        const aiGeneratedRef = firestoreCollection(db, 'ai_generated_words')
        const aiGeneratedQuery = query(aiGeneratedRef, where('userId', '==', user.uid))
        const aiGeneratedSnapshot = await getDocs(aiGeneratedQuery)
        
        const aiWordIds: string[] = []
        console.log(`[selectCollection] 🔧 AI Generated Query Debug:`)
        console.log(`  - User ID: ${user.uid}`)
        console.log(`  - Query collection: ai_generated_words`)
        console.log(`  - Query result: ${aiGeneratedSnapshot.docs.length} documents`)
        
        aiGeneratedSnapshot.docs.forEach(doc => {
          console.log(`  - Found AI word: ${doc.id} (${doc.data()?.word || 'no word field'})`)
          aiWordIds.push(doc.id)
        })
        
        console.log(`[selectCollection] 🔧 Found ${aiWordIds.length} AI word IDs:`, aiWordIds)
        
        // 🔧 ai_generated_words 컬렉션에서 못 찾으면 words 컬렉션에서 찾기
        if (aiWordIds.length === 0) {
          console.log(`[selectCollection] 🔧 No AI words in ai_generated_words, trying words collection...`)
          
          try {
            const wordsRef = firestoreCollection(db, 'words')
            const wordsQuery = query(
              wordsRef, 
              where('source.type', '==', 'ai_generated'),
              where('userId', '==', user.uid)
            )
            const wordsSnapshot = await getDocs(wordsQuery)
            
            console.log(`[selectCollection] 🔧 Words collection query result: ${wordsSnapshot.docs.length} documents`)
            
            wordsSnapshot.docs.forEach(doc => {
              console.log(`  - Found AI word in words: ${doc.id} (${doc.data()?.word || 'no word field'})`)
              aiWordIds.push(doc.id)
            })
            
            console.log(`[selectCollection] 🔧 Total AI word IDs from words collection: ${aiWordIds.length}`)
          } catch (error) {
            console.error('[selectCollection] Error querying words collection:', error)
          }
        }
        
        if (aiWordIds.length > 0) {
          // 컬렉션 객체의 words 배열을 업데이트
          collection.words = aiWordIds
          console.log(`[selectCollection] ✅ Updated AI collection words array with ${aiWordIds.length} word IDs`)
        } else {
          console.warn(`[selectCollection] ❌ No AI words found in both ai_generated_words and words collections for user ${user.uid}`)
          
          // 🔧 마지막 시도: personal 컬렉션 자체의 words 배열 확인
          console.log(`[selectCollection] 🔧 Checking personal collection document itself...`)
          
          try {
            const personalCollectionRef = doc(db, 'personal_collections', collection.id)
            const personalCollectionSnap = await getDoc(personalCollectionRef)
            
            if (personalCollectionSnap.exists()) {
              const personalData = personalCollectionSnap.data()
              console.log(`[selectCollection] 🔧 Personal collection data:`)
              console.log(`  - Name: ${personalData?.name}`)
              console.log(`  - WordCount: ${personalData?.wordCount}`)
              console.log(`  - Words array:`, personalData?.words)
              console.log(`  - Words array length: ${personalData?.words?.length || 0}`)
              
              if (personalData?.words && personalData.words.length > 0) {
                console.log(`[selectCollection] 🔧 Using personal collection's words array`)
                collection.words = personalData.words
                aiWordIds.push(...personalData.words)
              }
            } else {
              console.warn(`[selectCollection] ❌ Personal collection document not found: ${collection.id}`)
            }
          } catch (error) {
            console.error('[selectCollection] Error checking personal collection:', error)
          }
          
          // 🔧 마지막 업데이트: 실제 단어를 찾지 못했다면 wordCount를 0으로 업데이트
          if (aiWordIds.length === 0) {
            console.log(`[selectCollection] 🔧 No words found anywhere, updating wordCount to 0`)
            collection.wordCount = 0
          }
        }
      } catch (error) {
        console.error('[selectCollection] Error fetching AI word IDs:', error)
      }
    }
    
    // Update local state
    const updatedCollections = collections.map(c => ({
      ...c,
      isSelected: c.id === collectionId ? true : c.isSelected,
      // 🔧 AI Generated 컬렉션의 동적 업데이트 반영
      words: c.id === collectionId ? collection.words : c.words
    }))
    
    const newSelected = updatedCollections.filter(c => c.isSelected)
    
    // 🔍 디버깅: 업데이트된 컬렉션 확인
    const selectedCollection = newSelected.find(c => c.id === collectionId)
    if (selectedCollection && selectedCollection.type === 'ai-generated') {
      console.log(`[selectCollection] 🔍 Final selected AI collection:`)
      console.log(`  - Name: ${selectedCollection.name}`)
      console.log(`  - Words array:`, selectedCollection.words)
      console.log(`  - Words length: ${selectedCollection.words?.length || 0}`)
    }
    
    setCollections(updatedCollections)
    setSelectedCollections(newSelected)
    
    // Update user settings - undefined 값 제거
    const selectedInfo: SelectedWordbook = {
      id: collectionId,
      type: collection.type as any,
      name: collection.name,
      selectedAt: new Date()
    }
    
    // priority가 정의된 경우만 추가
    if (priority !== undefined) {
      selectedInfo.priority = priority
    }
    
    const updatedSettings: Partial<UserSettings> = {
      selectedWordbooks: [
        ...(userSettings?.selectedWordbooks || []).filter(wb => wb.id !== collectionId),
        selectedInfo
      ]
    }
    
    await updateUserSettings(updatedSettings)
    
    // Reload words with the new selected collections
    await loadWords(undefined, newSelected)
  }, [collections, user, userSettings, updateUserSettings, loadWords])
  
  // 단일 선택 모드 - 이전 선택을 모두 지우고 하나만 선택
  const selectSingleCollection = useCallback(async (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId)
    if (!collection || !user) return

    console.log(`[selectSingleCollection] 🎯 Single selection mode: ${collection.name}`)

    // 모든 컬렉션 선택 해제하고 선택한 것만 활성화
    const updatedCollections = collections.map(c => ({
      ...c,
      isSelected: c.id === collectionId
    }))

    const newSelected = [collection]

    setCollections(updatedCollections)
    setSelectedCollections(newSelected)

    // Update user settings - 선택한 것만 저장
    const selectedInfo: SelectedWordbook = {
      id: collectionId,
      type: collection.type as any,
      name: collection.name,
      selectedAt: new Date()
    }

    const updatedSettings: Partial<UserSettings> = {
      selectedWordbooks: [selectedInfo]
    }

    await updateUserSettings(updatedSettings)

    // Reload words with the new selected collection
    await loadWords(undefined, newSelected)
  }, [collections, user, userSettings, updateUserSettings, loadWords])

  const unselectCollection = useCallback(async (collectionId: string) => {
    if (!user) return

    // Update local state
    const updatedCollections = collections.map(c => ({
      ...c,
      isSelected: c.id === collectionId ? false : c.isSelected
    }))

    const newSelected = updatedCollections.filter(c => c.isSelected)

    setCollections(updatedCollections)
    setSelectedCollections(newSelected)

    // Update user settings
    const updatedSettings: Partial<UserSettings> = {
      selectedWordbooks: (userSettings?.selectedWordbooks || []).filter(wb => wb.id !== collectionId)
    }

    await updateUserSettings(updatedSettings)

    // Reload words with the new selected collections
    await loadWords(undefined, newSelected)
  }, [collections, user, userSettings, updateUserSettings, loadWords])
  
  const toggleCollection = useCallback(async (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId)
    if (!collection) return
    
    if (collection.isSelected) {
      await unselectCollection(collectionId)
    } else {
      await selectCollection(collectionId)
    }
  }, [collections, selectCollection, unselectCollection])
  
  
  // ===== Other methods =====
  const refreshCollections = useCallback(async () => {
    await loadCollections()
  }, [loadCollections])
  
  const refreshWords = useCallback(async () => {
    await loadWords(undefined, selectedCollectionsRef.current)
  }, [loadWords])
  
  const getCollectionById = useCallback((id: string) => {
    return collections.find(c => c.id === id)
  }, [collections])
  
  const getWordById = useCallback((id: string) => {
    return allWords.find(w => w.id === id)
  }, [allWords])
  
  const getWordByText = useCallback(async (word: string) => {
    return await wordAdapter.searchWordFlexible(word)
  }, [wordAdapter])
  
  const updateWordSynonyms = useCallback(async (wordId: string, synonyms: string[]) => {
    // Update in WordAdapter
    await wordAdapter.updateWordSynonyms(wordId, synonyms)
    
    // Update local state
    setAllWords(prev => prev.map(w => 
      w.id === wordId ? { ...w, synonyms } : w
    ))
  }, [wordAdapter])
  
  const setFilter = useCallback((newFilter: Partial<CollectionContextV2Type['filter']>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }))
  }, [])
  
  const setCollectionFilter = useCallback((newFilter: Partial<CollectionContextV2Type['collectionFilter']>) => {
    setCollectionFilterState(prev => ({ ...prev, ...newFilter }))
  }, [])
  
  const getStats = useCallback(() => {
    const totalWords = selectedCollections.reduce((sum, c) => sum + c.wordCount, 0)
    const studiedWords = selectedCollections.reduce((sum, c) => sum + (c.progress?.studied || 0), 0)
    const masteredWords = selectedCollections.reduce((sum, c) => sum + (c.progress?.mastered || 0), 0)
    const overallProgress = totalWords > 0 ? Math.round((studiedWords / totalWords) * 100) : 0
    
    return {
      totalCollections: collections.length,
      selectedCollections: selectedCollections.length,
      totalWords,
      studiedWords,
      masteredWords,
      overallProgress
    }
  }, [collections, selectedCollections])
  
  const getAdapterStats = useCallback(() => {
    return wordAdapter.getStats()
  }, [wordAdapter])
  
  // ===== Initial load =====
  useEffect(() => {
    if (user && !hasInitializedRef.current) {
      hasInitializedRef.current = true
      loadCollections()
    }
  }, [user, loadCollections])
  
  // ===== Load words when selected collections change =====
  useEffect(() => {
    // Skip if not initialized or if collections are still loading
    if (!hasInitializedRef.current || collectionLoading || selectedCollections.length === 0) {
      return
    }
    
    console.log(`[CollectionV2] Collections loaded and selected (${selectedCollections.length}), loading words...`)
    // Log collection details
    selectedCollections.forEach(c => {
      console.log(`[CollectionV2] Selected: ${c.name} (type: ${c.type}, wordCount: ${c.wordCount}, words: ${c.words?.length || 0})`)
    })
    
    // Check if collections have words to load
    const hasWords = selectedCollections.some(c => c.wordCount > 0)
    if (hasWords) {
      loadWords(undefined, selectedCollections)
    } else {
      console.log(`[CollectionV2] Selected collections have no words to load`)
      setWords([])
      setAllWords([])
      setWordLoading(false) // Ensure loading state is cleared even when no words
    }
  }, [selectedCollections.length, loadWords, collectionLoading]) // Add collectionLoading to dependencies
  
  // ===== Context value =====
  const value: CollectionContextV2Type = {
    // Collections
    collections,
    selectedCollections,
    collectionLoading,
    collectionError,
    loadCollections,
    selectCollection,
    selectSingleCollection,
    unselectCollection,
    toggleCollection,
    refreshCollections,
    getCollectionById,
    
    // Words
    words,
    allWords,
    wordLoading,
    wordError,
    loadWords,
    loadMoreWords,
    refreshWords,
    getWordById,
    getWordByText,
    updateWordSynonyms,
    hasMoreWords,
    currentPage,
    totalAvailableWords,
    
    // Filters
    filter,
    setFilter,
    collectionFilter,
    setCollectionFilter,
    
    // User Settings
    userSettings,
    updateUserSettings,
    
    // Statistics
    getStats,
    
    // Legacy compatibility
    loading: wordLoading,
    error: wordError,
    wordbooks: collections,
    selectedWordbooks: selectedCollections,
    selectWordbook: selectCollection,
    unselectWordbook: unselectCollection,
    
    // Adapter
    getAdapterStats
  }
  
  return (
    <CollectionContextV2.Provider value={value}>
      {children}
    </CollectionContextV2.Provider>
  )
}

// ===== Legacy Provider Wrappers (for backward compatibility) =====
export const VocabularyProvider = CollectionProviderV2
export const UnifiedVocabularyProvider = CollectionProviderV2