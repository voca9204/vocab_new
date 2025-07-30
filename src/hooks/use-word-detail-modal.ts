import { useState, useCallback, useRef } from 'react'
import { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import { VocabularyWord } from '@/types'
import { useAuth } from '@/hooks/use-auth'
import { vocabularyService } from '@/lib/api'

// Type that accepts both old and new word types
type ModalWord = ExtractedVocabulary | VocabularyWord

export function useWordDetailModal() {
  const { user } = useAuth()
  const [selectedWord, setSelectedWord] = useState<ModalWord | null>(null)
  const [generatingExamples, setGeneratingExamples] = useState(false)
  const [generatingEtymology, setGeneratingEtymology] = useState(false)
  const [fetchingPronunciation, setFetchingPronunciation] = useState(false)
  
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
    if (!word || !word.id || word.examples?.length > 0 || !user) return
    
    setGeneratingExamples(true)
    
    try {
      const response = await fetch('/api/generate-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          wordIds: [word.id],
          singleWord: true
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.updated > 0) {
          // Reload the word data from new service
          // Wait for DB propagation
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const updatedWord = await vocabularyService.getById(word.id)
          if (updatedWord) {
            setSelectedWord(prev => prev ? {
              ...prev,
              examples: updatedWord.examples
            } : null)
            
            // Dispatch custom event for list page to reload
            const event = new CustomEvent('word-updated', {
              detail: { wordId: word.id, type: 'examples' }
            })
            window.dispatchEvent(event)
          }
        }
      }
    } catch (error) {
      console.error('Error generating examples:', error)
    } finally {
      setGeneratingExamples(false)
    }
  }, [user])

  const generateEtymology = useCallback(async () => {
    const word = selectedWordRef.current
    if (!word || !word.id || !user) return
    
    // Handle both old and new word types
    const hasEtymology = 'realEtymology' in word ? word.realEtymology : word?.etymology?.meaning
    if (hasEtymology) return
    
    setGeneratingEtymology(true)
    
    try {
      const response = await fetch('/api/generate-etymology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          wordIds: [word.id],
          singleWord: true
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.updated > 0) {
          // Reload the word data from new service
          // Wait for DB propagation
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const updatedWord = await vocabularyService.getById(word.id)
          if (updatedWord) {
            setSelectedWord(prev => {
              if (!prev) return null
              if ('realEtymology' in prev) {
                return { ...prev, realEtymology: updatedWord.realEtymology }
              } else {
                return { 
                  ...prev, 
                  etymology: {
                    ...prev.etymology,
                    meaning: updatedWord.realEtymology
                  }
                }
              }
            })
            
            // Dispatch custom event for list page to reload
            const event = new CustomEvent('word-updated', {
              detail: { wordId: word.id, type: 'etymology' }
            })
            window.dispatchEvent(event)
          }
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
          // Update in database using new service
          // For now, we'll skip DB update as the compatibility layer is read-only
          // TODO: Implement pronunciation update in new DB structure
          console.log('Pronunciation fetched:', phonetic, 'for word:', word.word)
          
          // Update local state
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