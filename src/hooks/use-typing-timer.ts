import { useState, useRef, useEffect, useCallback } from 'react'
import type { VocabularyWord } from '@/types'

// 전역 타이머 인스턴스 (중복 실행 방지)
let globalTimerInstance: NodeJS.Timeout | null = null

interface UseTypingTimerProps {
  currentWord: VocabularyWord | undefined
  showResult: boolean
  practiceComplete: boolean
  wordStartTime: Date | null
}

interface UseTypingTimerReturn {
  timeElapsed: number
  hintLevel: number
  nextHintIn: number
  resetTimer: () => void
  startNewWord: () => void
}

export function useTypingTimer({
  currentWord,
  showResult,
  practiceComplete,
  wordStartTime,
}: UseTypingTimerProps): UseTypingTimerReturn {
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [hintLevel, setHintLevel] = useState(0)
  const [nextHintIn, setNextHintIn] = useState(5)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hintLevelRef = useRef(0)
  const currentWordRef = useRef<VocabularyWord | undefined>(currentWord)
  const isTimerRunning = useRef(false)
  
  // currentWord가 변경될 때마다 ref 업데이트
  useEffect(() => {
    currentWordRef.current = currentWord
  }, [currentWord])

  const stopTimer = useCallback(() => {
    if (globalTimerInstance) {
      console.log('전역 타이머 정지')
      clearInterval(globalTimerInstance)
      globalTimerInstance = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    isTimerRunning.current = false
  }, [])

  // 프로덕션 모드에서도 안정적으로 작동하도록 함수 참조 방식 사용
  const updateTimer = useCallback(() => {
    console.log('타이머 틱 - 1초 경과')
    
    setTimeElapsed(prev => {
      const newTime = prev + 1
      console.log(`경과 시간: ${newTime}초`)
      return newTime
    })
    
    setNextHintIn(prev => {
      const newNextHint = prev - 1
      console.log(`nextHintIn 업데이트: ${prev} → ${newNextHint}`)
      
      if (newNextHint <= 0) {
        console.log('힌트 시간 도달! 힌트 레벨 증가 시도')
        // 최신 currentWord 참조를 다시 가져오기
        const currentWord = currentWordRef.current
        console.log('타이머 콜백에서 현재 단어:', currentWord?.word)
        
        if (currentWord) {
          setHintLevel(prevLevel => {
            console.log(`현재 단어: ${currentWord.word}, 현재 레벨: ${prevLevel}, 단어 길이: ${currentWord.word.length}`)
            if (prevLevel < currentWord.word.length) {
              const newLevel = prevLevel + 1
              console.log(`힌트 레벨 증가: ${prevLevel} → ${newLevel} (단어: ${currentWord.word})`)
              hintLevelRef.current = newLevel
              return newLevel
            }
            console.log('힌트 레벨 증가하지 않음 - 이미 최대 레벨')
            return prevLevel
          })
        } else {
          console.log('현재 단어가 없어서 힌트 레벨 증가하지 않음')
        }
        return 5 // Next hint in 5 seconds
      }
      
      return newNextHint
    })
  }, [])

  const startTimer = useCallback(() => {
    // 이미 실행 중이면 시작하지 않음
    if (isTimerRunning.current) {
      console.log('타이머 이미 실행 중 - 중복 실행 방지')
      return
    }
    
    // 전역 타이머가 이미 실행 중이면 시작하지 않음
    if (globalTimerInstance) {
      console.log('전역 타이머 이미 실행 중 - 중복 실행 방지')
      return
    }
    
    // 기존 타이머가 있으면 먼저 정지
    if (timerRef.current) {
      console.log('기존 타이머 정지')
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    console.log('새 타이머 시작', '현재 단어:', currentWordRef.current?.word)
    isTimerRunning.current = true
    const interval = setInterval(updateTimer, 1000)
    
    globalTimerInstance = interval
    timerRef.current = interval
    console.log('타이머 설정 완료, interval ID:', interval)
  }, [updateTimer])

  const resetTimer = useCallback(() => {
    setTimeElapsed(0)
    setHintLevel(0)
    setNextHintIn(5)
    hintLevelRef.current = 0
    stopTimer()
  }, [stopTimer])

  const startNewWord = useCallback(() => {
    resetTimer()
    // Small delay to ensure state is reset before starting
    setTimeout(() => {
      if (wordStartTime && !showResult && !practiceComplete) {
        startTimer()
      }
    }, 0)
  }, [resetTimer, startTimer, wordStartTime, showResult, practiceComplete])

  // Timer control logic
  useEffect(() => {
    console.log('Timer control effect 실행:', {
      showResult,
      currentWord: currentWord?.word,
      practiceComplete,
      wordStartTime: !!wordStartTime,
      shouldStart: !showResult && currentWord && !practiceComplete && wordStartTime
    })
    
    if (!showResult && currentWord && !practiceComplete && wordStartTime) {
      console.log('타이머 시작 조건 만족 - startTimer 호출')
      startTimer()
    } else {
      console.log('타이머 시작 조건 불만족 - stopTimer 호출')
      stopTimer()
    }
    
    return stopTimer
  }, [showResult, practiceComplete, wordStartTime, currentWord]) // startTimer, stopTimer 의존성 제거

  return {
    timeElapsed,
    hintLevel,
    nextHintIn,
    resetTimer,
    startNewWord,
  }
}