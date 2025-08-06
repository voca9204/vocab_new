import { useState, useCallback, useRef } from 'react'
import { UnifiedWord } from '@/types/unified-word'
import { useAuth } from '@/hooks/use-auth'
import { WordAdapter } from '@/lib/adapters/word-adapter'

// Use unified word type
type ModalWord = UnifiedWord

export function useWordDetailModal() {
  const { user } = useAuth()
  const [selectedWord, setSelectedWord] = useState<ModalWord | null>(null)
  const [generatingExamples, setGeneratingExamples] = useState(false)
  const [generatingEtymology, setGeneratingEtymology] = useState(false)
  const [fetchingPronunciation, setFetchingPronunciation] = useState(false)
  
  // WordAdapter 인스턴스
  const [wordAdapter] = useState(() => new WordAdapter())
  
  // Use ref to access current word without causing re-renders
  const selectedWordRef = useRef<ModalWord | null>(null)
  selectedWordRef.current = selectedWord

  const openModal = useCallback((word: ModalWord) => {
    setSelectedWord(word)
  }, [])

  const closeModal = useCallback(() => {
    setSelectedWord(null)
  }, [])

  const generateExamples = useCallback(async () => {
    const word = selectedWordRef.current
    // Check if examples already exist in unified format (both direct and in definitions)
    const hasDirectExamples = word?.examples && word.examples.length > 0
    const hasDefinitionExamples = word?.definitions?.[0]?.examples && word.definitions[0].examples.length > 0
    const hasExamples = hasDirectExamples || hasDefinitionExamples
    
    // For photo vocabulary words, allow generating examples even if some exist
    // to ensure quality examples are available
    const isPhotoVocab = word?.source?.collection === 'photo_vocabulary_words'
    // Force generation for photo vocabulary to debug the issue
    const shouldGenerate = !hasExamples || isPhotoVocab
    
    if (!word || !word.id || !shouldGenerate || !user) {
      console.log('[useWordDetailModal] Cannot generate examples:', {
        word: word?.word,
        hasWord: !!word,
        hasId: !!word?.id,
        wordId: word?.id,
        hasDirectExamples,
        hasDefinitionExamples,
        hasExamples,
        isPhotoVocab,
        shouldGenerate,
        hasUser: !!user,
        wordSource: word?.source
      })
      return
    }
    
    console.log('[useWordDetailModal] STARTING example generation for:', word.word, {
      wordId: word.id,
      isPhotoVocab,
      wordSource: word.source
    })
    
    setGeneratingExamples(true)
    
    try {
      const requestData = {
        userId: user.uid,
        wordId: word.id,
        word: word.word,
        definition: word.definition || '',
        partOfSpeech: word.partOfSpeech || []
      }
      
      console.log('[useWordDetailModal] API request:', requestData)
      
      // Use unified API that handles all collections
      const response = await fetch('/api/generate-examples-unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })
      
      console.log('[useWordDetailModal] API response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('[useWordDetailModal] API response data:', result)
        
        if (result.success && result.examples) {
          // Update local state immediately with the generated examples
          setSelectedWord(prev => {
            if (!prev) return null
            return { ...prev, examples: result.examples }
          })
          
          // Also update from DB after a delay for persistence
          setTimeout(async () => {
            const updatedWord = await wordAdapter.getWordById(word.id)
            if (updatedWord) {
              setSelectedWord(prev => {
                if (!prev) return null
                return { ...prev, examples: updatedWord.examples }
              })
            }
          }, 1000)
          
          // Dispatch custom event for list page to reload
          const event = new CustomEvent('word-updated', {
            detail: { wordId: word.id, type: 'examples' }
          })
          window.dispatchEvent(event)
        }
      } else {
        const errorData = await response.text()
        console.error('[useWordDetailModal] API error response:', response.status, errorData)
      }
    } catch (error) {
      console.error('[useWordDetailModal] Error generating examples:', error)
    } finally {
      setGeneratingExamples(false)
    }
  }, [user])

  const generateEtymology = useCallback(async () => {
    const word = selectedWordRef.current
    
    if (!word || !word.id || !user) {
      console.log('[useWordDetailModal] Cannot generate etymology:', {
        word: word?.word,
        hasWord: !!word,
        hasId: !!word?.id,
        hasUser: !!user
      })
      return
    }
    
    // Check unified structure
    const hasEtymology = word.realEtymology
    if (hasEtymology) {
      console.log('[useWordDetailModal] Word already has etymology')
      return
    }
    
    setGeneratingEtymology(true)
    
    try {
      // Use unified API that handles all collections
      const response = await fetch('/api/generate-etymology-unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          wordId: word.id,
          word: word.word,
          definition: word.definition || ''
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.etymology) {
          // Update local state immediately with the generated etymology
          setSelectedWord(prev => {
            if (!prev) return null
            return { ...prev, realEtymology: result.etymology }
          })
          
          // Also update from DB after a delay for persistence
          setTimeout(async () => {
            const updatedWord = await wordAdapter.getWordById(word.id)
            if (updatedWord) {
              setSelectedWord(prev => {
                if (!prev) return null
                return { ...prev, realEtymology: updatedWord.realEtymology }
              })
            }
          }, 1000)
          
          // Dispatch custom event for list page to reload
          const event = new CustomEvent('word-updated', {
            detail: { wordId: word.id, type: 'etymology' }
          })
          window.dispatchEvent(event)
        }
      }
    } catch (error) {
      console.error('Error generating etymology:', error)
    } finally {
      setGeneratingEtymology(false)
    }
  }, [user])

  const fetchPronunciation = useCallback(async () => {
    const word = selectedWordRef.current
    if (!word || !word.id || word.pronunciation || !user) return
    
    setFetchingPronunciation(true)
    
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.word)}`)
      if (response.ok) {
        const data = await response.json()
        const phonetic = data[0]?.phonetic || 
                        data[0]?.phonetics?.[0]?.text ||
                        data[0]?.phonetics?.find((p: any) => p.text)?.text
                        
        if (phonetic && word.id) {
          // Update local state with unified structure
          console.log('Pronunciation fetched:', phonetic, 'for word:', word.word)
          
          setSelectedWord(prev => prev ? {
            ...prev,
            pronunciation: phonetic
          } : null)
        }
      }
    } catch (error) {
      console.error('Error fetching pronunciation:', error)
    } finally {
      setFetchingPronunciation(false)
    }
  }, [user])

  const speakWord = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  return {
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
  }
}