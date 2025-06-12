// News Processing Module - Main Exports

// Core Services
export { newsService } from './news-service'
export { newsCrawlerService } from './news-crawler'
export { newsFirestoreService } from './news-firestore'

// Processing Components
export { satWordDetector } from './sat-word-detector'
export { contentFilteringService } from './content-filtering'

// Types (re-export from types/news)
export type {
  NewsSource,
  RawNewsArticle,
  ProcessedNewsArticle,
  NewsHighlight,
  ContentFilter,
  CrawlingConfig,
  CrawlingSession,
  NewsCategory,
  ProcessingStage,
  CrawlingStatus,
  WordDetectionResult,
  TextAnalysis,
  FilterResult,
  AgeAppropriatenessCheck
} from '@/types/news'

// Constants
export { NEWS_CONFIG, SAT_WORD_PATTERNS, CONTENT_QUALITY } from '@/lib/constants'

/**
 * Initialize the complete news processing system
 */
export async function initializeNewsSystem(): Promise<void> {
  console.log('🚀 Initializing News Processing System...')
  
  try {
    await newsService.initialize()
    console.log('✅ News Processing System initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize News Processing System:', error)
    throw error
  }
}

/**
 * Quick start for news processing
 * Usage: import { quickStartNews } from '@/lib/news'
 */
export async function quickStartNews(): Promise<{
  articlesProcessed: number
  educationalArticles: number
  errors: string[]
}> {
  try {
    // Initialize if not already done
    await initializeNewsSystem()
    
    // Run a crawling cycle
    const result = await newsService.runCrawlingCycle()
    
    // Get educational articles
    const educationalArticles = await newsService.getEducationalArticles({ limit: 10 })
    
    return {
      articlesProcessed: result.storedArticles,
      educationalArticles: educationalArticles.length,
      errors: result.errors
    }
  } catch (error) {
    console.error('Quick start failed:', error)
    throw error
  }
}

/**
 * Health check for the entire news system
 */
export async function checkNewsSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: Record<string, 'operational' | 'degraded' | 'down'>
  message: string
}> {
  try {
    const healthCheck = await newsService.healthCheck()
    
    const services = {
      'News Service': healthCheck.status === 'healthy' ? 'operational' : 'degraded',
      'SAT Word Detector': 'operational', // Would check actual status
      'Content Filtering': 'operational', // Would check actual status
      'Firestore': 'operational' // Would check actual status
    }
    
    return {
      status: healthCheck.status,
      services,
      message: `System ${healthCheck.status}. ${healthCheck.checks.length} checks completed.`
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      services: {
        'News Service': 'down',
        'SAT Word Detector': 'down',
        'Content Filtering': 'down',
        'Firestore': 'down'
      },
      message: `Health check failed: ${error}`
    }
  }
}

/**
 * Emergency procedures
 */
export function emergencyStopNews(): void {
  console.log('🚨 Emergency stop initiated for News System')
  newsService.emergencyStop()
}

/**
 * Get system statistics and performance metrics
 */
export async function getNewsSystemStats(): Promise<{
  serviceStats: any
  contentFilteringStats: any
  detectionStats: any
  systemHealth: any
}> {
  try {
    const [serviceStats, contentFilteringStats, detectionStats, systemHealth] = await Promise.all([
      newsService.getServiceStats(),
      newsService.getContentFilteringStats(),
      newsService.getSATWordDetectionStats(),
      checkNewsSystemHealth()
    ])

    return {
      serviceStats,
      contentFilteringStats,
      detectionStats,
      systemHealth
    }
  } catch (error) {
    console.error('Error getting system stats:', error)
    throw error
  }
}

/**
 * Utility functions for common operations
 */
export const newsUtils = {
  // Analyze any text for SAT vocabulary
  analyzeText: (text: string) => newsService.analyzeTextForSATWords(text),
  
  // Get contextual articles for learning
  getContextualArticles: (wordIds: string[], limit = 3) => 
    newsService.getContextualLearningArticles(wordIds, limit),
  
  // Get articles for specific vocabulary
  getVocabularyArticles: (wordIds: string[], limit = 5) => 
    newsService.getArticlesForVocabulary(wordIds, limit),
  
  // Manual crawling trigger
  triggerCrawling: (sources?: any[]) => 
    newsService.triggerImmediateCrawling(sources),
  
  // Update system configuration
  updateConfig: (config: any) => 
    newsService.updateConfig(config)
}

// Default export for main service
export default newsService
