'use client'

import React, { createContext, useContext, useCallback, useRef } from 'react'

interface CachedData<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheContextType {
  // Synonym cache
  getSynonyms: (word: string) => string[] | null
  setSynonyms: (word: string, synonyms: string[]) => void
  
  // Discovery cache
  getDiscovery: (word: string) => { word: any; exists: boolean } | null
  setDiscovery: (word: string, data: any, exists: boolean) => void
  
  // Generic cache operations
  clearCache: (type?: 'synonyms' | 'discovery') => void
  getCacheStats: () => {
    synonyms: { size: number; hits: number; misses: number }
    discovery: { size: number; hits: number; misses: number }
  }
}

const CacheContext = createContext<CacheContextType | undefined>(undefined)

export function useCache() {
  const context = useContext(CacheContext)
  if (!context) {
    throw new Error('useCache must be used within CacheProvider')
  }
  return context
}

interface CacheProviderProps {
  children: React.ReactNode
  defaultTTL?: {
    synonyms?: number
    discovery?: number
  }
}

export function CacheProvider({ 
  children, 
  defaultTTL = {
    synonyms: 10 * 60 * 1000, // 10 minutes
    discovery: 5 * 60 * 1000   // 5 minutes
  }
}: CacheProviderProps) {
  // Cache storage
  const synonymCache = useRef<Map<string, CachedData<string[]>>>(new Map())
  const discoveryCache = useRef<Map<string, CachedData<{ word: any; exists: boolean }>>>(new Map())
  
  // LocalStorage keys
  const SYNONYM_CACHE_KEY = 'vocabulary_synonym_cache'
  const DISCOVERY_CACHE_KEY = 'vocabulary_discovery_cache'
  
  // Load cache from localStorage on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      // Load synonym cache
      const storedSynonyms = localStorage.getItem(SYNONYM_CACHE_KEY)
      if (storedSynonyms) {
        const parsed = JSON.parse(storedSynonyms)
        synonymCache.current = new Map(Object.entries(parsed))
        console.log('[CacheContext] Loaded', synonymCache.current.size, 'synonym entries from localStorage')
      }
      
      // Load discovery cache
      const storedDiscovery = localStorage.getItem(DISCOVERY_CACHE_KEY)
      if (storedDiscovery) {
        const parsed = JSON.parse(storedDiscovery)
        discoveryCache.current = new Map(Object.entries(parsed))
        console.log('[CacheContext] Loaded', discoveryCache.current.size, 'discovery entries from localStorage')
      }
    } catch (error) {
      console.error('[CacheContext] Error loading from localStorage:', error)
    }
  }, [])
  
  // Cache statistics
  const stats = useRef({
    synonyms: { hits: 0, misses: 0 },
    discovery: { hits: 0, misses: 0 }
  })

  // Helper to check if cache entry is still valid
  const isValid = useCallback(<T,>(entry: CachedData<T> | undefined): entry is CachedData<T> => {
    if (!entry) return false
    return Date.now() - entry.timestamp < entry.ttl
  }, [])

  // Synonym cache operations
  const getSynonyms = useCallback((word: string): string[] | null => {
    const key = word.toLowerCase()
    const entry = synonymCache.current.get(key)
    
    if (isValid(entry)) {
      stats.current.synonyms.hits++
      console.log('[CacheContext] Synonym cache hit for:', word)
      return entry.data
    }
    
    stats.current.synonyms.misses++
    if (entry) {
      // Remove expired entry
      synonymCache.current.delete(key)
    }
    return null
  }, [isValid])

  const setSynonyms = useCallback((word: string, synonyms: string[]) => {
    const key = word.toLowerCase()
    synonymCache.current.set(key, {
      data: synonyms,
      timestamp: Date.now(),
      ttl: defaultTTL.synonyms!
    })
    console.log('[CacheContext] Cached synonyms for:', word)
  }, [defaultTTL.synonyms])

  // Discovery cache operations
  const getDiscovery = useCallback((word: string): { word: any; exists: boolean } | null => {
    const key = word.toLowerCase()
    const entry = discoveryCache.current.get(key)
    
    if (isValid(entry)) {
      stats.current.discovery.hits++
      console.log('[CacheContext] Discovery cache hit for:', word)
      return entry.data
    }
    
    stats.current.discovery.misses++
    if (entry) {
      // Remove expired entry
      discoveryCache.current.delete(key)
    }
    return null
  }, [isValid])

  const setDiscovery = useCallback((word: string, data: any, exists: boolean) => {
    const key = word.toLowerCase()
    discoveryCache.current.set(key, {
      data: { word: data, exists },
      timestamp: Date.now(),
      ttl: defaultTTL.discovery!
    })
    console.log('[CacheContext] Cached discovery for:', word, 'exists:', exists)
  }, [defaultTTL.discovery])

  // Clear cache
  const clearCache = useCallback((type?: 'synonyms' | 'discovery') => {
    if (!type || type === 'synonyms') {
      synonymCache.current.clear()
      stats.current.synonyms = { hits: 0, misses: 0 }
      console.log('[CacheContext] Cleared synonym cache')
    }
    if (!type || type === 'discovery') {
      discoveryCache.current.clear()
      stats.current.discovery = { hits: 0, misses: 0 }
      console.log('[CacheContext] Cleared discovery cache')
    }
  }, [])

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return {
      synonyms: {
        size: synonymCache.current.size,
        hits: stats.current.synonyms.hits,
        misses: stats.current.synonyms.misses
      },
      discovery: {
        size: discoveryCache.current.size,
        hits: stats.current.discovery.hits,
        misses: stats.current.discovery.misses
      }
    }
  }, [])

  // Periodic cleanup of expired entries
  React.useEffect(() => {
    const cleanup = () => {
      let cleanedSynonyms = 0
      let cleanedDiscovery = 0

      // Clean synonym cache
      for (const [key, entry] of synonymCache.current.entries()) {
        if (!isValid(entry)) {
          synonymCache.current.delete(key)
          cleanedSynonyms++
        }
      }

      // Clean discovery cache
      for (const [key, entry] of discoveryCache.current.entries()) {
        if (!isValid(entry)) {
          discoveryCache.current.delete(key)
          cleanedDiscovery++
        }
      }

      if (cleanedSynonyms > 0 || cleanedDiscovery > 0) {
        console.log(`[CacheContext] Cleaned up ${cleanedSynonyms} synonym entries, ${cleanedDiscovery} discovery entries`)
      }
    }

    const interval = setInterval(cleanup, 60 * 1000) // Run every minute
    return () => clearInterval(interval)
  }, [isValid])

  const value: CacheContextType = {
    getSynonyms,
    setSynonyms,
    getDiscovery,
    setDiscovery,
    clearCache,
    getCacheStats
  }

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  )
}