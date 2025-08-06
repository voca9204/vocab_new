'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { vocabularyService } from '@/lib/api'
import type { Word } from '@/types/vocabulary-v2'

interface VocabularyContextType {
  // Data
  words: Word[]
  loading: boolean
  error: string | null
  
  // Operations
  loadWords: (limit?: number) => Promise<void>
  updateWord: (id: string, updates: Partial<Word>) => Promise<void>
  updateWordSynonyms: (wordId: string, synonyms: string[]) => Promise<void>
  getWordById: (id: string) => Word | undefined
  refreshWords: () => Promise<void>
  
  // Filters
  filter: {
    studyMode: 'all' | 'not-studied' | 'studied'
    partOfSpeech?: string[]
    difficulty?: { min: number; max: number }
  }
  setFilter: (filter: Partial<VocabularyContextType['filter']>) => void
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
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilterState] = useState<VocabularyContextType['filter']>({
    studyMode: 'all'
  })

  // Load words from database
  const loadWords = useCallback(async (limit: number = 2000) => {
    if (!user) {
      setWords([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { words: fetchedWords } = await vocabularyService.getAll(undefined, limit, user.uid)
      
      // Apply client-side filters
      let filteredWords = fetchedWords as Word[]
      
      // Study mode filter
      if (filter.studyMode === 'not-studied') {
        filteredWords = filteredWords.filter(w => !w.studyStatus?.studied)
      } else if (filter.studyMode === 'studied') {
        filteredWords = filteredWords.filter(w => w.studyStatus?.studied)
      }
      
      // Part of speech filter
      if (filter.partOfSpeech && filter.partOfSpeech.length > 0) {
        filteredWords = filteredWords.filter(w => 
          w.partOfSpeech.some(pos => filter.partOfSpeech!.includes(pos))
        )
      }
      
      // Difficulty filter
      if (filter.difficulty) {
        filteredWords = filteredWords.filter(w => 
          w.difficulty >= filter.difficulty!.min && 
          w.difficulty <= filter.difficulty!.max
        )
      }
      
      setWords(filteredWords)
      console.log(`[VocabularyContext] Loaded ${filteredWords.length} words`)
    } catch (err) {
      console.error('[VocabularyContext] Error loading words:', err)
      setError(err instanceof Error ? err.message : 'Failed to load words')
    } finally {
      setLoading(false)
    }
  }, [user, filter])

  // Update word locally and in database
  const updateWord = useCallback(async (id: string, updates: Partial<Word>) => {
    // Optimistic update
    setWords(prev => prev.map(w => 
      w.id === id ? { ...w, ...updates, updatedAt: new Date() } : w
    ))

    try {
      // Update in database
      const response = await fetch('/api/vocabulary/update-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: id, updates, userId: user?.uid })
      })

      if (!response.ok) {
        throw new Error('Failed to update word')
      }

      console.log(`[VocabularyContext] Updated word ${id}`)
    } catch (err) {
      console.error('[VocabularyContext] Error updating word:', err)
      // Revert optimistic update
      await loadWords()
      throw err
    }
  }, [user, loadWords])

  // Update word synonyms
  const updateWordSynonyms = useCallback(async (wordId: string, synonyms: string[]) => {
    // Optimistic update
    setWords(prev => prev.map(w => 
      w.id === wordId ? { ...w, synonyms } : w
    ))

    try {
      const response = await fetch('/api/vocabulary/update-synonyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId, synonyms, userId: user?.uid })
      })

      if (!response.ok) {
        throw new Error('Failed to update synonyms')
      }

      console.log(`[VocabularyContext] Updated synonyms for word ${wordId}`)
    } catch (err) {
      console.error('[VocabularyContext] Error updating synonyms:', err)
      // Revert optimistic update
      await loadWords()
      throw err
    }
  }, [user, loadWords])

  // Get word by ID
  const getWordById = useCallback((id: string): Word | undefined => {
    return words.find(w => w.id === id)
  }, [words])

  // Refresh words
  const refreshWords = useCallback(async () => {
    await loadWords()
  }, [loadWords])

  // Set filter
  const setFilter = useCallback((newFilter: Partial<VocabularyContextType['filter']>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }))
  }, [])

  // Load words when user changes or filter changes
  useEffect(() => {
    if (user) {
      loadWords()
    }
  }, [user, loadWords])

  // Listen for word discovery events
  useEffect(() => {
    const handleWordDiscovered = () => {
      console.log('[VocabularyContext] Word discovered, refreshing...')
      refreshWords()
    }

    window.addEventListener('word-discovered', handleWordDiscovered)
    return () => window.removeEventListener('word-discovered', handleWordDiscovered)
  }, [refreshWords])

  const value: VocabularyContextType = {
    words,
    loading,
    error,
    loadWords,
    updateWord,
    updateWordSynonyms,
    getWordById,
    refreshWords,
    filter,
    setFilter
  }

  return (
    <VocabularyContext.Provider value={value}>
      {children}
    </VocabularyContext.Provider>
  )
}