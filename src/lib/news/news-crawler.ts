// News Processing - News Crawler and Fetcher

import type { 
  NewsSource, 
  RawNewsArticle, 
  ProcessedNewsArticle,
  CrawlingSession,
  CrawlingConfig,
  NewsAPIResponse,
  RSSFeedResponse 
} from '@/types/news'
import { NEWS_CONFIG } from '@/lib/constants'
import { satWordDetector } from './sat-word-detector'
import { contentFilteringService } from './content-filtering'

export interface CrawlingResult {
  session: CrawlingSession
  articles: ProcessedNewsArticle[]
  errors: Array<{ source: string; error: string }>
}

export class NewsCrawlerService {
  private config: CrawlingConfig
  private isRunning = false
  private currentSession: CrawlingSession | null = null

  constructor(config?: Partial<CrawlingConfig>) {
    this.config = {
      maxArticlesPerSource: NEWS_CONFIG.MAX_ARTICLES_PER_SOURCE,
      crawlingInterval: NEWS_CONFIG.CRAWLING_INTERVAL_HOURS,
      maxContentLength: NEWS_CONFIG.MAX_CONTENT_LENGTH,
      minContentLength: NEWS_CONFIG.MIN_CONTENT_LENGTH,
      requiredSATWordCount: NEWS_CONFIG.REQUIRED_SAT_WORDS,
      enableContentFiltering: true,
      enableAIProcessing: true,
      retryAttempts: NEWS_CONFIG.MAX_RETRIES,
      timeout: NEWS_CONFIG.TIMEOUT_SECONDS * 1000,
      ...config
    }
  }

  /**
   * Start crawling session
   */
  async startCrawling(sources?: NewsSource[]): Promise<CrawlingResult> {
    if (this.isRunning) {
      throw new Error('Crawling session already in progress')
    }

    this.isRunning = true
    const sourcesToUse = sources || NEWS_CONFIG.NEWS_SOURCES.map(s => ({
      ...s,
      isActive: true,
      lastCrawled: undefined,
      totalArticles: 0,
      errorCount: 0
    }))

    // Initialize crawling session
    this.currentSession = {
      id: `session-${Date.now()}`,
      startTime: new Date(),
      status: 'running',
      sourcesProcessed: 0,
      articlesFound: 0,
      articlesProcessed: 0,
      articlesStored: 0,
      errorCount: 0,
      logs: []
    }

    console.log(`🕷️ Starting news crawling session: ${this.currentSession.id}`)

    const results: ProcessedNewsArticle[] = []
    const errors: Array<{ source: string; error: string }> = []

    try {
      // Initialize SAT word detector
      await satWordDetector.initialize()

      // Process each news source
      for (const source of sourcesToUse) {
        if (!source.isActive) continue

        try {
          console.log(`📰 Processing source: ${source.name}`)
          const articles = await this.crawlSource(source)
          
          for (const article of articles) {
            try {
              const processed = await this.processArticle(article)
              if (processed) {
                results.push(processed)
                this.currentSession.articlesStored++
              }
            } catch (error) {
              console.error(`Error processing article from ${source.name}:`, error)
              errors.push({
                source: source.name,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
              this.currentSession.errorCount++
            }
          }

          this.currentSession.sourcesProcessed++
        } catch (error) {
          console.error(`Error crawling source ${source.name}:`, error)
          errors.push({
            source: source.name,
            error: error instanceof Error ? error.message : 'Source crawling failed'
          })
          this.currentSession.errorCount++
        }
      }

      // Complete session
      this.currentSession.endTime = new Date()
      this.currentSession.status = 'completed'
      
      console.log(`✅ Crawling session completed: ${results.length} articles processed`)

    } catch (error) {
      this.currentSession.status = 'error'
      this.currentSession.endTime = new Date()
      console.error('Crawling session failed:', error)
      throw error
    } finally {
      this.isRunning = false
    }

    return {
      session: this.currentSession,
      articles: results,
      errors
    }
  }

  /**
   * Crawl articles from a specific news source
   */
  private async crawlSource(source: NewsSource): Promise<RawNewsArticle[]> {
    switch (source.type) {
      case 'rss':
        return this.crawlRSSFeed(source)
      case 'api':
        return this.crawlNewsAPI(source)
      default:
        throw new Error(`Unsupported source type: ${source.type}`)
    }
  }

  /**
   * Crawl RSS feed
   */
  private async crawlRSSFeed(source: NewsSource): Promise<RawNewsArticle[]> {
    try {
      const response = await fetch(source.url, {
        timeout: this.config.timeout,
        headers: {
          'User-Agent': 'SAT-Vocabulary-Learning-Bot/2.0'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const xmlText = await response.text()
      const articles = this.parseRSSFeed(xmlText, source)
      
      this.currentSession!.articlesFound += articles.length
      return articles.slice(0, this.config.maxArticlesPerSource)

    } catch (error) {
      console.error(`RSS crawling error for ${source.name}:`, error)
      throw error
    }
  }

  /**
   * Parse RSS feed XML
   */
  private parseRSSFeed(xmlText: string, source: NewsSource): RawNewsArticle[] {
    // Simple RSS parsing (in production, use a proper XML parser)
    const articles: RawNewsArticle[] = []
    
    // Extract item elements using regex (simplified approach)
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const items = xmlText.match(itemRegex) || []

    for (const itemXml of items) {
      try {
        const article = this.parseRSSItem(itemXml, source)
        if (article) {
          articles.push(article)
        }
      } catch (error) {
        console.warn('Error parsing RSS item:', error)
      }
    }

    return articles
  }

  /**
   * Parse individual RSS item
   */
  private parseRSSItem(itemXml: string, source: NewsSource): RawNewsArticle | null {
    const extractTag = (tag: string): string => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
      const match = itemXml.match(regex)
      return match ? match[1].trim() : ''
    }

    const title = this.stripHTML(extractTag('title'))
    const description = this.stripHTML(extractTag('description'))
    const link = extractTag('link')
    const pubDate = extractTag('pubDate')

    if (!title || !link) {
      return null
    }

    // For RSS, content is often in description
    // In a real implementation, you might fetch the full article content
    const content = description || title

    return {
      title,
      content,
      url: link,
      publishedAt: pubDate ? new Date(pubDate) : new Date(),
      description,
      sourceName: source.name,
      sourceId: source.id,
      language: source.language,
      rawData: itemXml
    }
  }

  /**
   * Crawl from News API
   */
  private async crawlNewsAPI(source: NewsSource): Promise<RawNewsArticle[]> {
    // This would integrate with actual news APIs like NewsAPI.org
    // For now, return empty array as placeholder
    console.log(`API crawling for ${source.name} not implemented yet`)
    return []
  }

  /**
   * Process raw article into processed article
   */
  private async processArticle(rawArticle: RawNewsArticle): Promise<ProcessedNewsArticle | null> {
    try {
      // Apply content filtering
      if (this.config.enableContentFiltering) {
        const filterResult = await contentFilteringService.filterArticle(rawArticle)
        
        if (filterResult.blocked) {
          console.log(`❌ Article blocked: ${rawArticle.title}`)
          return null
        }

        if (filterResult.flagged) {
          console.log(`⚠️ Article flagged: ${rawArticle.title}`)
        }
      }

      // Detect SAT words
      const wordDetection = await satWordDetector.detectSATWords(rawArticle.content)
      
      // Check if article has enough SAT words
      if (wordDetection.satWordCount < this.config.requiredSATWordCount) {
        console.log(`📖 Article has insufficient SAT words (${wordDetection.satWordCount}): ${rawArticle.title}`)
        return null
      }

      // Analyze text quality
      const textAnalysis = satWordDetector.analyzeText(rawArticle.content)
      const qualityCheck = satWordDetector.evaluateContentQuality(rawArticle.content)

      // Check age appropriateness
      const ageCheck = contentFilteringService.checkAgeAppropriateness(rawArticle.content)

      // Create processed article
      const processedArticle: ProcessedNewsArticle = {
        // Base NewsArticle fields
        id: `${rawArticle.sourceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: rawArticle.title,
        content: rawArticle.content,
        url: rawArticle.url,
        source: rawArticle.sourceName,
        publishedAt: rawArticle.publishedAt,
        processedAt: new Date(),
        satWords: wordDetection.detectedWords,
        difficulty: this.calculateArticleDifficulty(textAnalysis, wordDetection),

        // Extended fields
        wordCount: textAnalysis.wordCount,
        readingTime: textAnalysis.readingTime,
        satWordCount: wordDetection.satWordCount,
        satWordDensity: wordDetection.satWordDensity,
        contentQuality: qualityCheck.score,
        ageAppropriate: ageCheck.isAppropriate,
        highlights: wordDetection.highlights,
        summary: this.generateSummary(rawArticle.content),
        tags: this.extractTags(rawArticle),
        isEducational: qualityCheck.isEducational,
        processingLogs: [
          {
            timestamp: new Date(),
            stage: 'complete',
            status: 'success',
            message: 'Article processed successfully',
            duration: wordDetection.processingTime
          }
        ]
      }

      this.currentSession!.articlesProcessed++
      return processedArticle

    } catch (error) {
      console.error('Error processing article:', error)
      return null
    }
  }

  /**
   * Calculate article difficulty based on analysis
   */
  private calculateArticleDifficulty(textAnalysis: any, wordDetection: any): number {
    // Simple difficulty calculation
    let difficulty = 5 // Base difficulty

    // Adjust based on grade level
    if (textAnalysis.gradeLevel > 12) difficulty += 2
    else if (textAnalysis.gradeLevel > 10) difficulty += 1
    else if (textAnalysis.gradeLevel < 9) difficulty -= 1

    // Adjust based on SAT word density
    if (wordDetection.satWordDensity > 2) difficulty += 1
    else if (wordDetection.satWordDensity < 0.5) difficulty -= 1

    return Math.max(1, Math.min(10, Math.round(difficulty)))
  }

  /**
   * Generate article summary
   */
  private generateSummary(content: string): string {
    // Simple extractive summary (first 150 characters)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const firstSentence = sentences[0]?.trim() || ''
    
    if (firstSentence.length <= 150) {
      return firstSentence
    }
    
    return firstSentence.substring(0, 147) + '...'
  }

  /**
   * Extract relevant tags from article
   */
  private extractTags(article: RawNewsArticle): string[] {
    const tags: string[] = []
    
    // Extract from title and content
    const text = `${article.title} ${article.content}`.toLowerCase()
    
    // Simple keyword extraction
    const keywords = [
      'technology', 'science', 'politics', 'business', 'health',
      'education', 'environment', 'culture', 'sports', 'economy'
    ]
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tags.push(keyword)
      }
    })

    return tags
  }

  /**
   * Strip HTML tags from text
   */
  private stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim()
  }

  /**
   * Get current crawling status
   */
  getCurrentStatus(): {
    isRunning: boolean
    session: CrawlingSession | null
  } {
    return {
      isRunning: this.isRunning,
      session: this.currentSession
    }
  }

  /**
   * Update crawling configuration
   */
  updateConfig(newConfig: Partial<CrawlingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Stop current crawling session
   */
  stopCrawling(): void {
    if (this.currentSession && this.isRunning) {
      this.currentSession.status = 'paused'
      this.currentSession.endTime = new Date()
      this.isRunning = false
      console.log('🛑 Crawling session stopped')
    }
  }
}

// Singleton instance
export const newsCrawlerService = new NewsCrawlerService()
