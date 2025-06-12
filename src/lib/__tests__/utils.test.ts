import { formatDate, calculateReadingTime, cn } from '@/lib/utils'

describe('Utils', () => {
  describe('formatDate', () => {
    it('should format a date correctly', () => {
      const date = new Date('2025-06-11T12:00:00Z')
      const formatted = formatDate(date)
      expect(formatted).toMatch(/June 11, 2025/)
    })

    it('should handle string dates', () => {
      const dateString = '2025-06-11T12:00:00Z'
      const formatted = formatDate(dateString)
      expect(formatted).toMatch(/June 11, 2025/)
    })
  })

  describe('calculateReadingTime', () => {
    it('should calculate reading time correctly', () => {
      const shortText = 'This is a short text with about ten words here.'
      const readingTime = calculateReadingTime(shortText)
      expect(readingTime).toBe(1) // Should be 1 minute minimum
    })

    it('should handle longer texts', () => {
      const longText = 'word '.repeat(400) // 400 words
      const readingTime = calculateReadingTime(longText)
      expect(readingTime).toBe(2) // 400 words / 200 wpm = 2 minutes
    })
  })

  describe('cn', () => {
    it('should combine class names', () => {
      const result = cn('text-red-500', 'bg-blue-500')
      expect(result).toBe('text-red-500 bg-blue-500')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class active-class')
    })
  })
})
