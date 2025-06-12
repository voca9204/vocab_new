// News Processing - Extended Types and Constants

export interface NewsSource {
  id: string
  name: string
  url: string
  type: 'rss' | 'api' | 'scraping'
  category: NewsCategory
  reliability: number // 1-10 scale
  language: string
  region: string
  isActive: boolean
  lastCrawled?: Date
  totalArticles?: number
  errorCount?: number
}

export interface RawNewsArticle {
  title: string
  content: string
  url: string
  publishedAt: Date
  author?: string
  description?: string
  imageUrl?: string
  sourceName: string
  sourceId: string
  language: string
  rawData?: any // Original API response
}

export interface ProcessedNewsArticle extends NewsArticle {
  // From existing NewsArticle type
  wordCount: number
  readingTime: number // minutes
  satWordCount: number
  satWordDensity: number // percentage
  contentQuality: number // 1-10 scale
  ageAppropriate: boolean
  highlights: NewsHighlight[]
  summary: string
  tags: string[]
  isEducational: boolean
  processingLogs: ProcessingLog[]
}

export interface NewsHighlight {
  wordId: string
  word: string
  startIndex: number
  endIndex: number
  context: string // surrounding text
  definition: string
  difficulty: number
}

export interface ProcessingLog {
  timestamp: Date
  stage: ProcessingStage
  status: 'success' | 'warning' | 'error'
  message: string
  duration?: number
}

export interface ContentFilter {
  id: string
  name: string
  type: 'keyword' | 'regex' | 'ai' | 'manual'
  pattern: string
  action: 'block' | 'flag' | 'modify'
  reason: string
  isActive: boolean
}

export interface CrawlingConfig {
  maxArticlesPerSource: number
  crawlingInterval: number // hours
  maxContentLength: number
  minContentLength: number
  requiredSATWordCount: number
  enableContentFiltering: boolean
  enableAIProcessing: boolean
  retryAttempts: number
  timeout: number // seconds
}

export type NewsCategory = 
  | 'general'
  | 'politics' 
  | 'business'
  | 'technology'
  | 'science'
  | 'health'
  | 'education'
  | 'culture'
  | 'sports'
  | 'environment'

export type ProcessingStage = 
  | 'fetch'
  | 'parse'
  | 'filter'
  | 'detect_words'
  | 'validate'
  | 'store'
  | 'complete'

export type CrawlingStatus = 
  | 'idle'
  | 'running'
  | 'paused'
  | 'error'
  | 'completed'

export interface CrawlingSession {
  id: string
  startTime: Date
  endTime?: Date
  status: CrawlingStatus
  sourcesProcessed: number
  articlesFound: number
  articlesProcessed: number
  articlesStored: number
  errorCount: number
  logs: ProcessingLog[]
}

// News API Response Types
export interface NewsAPIResponse {
  status: string
  totalResults: number
  articles: NewsAPIArticle[]
}

export interface NewsAPIArticle {
  source: {
    id: string
    name: string
  }
  author: string
  title: string
  description: string
  url: string
  urlToImage: string
  publishedAt: string
  content: string
}

export interface RSSFeedResponse {
  title: string
  description: string
  link: string
  items: RSSItem[]
}

export interface RSSItem {
  title: string
  description: string
  link: string
  pubDate: string
  content?: string
  guid: string
}
