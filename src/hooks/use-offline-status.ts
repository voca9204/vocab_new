import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

interface OfflineStatusOptions {
  onOnline?: () => void
  onOffline?: () => void
  checkInterval?: number
}

export function useOfflineStatus(options: OfflineStatusOptions = {}) {
  const {
    onOnline,
    onOffline,
    checkInterval = 5000 // Check every 5 seconds
  } = options
  
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  )
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [pendingActions, setPendingActions] = useState<number>(0)
  
  // Handle online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleOnline = () => {
      logger.info('Connection restored')
      setIsOnline(true)
      setLastSyncTime(new Date())
      onOnline?.()
    }
    
    const handleOffline = () => {
      logger.warn('Connection lost')
      setIsOnline(false)
      onOffline?.()
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Initial check
    setIsOnline(navigator.onLine)
    
    // Periodic connectivity check
    const intervalId = setInterval(() => {
      const currentStatus = navigator.onLine
      if (currentStatus !== isOnline) {
        setIsOnline(currentStatus)
        if (currentStatus) {
          handleOnline()
        } else {
          handleOffline()
        }
      }
    }, checkInterval)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(intervalId)
    }
  }, [isOnline, onOnline, onOffline, checkInterval])
  
  // Save last sync time to localStorage
  useEffect(() => {
    if (lastSyncTime) {
      localStorage.setItem('lastSyncTime', lastSyncTime.getTime().toString())
    }
  }, [lastSyncTime])
  
  // Load last sync time from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('lastSyncTime')
    if (stored) {
      setLastSyncTime(new Date(parseInt(stored)))
    }
  }, [])
  
  const addPendingAction = useCallback(() => {
    setPendingActions(prev => prev + 1)
  }, [])
  
  const removePendingAction = useCallback(() => {
    setPendingActions(prev => Math.max(0, prev - 1))
  }, [])
  
  const clearPendingActions = useCallback(() => {
    setPendingActions(0)
  }, [])
  
  return {
    isOnline,
    lastSyncTime,
    pendingActions,
    addPendingAction,
    removePendingAction,
    clearPendingActions
  }
}

/**
 * Hook for managing offline queue
 */
export function useOfflineQueue<T = any>() {
  const [queue, setQueue] = useState<T[]>([])
  
  // Load queue from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('offlineQueue')
    if (stored) {
      try {
        setQueue(JSON.parse(stored))
      } catch (error) {
        logger.error('Failed to load offline queue:', error)
      }
    }
  }, [])
  
  // Save queue to localStorage
  useEffect(() => {
    if (queue.length > 0) {
      localStorage.setItem('offlineQueue', JSON.stringify(queue))
    } else {
      localStorage.removeItem('offlineQueue')
    }
  }, [queue])
  
  const addToQueue = useCallback((item: T) => {
    setQueue(prev => [...prev, item])
  }, [])
  
  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index))
  }, [])
  
  const clearQueue = useCallback(() => {
    setQueue([])
    localStorage.removeItem('offlineQueue')
  }, [])
  
  const processQueue = useCallback(async (
    processor: (item: T) => Promise<void>
  ) => {
    const items = [...queue]
    const results = []
    
    for (let i = 0; i < items.length; i++) {
      try {
        await processor(items[i])
        removeFromQueue(0) // Remove from front as we process
        results.push({ success: true, item: items[i] })
      } catch (error) {
        logger.error('Failed to process queue item:', error)
        results.push({ success: false, item: items[i], error })
      }
    }
    
    return results
  }, [queue, removeFromQueue])
  
  return {
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue
  }
}