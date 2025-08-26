import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { wordQueryKeys } from '@/hooks/queries/use-words-query'
import { collectionQueryKeys } from '@/hooks/queries/use-collections-query'
import { wordAdapterBridge } from '@/lib/adapters/word-adapter-bridge'
import { logger } from '@/lib/utils/logger'

interface PrefetchOptions {
  enabled?: boolean
  strategy?: 'aggressive' | 'conservative' | 'smart'
  maxPrefetchItems?: number
}

/**
 * Predictive prefetching hook for optimizing data loading
 * Predicts user behavior and preloads data accordingly
 */
export function usePredictivePrefetch(options: PrefetchOptions = {}) {
  const {
    enabled = true,
    strategy = 'smart',
    maxPrefetchItems = 10
  } = options
  
  const queryClient = useQueryClient()
  
  /**
   * Prefetch next/previous collection in sequence
   */
  const prefetchAdjacentCollections = useCallback(async (
    currentCollectionId: string,
    allCollections: any[]
  ) => {
    if (!enabled) return
    
    const currentIndex = allCollections.findIndex(c => c.id === currentCollectionId)
    if (currentIndex === -1) return
    
    // Prefetch next collection
    if (currentIndex < allCollections.length - 1) {
      const nextCollection = allCollections[currentIndex + 1]
      logger.debug(`Prefetching next collection: ${nextCollection.id}`)
      
      queryClient.prefetchQuery({
        queryKey: collectionQueryKeys.byId(nextCollection.id),
        queryFn: async () => {
          // Fetch collection metadata
          return nextCollection
        },
        staleTime: 5 * 60 * 1000 // 5 minutes
      })
      
      // Also prefetch first few words of next collection
      if (nextCollection.wordIds?.length > 0) {
        const wordsToPrefetch = nextCollection.wordIds.slice(0, maxPrefetchItems)
        queryClient.prefetchQuery({
          queryKey: wordQueryKeys.byIds(wordsToPrefetch),
          queryFn: () => wordAdapterBridge.getWordsByIds(wordsToPrefetch),
          staleTime: 5 * 60 * 1000
        })
      }
    }
    
    // Prefetch previous collection (for back navigation)
    if (currentIndex > 0 && strategy !== 'conservative') {
      const prevCollection = allCollections[currentIndex - 1]
      logger.debug(`Prefetching previous collection: ${prevCollection.id}`)
      
      queryClient.prefetchQuery({
        queryKey: collectionQueryKeys.byId(prevCollection.id),
        queryFn: async () => prevCollection,
        staleTime: 5 * 60 * 1000
      })
    }
  }, [enabled, queryClient, strategy, maxPrefetchItems])
  
  /**
   * Prefetch related words (synonyms, antonyms)
   */
  const prefetchRelatedWords = useCallback(async (word: any) => {
    if (!enabled || strategy === 'conservative') return
    
    const relatedWords: string[] = []
    
    // Collect related word texts
    if (word.synonyms?.length > 0) {
      relatedWords.push(...word.synonyms.slice(0, 3))
    }
    if (word.antonyms?.length > 0) {
      relatedWords.push(...word.antonyms.slice(0, 2))
    }
    
    // Prefetch related words
    for (const relatedWord of relatedWords) {
      logger.debug(`Prefetching related word: ${relatedWord}`)
      
      queryClient.prefetchQuery({
        queryKey: wordQueryKeys.search(relatedWord),
        queryFn: () => wordAdapterBridge.searchWordByText(relatedWord),
        staleTime: 10 * 60 * 1000 // 10 minutes
      })
    }
  }, [enabled, queryClient, strategy])
  
  /**
   * Prefetch words based on difficulty progression
   */
  const prefetchByDifficulty = useCallback(async (
    currentDifficulty: number,
    category: string
  ) => {
    if (!enabled || strategy === 'conservative') return
    
    // Prefetch words with similar difficulty
    const difficulties = [
      currentDifficulty - 1,
      currentDifficulty,
      currentDifficulty + 1
    ].filter(d => d >= 1 && d <= 10)
    
    for (const difficulty of difficulties) {
      logger.debug(`Prefetching words with difficulty ${difficulty} in category ${category}`)
      
      // This would need a new query in the adapter to fetch by difficulty
      // For now, we'll prefetch by category which is available
      if (difficulty === currentDifficulty) continue
      
      queryClient.prefetchQuery({
        queryKey: [...wordQueryKeys.byCategory(category), difficulty],
        queryFn: () => wordAdapterBridge.getWordsByCategory(category, maxPrefetchItems),
        staleTime: 10 * 60 * 1000
      })
    }
  }, [enabled, queryClient, strategy, maxPrefetchItems])
  
  /**
   * Smart prefetching based on user interaction patterns
   */
  const smartPrefetch = useCallback(async (context: {
    currentWord?: any
    currentCollection?: any
    allCollections?: any[]
    userPattern?: 'sequential' | 'random' | 'difficulty-based'
  }) => {
    if (!enabled || strategy === 'conservative') return
    
    const { currentWord, currentCollection, allCollections, userPattern = 'sequential' } = context
    
    logger.debug(`Smart prefetching with pattern: ${userPattern}`)
    
    switch (userPattern) {
      case 'sequential':
        // User tends to go through words in order
        if (currentCollection && allCollections) {
          await prefetchAdjacentCollections(currentCollection.id, allCollections)
        }
        break
        
      case 'difficulty-based':
        // User tends to study by difficulty level
        if (currentWord && currentWord.categories?.[0]) {
          await prefetchByDifficulty(currentWord.difficulty || 5, currentWord.categories[0])
        }
        break
        
      case 'random':
      default:
        // User jumps around - prefetch related content
        if (currentWord) {
          await prefetchRelatedWords(currentWord)
        }
        break
    }
  }, [enabled, strategy, prefetchAdjacentCollections, prefetchByDifficulty, prefetchRelatedWords])
  
  /**
   * Prefetch common navigation targets
   */
  const prefetchCommonTargets = useCallback(async () => {
    if (!enabled) return
    
    logger.debug('Prefetching common navigation targets')
    
    // Prefetch main collections (SAT, TOEFL, etc.)
    const commonCategories = ['SAT', 'TOEFL', 'GRE']
    
    for (const category of commonCategories) {
      queryClient.prefetchQuery({
        queryKey: wordQueryKeys.byCategory(category),
        queryFn: () => wordAdapterBridge.getWordsByCategory(category, 20),
        staleTime: 15 * 60 * 1000 // 15 minutes
      })
    }
  }, [enabled, queryClient])
  
  /**
   * Initialize prefetching on mount
   */
  useEffect(() => {
    if (!enabled) return
    
    // Prefetch common targets on app load
    if (strategy === 'aggressive') {
      prefetchCommonTargets()
    }
  }, [enabled, strategy, prefetchCommonTargets])
  
  return {
    prefetchAdjacentCollections,
    prefetchRelatedWords,
    prefetchByDifficulty,
    smartPrefetch,
    prefetchCommonTargets
  }
}

/**
 * Hook to track user interaction patterns for better prefetching
 */
export function useUserPatternTracking() {
  const detectPattern = useCallback((history: string[]): 'sequential' | 'random' | 'difficulty-based' => {
    if (history.length < 3) return 'sequential'
    
    // Check if user is going through items sequentially
    let sequentialCount = 0
    for (let i = 1; i < history.length; i++) {
      const prev = parseInt(history[i - 1].split('-').pop() || '0')
      const curr = parseInt(history[i].split('-').pop() || '0')
      if (Math.abs(curr - prev) === 1) sequentialCount++
    }
    
    if (sequentialCount > history.length * 0.6) {
      return 'sequential'
    }
    
    // Check if user is focusing on difficulty levels
    // This would need actual difficulty data to determine
    
    return 'random'
  }, [])
  
  return { detectPattern }
}