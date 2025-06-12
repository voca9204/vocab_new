// Unified Dictionary API Client with Fallback and Rate Limiting
import { freeDictionaryAPI, type FreeDictionaryResponse } from './free-dictionary'

export interface StandardDictionaryResponse {
  word: string
  pronunciation: string
  definitions: Array<{
    partOfSpeech: string
    definition: string
    example: string
    synonyms: string[]
    antonyms: string[]
  }>
  audioUrl: string
  sourceUrls: string[]
  apiSource: 'FreeDictionary' | 'MerriamWebster' | 'WordsAPI'
  timestamp: number
}

export interface APIError {
  code: string
  message: string
  apiSource: string
  timestamp: number
}

// Rate limiting configuration
interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  retryAfterMs: number
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  constructor(private config: RateLimitConfig) {}
  
  canMakeRequest(apiSource: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(apiSource) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.config.windowMs)
    this.requests.set(apiSource, validRequests)
    
    return validRequests.length < this.config.maxRequests
  }
  
  recordRequest(apiSource: string): void {
    const requests = this.requests.get(apiSource) || []
    requests.push(Date.now())
    this.requests.set(apiSource, requests)
  }
  
  getRetryAfter(apiSource: string): number {
    return this.config.retryAfterMs
  }
}

// Cache implementation
class DictionaryCache {
  private cache: Map<string, { data: StandardDictionaryResponse; expiry: number }> = new Map()
  private readonly TTL = 24 * 60 * 60 * 1000 // 24 hours

  get(word: string): StandardDictionaryResponse | null {
    const entry = this.cache.get(word.toLowerCase())
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(word.toLowerCase())
      return null
    }
    
    return entry.data
  }

  set(word: string, data: StandardDictionaryResponse): void {
    this.cache.set(word.toLowerCase(), {
      data,
      expiry: Date.now() + this.TTL
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

class DictionaryClient {
  private rateLimiter: RateLimiter
  private cache: DictionaryCache
  private readonly maxRetries = 3
  private readonly retryDelayMs = 1000

  constructor() {
    this.rateLimiter = new RateLimiter({
      maxRequests: 60, // 60 requests per minute
      windowMs: 60 * 1000,
      retryAfterMs: 60 * 1000
    })
    this.cache = new DictionaryCache()
  }

  async fetchWord(word: string, useCache: boolean = true): Promise<StandardDictionaryResponse> {
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(word)
      if (cached) {
        return cached
      }
    }

    // Try APIs in order of preference
    const apis = ['FreeDictionary'] as const
    let lastError: Error | null = null

    for (const apiSource of apis) {
      try {
        const result = await this.fetchFromAPI(word, apiSource)
        
        // Cache successful result
        if (useCache) {
          this.cache.set(word, result)
        }
        
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.warn(`API ${apiSource} failed for word "${word}":`, error)
        continue
      }
    }

    throw new Error(`All APIs failed for word "${word}". Last error: ${lastError?.message}`)
  }

  private async fetchFromAPI(word: string, apiSource: 'FreeDictionary'): Promise<StandardDictionaryResponse> {
    // Check rate limiting
    if (!this.rateLimiter.canMakeRequest(apiSource)) {
      const retryAfter = this.rateLimiter.getRetryAfter(apiSource)
      throw new Error(`Rate limit exceeded for ${apiSource}. Retry after ${retryAfter}ms`)
    }

    // Record the request
    this.rateLimiter.recordRequest(apiSource)

    // Retry logic
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        switch (apiSource) {
          case 'FreeDictionary':
            const response = await freeDictionaryAPI.fetchWord(word)
            return freeDictionaryAPI.parseResponse(response)
          default:
            throw new Error(`Unsupported API: ${apiSource}`)
        }
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw error
        }
        
        // Exponential backoff
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error(`Max retries exceeded for ${apiSource}`)
  }

  // Utility methods
  clearCache(): void {
    this.cache.clear()
  }

  getCacheStats(): { size: number } {
    return { size: this.cache.size() }
  }
}

export const dictionaryClient = new DictionaryClient()
