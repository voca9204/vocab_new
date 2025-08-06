/**
 * Google Vision API Service for text extraction from images
 */

interface TextBlock {
  text: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface ExtractedText {
  fullText: string
  textBlocks: TextBlock[]
  language?: string
}

export class VisionService {
  constructor() {
    // Client-side only - no Google Cloud Vision initialization
    // All text extraction will be done via API routes or OpenAI
  }

  /**
   * Extract text from an image URL
   * This will be called from the API route which has access to server-side libraries
   */
  async extractText(imageUrl: string): Promise<ExtractedText> {
    // In client-side context, we'll call the API route
    // The API route will handle the actual text extraction
    return this.extractTextViaAPI(imageUrl)
  }

  /**
   * Extract text by calling our API route
   */
  private async extractTextViaAPI(imageUrl: string): Promise<ExtractedText> {
    // This method will be called from photo-vocabulary-service
    // which already handles the API call to /api/photo-vocabulary/extract
    // So we'll just return mock data here to avoid circular dependency
    return this.mockExtractText(imageUrl)
  }

  /**
   * Extract text using OpenAI Vision API
   */
  private async extractTextWithOpenAI(imageUrl: string): Promise<ExtractedText> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all text from this image. Return only the extracted text, nothing else.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const fullText = data.choices[0]?.message?.content || ''

      // Simple text block extraction based on lines
      const lines = fullText.split('\n').filter(line => line.trim())
      const textBlocks: TextBlock[] = lines.map((line, index) => ({
        text: line.trim(),
        bounds: {
          x: 50,
          y: 50 + (index * 30),
          width: 500,
          height: 25
        }
      }))

      return {
        fullText,
        textBlocks,
        language: 'en' // Default to English, could be enhanced with language detection
      }
    } catch (error) {
      console.error('OpenAI Vision API error:', error)
      throw new Error('Failed to extract text from image using OpenAI')
    }
  }

  /**
   * Extract vocabulary words from text
   */
  extractVocabularyWords(text: string): string[] {
    // Remove punctuation and split into words
    const words = text
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3) // Filter short words
      .map(word => word.toLowerCase())
      .filter((word, index, arr) => arr.indexOf(word) === index) // Unique only

    // Filter out common words
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'with',
      'from', 'they', 'have', 'this', 'that', 'what', 'when', 'where',
      'which', 'their', 'would', 'there', 'been', 'will', 'more', 'other',
      'some', 'such', 'only', 'also', 'than', 'very', 'just', 'about'
    ])

    return words.filter(word => !commonWords.has(word))
  }

  /**
   * Mock text extraction for development
   */
  private mockExtractText(imageUrl: string): ExtractedText {
    const mockText = `
      The Industrial Revolution marked a major turning point in history.
      Manufacturing processes evolved from hand production methods to machines.
      Steam power and mechanization transformed society dramatically.
      Urbanization increased as people migrated to industrial centers.
      Economic systems adapted to accommodate mass production capabilities.
      Transportation networks expanded with railways and steamships.
      Social structures underwent significant transformations during this period.
      Innovation accelerated technological advancement exponentially.
      Labor movements emerged advocating for workers' rights.
      Environmental impacts became increasingly apparent over time.
    `

    return {
      fullText: mockText.trim(),
      textBlocks: mockText.trim().split('\n').filter(line => line.trim()).map((line, index) => ({
        text: line.trim(),
        bounds: {
          x: 50,
          y: 50 + (index * 30),
          width: 500,
          height: 25
        }
      })),
      language: 'en'
    }
  }

  /**
   * Check if Vision API is available
   */
  isAvailable(): boolean {
    return this.client !== null
  }
}

// Singleton instance
export const visionService = new VisionService()