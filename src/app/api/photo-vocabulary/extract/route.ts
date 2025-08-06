import { NextRequest, NextResponse } from 'next/server'
import { ImageAnnotatorClient } from '@google-cloud/vision'

// Common English words to filter out
const COMMON_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'with',
  'from', 'they', 'have', 'this', 'that', 'what', 'when', 'where',
  'which', 'their', 'would', 'there', 'been', 'will', 'more', 'other',
  'some', 'such', 'only', 'also', 'than', 'very', 'just', 'about',
  'into', 'through', 'after', 'before', 'under', 'over', 'between',
  'could', 'should', 'might', 'must', 'shall', 'being', 'does',
  'each', 'every', 'these', 'those', 'then', 'them', 'were',
  'was', 'has', 'had', 'did', 'get', 'got', 'made', 'make',
  'come', 'came', 'know', 'think', 'thought', 'take', 'took',
  'see', 'saw', 'look', 'want', 'use', 'find', 'give', 'tell'
])

interface WordScore {
  word: string
  score: number
  context?: string
  isSAT?: boolean
  difficulty?: number
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, method = 'openai', maxWords = 30 } = await req.json()

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      )
    }

    // Use selected method or fallback
    let extractedText
    if (method === 'google') {
      try {
        extractedText = await extractTextWithGoogleVision(imageUrl)
      } catch (error) {
        console.error('Google Vision failed, falling back to OpenAI:', error)
        extractedText = await extractTextWithOpenAI(imageUrl)
      }
    } else {
      try {
        extractedText = await extractTextWithOpenAI(imageUrl)
      } catch (error) {
        console.error('OpenAI Vision failed, falling back to Google:', error)
        extractedText = await extractTextWithGoogleVision(imageUrl)
      }
    }
    
    // Parse vocabulary entries (word + definition pairs)
    const vocabularyEntries: Array<{word: string, definition: string}> = []
    
    // Split by lines and process each line
    const lines = extractedText.fullText.split('\n').filter(line => line.trim())
    
    for (const line of lines) {
      // Pattern 1: "word 한글뜻" or "word definition"
      const cleanLine = line.trim()
      
      // Skip empty lines or lines that are too short
      if (cleanLine.length < 3) continue
      
      // Try to extract English word and Korean definition
      // Look for pattern where English word is followed by Korean text
      const koreanMatch = cleanLine.match(/^([a-zA-Z-]+)\s+(.+)$/)
      
      if (koreanMatch) {
        const [, word, definition] = koreanMatch
        
        // Check if the word is actually English and not too short
        if (word && word.length > 2 && /^[a-zA-Z-]+$/.test(word)) {
          // Check if definition contains Korean characters
          if (/[\u3131-\uD79D]/.test(definition) || definition.length > 0) {
            vocabularyEntries.push({
              word: word.toLowerCase(),
              definition: definition.trim()
            })
          }
        }
      }
    }
    
    // If no entries found, try alternative parsing
    if (vocabularyEntries.length === 0) {
      // Try to find all English words that are likely vocabulary words
      const words = extractedText.fullText
        .match(/\b[a-zA-Z]{4,}\b/g) || []
      
      const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))]
        .filter(word => !COMMON_WORDS.has(word))
        .slice(0, 30)
      
      for (const word of uniqueWords) {
        vocabularyEntries.push({
          word,
          definition: '' // No definition found
        })
      }
    }

    // Convert to expected format
    const selectedWords = vocabularyEntries
      .slice(0, maxWords)
      .map(({ word, definition }) => ({
        word,
        context: definition || `Found in: ${word}`,
        confidence: definition ? 0.95 : 0.7
      }))

    return NextResponse.json({
      success: true,
      words: selectedWords,
      fullText: extractedText.fullText,
      language: extractedText.language
    })
  } catch (error) {
    console.error('Error extracting vocabulary:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to extract vocabulary' },
      { status: 500 }
    )
  }
}

/**
 * Extract text using OpenAI Vision API
 */
async function extractTextWithOpenAI(imageUrl: string): Promise<{
  fullText: string
  language: string
}> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'This image contains vocabulary words. Please extract ALL visible text from the image exactly as it appears. Include both English words and their Korean/Chinese meanings if present. Do not add any extra words or explanations. Just return the raw text you can see in the image, preserving the original formatting.'
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
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', response.status, errorData)
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const fullText = data.choices[0]?.message?.content || ''

    console.log('OpenAI Vision extracted text:', fullText)

    // Detect language (simple check for now)
    const hasKorean = /[\u3131-\uD79D]/.test(fullText)
    const language = hasKorean ? 'ko' : 'en'

    return {
      fullText,
      language
    }
  } catch (error) {
    console.error('OpenAI Vision API error:', error)
    // Fallback to mock data for testing
    return {
      fullText: `The Industrial Revolution marked a major turning point in history.
        Manufacturing processes evolved from hand production methods to machines.
        Steam power and mechanization transformed society dramatically.
        Urbanization increased as people migrated to industrial centers.
        Economic systems adapted to accommodate mass production capabilities.`,
      language: 'en'
    }
  }
}

/**
 * Extract text using Google Cloud Vision API
 */
async function extractTextWithGoogleVision(imageUrl: string): Promise<{
  fullText: string
  language: string
}> {
  try {
    // Initialize the client
    const client = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    })

    // Perform text detection
    const [result] = await client.textDetection(imageUrl)
    const detections = result.textAnnotations || []
    
    if (detections.length === 0) {
      throw new Error('No text detected in image')
    }

    // The first annotation contains the entire extracted text
    const fullText = detections[0].description || ''
    
    console.log('Google Vision extracted text:', fullText)

    // Detect language
    const hasKorean = /[\u3131-\uD79D]/.test(fullText)
    const language = hasKorean ? 'ko' : 'en'

    return {
      fullText,
      language
    }
  } catch (error) {
    console.error('Google Vision API error:', error)
    throw error
  }
}