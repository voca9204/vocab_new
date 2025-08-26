import { NextRequest, NextResponse } from 'next/server'

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
  'see', 'saw', 'look', 'want', 'use', 'find', 'give', 'tell',
  // Add more common words that appear in vocabulary books but aren't vocabulary
  'page', 'unit', 'lesson', 'chapter', 'exercise', 'test', 'quiz',
  'answer', 'question', 'example', 'practice', 'review', 'study',
  'veterans', 'edu', 'zip', 'old', 'english', 'new', 'person'
])

/**
 * Parse and structure definition that may contain mixed Korean and English
 */
function parseDefinition(rawDef: string): { korean: string; english: string } {
  // Pattern 1: "한글정의 (English definition)"
  const pattern1 = rawDef.match(/^([\u3131-\uD79D][^(]+)\s*\(([^)]+)\)/)
  if (pattern1) {
    return {
      korean: pattern1[1].trim(),
      english: pattern1[2].trim()
    }
  }
  
  // Pattern 2: Korean followed by English without parentheses
  const koreanMatch = rawDef.match(/[\u3131-\uD79D][^a-zA-Z]+/)
  const englishMatch = rawDef.match(/[a-zA-Z].+/)
  
  if (koreanMatch && englishMatch) {
    return {
      korean: koreanMatch[0].trim(),
      english: englishMatch[0].trim()
    }
  }
  
  // Pattern 3: Only Korean or only English
  if (/[\u3131-\uD79D]/.test(rawDef)) {
    return { korean: rawDef.trim(), english: '' }
  } else {
    return { korean: '', english: rawDef.trim() }
  }
}

function isCommonWord(word: string): boolean {
  return COMMON_WORDS.has(word.toLowerCase())
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, method = 'google', maxWords = 30 } = await req.json()

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      )
    }

    console.log(`[photo-vocabulary/extract] Processing image from URL: ${imageUrl}`)

    // Fetch the image from URL
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image from URL')
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Use Google Cloud Vision API to extract text
    const { ImageAnnotatorClient } = await import('@google-cloud/vision')
    const vision = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    })

    // Detect text in the image
    const [result] = await vision.textDetection({
      image: { content: imageBuffer.toString('base64') }
    })

    const detections = result.textAnnotations || []
    const fullText = detections[0]?.description || ''

    if (!fullText) {
      console.log('[photo-vocabulary/extract] No text found in image')
      return NextResponse.json({
        success: true,
        words: [],
        fullText: '',
        language: 'en'
      })
    }

    console.log(`[photo-vocabulary/extract] Extracted text (first 200 chars): ${fullText.substring(0, 200)}...`)

    // Extract meaningful words from the text
    const words = fullText
      .split(/[\s\n\r\t,;.!?()[\]{}'"]+/)
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase().trim())
      .filter((word, index, self) => self.indexOf(word) === index) // Remove duplicates
      .filter(word => {
        // Filter for SAT-level words
        return word.length >= 5 && // At least 5 characters
               /^[a-z]+$/.test(word) && // Only letters
               !isCommonWord(word) // Not a common word
      })
      .slice(0, maxWords)

    // Transform to expected format with placeholder definitions
    const enhancedWords = words.map(word => {
      const definition = '정의를 추가해주세요'
      const parsed = parseDefinition(definition)
      
      return {
        word: word,
        context: `Found in image text`,
        koreanDefinition: parsed.korean,
        englishDefinition: parsed.english,
        confidence: 0.95
      }
    })

    console.log(`[photo-vocabulary/extract] Found ${enhancedWords.length} vocabulary words`)

    return NextResponse.json({
      success: true,
      words: enhancedWords,
      fullText: fullText.substring(0, 500), // Limit full text for response
      language: 'en'
    })
  } catch (error) {
    console.error('[photo-vocabulary/extract] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to extract vocabulary'
      },
      { status: 500 }
    )
  }
}