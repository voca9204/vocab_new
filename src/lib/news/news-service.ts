// News Processing - Main News Service Integration

import { newsCrawlerService } from './news-crawler'
import { newsFirestoreService } from './news-firestore'
import { satWordDetector } from './sat-word-detector'
import { contentFilteringService } from './content-filtering'
import type { 
  NewsSource, 
  CrawlingSession, 
  ProcessedNewsArticle,
  CrawlingConfig 
} from '@/types/news'
import { NEWS_CONFIG } from '@/lib/constants'

export interface NewsServiceConfig {
  autoScheduling?: boolean
  schedulingInterval?: number // hours
  maxStoredArticles?: number
  qualityThreshold?: number
}

export interface NewsServiceStats {
  totalArticles: number
  articlesLastCrawl: number
  avgProcessingTime: number
  lastCrawlTime?: Date
  nextScheduledCrawl?: Date
  crawlingStatus: 'idle' | 'running' | 'error'
  errorRate: number
}

export class NewsService {
  private config: NewsServiceConfig
  private schedulingTimer?: NodeJS.Timeout
  private lastCrawlStats: any = null

  constructor(config: NewsServiceConfig = {}) {
    this.config = {
      autoScheduling: false,
      schedulingInterval: NEWS_CONFIG.CRAWLING_INTERVAL_HOURS,
      maxStoredArticles: 1000,
      qualityThreshold: NEWS_CONFIG.MIN_QUALITY_SCORE,
      ...config
    }
  }

  /**
   * Initialize the news service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing News Service...')
      
      // Initialize SAT word detector
      await satWordDetector.initialize()
      console.log('✅ SAT Word Detector initialized')

      // Start auto-scheduling if enabled
      if (this.config.autoScheduling) {
        this.startAutoScheduling()
        console.log('⏰ Auto-scheduling enabled')
      }

      console.log('🎉 News Service initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize News Service:', error)
      throw error
    }
  }

  /**
   * Run a complete news crawling and processing cycle
   */
  async runCrawlingCycle(sources?: NewsSource[]): Promise<{
    session: CrawlingSession
    storedArticles: number
    skippedArticles: number
    errors: string[]
  }> {
    console.log('🕷️ Starting news crawling cycle...')
    
    try {
      // Step 1: Crawl news articles
      const crawlingResult = await newsCrawlerService.startCrawling(sources)
      console.log(`📰 Crawled ${crawlingResult.articles.length} articles`)

      // Step 2: Filter high-quality articles
      const qualityArticles = crawlingResult.articles.filter(article => 
        article.contentQuality >= this.config.qualityThreshold! &&
        article.ageAppropriate &&
        article.satWordCount >= NEWS_CONFIG.REQUIRED_SAT_WORDS
      )

      console.log(`✨ ${qualityArticles.length} articles passed quality filter`)

      // Step 3: Store articles in Firestore
      const storageResult = await newsFirestoreService.storeArticles(qualityArticles)
      console.log(`💾 Stored ${storageResult.success} articles successfully`)

      // Step 4: Store crawling session
      await newsFirestoreService.storeCrawlingSession(crawlingResult.session)

      // Step 5: Cleanup old articles if needed
      await this.cleanupOldArticlesIfNeeded()

      // Update stats
      this.lastCrawlStats = {
        timestamp: new Date(),
        articlesFound: crawlingResult.articles.length,
        articlesStored: storageResult.success,
        errors: crawlingResult.errors.concat(storageResult.errors)
      }

      return {
        session: crawlingResult.session,
        storedArticles: storageResult.success,
        skippedArticles: crawlingResult.articles.length - qualityArticles.length + storageResult.failed,
        errors: crawlingResult.errors.map(e => e.error).concat(storageResult.errors)
      }

    } catch (error) {
      console.error('❌ News crawling cycle failed:', error)
      throw error
    }
  }

  /**
   * Get latest educational articles
   */
  async getEducationalArticles(options: {
    limit?: number
    minSATWords?: number
    maxDifficulty?: number
    userLevel?: number
  } = {}): Promise<ProcessedNewsArticle[]> {
    try {
      const { articles } = await newsFirestoreService.getLatestArticles({
        limit: options.limit || 10,
        minSATWords: options.minSATWords || 3,
        maxDifficulty: options.maxDifficulty || (options.userLevel ? options.userLevel + 2 : 8),
        educationalOnly: true,
        ageAppropriate: true
      })

      return articles
    } catch (error) {
      console.error('Error fetching educational articles:', error)
      throw error
    }
  }

  /**
   * Get articles featuring specific vocabulary words
   */
  async getArticlesForVocabulary(
    wordIds: string[],
    limit: number = 5
  ): Promise<ProcessedNewsArticle[]> {
    try {
      const articles = await newsFirestoreService.getArticlesWithWords(wordIds, limit)
      return articles
    } catch (error) {
      console.error('Error fetching articles for vocabulary:', error)
      throw error
    }
  }

  /**
   * Get articles for contextual learning
   */
  async getContextualLearningArticles(
    userWordIds: string[],
    limit: number = 3
  ): Promise<ProcessedNewsArticle[]> {
    try {
      // Get articles that contain words the user is currently learning
      const contextualArticles = await newsFirestoreService.getArticlesWithWords(
        userWordIds, 
        limit * 2 // Get more to filter
      )

      // Filter for educational quality
      const educationalArticles = contextualArticles.filter(article => 
        article.isEducational && 
        article.ageAppropriate &&
        article.contentQuality >= 7
      )

      return educationalArticles.slice(0, limit)
    } catch (error) {
      console.error('Error fetching contextual learning articles:', error)
      throw error
    }
  }

  /**
   * Analyze text for SAT vocabulary
   */
  async analyzeTextForSATWords(text: string): Promise<{
    highlights: any[]
    wordCount: number
    satWordCount: number
    satWordDensity: number
    educationalValue: number
  }> {
    try {
      const detection = await satWordDetector.detectSATWords(text)
      const quality = satWordDetector.evaluateContentQuality(text)

      return {
        highlights: detection.highlights,
        wordCount: satWordDetector.analyzeText(text).wordCount,
        satWordCount: detection.satWordCount,
        satWordDensity: detection.satWordDensity,
        educationalValue: quality.score
      }
    } catch (error) {
      console.error('Error analyzing text:', error)
      throw error
    }
  }

  /**
   * Get news service statistics
   */
  async getServiceStats(): Promise<NewsServiceStats> {
    try {
      const newsStats = await newsFirestoreService.getNewsStatistics()
      const crawlingStatus = newsCrawlerService.getCurrentStatus()

      return {
        totalArticles: newsStats.totalArticles,
        articlesLastCrawl: this.lastCrawlStats?.articlesStored || 0,
        avgProcessingTime: 0, // Would calculate from session logs
        lastCrawlTime: this.lastCrawlStats?.timestamp,
        nextScheduledCrawl: this.getNextScheduledTime(),
        crawlingStatus: crawlingStatus.isRunning ? 'running' : 'idle',
        errorRate: this.calculateErrorRate()
      }
    } catch (error) {
      console.error('Error getting service stats:', error)
      throw error
    }
  }

  /**
   * Start automatic crawling scheduling
   */
  startAutoScheduling(): void {
    if (this.schedulingTimer) {
      clearInterval(this.schedulingTimer)
    }

    const intervalMs = this.config.schedulingInterval! * 60 * 60 * 1000 // Convert hours to ms

    this.schedulingTimer = setInterval(async () => {
      try {
        console.log('⏰ Scheduled crawling cycle starting...')
        await this.runCrawlingCycle()
        console.log('✅ Scheduled crawling cycle completed')
      } catch (error) {
        console.error('❌ Scheduled crawling cycle failed:', error)
      }
    }, intervalMs)

    console.log(`⏰ Auto-scheduling enabled: every ${this.config.schedulingInterval} hours`)
  }

  /**
   * Stop automatic crawling scheduling
   */
  stopAutoScheduling(): void {
    if (this.schedulingTimer) {
      clearInterval(this.schedulingTimer)
      this.schedulingTimer = undefined
      console.log('⏰ Auto-scheduling disabled')
    }
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<NewsServiceConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart scheduling if configuration changed
    if (newConfig.autoScheduling !== undefined || newConfig.schedulingInterval !== undefined) {
      if (this.config.autoScheduling) {
        this.startAutoScheduling()
      } else {
        this.stopAutoScheduling()
      }
    }
  }

  /**
   * Manual trigger for immediate crawling
   */
  async triggerImmediateCrawling(sources?: NewsSource[]): Promise<void> {
    console.log('🚀 Manual crawling triggered')
    await this.runCrawlingCycle(sources)
  }

  /**
   * Get content filtering statistics
   */
  getContentFilteringStats(): any {
    return contentFilteringService.getFilteringStats()
  }

  /**
   * Get SAT word detection statistics
   */
  getSATWordDetectionStats(): any {
    return satWordDetector.getStatistics()
  }

  /**
   * Emergency stop all operations
   */
  emergencyStop(): void {
    console.log('🛑 Emergency stop triggered')
    this.stopAutoScheduling()
    newsCrawlerService.stopCrawling()
  }

  /**
   * Health check for the news service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Array<{ name: string; status: 'pass' | 'fail'; message?: string }>
  }> {
    const checks = []

    // Check SAT word detector
    try {
      const detectorStats = satWordDetector.getStatistics()
      checks.push({
        name: 'SAT Word Detector',
        status: detectorStats.totalWords > 0 ? 'pass' : 'fail',
        message: `${detectorStats.totalWords} words loaded`
      })
    } catch (error) {
      checks.push({
        name: 'SAT Word Detector',
        status: 'fail',
        message: 'Failed to check detector status'
      })
    }

    // Check crawler status
    const crawlerStatus = newsCrawlerService.getCurrentStatus()
    checks.push({
      name: 'News Crawler',
      status: crawlerStatus.isRunning ? 'pass' : 'pass', // Running or idle is fine
      message: `Status: ${crawlerStatus.isRunning ? 'running' : 'idle'}`
    })

    // Check recent articles
    try {
      const { articles } = await newsFirestoreService.getLatestArticles({ limit: 1 })
      checks.push({
        name: 'Recent Articles',
        status: articles.length > 0 ? 'pass' : 'fail',
        message: articles.length > 0 ? 'Recent articles available' : 'No recent articles'
      })
    } catch (error) {
      checks.push({
        name: 'Recent Articles',
        status: 'fail',
        message: 'Failed to check recent articles'
      })
    }

    const failedChecks = checks.filter(check => check.status === 'fail').length
    const status = failedChecks === 0 ? 'healthy' : failedChecks <= 1 ? 'degraded' : 'unhealthy'

    return { status, checks }
  }

  /**
   * Private helper methods
   */
  private async cleanupOldArticlesIfNeeded(): Promise<void> {
    try {
      const stats = await newsFirestoreService.getNewsStatistics()
      if (stats.totalArticles > this.config.maxStoredArticles!) {
        const deleted = await newsFirestoreService.cleanupOldArticles()
        console.log(`🗑️ Cleaned up ${deleted} old articles`)
      }
    } catch (error) {
      console.warn('Warning: Failed to cleanup old articles:', error)
    }
  }

  private getNextScheduledTime(): Date | undefined {
    if (!this.config.autoScheduling || !this.lastCrawlStats?.timestamp) {
      return undefined
    }

    const nextTime = new Date(this.lastCrawlStats.timestamp)
    nextTime.setHours(nextTime.getHours() + this.config.schedulingInterval!)
    return nextTime
  }

  private calculateErrorRate(): number {
    if (!this.lastCrawlStats?.errors) return 0
    const totalOperations = this.lastCrawlStats.articlesFound || 1
    return (this.lastCrawlStats.errors.length / totalOperations) * 100
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoScheduling()
    console.log('🧹 News Service destroyed')
  }
}

// Singleton instance
export const newsService = new NewsService({
  autoScheduling: false, // Will be enabled in production
  schedulingInterval: 6, // 6 hours
  maxStoredArticles: 1000,
  qualityThreshold: 6
})
