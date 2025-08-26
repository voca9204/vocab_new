import { LocalCacheManager } from '../local-cache-manager'

describe('LocalCacheManager', () => {
  let cacheManager: LocalCacheManager
  let localStorageMock: {
    getItem: jest.Mock
    setItem: jest.Mock
    removeItem: jest.Mock
    clear: jest.Mock
    key: jest.Mock
    length: number
  }
  
  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0
    }
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    })
    
    // Create fresh instance for each test
    cacheManager = new LocalCacheManager()
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })
  
  describe('get', () => {
    it('should return null if item not found', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = await cacheManager.get('test-key')
      
      expect(result).toBeNull()
      expect(localStorageMock.getItem).toHaveBeenCalledWith('vocab_cache_test-key')
    })
    
    it('should return cached value if not expired', async () => {
      const testData = { test: 'value' }
      const cacheData = {
        value: testData,
        timestamp: Date.now() - 1000 // 1 second ago
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheData))
      
      const result = await cacheManager.get('test-key')
      
      expect(result).toEqual(testData)
    })
    
    it('should return null and remove item if expired', async () => {
      const testData = { test: 'value' }
      const cacheData = {
        value: testData,
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheData))
      
      const result = await cacheManager.get('test-key')
      
      expect(result).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vocab_cache_test-key')
    })
    
    it('should handle invalid JSON gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      const result = await cacheManager.get('test-key')
      
      expect(result).toBeNull()
    })
  })
  
  describe('set', () => {
    it('should store value with timestamp', async () => {
      const testData = { test: 'value' }
      
      await cacheManager.set('test-key', testData)
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
      const [key, value] = localStorageMock.setItem.mock.calls[0]
      expect(key).toBe('vocab_cache_test-key')
      
      const storedData = JSON.parse(value)
      expect(storedData.value).toEqual(testData)
      expect(storedData.timestamp).toBeDefined()
    })
    
    it('should handle storage quota exceeded error', async () => {
      const testData = { test: 'value' }
      
      // First call fails with quota exceeded
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })
      
      // Mock Object.keys to return cache keys
      Object.keys = jest.fn().mockReturnValue([
        'vocab_cache_old1',
        'vocab_cache_old2',
        'vocab_cache_old3',
        'other_key'
      ])
      
      // Mock getItem for old cache items
      localStorageMock.getItem.mockImplementation((key) => {
        if (key.startsWith('vocab_cache_old')) {
          return JSON.stringify({
            value: {},
            timestamp: Date.now() - (30 * 60 * 60 * 1000) // 30 hours ago
          })
        }
        return null
      })
      
      await cacheManager.set('test-key', testData)
      
      // Should have attempted to clear old cache
      expect(localStorageMock.removeItem).toHaveBeenCalled()
      // Should retry setItem after clearing
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2)
    })
  })
  
  describe('remove', () => {
    it('should remove item from localStorage', async () => {
      await cacheManager.remove('test-key')
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vocab_cache_test-key')
    })
  })
  
  describe('clear', () => {
    it('should clear all cache items', async () => {
      Object.keys = jest.fn().mockReturnValue([
        'vocab_cache_item1',
        'vocab_cache_item2',
        'other_item',
        'vocab_cache_item3'
      ])
      
      await cacheManager.clear()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vocab_cache_item1')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vocab_cache_item2')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vocab_cache_item3')
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('other_item')
    })
  })
  
  describe('getStats', () => {
    it('should return cache statistics', () => {
      Object.keys = jest.fn().mockReturnValue([
        'vocab_cache_item1',
        'vocab_cache_item2',
        'other_item'
      ])
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'vocab_cache_item1') {
          return JSON.stringify({
            value: { data: 'test1' },
            timestamp: Date.now() - 1000
          })
        }
        if (key === 'vocab_cache_item2') {
          return JSON.stringify({
            value: { data: 'test2' },
            timestamp: Date.now() - 5000
          })
        }
        return null
      })
      
      const stats = cacheManager.getStats()
      
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.itemCount).toBe(2)
      expect(stats.oldestItem).toBeDefined()
    })
    
    it('should handle invalid cache items in stats', () => {
      Object.keys = jest.fn().mockReturnValue(['vocab_cache_invalid'])
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      const stats = cacheManager.getStats()
      
      expect(stats.itemCount).toBe(0)
      expect(stats.totalSize).toBe(0)
      expect(stats.oldestItem).toBeNull()
    })
  })
  
  describe('has', () => {
    it('should return true if item exists and not expired', async () => {
      const cacheData = {
        value: { test: 'data' },
        timestamp: Date.now() - 1000
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheData))
      
      const result = await cacheManager.has('test-key')
      
      expect(result).toBe(true)
    })
    
    it('should return false if item does not exist', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = await cacheManager.has('test-key')
      
      expect(result).toBe(false)
    })
    
    it('should return false if item is expired', async () => {
      const cacheData = {
        value: { test: 'data' },
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheData))
      
      const result = await cacheManager.has('test-key')
      
      expect(result).toBe(false)
    })
  })
})