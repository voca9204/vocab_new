/**
 * LocalCacheManager - 브라우저 로컬 스토리지를 활용한 캐시 관리
 * 
 * Features:
 * - TTL 기반 캐시 만료
 * - 자동 용량 관리
 * - 타입 안정성
 * - 성능 최적화
 */

export class LocalCacheManager {
  private readonly CACHE_PREFIX = 'vocab_cache_'
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24시간
  private readonly MAX_CACHE_SIZE = 5 * 1024 * 1024 // 5MB
  
  /**
   * 캐시에서 데이터 가져오기
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.CACHE_PREFIX + key
      const cached = localStorage.getItem(cacheKey)
      
      if (!cached) return null
      
      const data = JSON.parse(cached) as CacheEntry<T>
      
      // TTL 체크
      if (Date.now() - data.timestamp > (data.ttl || this.DEFAULT_TTL)) {
        localStorage.removeItem(cacheKey)
        return null
      }
      
      // 통계 업데이트
      this.updateStats('hit')
      
      return data.value
    } catch (error) {
      console.warn('[CacheManager] Error reading cache:', error)
      this.updateStats('error')
      return null
    }
  }
  
  /**
   * 캐시에 데이터 저장
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + key
      const data: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl: ttl || this.DEFAULT_TTL
      }
      
      const serialized = JSON.stringify(data)
      
      // 용량 체크
      if (serialized.length > this.MAX_CACHE_SIZE / 10) {
        console.warn('[CacheManager] Data too large to cache:', key)
        return
      }
      
      try {
        localStorage.setItem(cacheKey, serialized)
        this.updateStats('set')
      } catch (e) {
        // 스토리지 용량 초과 시 오래된 캐시 삭제
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          await this.clearOldCache()
          // 재시도
          localStorage.setItem(cacheKey, serialized)
        } else {
          throw e
        }
      }
    } catch (error) {
      console.error('[CacheManager] Error setting cache:', error)
      this.updateStats('error')
    }
  }
  
  /**
   * 특정 캐시 삭제
   */
  async remove(key: string): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + key
    localStorage.removeItem(cacheKey)
    this.updateStats('remove')
  }
  
  /**
   * 패턴과 일치하는 캐시 삭제
   */
  async removePattern(pattern: string): Promise<void> {
    const keys = Object.keys(localStorage)
    const regex = new RegExp(this.CACHE_PREFIX + pattern)
    
    keys.forEach(key => {
      if (regex.test(key)) {
        localStorage.removeItem(key)
      }
    })
  }
  
  /**
   * 모든 캐시 삭제
   */
  async clear(): Promise<void> {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
    this.updateStats('clear')
  }
  
  /**
   * 오래된 캐시 삭제 (용량 관리)
   */
  private async clearOldCache(): Promise<void> {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX))
    
    if (cacheKeys.length === 0) return
    
    // 캐시 항목들을 타임스탬프 순으로 정렬
    const cacheItems: Array<{ key: string; timestamp: number }> = []
    
    cacheKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        cacheItems.push({
          key,
          timestamp: data.timestamp || 0
        })
      } catch {
        // 파싱 실패한 항목은 삭제 대상
        localStorage.removeItem(key)
      }
    })
    
    // 오래된 순으로 정렬
    cacheItems.sort((a, b) => a.timestamp - b.timestamp)
    
    // 가장 오래된 50% 삭제
    const toDelete = Math.ceil(cacheItems.length / 2)
    cacheItems.slice(0, toDelete).forEach(item => {
      localStorage.removeItem(item.key)
    })
    
    console.log(`[CacheManager] Cleared ${toDelete} old cache entries`)
  }
  
  /**
   * 캐시 통계 조회
   */
  getStats(): CacheStats {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX))
    
    let totalSize = 0
    let validCount = 0
    let expiredCount = 0
    
    cacheKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key) || ''
        totalSize += data.length * 2 // UTF-16 encoding
        
        const parsed = JSON.parse(data)
        if (Date.now() - parsed.timestamp > (parsed.ttl || this.DEFAULT_TTL)) {
          expiredCount++
        } else {
          validCount++
        }
      } catch {
        // Ignore
      }
    })
    
    const stats = this.loadStats()
    
    return {
      ...stats,
      totalEntries: cacheKeys.length,
      validEntries: validCount,
      expiredEntries: expiredCount,
      sizeInBytes: totalSize,
      sizeInMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
    }
  }
  
  /**
   * 통계 업데이트
   */
  private updateStats(operation: 'hit' | 'miss' | 'set' | 'remove' | 'clear' | 'error'): void {
    const statsKey = this.CACHE_PREFIX + '_stats'
    const stats = this.loadStats()
    
    switch (operation) {
      case 'hit':
        stats.hits++
        break
      case 'miss':
        stats.misses++
        break
      case 'set':
        stats.sets++
        break
      case 'remove':
        stats.removes++
        break
      case 'clear':
        stats.clears++
        break
      case 'error':
        stats.errors++
        break
    }
    
    stats.lastUpdated = Date.now()
    
    try {
      localStorage.setItem(statsKey, JSON.stringify(stats))
    } catch {
      // Ignore stats update failure
    }
  }
  
  /**
   * 통계 로드
   */
  private loadStats(): CacheStats {
    const statsKey = this.CACHE_PREFIX + '_stats'
    try {
      const saved = localStorage.getItem(statsKey)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // Ignore
    }
    
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      removes: 0,
      clears: 0,
      errors: 0,
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      sizeInBytes: 0,
      sizeInMB: 0,
      lastUpdated: Date.now()
    }
  }
}

/**
 * 캐시 엔트리 타입
 */
interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
}

/**
 * 캐시 통계 타입
 */
interface CacheStats {
  hits: number
  misses: number
  sets: number
  removes: number
  clears: number
  errors: number
  totalEntries: number
  validEntries: number
  expiredEntries: number
  sizeInBytes: number
  sizeInMB: number
  lastUpdated: number
}

// 싱글톤 인스턴스
export const cacheManager = new LocalCacheManager()