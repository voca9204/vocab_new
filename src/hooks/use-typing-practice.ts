import { useState, useRef, useCallback } from 'react'
import type { VocabularyWord } from '@/types'
import { vocabularyService } from '@/lib/api'

export interface TypingResult {
  word: VocabularyWord
  typed: string
  correct: boolean
  time: number
  hintsUsed: number
}

interface UseTypingPracticeReturn {
  // State
  words: VocabularyWord[]
  currentWordIndex: number
  typedWord: string
  showResult: boolean
  currentResult: TypingResult | null
  results: TypingResult[]
  practiceComplete: boolean
  wordStartTime: Date | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setWords: (words: VocabularyWord[]) => void
  setTypedWord: (word: string) => void
  submitWord: (hintLevel: number) => void
  nextWord: () => void
  restartPractice: () => void
  startNewSession: () => void
  clearError: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Computed
  currentWord: VocabularyWord | undefined
  accuracy: number
  avgTime: string
  avgHints: string
  correctCount: number
}

export function useTypingPractice(): UseTypingPracticeReturn {
  const [words, setWords] = useState<VocabularyWord[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [typedWord, setTypedWord] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [currentResult, setCurrentResult] = useState<TypingResult | null>(null)
  const [results, setResults] = useState<TypingResult[]>([])
  const [practiceComplete, setPracticeComplete] = useState(false)
  const [wordStartTime, setWordStartTime] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)

  const currentWord = words[currentWordIndex]
  const correctCount = results.filter(r => r.correct).length
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0
  const avgTime = results.length > 0 
    ? (results.reduce((sum, r) => sum + r.time, 0) / results.length).toFixed(1)
    : '0'
  const avgHints = results.length > 0
    ? (results.reduce((sum, r) => sum + r.hintsUsed, 0) / results.length).toFixed(1)
    : '0'

  const submitWord = useCallback((hintLevel: number) => {
    if (showResult || !typedWord.trim() || !currentWord || !wordStartTime) return

    const isTypedCorrect = typedWord.trim().toLowerCase() === currentWord.word.toLowerCase()
    const timeSpent = (new Date().getTime() - wordStartTime.getTime()) / 1000
    const allLettersRevealed = hintLevel >= currentWord.word.length
    
    // 모든 글자가 공개된 상태에서 맞춘 경우는 오답으로 처리
    const isCorrect = isTypedCorrect && !allLettersRevealed
    
    console.log('submitWord 채점:', {
      word: currentWord.word,
      typed: typedWord.trim(),
      isTypedCorrect,
      hintLevel,
      wordLength: currentWord.word.length,
      allLettersRevealed,
      finalCorrect: isCorrect
    })

    const result: TypingResult = {
      word: currentWord,
      typed: typedWord.trim(),
      correct: isCorrect,
      time: timeSpent,
      hintsUsed: hintLevel
    }

    setResults(prev => [...prev, result])
    setCurrentResult(result)
    setShowResult(true)

    // 학습 진도 업데이트
    if (currentWord.id) {
      const increment = isCorrect ? 10 : -5
      vocabularyService.updateStudyProgress(
        currentWord.id,
        'typing',
        isCorrect,
        increment
      ).then(() => {
        console.log('Typing progress updated:', currentWord.word, isCorrect)
      }).catch(error => {
        console.error('Failed to update typing progress:', error)
      })
    }
  }, [showResult, typedWord, currentWord, wordStartTime])

  const nextWord = useCallback(() => {
    if (currentWordIndex < words.length - 1) {
      // Reset result state
      setShowResult(false)
      setCurrentResult(null)
      setTypedWord('')
      
      // Move to next word
      const newIndex = currentWordIndex + 1
      setCurrentWordIndex(newIndex)
      setWordStartTime(new Date())
      
      // Focus input field
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 50)
    } else {
      // Practice complete
      setPracticeComplete(true)
    }
  }, [currentWordIndex, words.length])

  const restartPractice = useCallback(() => {
    setCurrentWordIndex(0)
    setTypedWord('')
    setShowResult(false)
    setCurrentResult(null)
    setResults([])
    setPracticeComplete(false)
    setWordStartTime(new Date())
    
    // Reset and focus input field
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
  }, [])

  const startNewSession = useCallback(() => {
    setWordStartTime(new Date())
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  const setErrorCallback = useCallback((error: string | null) => {
    setError(error)
  }, [])

  return {
    // State
    words,
    currentWordIndex,
    typedWord,
    showResult,
    currentResult,
    results,
    practiceComplete,
    wordStartTime,
    isLoading,
    error,
    
    // Actions
    setWords,
    setTypedWord,
    submitWord,
    nextWord,
    restartPractice,
    startNewSession,
    clearError,
    setLoading,
    setError: setErrorCallback,
    
    // Computed
    currentWord,
    accuracy,
    avgTime,
    avgHints,
    correctCount,
  }
}