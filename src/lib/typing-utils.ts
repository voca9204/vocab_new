/**
 * Generate masked word with revealed characters based on hint level
 * @param word - The word to mask
 * @param level - Number of characters to reveal (0-based)
 * @returns Masked word with spaces between characters
 */
export function getMaskedWord(word: string, level: number): string {
  if (level >= word.length) {
    console.log(`getMaskedWord: 완전 공개 - "${word}" (level: ${level})`)
    return word
  }
  
  const result = word.split('').map((char, index) => {
    if (index < level) return char
    return '_'
  }).join(' ')
  
  console.log(`getMaskedWord: "${word}" level ${level} → "${result}"`)
  return result
}

/**
 * Generate hint dots showing remaining time until next hint
 * @param timeElapsed - Total time elapsed in seconds
 * @returns String of filled and empty dots
 */
export function getHintDots(timeElapsed: number): string {
  const maxDots = 5
  const remainingDots = Math.max(0, maxDots - Math.floor(timeElapsed / 5))
  return '●'.repeat(remainingDots) + '○'.repeat(maxDots - remainingDots)
}

/**
 * Filter and sort words for typing practice
 * @param words - Array of vocabulary words
 * @param maxWords - Maximum number of words to return
 * @returns Filtered and sorted words array
 */
export function prepareWordsForTyping(words: any[], maxWords: number = 20): any[] {
  return words
    .filter(w => w.word.length >= 3 && w.word.length <= 12) // Reasonable length words
    .sort((a, b) => {
      // Sort by difficulty then by length
      if (a.difficulty !== b.difficulty) {
        return a.difficulty - b.difficulty
      }
      return a.word.length - b.word.length
    })
    .slice(0, maxWords)
}

/**
 * Calculate performance statistics from typing results
 * @param results - Array of typing results
 * @returns Performance statistics object
 */
export function calculateTypingStats(results: any[]) {
  if (results.length === 0) {
    return {
      accuracy: 0,
      avgTime: '0',
      avgHints: '0',
      correctCount: 0,
      totalWords: 0,
    }
  }

  const correctCount = results.filter(r => r.correct).length
  const accuracy = Math.round((correctCount / results.length) * 100)
  const avgTime = (results.reduce((sum, r) => sum + r.time, 0) / results.length).toFixed(1)
  const avgHints = (results.reduce((sum, r) => sum + r.hintsUsed, 0) / results.length).toFixed(1)

  return {
    accuracy,
    avgTime,
    avgHints,
    correctCount,
    totalWords: results.length,
  }
}