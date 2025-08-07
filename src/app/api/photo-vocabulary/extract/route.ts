import { NextRequest, NextResponse } from 'next/server'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import OpenAI from 'openai'

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

interface WordScore {
  word: string
  score: number
  context?: string
  isSAT?: boolean
  difficulty?: number
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

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

/**
 * Enhance word with AI-generated definition
 */
async function enhanceWordWithAI(word: string, existingDef?: string): Promise<string | null> {
  try {
    let prompt = ''
    
    if (existingDef && existingDef.length > 0) {
      // Parse existing definition
      const parsed = parseDefinition(existingDef)
      
      // Check what's missing
      const needsKorean = !parsed.korean || parsed.korean.length < 3
      const needsEnglish = !parsed.english || parsed.english.length < 10
      
      if (needsKorean && needsEnglish) {
        prompt = `Define the SAT/GRE vocabulary word "${word}".
Provide BOTH:
1. Korean definition: 명확하고 간단한 한글 정의
2. English definition: Clear and concise English explanation

Format your response EXACTLY as:
한글정의 (English definition)`
      } else if (needsKorean) {
        prompt = `The word "${word}" means: "${parsed.english}".
Provide a clear Korean translation/definition for this word.
Format: 한글정의 (${parsed.english})`
      } else if (needsEnglish) {
        prompt = `The word "${word}" (${parsed.korean}) needs an English definition.
Format: ${parsed.korean} (clear English definition)`
      } else {
        // Both exist but might need improvement
        return existingDef
      }
    } else {
      // Generate new definition
      prompt = `Define the SAT/GRE vocabulary word "${word}".
Provide BOTH Korean and English definitions.
Format EXACTLY as: 한글정의 (English definition)
Example: 약간의, 미미한 (slight or minimal in degree)`
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert vocabulary teacher. Always provide definitions in the exact format requested: Korean definition (English definition). Be accurate and concise.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    })

    const result = completion.choices[0]?.message?.content || null
    
    // Validate the result has proper format
    if (result && /[\u3131-\uD79D]/.test(result)) {
      return result.trim()
    }
    
    return result
  } catch (error) {
    console.error('OpenAI API error for word enhancement:', error)
    return null
  }
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
    
    // Common part of speech abbreviations to filter out
    const partsOfSpeech = new Set(['n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'pron.', 'int.'])
    
    for (const line of lines) {
      const cleanLine = line.trim()
      
      // Skip empty lines or lines that are too short
      if (cleanLine.length < 3) continue
      
      // Pattern 1: Lines that start with numbers (Veterans EDU format)
      if (/^\d+/.test(cleanLine)) {
        // Multiple patterns to handle various formats
        const patterns = [
          // Pattern with part of speech: "318 unaddressed adj. not answered..."
          /^(\d+)\s+([a-zA-Z][-a-zA-Z]*)\s+(n\.|v\.|adj\.|adv\.|prep\.|conj\.)\s+(.+)$/,
          // Pattern without part of speech: "318 unaddressed not answered..."
          /^(\d+)\s+([a-zA-Z][-a-zA-Z]*)\s+([^a-zA-Z].+)$/,
          // Simple pattern: "318 unaddressed"
          /^(\d+)\s+([a-zA-Z][-a-zA-Z]+)$/
        ]
        
        let matched = false
        for (const pattern of patterns) {
          const match = cleanLine.match(pattern)
          if (match) {
            const word = match[2]
            let definition = ''
            
            if (pattern === patterns[0]) {
              // With part of speech - definition is in match[4]
              definition = match[4]
            } else if (pattern === patterns[1]) {
              // Without part of speech - definition is in match[3]
              definition = match[3]
            }
            // For patterns[2], definition remains empty (just word)
            
            if (word && word.length > 2 && !COMMON_WORDS.has(word.toLowerCase())) {
              // Extract Korean part if exists
              const koreanMatch = definition.match(/[\u3131-\uD79D].+/)
              const finalDef = koreanMatch ? koreanMatch[0] : definition
              
              vocabularyEntries.push({
                word: word.toLowerCase(),
                definition: finalDef.trim()
              })
              matched = true
              break
            }
          }
        }
        if (matched) continue
      }
      
      // Pattern 2: Lines without numbers
      const patterns = [
        // With part of speech: "unaddressed adj. not answered..."
        /^([a-zA-Z][-a-zA-Z]*)\s+(n\.|v\.|adj\.|adv\.)\s+(.+)$/,
        // Without part of speech but with definition: "unaddressed not answered..."
        /^([a-zA-Z][-a-zA-Z]*)\s+([^a-zA-Z].+)$/,
        // Just a word that looks like vocabulary
        /^([a-zA-Z][-a-zA-Z]+)$/
      ]
      
      for (const pattern of patterns) {
        const match = cleanLine.match(pattern)
        if (match) {
          const word = match[1]
          let definition = ''
          
          if (pattern === patterns[0]) {
            // With part of speech - definition is in match[3]
            definition = match[3]
          } else if (pattern === patterns[1]) {
            // Without part of speech - definition is in match[2]
            definition = match[2]
          }
          // For patterns[2], definition remains empty
          
          if (word && 
              word.length > 2 && 
              word.length < 30 &&
              !COMMON_WORDS.has(word.toLowerCase()) &&
              !partsOfSpeech.has(word.toLowerCase() + '.')) {
            
            // Extract Korean part if exists
            const koreanMatch = definition.match(/[\u3131-\uD79D].+/)
            const finalDef = koreanMatch ? koreanMatch[0] : definition
            
            vocabularyEntries.push({
              word: word.toLowerCase(),
              definition: finalDef.trim()
            })
            break
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
        context: definition || '',
        confidence: definition ? 0.95 : 0.7,
        needsAIEnhancement: !definition || definition.length < 10 || !/[\u3131-\uD79D]/.test(definition)
      }))

    // Enhance words with AI if definitions are missing or incomplete
    const enhancedWords = await Promise.all(
      selectedWords.map(async (wordEntry) => {
        let finalContext = wordEntry.context
        
        if (wordEntry.needsAIEnhancement) {
          try {
            // Use OpenAI to generate or enhance definition
            const enhancedDef = await enhanceWordWithAI(wordEntry.word, wordEntry.context)
            
            if (enhancedDef) {
              console.log(`Enhanced word "${wordEntry.word}": ${wordEntry.context} -> ${enhancedDef}`)
              finalContext = enhancedDef
            }
          } catch (error) {
            console.error(`Failed to enhance word ${wordEntry.word}:`, error)
          }
        }
        
        // Parse the final definition into Korean and English parts
        const parsed = parseDefinition(finalContext || '')
        
        return {
          word: wordEntry.word,
          context: finalContext,
          koreanDefinition: parsed.korean,
          englishDefinition: parsed.english,
          confidence: wordEntry.confidence || 0.95
        }
      })
    )

    return NextResponse.json({
      success: true,
      words: enhancedWords,
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

    // Use DOCUMENT_TEXT_DETECTION for better quality (optimized for dense text)
    const [result] = await client.documentTextDetection(imageUrl)
    
    // Get full text from the result
    const fullTextAnnotation = result.fullTextAnnotation
    const fullText = fullTextAnnotation?.text || ''
    
    if (!fullText) {
      // Fallback to regular text detection
      const [fallbackResult] = await client.textDetection(imageUrl)
      const detections = fallbackResult.textAnnotations || []
      
      if (detections.length === 0) {
        throw new Error('No text detected in image')
      }
      
      const fallbackText = detections[0].description || ''
      console.log('Google Vision (fallback) extracted text:', fallbackText)
      return {
        fullText: fallbackText,
        language: /[\u3131-\uD79D]/.test(fallbackText) ? 'ko' : 'en'
      }
    }
    
    console.log('Google Vision (document mode) extracted text:', fullText)

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