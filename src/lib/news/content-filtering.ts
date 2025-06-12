// News Processing - Content Filtering System

import type { ContentFilter, RawNewsArticle } from '@/types/news'
import { NEWS_CONFIG } from '@/lib/constants'

export interface FilterResult {
  passed: boolean
  blocked: boolean
  flagged: boolean
  reasons: string[]
  confidence: number // 0-1
  modifiedContent?: string
}

export interface AgeAppropriatenessCheck {
  isAppropriate: boolean
  ageRating: number // 13, 16, 18+
  concerns: string[]
  suggestions: string[]
}

export class ContentFilteringService {
  private activeFilters: ContentFilter[] = []
  private inappropriatePatterns: RegExp[] = []
  
  constructor() {
    this.initializeDefaultFilters()
  }

  /**
   * Initialize default content filters
   */
  private initializeDefaultFilters(): void {
    // Keyword-based filters
    const keywordFilters: ContentFilter[] = NEWS_CONFIG.BLOCKED_KEYWORDS.map(keyword => ({
      id: `keyword-${keyword.replace(/\s+/g, '-')}`,
      name: `Block: ${keyword}`,
      type: 'keyword',
      pattern: keyword,
      action: 'block',
      reason: 'Inappropriate content',
      isActive: true
    }))

    // Regex-based filters
    const regexFilters: ContentFilter[] = [
      {
        id: 'violence-regex',
        name: 'Violence Detection',
        type: 'regex',
        pattern: '\\b(kill|murder|violent|assault|attack|weapon|gun|blood)\\w*\\b',
        action: 'flag',
        reason: 'Potentially violent content',
        isActive: true
      },
      {
        id: 'profanity-regex',
        name: 'Profanity Filter',
        type: 'regex',
        pattern: '\\b(damn|hell|crap|stupid|idiot)\\b',
        action: 'flag',
        reason: 'Mild profanity detected',
        isActive: true
      },
      {
        id: 'adult-content-regex',
        name: 'Adult Content Detection',
        type: 'regex',
        pattern: '\\b(adult|mature|explicit|sexual|inappropriate)\\b',
        action: 'block',
        reason: 'Adult content detected',
        isActive: true
      }
    ]

    this.activeFilters = [...keywordFilters, ...regexFilters]
    this.compilePatterns()
  }

  /**
   * Compile regex patterns for performance
   */
  private compilePatterns(): void {
    this.inappropriatePatterns = this.activeFilters
      .filter(filter => filter.type === 'regex' && filter.isActive)
      .map(filter => new RegExp(filter.pattern, 'gi'))
  }

  /**
   * Filter article content
   */
  async filterArticle(article: RawNewsArticle): Promise<FilterResult> {
    const fullText = `${article.title} ${article.content} ${article.description || ''}`
    
    // Apply all active filters
    const results = await Promise.all([
      this.applyKeywordFilters(fullText),
      this.applyRegexFilters(fullText),
      this.checkContentLength(article),
      this.checkLanguage(article),
      this.checkAgeAppropriateness(fullText)
    ])

    // Combine results
    const combinedResult = this.combineFilterResults(results)
    
    // Add article-specific checks
    if (this.hasSensitiveTopics(fullText)) {
      combinedResult.flagged = true
      combinedResult.reasons.push('Contains sensitive topics that may need review')
    }

    return combinedResult
  }

  /**
   * Check age appropriateness
   */
  checkAgeAppropriateness(text: string): AgeAppropriatenessCheck {
    const concerns: string[] = []
    let ageRating = 13 // Default for teenagers
    
    // Violence indicators
    const violenceWords = ['murder', 'kill', 'violence', 'war', 'conflict', 'death']
    const violenceCount = violenceWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length
    
    if (violenceCount > 2) {
      ageRating = Math.max(ageRating, 16)
      concerns.push('Contains violence-related content')
    }

    // Adult themes
    const adultThemes = ['alcohol', 'drugs', 'politics', 'controversy']
    const adultThemeCount = adultThemes.filter(theme => 
      text.toLowerCase().includes(theme)
    ).length
    
    if (adultThemeCount > 1) {
      ageRating = Math.max(ageRating, 16)
      concerns.push('Contains mature themes')
    }

    // Complex topics that might be confusing
    const complexTopics = ['economy', 'legislation', 'diplomacy', 'regulations']
    const complexTopicCount = complexTopics.filter(topic => 
      text.toLowerCase().includes(topic)
    ).length

    if (complexTopicCount > 2) {
      concerns.push('Contains complex topics that may need explanation')
    }

    const isAppropriate = ageRating <= 16 && concerns.length <= 2
    
    const suggestions: string[] = []
    if (!isAppropriate) {
      suggestions.push('Consider adding content warnings')
      suggestions.push('Provide additional context for complex topics')
    }

    return {
      isAppropriate,
      ageRating,
      concerns,
      suggestions
    }
  }

  /**
   * Apply keyword-based filters
   */
  private async applyKeywordFilters(text: string): Promise<FilterResult> {
    const keywordFilters = this.activeFilters.filter(f => f.type === 'keyword')
    const normalizedText = text.toLowerCase()
    
    for (const filter of keywordFilters) {
      if (normalizedText.includes(filter.pattern.toLowerCase())) {
        return {
          passed: false,
          blocked: filter.action === 'block',
          flagged: filter.action === 'flag',
          reasons: [filter.reason],
          confidence: 0.9
        }
      }
    }

    return {
      passed: true,
      blocked: false,
      flagged: false,
      reasons: [],
      confidence: 1.0
    }
  }

  /**
   * Apply regex-based filters
   */
  private async applyRegexFilters(text: string): Promise<FilterResult> {
    const regexFilters = this.activeFilters.filter(f => f.type === 'regex')
    
    for (const filter of regexFilters) {
      const regex = new RegExp(filter.pattern, 'gi')
      if (regex.test(text)) {
        return {
          passed: false,
          blocked: filter.action === 'block',
          flagged: filter.action === 'flag',
          reasons: [filter.reason],
          confidence: 0.8
        }
      }
    }

    return {
      passed: true,
      blocked: false,
      flagged: false,
      reasons: [],
      confidence: 1.0
    }
  }

  /**
   * Check content length requirements
   */
  private checkContentLength(article: RawNewsArticle): FilterResult {
    const contentLength = article.content.length
    
    if (contentLength < NEWS_CONFIG.MIN_CONTENT_LENGTH) {
      return {
        passed: false,
        blocked: true,
        flagged: false,
        reasons: [`Content too short (${contentLength} chars, minimum ${NEWS_CONFIG.MIN_CONTENT_LENGTH})`],
        confidence: 1.0
      }
    }
    
    if (contentLength > NEWS_CONFIG.MAX_CONTENT_LENGTH) {
      return {
        passed: false,
        blocked: false,
        flagged: true,
        reasons: [`Content very long (${contentLength} chars, maximum ${NEWS_CONFIG.MAX_CONTENT_LENGTH})`],
        confidence: 0.7
      }
    }

    return {
      passed: true,
      blocked: false,
      flagged: false,
      reasons: [],
      confidence: 1.0
    }
  }

  /**
   * Check language requirements
   */
  private checkLanguage(article: RawNewsArticle): FilterResult {
    // Simple language detection (in real app would use proper language detection)
    const englishPattern = /^[a-zA-Z\s.,!?;:()\-"'0-9%]+$/
    const isEnglish = englishPattern.test(article.content.slice(0, 500))
    
    if (!isEnglish) {
      return {
        passed: false,
        blocked: true,
        flagged: false,
        reasons: ['Content appears to be in a non-English language'],
        confidence: 0.6
      }
    }

    return {
      passed: true,
      blocked: false,
      flagged: false,
      reasons: [],
      confidence: 0.8
    }
  }

  /**
   * Check for sensitive topics
   */
  private hasSensitiveTopics(text: string): boolean {
    const sensitiveTopics = [
      'terrorism', 'extremism', 'suicide', 'self-harm',
      'discrimination', 'racism', 'harassment'
    ]
    
    const normalizedText = text.toLowerCase()
    return sensitiveTopics.some(topic => normalizedText.includes(topic))
  }

  /**
   * Combine multiple filter results
   */
  private combineFilterResults(results: FilterResult[]): FilterResult {
    const blocked = results.some(r => r.blocked)
    const flagged = results.some(r => r.flagged)
    const passed = !blocked && !flagged
    
    const allReasons = results.flatMap(r => r.reasons)
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length

    return {
      passed,
      blocked,
      flagged,
      reasons: allReasons,
      confidence: avgConfidence
    }
  }

  /**
   * Add custom filter
   */
  addFilter(filter: ContentFilter): void {
    this.activeFilters.push(filter)
    if (filter.type === 'regex') {
      this.compilePatterns()
    }
  }

  /**
   * Remove filter
   */
  removeFilter(filterId: string): void {
    this.activeFilters = this.activeFilters.filter(f => f.id !== filterId)
    this.compilePatterns()
  }

  /**
   * Update filter status
   */
  updateFilter(filterId: string, isActive: boolean): void {
    const filter = this.activeFilters.find(f => f.id === filterId)
    if (filter) {
      filter.isActive = isActive
      this.compilePatterns()
    }
  }

  /**
   * Get filtering statistics
   */
  getFilteringStats(): {
    totalFilters: number
    activeFilters: number
    filterTypes: Record<string, number>
  } {
    const totalFilters = this.activeFilters.length
    const activeFilters = this.activeFilters.filter(f => f.isActive).length
    
    const filterTypes: Record<string, number> = {}
    this.activeFilters.forEach(filter => {
      filterTypes[filter.type] = (filterTypes[filter.type] || 0) + 1
    })

    return {
      totalFilters,
      activeFilters,
      filterTypes
    }
  }
}

// Singleton instance
export const contentFilteringService = new ContentFilteringService()
