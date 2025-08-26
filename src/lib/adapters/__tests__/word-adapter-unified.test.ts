import { UnifiedWordAdapter } from '../word-adapter-unified'
import { LocalCacheManager } from '@/lib/cache/local-cache-manager'
import { getDoc, getDocs } from 'firebase/firestore'
import { UnifiedWord } from '@/types/unified-word'

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
  Timestamp: {
    now: jest.fn(() => new Date()),
    fromDate: jest.fn((date) => date)
  }
}))

// Mock LocalCacheManager
jest.mock('@/lib/cache/local-cache-manager')

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

describe('UnifiedWordAdapter', () => {
  let adapter: UnifiedWordAdapter
  let mockCacheManager: jest.Mocked<LocalCacheManager>
  
  const mockWord: UnifiedWord = {
    id: 'test-id',
    word: 'test',
    normalizedWord: 'test',
    definition: '테스트',
    englishDefinition: 'A test',
    pronunciation: '/test/',
    partOfSpeech: ['n.', 'v.'],
    examples: ['This is a test'],
    synonyms: ['exam', 'trial'],
    antonyms: ['reality'],
    etymology: 'From Latin testum',
    difficulty: 5,
    frequency: 7,
    importance: 6,
    categories: ['SAT', 'TOEFL'],
    tags: ['common'],
    source: {
      type: 'manual',
      collection: 'test-collection',
      addedAt: new Date()
    },
    quality: {
      score: 85,
      validated: true
    },
    aiGenerated: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isSAT: true
  }
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    
    // Reset localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }
    global.localStorage = localStorageMock as any
    
    // Create adapter instance
    adapter = new UnifiedWordAdapter()
    
    // Get mocked cache manager instance
    mockCacheManager = (LocalCacheManager as jest.MockedClass<typeof LocalCacheManager>).mock.instances[0] as any
  })
  
  describe('getWordById', () => {
    it('should return word from memory cache if available', async () => {
      // Setup: Add word to memory cache
      adapter['memoryCache'].set('test-id', mockWord)
      
      const result = await adapter.getWordById('test-id')
      
      expect(result).toEqual(mockWord)
      expect(mockCacheManager.get).not.toHaveBeenCalled()
      expect(getDoc).not.toHaveBeenCalled()
    })
    
    it('should return word from localStorage cache if available', async () => {
      // Setup: Mock localStorage cache
      mockCacheManager.get.mockResolvedValue(mockWord)
      
      const result = await adapter.getWordById('test-id')
      
      expect(result).toEqual(mockWord)
      expect(mockCacheManager.get).toHaveBeenCalledWith('test-id')
      expect(getDoc).not.toHaveBeenCalled()
    })
    
    it('should fetch from Firestore if not in cache', async () => {
      // Setup: Mock Firestore response
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          word: 'test',
          definition: '테스트',
          englishDefinition: 'A test',
          // ... other fields
        }),
        id: 'test-id'
      }
      ;(getDoc as jest.Mock).mockResolvedValue(mockDocSnap)
      mockCacheManager.get.mockResolvedValue(null)
      
      const result = await adapter.getWordById('test-id')
      
      expect(result).toBeTruthy()
      expect(result?.word).toBe('test')
      expect(getDoc).toHaveBeenCalled()
      expect(mockCacheManager.set).toHaveBeenCalled()
    })
    
    it('should return null if word not found', async () => {
      // Setup: Mock empty response
      const mockDocSnap = {
        exists: () => false
      }
      ;(getDoc as jest.Mock).mockResolvedValue(mockDocSnap)
      mockCacheManager.get.mockResolvedValue(null)
      
      const result = await adapter.getWordById('non-existent')
      
      expect(result).toBeNull()
    })
  })
  
  describe('getWordsByIds', () => {
    it('should return empty array for empty input', async () => {
      const result = await adapter.getWordsByIds([])
      
      expect(result).toEqual([])
      expect(getDocs).not.toHaveBeenCalled()
    })
    
    it('should batch fetch uncached words', async () => {
      // Setup: Mock Firestore response
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            data: () => ({
              word: 'test1',
              definition: '테스트1'
            }),
            id: 'test-1'
          })
          callback({
            data: () => ({
              word: 'test2',
              definition: '테스트2'
            }),
            id: 'test-2'
          })
        })
      }
      ;(getDocs as jest.Mock).mockResolvedValue(mockSnapshot)
      mockCacheManager.get.mockResolvedValue(null)
      
      const result = await adapter.getWordsByIds(['test-1', 'test-2'])
      
      expect(result).toHaveLength(2)
      expect(getDocs).toHaveBeenCalled()
    })
    
    it('should handle batch size limits correctly', async () => {
      // Create array of 100 IDs (should result in 4 batches of 30)
      const ids = Array.from({ length: 100 }, (_, i) => `test-${i}`)
      
      const mockSnapshot = {
        forEach: jest.fn()
      }
      ;(getDocs as jest.Mock).mockResolvedValue(mockSnapshot)
      mockCacheManager.get.mockResolvedValue(null)
      
      await adapter.getWordsByIds(ids)
      
      // Should make 4 batch requests (100 / 30 = 3.33...)
      expect(getDocs).toHaveBeenCalledTimes(4)
    })
  })
  
  describe('searchWordByText', () => {
    it('should search by normalized word', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{
          data: () => ({
            word: 'Test',
            normalizedWord: 'test',
            definition: '테스트'
          }),
          id: 'test-id'
        }]
      }
      ;(getDocs as jest.Mock).mockResolvedValue(mockSnapshot)
      
      const result = await adapter.searchWordByText('Test')
      
      expect(result).toBeTruthy()
      expect(result?.normalizedWord).toBe('test')
    })
    
    it('should return null if no word found', async () => {
      const mockSnapshot = {
        empty: true,
        docs: []
      }
      ;(getDocs as jest.Mock).mockResolvedValue(mockSnapshot)
      
      const result = await adapter.searchWordByText('nonexistent')
      
      expect(result).toBeNull()
    })
  })
  
  describe('getWordsByCategory', () => {
    it('should fetch words by category', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            data: () => ({
              word: 'test',
              categories: ['SAT'],
              importance: 8
            }),
            id: 'test-id'
          })
        })
      }
      ;(getDocs as jest.Mock).mockResolvedValue(mockSnapshot)
      
      const result = await adapter.getWordsByCategory('SAT', 10)
      
      expect(result).toHaveLength(1)
      expect(result[0].word).toBe('test')
    })
  })
  
  describe('clearCache', () => {
    it('should clear all caches', async () => {
      // Add item to memory cache
      adapter['memoryCache'].set('test', mockWord)
      
      await adapter.clearCache()
      
      expect(adapter['memoryCache'].size).toBe(0)
      expect(mockCacheManager.clear).toHaveBeenCalled()
    })
  })
  
  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      // Add items to memory cache
      adapter['memoryCache'].set('test1', mockWord)
      adapter['memoryCache'].set('test2', mockWord)
      
      mockCacheManager.getStats.mockReturnValue({
        totalSize: 1024,
        itemCount: 2,
        oldestItem: new Date()
      })
      
      const stats = adapter.getCacheStats()
      
      expect(stats.memoryCache.size).toBe(2)
      expect(stats.localStorage).toBeDefined()
    })
  })
})