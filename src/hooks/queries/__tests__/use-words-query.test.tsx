import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWord, useWords, useCollectionWords, useCategoryWords, useWordSearch } from '../use-words-query'
import { wordAdapterBridge } from '@/lib/adapters/word-adapter-bridge'
import React from 'react'

// Mock the word adapter bridge
jest.mock('@/lib/adapters/word-adapter-bridge', () => ({
  wordAdapterBridge: {
    getWordById: jest.fn(),
    getWordsByIds: jest.fn(),
    getWordsByCollection: jest.fn(),
    getWordsByCategory: jest.fn(),
    searchWordByText: jest.fn(),
    clearCache: jest.fn()
  }
}))

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

describe('useWords Query Hooks', () => {
  let queryClient: QueryClient
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
  
  const mockWord = {
    id: 'test-id',
    word: 'test',
    normalizedWord: 'test',
    definition: '테스트',
    englishDefinition: 'Test',
    pronunciation: '/test/',
    partOfSpeech: ['n.'],
    examples: ['This is a test'],
    synonyms: ['exam'],
    antonyms: [],
    etymology: null,
    difficulty: 5,
    frequency: 7,
    importance: 6,
    categories: ['SAT'],
    tags: [],
    source: {
      type: 'manual' as const,
      collection: 'test',
      addedAt: new Date()
    },
    quality: {
      score: 80,
      validated: true
    },
    aiGenerated: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isSAT: true
  }
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity
        }
      }
    })
    jest.clearAllMocks()
  })
  
  describe('useWord', () => {
    it('should fetch a single word by ID', async () => {
      const mockWordData = { ...mockWord }
      ;(wordAdapterBridge.getWordById as jest.Mock).mockResolvedValue(mockWordData)
      
      const { result } = renderHook(
        () => useWord('test-id'),
        { wrapper }
      )
      
      expect(result.current.isLoading).toBe(true)
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
      
      expect(result.current.data).toEqual(mockWordData)
      expect(wordAdapterBridge.getWordById).toHaveBeenCalledWith('test-id')
    })
    
    it('should not fetch if ID is null', () => {
      const { result } = renderHook(
        () => useWord(null),
        { wrapper }
      )
      
      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(wordAdapterBridge.getWordById).not.toHaveBeenCalled()
    })
  })
  
  describe('useWords', () => {
    it('should fetch multiple words by IDs', async () => {
      const mockWords = [mockWord, { ...mockWord, id: 'test-id-2', word: 'test2' }]
      ;(wordAdapterBridge.getWordsByIds as jest.Mock).mockResolvedValue(mockWords)
      
      const { result } = renderHook(
        () => useWords(['test-id', 'test-id-2']),
        { wrapper }
      )
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
      
      expect(result.current.data).toEqual(mockWords)
      expect(wordAdapterBridge.getWordsByIds).toHaveBeenCalledWith(['test-id', 'test-id-2'])
    })
    
    it('should return empty array for empty IDs', async () => {
      const { result } = renderHook(
        () => useWords([]),
        { wrapper }
      )
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
      
      expect(result.current.data).toEqual([])
      expect(wordAdapterBridge.getWordsByIds).not.toHaveBeenCalled()
    })
  })
  
  describe('useCollectionWords', () => {
    it('should fetch words by collection ID', async () => {
      const mockWords = [mockWord]
      ;(wordAdapterBridge.getWordsByCollection as jest.Mock).mockResolvedValue(mockWords)
      
      const { result } = renderHook(
        () => useCollectionWords('collection-id', 'official', 10),
        { wrapper }
      )
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
      
      expect(result.current.data).toEqual(mockWords)
      expect(wordAdapterBridge.getWordsByCollection).toHaveBeenCalledWith('collection-id', 'official', 10)
    })
    
    it('should not fetch if collection ID is null', () => {
      const { result } = renderHook(
        () => useCollectionWords(null),
        { wrapper }
      )
      
      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(wordAdapterBridge.getWordsByCollection).not.toHaveBeenCalled()
    })
  })
  
  describe('useCategoryWords', () => {
    it('should fetch words by category', async () => {
      const mockWords = [mockWord]
      ;(wordAdapterBridge.getWordsByCategory as jest.Mock).mockResolvedValue(mockWords)
      
      const { result } = renderHook(
        () => useCategoryWords('SAT', 50),
        { wrapper }
      )
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
      
      expect(result.current.data).toEqual(mockWords)
      expect(wordAdapterBridge.getWordsByCategory).toHaveBeenCalledWith('SAT', 50)
    })
    
    it('should use default limit of 100', async () => {
      const mockWords = [mockWord]
      ;(wordAdapterBridge.getWordsByCategory as jest.Mock).mockResolvedValue(mockWords)
      
      const { result } = renderHook(
        () => useCategoryWords('TOEFL'),
        { wrapper }
      )
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
      
      expect(wordAdapterBridge.getWordsByCategory).toHaveBeenCalledWith('TOEFL', 100)
    })
  })
  
  describe('useWordSearch', () => {
    it('should search for a word by text', async () => {
      ;(wordAdapterBridge.searchWordByText as jest.Mock).mockResolvedValue(mockWord)
      
      const { result } = renderHook(
        () => useWordSearch('test'),
        { wrapper }
      )
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
      
      expect(result.current.data).toEqual(mockWord)
      expect(wordAdapterBridge.searchWordByText).toHaveBeenCalledWith('test')
    })
    
    it('should not search if text is empty', () => {
      const { result } = renderHook(
        () => useWordSearch(''),
        { wrapper }
      )
      
      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(wordAdapterBridge.searchWordByText).not.toHaveBeenCalled()
    })
  })
})