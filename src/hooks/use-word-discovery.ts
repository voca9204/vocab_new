import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'

interface DiscoveredWord {
  word: string
  normalizedWord: string
  pronunciation?: string
  partOfSpeech: string[]
  definitions: Array<{
    id: string
    definition: string
    examples: string[]
    source: string
    language: string
    createdAt: Date
  }>
  etymology?: string
  realEtymology?: string
  synonyms?: string[]
  antonyms?: string[]
  difficulty?: number
  frequency?: number
  isSAT?: boolean
  source: {
    type: string
    origin: string
    addedAt: Date
    metadata?: any
  }
  aiGenerated?: {
    examples: boolean
    etymology: boolean
    generatedAt: Date
  }
  relationshipId?: string
}

export function useWordDiscovery() {
  const { user } = useAuth()
  const [discoveryModalOpen, setDiscoveryModalOpen] = useState(false)
  const [targetWord, setTargetWord] = useState<string>('')
  const [sourceWord, setSourceWord] = useState<string>('')
  const [relationship, setRelationship] = useState<string>('synonym')

  const openDiscoveryModal = useCallback((word: string, source?: string, rel?: string) => {
    setTargetWord(word)
    setSourceWord(source || '')
    setRelationship(rel || 'synonym')
    setDiscoveryModalOpen(true)
  }, [])

  const closeDiscoveryModal = useCallback(() => {
    setDiscoveryModalOpen(false)
    setTargetWord('')
    setSourceWord('')
    setRelationship('synonym')
  }, [])

  const saveDiscoveredWord = useCallback(async (word: DiscoveredWord) => {
    if (!user) {
      throw new Error('User must be logged in to save words')
    }

    // Save to personal vocabulary collection
    const response = await fetch('/api/vocabulary/save-to-personal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.uid,
        wordId: word.id || word.word, // Use ID if available, otherwise use word
        word: word.word,
        collectionName: '나만의 단어장',
        tags: [],
        notes: '',
        source: {
          type: 'ai_discovery' as const,
          context: sourceWord ? `유사어: ${sourceWord}` : undefined
        }
      })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to save word to personal vocabulary')
    }

    const result = await response.json()
    
    // Dispatch event for other components to reload
    const event = new CustomEvent('personal-word-added', {
      detail: { wordId: word.id, word: word.word, personalEntryId: result.personalEntryId }
    })
    window.dispatchEvent(event)

    return result
  }, [user, sourceWord])

  const handleWordStudy = useCallback((word: DiscoveredWord) => {
    // TODO: Navigate to study page with this word
    console.log('Study word:', word)
    closeDiscoveryModal()
  }, [closeDiscoveryModal])

  return {
    discoveryModalOpen,
    targetWord,
    sourceWord,
    relationship,
    openDiscoveryModal,
    closeDiscoveryModal,
    saveDiscoveredWord,
    handleWordStudy
  }
}