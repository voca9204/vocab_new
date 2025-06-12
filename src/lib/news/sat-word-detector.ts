// News Processing - SAT Word Detection System

import type { VocabularyWord, NewsHighlight } from '@/types'
import { vocabularyService } from '../firebase/firestore'
import { SAT_WORD_PATTERNS } from '@/lib/constants'

export interface WordDetectionResult {
  highlights: NewsHighlight[]
  satWordCount: number
  satWordDensity: number
  detectedWords: string[]
  processingTime: number
}

export interface TextAnalysis {
  wordCount: number
  sentenceCount: number
  avgWordsPerSentence: number
  avgSentenceLength: number
  readingTime: number // minutes
  gradeLevel: number
}

export class SATWordDetector {
  private satWordMap: Map<string, VocabularyWord> = new Map()
  private initialized = false

  /**
   * Initialize the detector with SAT vocabulary
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const satWords = await vocabularyService.getSATWords(2000)
      satWords.forEach(word => {
        this.satWordMap.set(word.word.toLowerCase(), word)
      })
      this.initialized = true
      console.log(`📚 SAT Word Detector initialized with ${satWords.length} words`)
    } catch (error) {
      console.error('Failed to initialize SAT Word Detector:', error)
      throw error
    }
  }

  /**
   * Detect SAT words in text and create highlights
   */
  async detectSATWords(text: string): Promise<WordDetectionResult> {
    const startTime = Date.now()
    
    if (!this.initialized) {
      await this.initialize()
    }

    const highlights: NewsHighlight[] = []
    const detectedWords: string[] = []
    
    // Clean and normalize text
    const cleanText = this.cleanText(text)
    const words = this.extractWords(cleanText)
    
    // Word position mapping for accurate highlighting
    const wordPositions = this.mapWordPositions(cleanText)
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase()
      const originalWord = words[i]
      
      if (this.satWordMap.has(word)) {
        const vocabWord = this.satWordMap.get(word)!
        const position = wordPositions[i]
        
        if (position) {
          const highlight = this.createHighlight(
            vocabWord,
            originalWord,
            position.start,
            position.end,
            cleanText
          )
          highlights.push(highlight)
          detectedWords.push(word)
        }
      }
    }

    // Calculate statistics
    const totalWords = words.length
    const satWordCount = detectedWords.length
    const satWordDensity = totalWords > 0 ? (satWordCount / totalWords) * 100 : 0
    const processingTime = Date.now() - startTime

    return {
      highlights,
      satWordCount,
      satWordDensity,
      detectedWords: [...new Set(detectedWords)], // Remove duplicates
      processingTime
    }
  }

  /**
   * Analyze text quality and readability
   */
  analyzeText(text: string): TextAnalysis {
    const cleanText = this.cleanText(text)
    const words = this.extractWords(cleanText)
    const sentences = this.extractSentences(cleanText)
    
    const wordCount = words.length
    const sentenceCount = sentences.length
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0
    const avgSentenceLength = this.calculateAverageSentenceLength(sentences)
    const readingTime = Math.ceil(wordCount / 200) // 200 words per minute
    const gradeLevel = this.calculateGradeLevel(avgWordsPerSentence, avgSentenceLength)

    return {
      wordCount,
      sentenceCount,
      avgWordsPerSentence,
      avgSentenceLength,
      readingTime,
      gradeLevel
    }
  }

  /**
   * Check if text meets quality standards for SAT learning
   */
  evaluateContentQuality(text: string): {
    score: number // 1-10
    reasons: string[]
    isEducational: boolean
  } {
    const analysis = this.analyzeText(text)
    
    let score = 5 // Base score
    const reasons: string[] = []

    // Grade level check (9-12 is ideal for SAT prep)
    if (analysis.gradeLevel >= 9 && analysis.gradeLevel <= 12) {
      score += 2
      reasons.push('Appropriate reading level for SAT prep')
    } else if (analysis.gradeLevel < 9) {
      score -= 1
      reasons.push('Reading level may be too low')
    } else {
      score -= 0.5
      reasons.push('Reading level may be challenging')
    }

    // Word count check
    if (analysis.wordCount >= 500 && analysis.wordCount <= 2000) {
      score += 1
      reasons.push('Good article length')
    } else {
      score -= 1
      reasons.push('Article length not optimal')
    }

    // Sentence structure check
    if (analysis.avgWordsPerSentence >= 15 && analysis.avgWordsPerSentence <= 25) {
      score += 1
      reasons.push('Good sentence complexity')
    }

    // Academic vocabulary presence
    const academicWordCount = this.countAcademicWords(text)
    if (academicWordCount >= 5) {
      score += 1
      reasons.push('Contains academic vocabulary')
    }

    // Ensure score is within bounds
    score = Math.max(1, Math.min(10, score))
    
    const isEducational = score >= 6 && 
                         analysis.gradeLevel >= 9 && 
                         academicWordCount >= 3

    return { score, reasons, isEducational }
  }

  /**
   * Clean and normalize text for processing
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?;:()"-]/g, '') // Remove special characters
      .trim()
  }

  /**
   * Extract words from text
   */
  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .match(/\b[a-z']+\b/g) || []
  }

  /**
   * Extract sentences from text
   */
  private extractSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }

  /**
   * Map word positions in text for accurate highlighting
   */
  private mapWordPositions(text: string): Array<{ start: number; end: number }> {
    const positions: Array<{ start: number; end: number }> = []
    const regex = /\b[a-zA-Z']+\b/g
    let match

    while ((match = regex.exec(text)) !== null) {
      positions.push({
        start: match.index,
        end: match.index + match[0].length
      })
    }

    return positions
  }

  /**
   * Create highlight object for detected SAT word
   */
  private createHighlight(
    vocabWord: VocabularyWord,
    originalWord: string,
    startIndex: number,
    endIndex: number,
    text: string
  ): NewsHighlight {
    // Extract context (50 characters before and after)
    const contextStart = Math.max(0, startIndex - 50)
    const contextEnd = Math.min(text.length, endIndex + 50)
    const context = text.slice(contextStart, contextEnd)

    // Get the primary definition
    const definition = vocabWord.definitions[0]?.text || 'No definition available'

    return {
      wordId: vocabWord.id,
      word: originalWord,
      startIndex,
      endIndex,
      context,
      definition,
      difficulty: vocabWord.difficulty
    }
  }

  /**
   * Calculate average sentence length
   */
  private calculateAverageSentenceLength(sentences: string[]): number {
    if (sentences.length === 0) return 0
    
    const totalChars = sentences.reduce((sum, sentence) => sum + sentence.length, 0)
    return totalChars / sentences.length
  }

  /**
   * Calculate grade level using simplified Flesch-Kincaid formula
   */
  private calculateGradeLevel(avgWordsPerSentence: number, avgSentenceLength: number): number {
    // Simplified approximation
    const avgSyllablesPerWord = avgSentenceLength / avgWordsPerSentence / 4 // rough estimate
    const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59
    return Math.max(1, Math.min(20, gradeLevel))
  }

  /**
   * Count academic vocabulary words
   */
  private countAcademicWords(text: string): number {
    const words = this.extractWords(text)
    const academicWords = SAT_WORD_PATTERNS.ACADEMIC_INDICATORS
    
    return words.filter(word => 
      academicWords.some(academic => word.includes(academic.toLowerCase()))
    ).length
  }

  /**
   * Get detection statistics
   */
  getStatistics(): {
    totalWords: number
    averageDetectionTime: number
    cacheHitRate: number
  } {
    return {
      totalWords: this.satWordMap.size,
      averageDetectionTime: 0, // Would track in real implementation
      cacheHitRate: 0 // Would track in real implementation
    }
  }
}

// Singleton instance
export const satWordDetector = new SATWordDetector()
