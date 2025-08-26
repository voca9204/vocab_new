'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { WordAdapter } from '@/lib/adapters/word-adapter'
import type { UnifiedWord } from '@/types/unified-word'
import type { 
  UnifiedWordbook, 
  WordbookFilter, 
  WordbookAction,
  WordbookProgress,
  adaptOfficialCollection,
  adaptPersonalCollection,
  groupWordbooksByType,
  sortWordbooks,
  searchWordbooks,
  calculateWordbookStats
} from '@/types/unified-wordbook'
import type { 
  UserSettings, 
  SelectedWordbook,
  migrateLegacySettings,
  DEFAULT_USER_SETTINGS 
} from '@/types/user-settings'
import type { OfficialCollection, PersonalCollection } from '@/types/collections'

interface UnifiedVocabularyContextType {
  // 단어장 관리
  wordbooks: UnifiedWordbook[]
  allWordbooks?: UnifiedWordbook[] // Alias for backward compatibility
  selectedWordbooks: UnifiedWordbook[]
  wordbookFilter: WordbookFilter
  setWordbookFilter: (filter: Partial<WordbookFilter>) => void
  
  // 단어 데이터 (선택된 단어장의 모든 단어)
  words: UnifiedWord[]
  allWords: UnifiedWord[]
  loading: boolean
  error: string | null
  
  // 단어장 액션
  selectWordbook: (wordbookId: string, priority?: number) => Promise<void>
  unselectWordbook: (wordbookId: string) => Promise<void>
  toggleWordbook: (wordbookId: string, priority?: number) => Promise<void>
  refreshWordbooks: () => Promise<void>
  loadWordbooks: () => Promise<void>
  
  // 단어 operations (기존 VocabularyContext와 동일)
  loadWords: (limit?: number) => Promise<void>
  updateWordSynonyms: (wordId: string, synonyms: string[]) => Promise<void>
  getWordById: (id: string) => UnifiedWord | undefined
  getWordByText: (word: string) => Promise<UnifiedWord | null>
  refreshWords: () => Promise<void>
  
  // 학습 상태 및 통계
  studySession: {
    currentWordbook?: string
    progress: number
    timeSpent: number
    startedAt?: Date
  }
  updateStudySession: (session: Partial<UnifiedVocabularyContextType['studySession']>) => void
  
  // 통계 및 진도
  getWordbookStats: () => ReturnType<typeof calculateWordbookStats>
  updateWordbookProgress: (wordbookId: string, progress: Partial<WordbookProgress>) => Promise<void>
  
  // 필터링 (기존과 호환)
  filter: {
    studyMode: 'all' | 'not-studied' | 'studied'
    partOfSpeech?: string[]
    difficulty?: { min: number; max: number }
    source?: string[]
    wordbookId?: string // 특정 단어장만 표시
  }
  setFilter: (filter: Partial<UnifiedVocabularyContextType['filter']>) => void
  
  // Adapter stats
  getAdapterStats: () => any
}

const UnifiedVocabularyContext = createContext<UnifiedVocabularyContextType | undefined>(undefined)

export function useUnifiedVocabulary() {
  const context = useContext(UnifiedVocabularyContext)
  if (!context) {
    throw new Error('useUnifiedVocabulary must be used within UnifiedVocabularyProvider')
  }
  return context
}

interface UnifiedVocabularyProviderProps {
  children: React.ReactNode
}

export function UnifiedVocabularyProvider({ children }: UnifiedVocabularyProviderProps) {
  const { user } = useAuth()
  const CACHE_DURATION = 10 * 60 * 1000 // 10분 캐시
  const CACHE_KEY = 'unified-vocabulary-cache-v1'
  
  // State for wordbooks
  const [wordbooks, setWordbooks] = useState<UnifiedWordbook[]>([])
  const [selectedWordbooks, setSelectedWordbooks] = useState<UnifiedWordbook[]>([])
  const [wordbookFilter, setWordbookFilterState] = useState<WordbookFilter>({ sortBy: 'name' })
  const [wordbookLoading, setWordbookLoading] = useState(true)
  
  // State for words (from existing context)
  const [allWords, setAllWords] = useState<UnifiedWord[]>([])
  const [words, setWords] = useState<UnifiedWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilterState] = useState<UnifiedVocabularyContextType['filter']>({ studyMode: 'all' })
  
  // Study session state
  const [studySession, setStudySession] = useState<UnifiedVocabularyContextType['studySession']>({
    progress: 0,
    timeSpent: 0
  })
  
  // User settings
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  
  // WordAdapter instance
  const [wordAdapter] = useState(() => new WordAdapter({
    enableCache: true,
    enableBackgroundMigration: true
  }))
  
  // Refs for stable values
  const allWordsRef = useRef<UnifiedWord[]>(allWords)
  const selectedWordbooksRef = useRef<UnifiedWordbook[]>(selectedWordbooks)
  const hasInitializedRef = useRef(false)
  
  // Update refs when state changes
  useEffect(() => {
    allWordsRef.current = allWords
  }, [allWords])
  
  useEffect(() => {
    selectedWordbooksRef.current = selectedWordbooks
  }, [selectedWordbooks])

  // Import utility functions dynamically
  const getUtilityFunctions = useCallback(async () => {
    const module = await import('@/types/unified-wordbook')
    return {
      adaptOfficialCollection: module.adaptOfficialCollection,
      adaptPersonalCollection: module.adaptPersonalCollection,
      groupWordbooksByType: module.groupWordbooksByType,
      sortWordbooks: module.sortWordbooks,
      searchWordbooks: module.searchWordbooks,
      calculateWordbookStats: module.calculateWordbookStats
    }
  }, [])

  // Load user settings
  const loadUserSettings = useCallback(async () => {
    if (!user) return null
    
    try {
      const { UserSettingsService } = await import('@/lib/settings/user-settings-service')
      const settingsService = new UserSettingsService()
      const settings = await settingsService.getUserSettings(user.uid)
      
      if (!settings) {
        // Create default settings
        const defaultSettings = {
          ...DEFAULT_USER_SETTINGS,
          userId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date()
        } as UserSettings
        
        await settingsService.updateUserSettings(user.uid, defaultSettings)
        return defaultSettings
      }
      
      // Migrate legacy settings if needed
      const { migrateLegacySettings } = await import('@/types/user-settings')
      const migratedSettings = migrateLegacySettings(settings)
      
      return migratedSettings
    } catch (error) {
      console.error('[UnifiedVocabulary] Error loading user settings:', error)
      return null
    }
  }, [user])

  // Load all available wordbooks
  const loadWordbooks = useCallback(async (skipSettingsRestore = false) => {
    if (!user) return
    
    setWordbookLoading(true)
    setError(null)
    
    try {
      console.log('[UnifiedVocabulary] Loading wordbooks...')
      const { adaptOfficialCollection, adaptPersonalCollection } = await getUtilityFunctions()
      
      // Load official collections
      const { db } = await import('@/lib/firebase/config')
      const { collection, getDocs, query, where } = await import('firebase/firestore')
      
      const officialCollectionsSnapshot = await getDocs(collection(db, 'vocabulary_collections'))
      const officialWordbooks: UnifiedWordbook[] = []
      
      officialCollectionsSnapshot.forEach(doc => {
        try {
          const data = doc.data()
          console.log(`[UnifiedVocabulary] Processing official collection ${doc.id}:`, data.name, data.category, `(${data.wordCount} words)`, data)
          
          // Skip collections that don't have required fields or are not properly official
          if (!data.isOfficial || !data.category || !data.name) {
            console.warn(`[UnifiedVocabulary] Skipping invalid official collection ${doc.id}: isOfficial=${data.isOfficial}, category=${data.category}, name=${data.name}`)
            return
          }
          
          // Safe Date conversion for Firestore Timestamps
          const processedData = {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now())
          } as OfficialCollection
          
          console.log(`[UnifiedVocabulary] 🔧 About to adapt collection ${doc.id}:`, processedData)
          const wordbook = adaptOfficialCollection(processedData)
          officialWordbooks.push(wordbook)
          console.log(`[UnifiedVocabulary] ✅ Added official wordbook: ${wordbook.name} (${wordbook.type}, category: ${wordbook.category})`)
        } catch (error) {
          console.warn(`[UnifiedVocabulary] Failed to process official collection ${doc.id}:`, error)
        }
      })
      
      // Load personal collections for current user
      const personalCollectionsSnapshot = await getDocs(collection(db, 'personal_collections'))
      const personalWordbooks: UnifiedWordbook[] = []
      
      personalCollectionsSnapshot.forEach(doc => {
        try {
          const data = doc.data()
          if (data.userId === user.uid) {
            // Safe Date conversion for Firestore Timestamps
            const processedData = {
              ...data,
              id: doc.id,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now())
            } as PersonalCollection
            
            const wordbook = adaptPersonalCollection(processedData)
            personalWordbooks.push(wordbook)
          }
        } catch (error) {
          console.warn(`[UnifiedVocabulary] Failed to process personal collection ${doc.id}:`, error)
        }
      })
      
      // Load AI-generated words as virtual wordbook
      console.log('[UnifiedVocabulary] Loading AI-generated words...')
      const aiGeneratedSnapshot = await getDocs(
        query(collection(db, 'ai_generated_words'), where('userId', '==', user.uid))
      )
      
      let aiWordbook: UnifiedWordbook | null = null
      if (aiGeneratedSnapshot.size > 0) {
        aiWordbook = {
          id: `ai-generated-${user.uid}`,
          name: '내가 발견한 단어',
          description: '학습 중 발견하고 추가한 새로운 단어들',
          type: 'ai-generated',
          category: 'AI-Generated',
          wordCount: aiGeneratedSnapshot.size,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            tags: ['AI', '발견', '새로운'],
            difficulty: 'medium'
          },
          ownership: {
            userId: user.uid,
            isPublic: false,
            canEdit: true
          }
        }
        console.log(`[UnifiedVocabulary] ✅ Created AI-generated virtual wordbook: ${aiWordbook.wordCount} words`)
      }
      
      // Load photo collections for current user
      console.log('[UnifiedVocabulary] Loading photo collections...')
      const photoCollectionsSnapshot = await getDocs(
        query(collection(db, 'photo_vocabulary_words'), where('userId', '==', user.uid))
      )
      
      const photoWordbooks: UnifiedWordbook[] = []
      // Group by collection if photo words have collection IDs
      const photoCollectionMap = new Map<string, any[]>()
      
      photoCollectionsSnapshot.forEach(doc => {
        const data = doc.data()
        const collectionId = data.collectionId || 'default-photo-collection'
        if (!photoCollectionMap.has(collectionId)) {
          photoCollectionMap.set(collectionId, [])
        }
        photoCollectionMap.get(collectionId)!.push({ id: doc.id, ...data })
      })
      
      // Create virtual wordbooks for each photo collection
      photoCollectionMap.forEach((words, collectionId) => {
        const photoWordbook: UnifiedWordbook = {
          id: `photo-${collectionId}`,
          name: `사진 단어장 ${new Date(words[0]?.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}`,
          description: '사진에서 추출한 단어들',
          type: 'photo',
          category: 'Photo-Extracted',
          wordCount: words.length,
          createdAt: new Date(words[0]?.createdAt?.seconds * 1000 || Date.now()),
          updatedAt: new Date(),
          metadata: {
            tags: ['사진', '추출', 'OCR'],
            difficulty: 'medium'
          },
          ownership: {
            userId: user.uid,
            isPublic: false,
            canEdit: true
          }
        }
        photoWordbooks.push(photoWordbook)
      })
      
      console.log(`[UnifiedVocabulary] ✅ Created ${photoWordbooks.length} photo wordbooks`)
      
      // Create separate array for AI-generated wordbooks
      const aiWordbooks: UnifiedWordbook[] = []
      if (aiWordbook) {
        aiWordbooks.push(aiWordbook)
      }
      
      const allWordbooks = [...officialWordbooks, ...personalWordbooks, ...aiWordbooks, ...photoWordbooks]
      console.log(`[UnifiedVocabulary] Loaded ${allWordbooks.length} wordbooks:`, allWordbooks.map(wb => `${wb.name} (${wb.type}, ${wb.wordCount} words)`))
      console.log(`[UnifiedVocabulary] Official: ${officialWordbooks.length}, Personal: ${personalWordbooks.length}, AI: ${aiWordbooks.length}, Photo: ${photoWordbooks.length}`)
      
      // 🔍 DETAILED DEBUGGING - List all official wordbooks
      console.log(`[UnifiedVocabulary] 🔍 DETAILED OFFICIAL WORDBOOKS:`)
      officialWordbooks.forEach((wb, index) => {
        console.log(`   ${index + 1}. ${wb.name} - ${wb.wordCount} words (${wb.category})`)
      })
      
      // Check for SAT specifically
      const satWordbook = officialWordbooks.find(wb => wb.category === 'SAT')
      if (satWordbook) {
        console.log(`[UnifiedVocabulary] ✅ SAT wordbook found:`, satWordbook.name, satWordbook.wordCount)
      } else {
        console.log(`[UnifiedVocabulary] ❌ SAT wordbook MISSING!`)
      }
      console.log(`[UnifiedVocabulary] Official collections detail:`, officialWordbooks.map(wb => ({
        id: wb.id,
        name: wb.name,
        category: wb.category,
        wordCount: wb.wordCount,
        type: wb.type
      })))
      
      // Preserve current selections if skipSettingsRestore is true
      const currentSelectedIds = selectedWordbooks.map(wb => wb.id)
      
      setWordbooks(allWordbooks)
      
      // Only restore from settings if this is the initial load
      if (!skipSettingsRestore) {
        // Load user settings and set selected wordbooks
        const settings = userSettings || await loadUserSettings()
        if (settings) {
          setUserSettings(settings)
          
          // Update selected wordbooks based on settings
          // First try new selectedWordbooks, then fall back to legacy selectedVocabularies
          let selectedIds: string[] = []
          
          if (settings.selectedWordbooks && settings.selectedWordbooks.length > 0) {
            selectedIds = settings.selectedWordbooks.map(wb => wb.id)
            console.log('[UnifiedVocabulary] Using selectedWordbooks from settings:', selectedIds)
          }
          // NO LEGACY SUPPORT - users must explicitly select wordbooks
          
          const selectedBooks = allWordbooks.filter(wb => selectedIds.includes(wb.id))
          selectedBooks.forEach(wb => { wb.isSelected = true })
          setSelectedWordbooks(selectedBooks)
          console.log('[UnifiedVocabulary] Selected wordbooks:', selectedBooks.map(wb => wb.name))
        }
      } else if (skipSettingsRestore && currentSelectedIds.length > 0) {
        // Preserve current selections
        const selectedBooks = allWordbooks.filter(wb => currentSelectedIds.includes(wb.id))
        selectedBooks.forEach(wb => { wb.isSelected = true })
        setSelectedWordbooks(selectedBooks)
      }
      
    } catch (error) {
      console.error('[UnifiedVocabulary] Error loading wordbooks:', error)
      setError(error instanceof Error ? error.message : 'Failed to load wordbooks')
    } finally {
      setWordbookLoading(false)
    }
  }, [user, getUtilityFunctions, loadUserSettings, userSettings]) // Added userSettings back for proper restoration

  // Apply filters function - Define before loadWords to avoid temporal dead zone
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

    // 특정 단어장 필터
    if (currentFilter.wordbookId) {
      filtered = filtered.filter(word => 
        word.source.collection === currentFilter.wordbookId
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

  // Load words from selected wordbooks - Define before selectWordbook to avoid temporal dead zone
  const loadWords = useCallback(async (limit: number = 2000) => {
    // Use ref to get current selected wordbooks
    const currentSelectedWordbooks = selectedWordbooksRef.current
    
    if (!user || currentSelectedWordbooks.length === 0) {
      setWords([])
      setAllWords([])
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('[UnifiedVocabulary] 📚 Loading words from selected wordbooks:', currentSelectedWordbooks.map(w => w.name))
      console.log('[UnifiedVocabulary] 🔄 Starting word loading process...')
      
      // Load words from all selected wordbooks using WordAdapter
      const allLoadedWords: UnifiedWord[] = []
      console.log('[UnifiedVocabulary] 🎯 Processing', currentSelectedWordbooks.length, 'selected wordbooks...')
      
      for (const wordbook of currentSelectedWordbooks) {
        try {
          console.log(`[UnifiedVocabulary] Loading words from ${wordbook.name} (${wordbook.id}, type: ${wordbook.type})`)
          // Use WordAdapter to get words from different sources
          const wordsFromWordbook = await wordAdapter.getWordsByCollection(wordbook.id, wordbook.type, limit)
          console.log(`[UnifiedVocabulary] Loaded ${wordsFromWordbook.length} words from ${wordbook.name}`)
          allLoadedWords.push(...wordsFromWordbook)
        } catch (error) {
          console.warn(`[UnifiedVocabulary] Failed to load words from ${wordbook.name}:`, error)
        }
      }
      
      console.log(`[UnifiedVocabulary] Loaded ${allLoadedWords.length} total words`)
      
      setAllWords(allLoadedWords)
      
      // Apply current filter
      const filteredWords = applyFilters(allLoadedWords, filter)
      setWords(filteredWords)
      
    } catch (error) {
      console.error('[UnifiedVocabulary] Error loading words:', error)
      setError(error instanceof Error ? error.message : 'Failed to load words')
    } finally {
      setLoading(false)
    }
  }, [user, wordAdapter, filter, applyFilters]) // Remove selectedWordbooks from dependencies, use ref instead

  // Select wordbook - Define after loadWords since it references loadWords
  const selectWordbook = useCallback(async (wordbookId: string, priority?: number) => {
    if (!user || !userSettings) return
    
    const wordbook = wordbooks.find(wb => wb.id === wordbookId)
    if (!wordbook) return
    
    // Update local state
    const updatedWordbook = { ...wordbook, isSelected: true }
    setWordbooks(prev => prev.map(wb => wb.id === wordbookId ? updatedWordbook : wb))
    setSelectedWordbooks(prev => [...prev.filter(wb => wb.id !== wordbookId), updatedWordbook])
    
    // Update user settings
    try {
      const selectedWordbook: SelectedWordbook = {
        id: wordbookId,
        type: wordbook.type,
        name: wordbook.name,
        selectedAt: new Date(),
        priority: priority || selectedWordbooks.length + 1
      }
      
      const updatedSettings = {
        ...userSettings,
        selectedWordbooks: [
          ...(userSettings.selectedWordbooks || []).filter(wb => wb.id !== wordbookId),
          selectedWordbook
        ],
        updatedAt: new Date()
      }
      
      const { UserSettingsService } = await import('@/lib/settings/user-settings-service')
      const settingsService = new UserSettingsService()
      await settingsService.updateUserSettings(user.uid, updatedSettings)
      
      setUserSettings(updatedSettings)
      console.log('[UnifiedVocabulary] Selected wordbook:', wordbookId)
      
      // Trigger words reload
      await loadWords()
      
    } catch (error) {
      console.error('[UnifiedVocabulary] Error selecting wordbook:', error)
      setError('Failed to select wordbook')
    }
  }, [user, userSettings, wordbooks, loadWords]) // Removed selectedWordbooks to prevent circular dependency, added loadWords

  // Unselect wordbook
  const unselectWordbook = useCallback(async (wordbookId: string) => {
    if (!user || !userSettings) return
    
    // Update local state
    setWordbooks(prev => prev.map(wb => 
      wb.id === wordbookId ? { ...wb, isSelected: false } : wb
    ))
    setSelectedWordbooks(prev => prev.filter(wb => wb.id !== wordbookId))
    
    // Update user settings
    try {
      const updatedSettings = {
        ...userSettings,
        selectedWordbooks: (userSettings.selectedWordbooks || []).filter(wb => wb.id !== wordbookId),
        updatedAt: new Date()
      }
      
      const { UserSettingsService } = await import('@/lib/settings/user-settings-service')
      const settingsService = new UserSettingsService()
      await settingsService.updateUserSettings(user.uid, updatedSettings)
      
      setUserSettings(updatedSettings)
      console.log('[UnifiedVocabulary] Unselected wordbook:', wordbookId)
      
      // Trigger words reload
      await loadWords()
      
    } catch (error) {
      console.error('[UnifiedVocabulary] Error unselecting wordbook:', error)
      setError('Failed to unselect wordbook')
    }
  }, [user, userSettings, loadWords])

  // Toggle wordbook
  const toggleWordbook = useCallback(async (wordbookId: string, priority?: number) => {
    const wordbook = selectedWordbooks.find(wb => wb.id === wordbookId)
    if (wordbook) {
      await unselectWordbook(wordbookId)
    } else {
      await selectWordbook(wordbookId, priority)
    }
  }, [selectedWordbooks, selectWordbook, unselectWordbook])

  // Other functions (similar to existing VocabularyContext)
  const refreshWordbooks = useCallback(async () => {
    console.log('[UnifiedVocabulary] Refreshing wordbooks...')
    await loadWordbooks(true) // Skip settings restore to preserve current selections
  }, [loadWordbooks])

  const getWordById = useCallback((id: string): UnifiedWord | undefined => {
    return words.find(word => word.id === id)
  }, [words])

  const getWordByText = useCallback(async (wordText: string): Promise<UnifiedWord | null> => {
    try {
      return await wordAdapter.getWordByText(wordText)
    } catch (error) {
      console.error('[UnifiedVocabulary] Error getting word by text:', error)
      return null
    }
  }, [wordAdapter])

  const updateWordSynonyms = useCallback(async (wordId: string, synonyms: string[]) => {
    // Implementation similar to existing VocabularyContext
    try {
      // Update memory
      setWords(prevWords => 
        prevWords.map(word => 
          word.id === wordId 
            ? { ...word, synonyms }
            : word
        )
      )
      
      // Update database through API
      const word = await wordAdapter.getWordById(wordId)
      if (word && word.source) {
        const response = await fetch('/api/update-synonyms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.uid,
            wordId,
            synonyms,
            collection: word.source.collection
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to update synonyms in DB')
        }
      }
      
    } catch (error) {
      console.error('[UnifiedVocabulary] Error updating synonyms:', error)
      throw error
    }
  }, [wordAdapter, user])

  const refreshWords = useCallback(async () => {
    wordAdapter.clearCache()
    await loadWords()
  }, [wordAdapter, loadWords])

  const setFilter = useCallback((newFilter: Partial<UnifiedVocabularyContextType['filter']>) => {
    const updatedFilter = { ...filter, ...newFilter }
    setFilterState(updatedFilter)
    
    if (allWords.length > 0) {
      const filteredWords = applyFilters(allWords, updatedFilter)
      setWords(filteredWords)
    }
  }, [filter, allWords, applyFilters])

  const setWordbookFilter = useCallback((newFilter: Partial<WordbookFilter>) => {
    const updatedFilter = { ...wordbookFilter, ...newFilter }
    setWordbookFilterState(updatedFilter)
  }, [wordbookFilter])

  const updateStudySession = useCallback((session: Partial<UnifiedVocabularyContextType['studySession']>) => {
    setStudySession(prev => ({ ...prev, ...session }))
  }, [])

  const getWordbookStats = useCallback(async () => {
    const { calculateWordbookStats } = await getUtilityFunctions()
    return calculateWordbookStats(selectedWordbooks)
  }, [selectedWordbooks, getUtilityFunctions])

  const updateWordbookProgress = useCallback(async (wordbookId: string, progress: Partial<WordbookProgress>) => {
    // Update local wordbook progress
    setWordbooks(prev => prev.map(wb => 
      wb.id === wordbookId 
        ? { ...wb, progress: { ...wb.progress, ...progress } }
        : wb
    ))
    
    setSelectedWordbooks(prev => prev.map(wb => 
      wb.id === wordbookId 
        ? { ...wb, progress: { ...wb.progress, ...progress } }
        : wb
    ))
    
    // Save progress to database (implementation needed)
    // This would save to a user_wordbook_progress collection
  }, [])

  const getAdapterStats = useCallback(() => {
    return wordAdapter.getStats()
  }, [wordAdapter])

  // Initialize context: load settings and wordbooks, then restore selected wordbooks
  const initializeContext = useCallback(async () => {
    // Prevent multiple initializations
    if (hasInitializedRef.current) {
      console.log('[UnifiedVocabulary] Context already initialized, skipping...')
      return
    }
    
    try {
      console.log('[UnifiedVocabulary] Initializing context...')
      hasInitializedRef.current = true
      
      // Load user settings first
      const settings = await loadUserSettings()
      setUserSettings(settings)
      
      // Load all available wordbooks
      await loadWordbooks()
      
      console.log('[UnifiedVocabulary] Context initialized')
    } catch (error) {
      console.error('[UnifiedVocabulary] Error initializing context:', error)
      setError('Failed to initialize vocabulary context')
      hasInitializedRef.current = false // Reset on error
    }
  }, [loadUserSettings, loadWordbooks])

  // Restore selected wordbooks from user settings
  const restoreSelectedWordbooks = useCallback(() => {
    if (!userSettings || wordbooks.length === 0) {
      return
    }

    console.log('[UnifiedVocabulary] Restoring selected wordbooks...')
    
    let selectedIds: string[] = []
    let selectedWordbooksToRestore: UnifiedWordbook[] = []

    // Only use new selectedWordbooks - NO LEGACY SUPPORT
    if (userSettings.selectedWordbooks && userSettings.selectedWordbooks.length > 0) {
      console.log('Settings selectedWordbooks:', userSettings.selectedWordbooks)
      selectedIds = userSettings.selectedWordbooks.map(wb => wb.id)
      
      // Find wordbooks that match the saved selections
      for (const selectedWb of userSettings.selectedWordbooks) {
        const foundWordbook = wordbooks.find(wb => wb.id === selectedWb.id)
        if (foundWordbook) {
          selectedWordbooksToRestore.push({
            ...foundWordbook,
            isSelected: true
          })
        } else {
          console.warn(`[UnifiedVocabulary] Saved wordbook not found: ${selectedWb.id}`)
        }
      }
    }
    // NO LEGACY SELECTEDVOCABULARIES - users must use dashboard to select wordbooks
    
    console.log('Available wordbooks:', wordbooks.map(wb => ({ id: wb.id, name: wb.name })))

    if (selectedWordbooksToRestore.length > 0) {
      console.log(`[UnifiedVocabulary] Restored ${selectedWordbooksToRestore.length} selected wordbooks`)
      
      // Update wordbooks with selection state
      setWordbooks(prev => prev.map(wb => ({
        ...wb,
        isSelected: selectedIds.includes(wb.id)
      })))
      
      // Set selected wordbooks
      setSelectedWordbooks(selectedWordbooksToRestore)
    } else {
      console.log('[UnifiedVocabulary] No selected wordbooks to restore')
    }
  }, [userSettings, wordbooks])

  // Initialize context when user is available
  useEffect(() => {
    if (user) {
      // Reset initialization flag when user changes (including re-login)
      hasInitializedRef.current = false
      initializeContext()
    } else {
      // Clean up when user logs out
      hasInitializedRef.current = false
      setWordbooks([])
      setSelectedWordbooks([])
      setWords([])
      setAllWords([])
      setUserSettings(null)
    }
  }, [user, initializeContext])

  // Restore selected wordbooks only once after initial load
  useEffect(() => {
    if (userSettings && wordbooks.length > 0 && selectedWordbooks.length === 0) {
      // Only restore if we haven't selected anything yet
      console.log('[UnifiedVocabulary] Initial restoration of selected wordbooks from settings')
      restoreSelectedWordbooks()
    }
  }, [userSettings, wordbooks.length]) // Don't include selectedWordbooks to avoid infinite loop

  // Load words when selected wordbooks change
  useEffect(() => {
    console.log('[UnifiedVocabulary] selectedWordbooks changed:', selectedWordbooks.length, 'wordbooks')
    if (selectedWordbooks.length > 0) {
      console.log('[UnifiedVocabulary] Calling loadWords for:', selectedWordbooks.map(wb => wb.name))
      loadWords()
    } else {
      console.log('[UnifiedVocabulary] No selected wordbooks, clearing words')
      setWords([])
      setAllWords([])
      setLoading(false)
    }
  }, [selectedWordbooks.map(wb => wb.id).join(','), loadWords]) // Track actual wordbook IDs and loadWords

  const value: UnifiedVocabularyContextType = {
    // Wordbook management
    wordbooks,
    allWordbooks: wordbooks, // Add alias for backward compatibility
    selectedWordbooks,
    wordbookFilter,
    setWordbookFilter,
    
    // Words data
    words,
    allWords,
    loading: loading || wordbookLoading,
    error,
    
    // Wordbook actions
    selectWordbook,
    unselectWordbook,
    toggleWordbook,
    refreshWordbooks,
    loadWordbooks,
    
    // Word operations
    loadWords,
    updateWordSynonyms,
    getWordById,
    getWordByText,
    refreshWords,
    
    // Study session
    studySession,
    updateStudySession,
    
    // Statistics
    getWordbookStats,
    updateWordbookProgress,
    
    // Filtering
    filter,
    setFilter,
    
    // Adapter
    getAdapterStats
  }

  return (
    <UnifiedVocabularyContext.Provider value={value}>
      {children}
    </UnifiedVocabularyContext.Provider>
  )
}

// Hook for backward compatibility with existing VocabularyContext
export function useVocabulary() {
  const unifiedContext = useContext(UnifiedVocabularyContext)
  
  if (!unifiedContext) {
    throw new Error('useVocabulary must be used within UnifiedVocabularyProvider')
  }
  
  // Return compatible interface
  return {
    words: unifiedContext.words,
    allWords: unifiedContext.allWords,
    loading: unifiedContext.loading,
    error: unifiedContext.error,
    loadWords: unifiedContext.loadWords,
    updateWordSynonyms: unifiedContext.updateWordSynonyms,
    getWordById: unifiedContext.getWordById,
    getWordByText: unifiedContext.getWordByText,
    refreshWords: unifiedContext.refreshWords,
    filter: unifiedContext.filter,
    setFilter: unifiedContext.setFilter,
    getAdapterStats: unifiedContext.getAdapterStats
  }
}