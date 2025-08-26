import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UnifiedWord } from '@/types/unified-word'
import { wordAdapterBridge } from '@/lib/adapters/word-adapter-bridge'
import { logger } from '@/lib/utils/logger'

// Query Keys
export const wordQueryKeys = {
  all: ['words'] as const,
  byId: (id: string) => ['words', 'byId', id] as const,
  byIds: (ids: string[]) => ['words', 'byIds', ids] as const,
  byCollection: (collectionId: string) => ['words', 'collection', collectionId] as const,
  byCategory: (category: string) => ['words', 'category', category] as const,
  search: (text: string) => ['words', 'search', text] as const,
}

// Fetch single word by ID
export function useWord(id: string | null) {
  return useQuery({
    queryKey: wordQueryKeys.byId(id || ''),
    queryFn: async () => {
      if (!id) return null
      logger.debug(`Fetching word with ID: ${id}`)
      return wordAdapterBridge.getWordById(id)
    },
    enabled: !!id,
  })
}

// Fetch multiple words by IDs
export function useWords(ids: string[]) {
  return useQuery({
    queryKey: wordQueryKeys.byIds(ids),
    queryFn: async () => {
      if (ids.length === 0) return []
      logger.debug(`Fetching ${ids.length} words by IDs`)
      return wordAdapterBridge.getWordsByIds(ids)
    },
    enabled: ids.length > 0,
  })
}

// Fetch words by collection
export function useCollectionWords(collectionId: string | null, collectionType?: string, limit?: number) {
  return useQuery({
    queryKey: wordQueryKeys.byCollection(collectionId || ''),
    queryFn: async () => {
      if (!collectionId) return []
      logger.debug(`Fetching words for collection: ${collectionId}`)
      return wordAdapterBridge.getWordsByCollection(collectionId, collectionType, limit)
    },
    enabled: !!collectionId,
  })
}

// Fetch words by category
export function useCategoryWords(category: string | null, limit: number = 100) {
  return useQuery({
    queryKey: wordQueryKeys.byCategory(category || ''),
    queryFn: async () => {
      if (!category) return []
      logger.debug(`Fetching words for category: ${category}`)
      return wordAdapterBridge.getWordsByCategory(category, limit)
    },
    enabled: !!category,
  })
}

// Search word by text
export function useWordSearch(searchText: string) {
  return useQuery({
    queryKey: wordQueryKeys.search(searchText),
    queryFn: async () => {
      if (!searchText) return null
      logger.debug(`Searching for word: ${searchText}`)
      return wordAdapterBridge.searchWordByText(searchText)
    },
    enabled: !!searchText && searchText.length > 0,
  })
}

// Clear all caches
export function useClearWordCache() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      logger.info('Clearing all word caches')
      await wordAdapterBridge.clearCache()
    },
    onSuccess: () => {
      // Invalidate all word queries
      queryClient.invalidateQueries({ queryKey: wordQueryKeys.all })
    },
  })
}

// Prefetch words for performance
export function usePrefetchWords() {
  const queryClient = useQueryClient()
  
  return async (ids: string[]) => {
    await queryClient.prefetchQuery({
      queryKey: wordQueryKeys.byIds(ids),
      queryFn: () => wordAdapterBridge.getWordsByIds(ids),
    })
  }
}