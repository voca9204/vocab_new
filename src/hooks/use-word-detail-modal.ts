import { useState, useCallback } from 'react'
import { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import { useAuth } from '@/hooks/use-auth'
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export function useWordDetailModal() {
  const { user } = useAuth()
  const [selectedWord, setSelectedWord] = useState<ExtractedVocabulary | null>(null)
  const [generatingExamples, setGeneratingExamples] = useState(false)
  const [generatingEtymology, setGeneratingEtymology] = useState(false)
  const [fetchingPronunciation, setFetchingPronunciation] = useState(false)

  const openModal = useCallback((word: ExtractedVocabulary) => {
    setSelectedWord(word)
  }, [])

  const closeModal = useCallback(() => {
    setSelectedWord(null)
  }, [])

  const generateExamples = useCallback(async () => {
    if (!selectedWord || !selectedWord.id || selectedWord.examples?.length > 0 || generatingExamples || !user) return
    
    setGeneratingExamples(true)
    
    try {
      const response = await fetch('/api/generate-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          wordIds: [selectedWord.id],
          singleWord: true
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.updated > 0) {
          // Reload the word data
          const q = query(
            collection(db, 'extracted_vocabulary'),
            where('userId', '==', user.uid),
            where('__name__', '==', selectedWord.id)
          )
          const snapshot = await getDocs(q)
          if (!snapshot.empty) {
            const updatedWord = snapshot.docs[0].data() as ExtractedVocabulary
            setSelectedWord(prev => prev ? {
              ...prev,
              examples: updatedWord.examples
            } : null)
          }
        }
      }
    } catch (error) {
      console.error('Error generating examples:', error)
    } finally {
      setGeneratingExamples(false)
    }
  }, [selectedWord, generatingExamples, user])

  const generateEtymology = useCallback(async () => {
    if (!selectedWord || !selectedWord.id || selectedWord.realEtymology || generatingEtymology || !user) return
    
    setGeneratingEtymology(true)
    
    try {
      const response = await fetch('/api/generate-etymology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          wordIds: [selectedWord.id],
          singleWord: true
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.updated > 0) {
          // Reload the word data
          const q = query(
            collection(db, 'extracted_vocabulary'),
            where('userId', '==', user.uid),
            where('__name__', '==', selectedWord.id)
          )
          const snapshot = await getDocs(q)
          if (!snapshot.empty) {
            const updatedWord = snapshot.docs[0].data() as ExtractedVocabulary
            setSelectedWord(prev => prev ? {
              ...prev,
              realEtymology: updatedWord.realEtymology
            } : null)
          }
        }
      }
    } catch (error) {
      console.error('Error generating etymology:', error)
    } finally {
      setGeneratingEtymology(false)
    }
  }, [selectedWord, generatingEtymology, user])

  const fetchPronunciation = useCallback(async () => {
    if (!selectedWord || !selectedWord.id || selectedWord.pronunciation || fetchingPronunciation || !user) return
    
    setFetchingPronunciation(true)
    
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(selectedWord.word)}`)
      if (response.ok) {
        const data = await response.json()
        const phonetic = data[0]?.phonetic || 
                        data[0]?.phonetics?.[0]?.text ||
                        data[0]?.phonetics?.find((p: any) => p.text)?.text
                        
        if (phonetic && selectedWord.id) {
          // Update in database
          const wordRef = doc(db, 'extracted_vocabulary', selectedWord.id)
          await updateDoc(wordRef, {
            pronunciation: phonetic,
            updatedAt: Timestamp.now()
          })
          
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
  }, [selectedWord, fetchingPronunciation, user])

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