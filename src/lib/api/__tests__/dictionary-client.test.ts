import { dictionaryClient } from '../dictionary-client'
import { freeDictionaryAPI } from '../free-dictionary'

// Mock the fetch function
global.fetch = jest.fn()

describe('Dictionary Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    dictionaryClient.clearCache()
  })

  describe('Free Dictionary API', () => {
    it('should fetch word definition successfully', async () => {
      const mockResponse = [{
        word: 'test',
        phonetic: '/test/',
        phonetics: [{ text: '/test/', audio: 'test.mp3' }],
        meanings: [{
          partOfSpeech: 'noun',
          definitions: [{
            definition: 'A procedure for critical evaluation',
            example: 'The test was challenging',
            synonyms: [],
            antonyms: []
          }],
          synonyms: ['examination'],
          antonyms: []
        }],
        sourceUrls: ['https://example.com']
      }]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await dictionaryClient.fetchWord('test')

      expect(result).toEqual({
        word: 'test',
        pronunciation: '/test/',
        definitions: [{
          partOfSpeech: 'noun',
          definition: 'A procedure for critical evaluation',
          example: 'The test was challenging',
          synonyms: ['examination'],
          antonyms: []
        }],
        audioUrl: 'test.mp3',
        sourceUrls: ['https://example.com'],
        apiSource: 'FreeDictionary',
        timestamp: expect.any(Number)
      })
    })

    it('should handle API errors gracefully', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(dictionaryClient.fetchWord('nonexistent'))
        .rejects.toThrow('All APIs failed')
    })
  })

  describe('Caching', () => {
    it('should cache successful responses', async () => {
      const mockResponse = [{
        word: 'cache',
        phonetic: '/kæʃ/',
        phonetics: [{ text: '/kæʃ/' }],
        meanings: [{
          partOfSpeech: 'noun',
          definitions: [{ definition: 'A hiding place' }]
        }]
      }]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      // First call should make API request
      await dictionaryClient.fetchWord('cache')
      expect(fetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await dictionaryClient.fetchWord('cache')
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('should provide cache statistics', () => {
      const stats = dictionaryClient.getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(typeof stats.size).toBe('number')
    })
  })
})
