import { useState, useEffect, useCallback, useRef } from 'react'

interface LoadingStateOptions {
  delay?: number // Delay before showing loading state (prevents flicker)
  minDuration?: number // Minimum duration to show loading state
  onLoadingStart?: () => void
  onLoadingEnd?: () => void
}

/**
 * Hook for managing loading states with skeleton UI
 */
export function useLoadingState(
  initialLoading = false,
  options: LoadingStateOptions = {}
) {
  const {
    delay = 200, // 200ms delay before showing loading
    minDuration = 500, // Minimum 500ms loading display
    onLoadingStart,
    onLoadingEnd
  } = options

  const [isLoading, setIsLoading] = useState(initialLoading)
  const [showLoading, setShowLoading] = useState(false)
  
  const loadingStartTime = useRef<number | null>(null)
  const delayTimer = useRef<NodeJS.Timeout | null>(null)
  const minDurationTimer = useRef<NodeJS.Timeout | null>(null)

  const startLoading = useCallback(() => {
    setIsLoading(true)
    loadingStartTime.current = Date.now()
    
    // Clear any existing timers
    if (delayTimer.current) clearTimeout(delayTimer.current)
    if (minDurationTimer.current) clearTimeout(minDurationTimer.current)
    
    // Delay showing loading state to prevent flicker
    delayTimer.current = setTimeout(() => {
      setShowLoading(true)
      onLoadingStart?.()
    }, delay)
  }, [delay, onLoadingStart])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
    
    const elapsedTime = loadingStartTime.current
      ? Date.now() - loadingStartTime.current
      : 0
    
    // If loading was shown, ensure minimum duration
    if (showLoading && elapsedTime < minDuration) {
      const remainingTime = minDuration - elapsedTime
      
      minDurationTimer.current = setTimeout(() => {
        setShowLoading(false)
        onLoadingEnd?.()
      }, remainingTime)
    } else {
      // Clear delay timer if loading ends before delay
      if (delayTimer.current) {
        clearTimeout(delayTimer.current)
        delayTimer.current = null
      }
      
      setShowLoading(false)
      onLoadingEnd?.()
    }
    
    loadingStartTime.current = null
  }, [showLoading, minDuration, onLoadingEnd])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (delayTimer.current) clearTimeout(delayTimer.current)
      if (minDurationTimer.current) clearTimeout(minDurationTimer.current)
    }
  }, [])

  return {
    isLoading,
    showLoading,
    startLoading,
    stopLoading
  }
}

/**
 * Hook for managing multiple loading states
 */
export function useMultiLoadingState() {
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(new Map())
  
  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => {
      const next = new Map(prev)
      if (loading) {
        next.set(key, true)
      } else {
        next.delete(key)
      }
      return next
    })
  }, [])
  
  const isLoading = useCallback((key?: string) => {
    if (key) {
      return loadingStates.has(key)
    }
    return loadingStates.size > 0
  }, [loadingStates])
  
  const clearAll = useCallback(() => {
    setLoadingStates(new Map())
  }, [])
  
  return {
    setLoading,
    isLoading,
    clearAll,
    loadingCount: loadingStates.size
  }
}

/**
 * Hook for progressive loading (show different UI based on loading duration)
 */
export function useProgressiveLoading(options: {
  stages?: Array<{ duration: number; component: React.ComponentType }>
} = {}) {
  const defaultStages = [
    { duration: 0, component: () => null }, // Nothing for first 200ms
    { duration: 200, component: () => 'Loading...' }, // Simple text
    { duration: 1000, component: () => 'Still loading...' }, // Updated text
    { duration: 5000, component: () => 'Taking longer than expected...' } // Warning
  ]
  
  const stages = options.stages || defaultStages
  const [currentStage, setCurrentStage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const startTime = useRef<number | null>(null)
  const timers = useRef<NodeJS.Timeout[]>([])
  
  const startLoading = useCallback(() => {
    setIsLoading(true)
    startTime.current = Date.now()
    setCurrentStage(0)
    
    // Clear existing timers
    timers.current.forEach(clearTimeout)
    timers.current = []
    
    // Set up stage timers
    stages.forEach((stage, index) => {
      if (index > 0) {
        const timer = setTimeout(() => {
          setCurrentStage(index)
        }, stage.duration)
        timers.current.push(timer)
      }
    })
  }, [stages])
  
  const stopLoading = useCallback(() => {
    setIsLoading(false)
    startTime.current = null
    setCurrentStage(0)
    
    // Clear all timers
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout)
    }
  }, [])
  
  return {
    isLoading,
    currentStage,
    CurrentStageComponent: stages[currentStage]?.component,
    startLoading,
    stopLoading,
    elapsedTime: startTime.current ? Date.now() - startTime.current : 0
  }
}