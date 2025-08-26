/**
 * Unified Spaced Repetition Algorithm
 * Based on SM-2 algorithm with modifications for better learning efficiency
 */

export interface SpacedRepetitionData {
  easeFactor: number      // 1.3 to 2.5 (default 2.5)
  interval: number        // Days until next review
  repetitions: number     // Number of consecutive correct answers
  lastReviewDate: Date    // Last review date
  nextReviewDate: Date    // Calculated next review date
}

export interface ReviewResult {
  quality: number  // 0-5 rating of answer quality
  // 0: Complete blackout
  // 1: Incorrect, but familiar
  // 2: Incorrect, but easy to recall with hint
  // 3: Correct, but with difficulty
  // 4: Correct with hesitation
  // 5: Perfect recall
}

export class SpacedRepetitionService {
  private static readonly MIN_EASE_FACTOR = 1.3
  private static readonly DEFAULT_EASE_FACTOR = 2.5
  private static readonly INITIAL_INTERVALS = [1, 6] // Days for first two reviews

  /**
   * Calculate next review schedule using SM-2 algorithm
   */
  static calculateNextReview(
    current: SpacedRepetitionData,
    quality: number
  ): SpacedRepetitionData {
    // Validate quality score
    if (quality < 0 || quality > 5) {
      throw new Error('Quality must be between 0 and 5')
    }

    // Calculate new ease factor
    const newEaseFactor = this.calculateEaseFactor(current.easeFactor, quality)
    
    // Calculate interval and repetitions
    let interval: number
    let repetitions: number
    
    if (quality < 3) {
      // Incorrect answer - reset to beginning
      interval = 1
      repetitions = 0
    } else {
      // Correct answer
      if (current.repetitions === 0) {
        interval = this.INITIAL_INTERVALS[0]
      } else if (current.repetitions === 1) {
        interval = this.INITIAL_INTERVALS[1]
      } else {
        interval = Math.round(current.interval * newEaseFactor)
      }
      repetitions = current.repetitions + 1
    }

    // Calculate next review date
    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + interval)

    return {
      easeFactor: newEaseFactor,
      interval,
      repetitions,
      lastReviewDate: new Date(),
      nextReviewDate
    }
  }

  /**
   * Calculate new ease factor based on answer quality
   */
  private static calculateEaseFactor(currentEF: number, quality: number): number {
    // SM-2 formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    
    // Ensure ease factor doesn't go below minimum
    return Math.max(this.MIN_EASE_FACTOR, newEF)
  }

  /**
   * Convert simple difficulty rating to quality score
   * Used for compatibility with existing UI buttons
   */
  static difficultyToQuality(difficulty: 'again' | 'hard' | 'medium' | 'easy'): number {
    switch (difficulty) {
      case 'again':
        return 1  // Failed to recall
      case 'hard':
        return 3  // Recalled with difficulty
      case 'medium':
        return 4  // Recalled with some hesitation
      case 'easy':
        return 5  // Perfect recall
      default:
        return 3
    }
  }

  /**
   * Calculate mastery level percentage based on repetition data
   */
  static calculateMasteryLevel(data: SpacedRepetitionData): number {
    // Base score from repetitions (max 50%)
    const repetitionScore = Math.min(data.repetitions * 10, 50)
    
    // Score from interval length (max 30%)
    const intervalScore = Math.min(data.interval / 2, 30)
    
    // Score from ease factor (max 20%)
    const easeScore = ((data.easeFactor - this.MIN_EASE_FACTOR) / 
                       (this.DEFAULT_EASE_FACTOR - this.MIN_EASE_FACTOR)) * 20
    
    return Math.min(100, Math.round(repetitionScore + intervalScore + easeScore))
  }

  /**
   * Get words that need review today
   */
  static getWordsForReview(
    words: Array<{ nextReviewDate: Date; [key: string]: any }>
  ): typeof words {
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    return words.filter(word => {
      const reviewDate = word.nextReviewDate instanceof Date 
        ? word.nextReviewDate 
        : new Date(word.nextReviewDate)
      return reviewDate <= today
    })
  }

  /**
   * Initialize spaced repetition data for a new word
   */
  static initializeData(): SpacedRepetitionData {
    const now = new Date()
    return {
      easeFactor: this.DEFAULT_EASE_FACTOR,
      interval: 0,
      repetitions: 0,
      lastReviewDate: now,
      nextReviewDate: now
    }
  }

  /**
   * Get a human-readable description of the next review time
   */
  static getNextReviewDescription(nextReviewDate: Date): string {
    const now = new Date()
    const diffMs = nextReviewDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return '복습 필요'
    } else if (diffDays === 0) {
      return '오늘 복습'
    } else if (diffDays === 1) {
      return '내일 복습'
    } else if (diffDays <= 7) {
      return `${diffDays}일 후`
    } else if (diffDays <= 30) {
      const weeks = Math.round(diffDays / 7)
      return `${weeks}주 후`
    } else {
      const months = Math.round(diffDays / 30)
      return `${months}개월 후`
    }
  }
}