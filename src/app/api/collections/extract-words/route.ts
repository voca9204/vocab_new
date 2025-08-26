import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import OpenAI from 'openai'

// 단어 타입 정의
interface Word {
  word: string
  definition?: string
  partOfSpeech?: string[]
  examples?: string[]
  etymology?: string
  pronunciation?: string
  synonyms?: string[]
}

// 일반적인 영어 단어 필터링
const COMMON_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'down', 'out', 'over', 'under',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'must', 'can', 'shall', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her',
  'its', 'our', 'their', 'this', 'that', 'these', 'those', 'what', 'which',
  'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'some',
  'any', 'many', 'much', 'more', 'most', 'less', 'least', 'very', 'too',
  'quite', 'just', 'only', 'not', 'no', 'yes', 'so', 'if', 'then', 'because',
  'as', 'until', 'while', 'although', 'though', 'since', 'before', 'after',
  'above', 'below', 'between', 'through', 'during', 'about', 'against'
])

export async function POST(request: NextRequest) {
  try {
    // Get auth token from headers (optional for this endpoint)
    const authHeader = request.headers.get('authorization')
    let userId: string | undefined
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1]
        const auth = getAdminAuth()
        const decodedToken = await auth.verifyIdToken(token)
        userId = decodedToken.uid
      } catch (error) {
        // Continue without auth - this endpoint can work without it
        console.log('Auth verification failed, continuing as anonymous')
      }
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File too large (max 10MB)' },
        { status: 400 }
      )
    }
    
    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`)
    
    // 파일 타입에 따라 처리 (파일 이름도 고려)
    let extractedWords: Word[] = []
    const fileName = file.name.toLowerCase()
    
    if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      // PDF 처리
      extractedWords = await extractFromPDF(file)
    } else if (file.type === 'text/plain' || file.type === 'text/csv' || 
               fileName.endsWith('.txt') || fileName.endsWith('.csv')) {
      // 텍스트 파일 처리
      extractedWords = await extractFromText(file)
    } else if (file.type.startsWith('image/') || 
               fileName.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      // 이미지 파일 처리 (OCR 필요)
      extractedWords = await extractFromImage(file)
    } else {
      // 알 수 없는 파일은 텍스트로 시도
      console.log(`Unknown file type ${file.type}, trying as text`)
      extractedWords = await extractFromText(file)
    }
    
    console.log(`Extracted ${extractedWords.length} words`)
    
    return NextResponse.json({
      success: true,
      words: extractedWords,
      totalCount: extractedWords.length,
      method: 'extraction',
      message: `Successfully extracted ${extractedWords.length} words from ${file.name}`
    })
    
  } catch (error) {
    console.error('Error extracting words:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to extract words' 
      },
      { status: 500 }
    )
  }
}

// PDF에서 단어 추출 (하이브리드 방식)
async function extractFromPDF(file: File): Promise<Word[]> {
  try {
    console.log('=== Starting simplified hybrid PDF extraction ===')
    console.log('File name:', file.name)
    console.log('File size:', file.size)
    
    // 직접 pdf-parse 사용 (Next.js 호환성을 위해)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`PDF buffer created: ${buffer.length} bytes`)
    
    // pdf-parse를 동적으로 로드
    let pdfParse: any
    try {
      pdfParse = require('pdf-parse')
    } catch (requireError) {
      console.log('require failed, trying dynamic import...')
      const pdfModule = await import('pdf-parse')
      pdfParse = pdfModule.default
    }
    
    console.log('Calling pdfParse...')
    const pdfData = await pdfParse(buffer)
    console.log(`PDF parsed: ${pdfData.numpages} pages, ${pdfData.text.length} characters`)
    
    // 단어 추출 (TOEFL 형식)
    const lines = pdfData.text.split('\n').filter(line => line.trim())
    console.log(`Processing ${lines.length} lines`)
    
    const extractedWords: any[] = []
    const wordSet = new Set<string>()
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      
      if (parts.length >= 2) {
        const firstWord = parts[0].toLowerCase()
        
        // Valid vocabulary word check
        if (/^[a-zA-Z]{3,25}$/.test(firstWord) && 
            !COMMON_WORDS.has(firstWord) &&
            !wordSet.has(firstWord)) {
          
          wordSet.add(firstWord)
          
          // Find Korean definition
          const koreanMatch = line.match(/[\u3131-\uD79D].+/)
          
          // Extract synonyms (words between first word and Korean)
          let synonyms: string[] = []
          if (koreanMatch) {
            const beforeKorean = line.substring(0, line.indexOf(koreanMatch[0]))
            synonyms = beforeKorean
              .split(/\s+/)
              .slice(1) // Skip first word
              .filter(w => /^[a-zA-Z]+$/.test(w) && w.length > 2)
              .slice(0, 5)
          } else {
            // No Korean, use next few words as synonyms
            synonyms = parts
              .slice(1, Math.min(6, parts.length))
              .filter(w => /^[a-zA-Z]+$/.test(w) && w.length > 2)
          }
          
          extractedWords.push({
            word: firstWord,
            definition: koreanMatch ? koreanMatch[0] : synonyms.join(', '),
            synonyms: synonyms.length > 0 ? synonyms : undefined
          })
        }
      }
    }
    
    console.log(`✅ Successfully extracted ${extractedWords.length} words using direct parsing`)
    
    if (extractedWords.length > 0) {
      console.log('First 3 words extracted:')
      extractedWords.slice(0, 3).forEach((w, i) => {
        console.log(`  ${i+1}. ${w.word}: ${w.definition?.substring(0, 50)}...`)
      })
    }
    
    // Return words in correct format
    return extractedWords
  } catch (error) {
    console.error('❌ Direct extraction failed, falling back to simple extraction')
    console.error('Error message:', (error as Error).message)
    console.error('Error stack:', (error as Error).stack)
    
    // 폴백: 기존 단순 추출 방식
    console.log('=== Attempting simple PDF extraction as fallback ===')
    const fallbackResult = await extractFromPDFSimple(file)
    console.log(`Fallback extracted ${fallbackResult.length} words`)
    return fallbackResult
  }
}

// 단순 PDF 추출 (폴백용)
async function extractFromPDFSimple(file: File): Promise<Word[]> {
  try {
    console.log('Using simple PDF extraction...')
    
    const pdfParse = (await import('pdf-parse')).default
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const data = await pdfParse(buffer)
    
    console.log(`PDF loaded. Has ${data.numpages} pages`)
    console.log(`Total text length: ${data.text.length} characters`)
    
    const allWords: Word[] = []
    
    // pdf-parse는 전체 텍스트를 한 번에 제공
    const lines = data.text.split('\n').filter(line => line.trim())
    
    console.log(`Total lines: ${lines.length}`)
    console.log('Sample lines:')
    lines.slice(0, 10).forEach((line, idx) => {
      console.log(`  Line ${idx + 1}: ${line.substring(0, 100)}`)
    })
    
    // 각 줄에서 단어 추출
    for (const line of lines) {
      // TOEFL 형식: "word synonyms Korean meaning"
      // 첫 번째 단어가 실제 vocabulary word
      const parts = line.split(/\s+/)
      if (parts.length >= 2) {
        const firstWord = parts[0].toLowerCase()
        
        // 유효한 영어 단어인지 확인
        if (/^[a-zA-Z]{2,20}$/.test(firstWord) && 
            !COMMON_WORDS.has(firstWord) &&
            !['word', 'synonyms', 'meaning', 'vocabulary', 'basic', 'day'].includes(firstWord)) {
          
          // 한글이 포함된 부분 찾기 (정의)
          const koreanMatch = line.match(/[\u3131-\uD79D].+/)
          let definition = ''
          
          if (koreanMatch) {
            // 한글 정의가 있으면 사용
            definition = koreanMatch[0]
          } else if (parts.length > 1) {
            // 한글이 없으면 영어 동의어들을 정의로 사용
            const synonyms = parts.slice(1, Math.min(5, parts.length)).join(', ')
            definition = synonyms
          }
          
          allWords.push({
            word: firstWord,
            definition: definition || 'Definition to be generated'
          })
        }
      }
    }
    
    // 중복 제거
    const uniqueWords = new Map<string, Word>()
    allWords.forEach(w => {
      if (!uniqueWords.has(w.word) || 
          (w.definition && w.definition !== 'Definition to be generated')) {
        uniqueWords.set(w.word, w)
      }
    })
    
    const finalWords = Array.from(uniqueWords.values())
    console.log(`Extracted ${finalWords.length} unique words from PDF`)
    
    // 정의가 없는 단어들에 대해 AI 생성
    const wordsNeedingDef = finalWords.filter(w => 
      !w.definition || w.definition === 'Definition to be generated'
    )
    
    if (wordsNeedingDef.length > 0) {
      console.log(`Generating definitions for ${wordsNeedingDef.length} words`)
      const aiGeneratedWords = await generateDefinitionsWithAI(
        wordsNeedingDef.map(w => w.word).slice(0, 50)
      )
      
      // AI 생성된 정의로 업데이트
      const aiWordMap = new Map(aiGeneratedWords.map(w => [w.word, w]))
      finalWords.forEach(w => {
        if ((!w.definition || w.definition === 'Definition to be generated') && 
            aiWordMap.has(w.word)) {
          const aiWord = aiWordMap.get(w.word)!
          w.definition = aiWord.definition
          w.partOfSpeech = aiWord.partOfSpeech
          w.examples = aiWord.examples
        }
      })
    }
    
    console.log(`Returning ${Math.min(finalWords.length, 500)} words`)
    return finalWords.slice(0, 500) // 최대 500개 단어 반환
  } catch (error) {
    console.error('PDF extraction error:', error)
    console.error('Error stack:', (error as Error).stack)
    // 폴백: 빈 배열 반환
    return []
  }
}

// 텍스트 파일에서 단어 추출
async function extractFromText(file: File): Promise<Word[]> {
  try {
    const text = await file.text()
    
    // 패턴 기반 추출 시도
    const wordsWithDef = extractWordsWithPattern(text)
    if (wordsWithDef.length > 0) {
      return wordsWithDef
    }
    
    // 단순 단어 추출
    const words = extractWordsFromText(text)
    
    // AI로 정의 생성
    if (words.length > 0) {
      return await generateDefinitionsWithAI(words.slice(0, 100))
    }
    
    return words.map(word => ({ word }))
  } catch (error) {
    console.error('Text extraction error:', error)
    throw new Error('Failed to extract from text file')
  }
}

// 이미지에서 단어 추출 (OCR)
async function extractFromImage(file: File): Promise<Word[]> {
  try {
    // OpenAI Vision API 사용
    const base64 = await fileToBase64(file)
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all vocabulary words from this image. Return as JSON array with {word, definition} objects.'
            },
            {
              type: 'image_url',
              image_url: { url: base64 }
            }
          ]
        }
      ],
      max_tokens: 2000
    })
    
    const content = response.choices[0]?.message?.content || '[]'
    
    try {
      const words = JSON.parse(content) as Word[]
      return words
    } catch {
      // JSON 파싱 실패시 텍스트로 처리
      const words = extractWordsFromText(content)
      return await generateDefinitionsWithAI(words.slice(0, 50))
    }
  } catch (error) {
    console.error('Image extraction error:', error)
    // 폴백: 빈 배열 반환
    return []
  }
}

// 텍스트에서 단어만 추출
function extractWordsFromText(text: string): string[] {
  const words: string[] = []
  const wordSet = new Set<string>()
  
  // 단어 추출 (3글자 이상의 영어 단어)
  const matches = text.match(/\b[a-zA-Z]{3,}\b/g) || []
  
  for (const match of matches) {
    const word = match.toLowerCase()
    
    // 중복 제거 및 일반 단어 필터링
    if (!wordSet.has(word) && !COMMON_WORDS.has(word)) {
      wordSet.add(word)
      words.push(word)
    }
  }
  
  return words
}

// 패턴 기반 단어 추출 (word - definition 형식)
function extractWordsWithPattern(text: string): Word[] {
  const words: Word[] = []
  const lines = text.split('\n')
  
  for (const line of lines) {
    // 다양한 패턴 매칭
    const patterns = [
      // 번호가 있는 형식: "1. word definition" 또는 "001 word definition"
      /^\d+[.)]\s*([a-zA-Z]+)\s+(.+)$/,
      /^(\d+)\s+([a-zA-Z]+)\s+(.+)$/,
      // word - definition
      /^([a-zA-Z]+)\s*[-–—]\s*(.+)$/,
      // word: definition
      /^([a-zA-Z]+)\s*[:：]\s*(.+)$/,
      // word = definition
      /^([a-zA-Z]+)\s*[=]\s*(.+)$/,
      // word (part of speech) definition
      /^([a-zA-Z]+)\s*\([^)]+\)\s*(.+)$/,
      // word [pronunciation] definition
      /^([a-zA-Z]+)\s*\[[^\]]+\]\s*(.+)$/,
    ]
    
    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        let word = ''
        let definition = ''
        
        // 패턴에 따라 word와 definition 위치가 다름
        if (pattern === patterns[0] || pattern === patterns[1]) {
          // 번호가 있는 형식
          word = (match[2] || match[1]).trim().toLowerCase()
          definition = match[3] || match[2] || ''
        } else {
          // 일반 형식
          word = match[1].trim().toLowerCase()
          definition = match[2].trim()
        }
        
        // 유효성 검사
        if (word && 
            word.length > 2 && 
            word.length < 50 && 
            /^[a-zA-Z]+$/.test(word) &&
            !COMMON_WORDS.has(word)) {
          
          // 정의가 너무 길면 잘라내기
          if (definition.length > 200) {
            definition = definition.substring(0, 200) + '...'
          }
          
          words.push({ 
            word, 
            definition: definition || 'Definition will be generated'
          })
          break
        }
      }
    }
  }
  
  // 중복 제거
  const uniqueWords = new Map<string, Word>()
  words.forEach(w => {
    if (!uniqueWords.has(w.word)) {
      uniqueWords.set(w.word, w)
    }
  })
  
  return Array.from(uniqueWords.values())
}

// AI로 단어 정의 생성
async function generateDefinitionsWithAI(words: string[]): Promise<Word[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // API 키가 없으면 단어만 반환
      return words.map(word => ({ word }))
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    const wordList = words.slice(0, 50).join(', ') // 최대 50개
    
    const prompt = `Generate definitions for these vocabulary words.
Words: ${wordList}

Return as JSON array with this format:
[{
  "word": "string",
  "definition": "Korean and English definition",
  "partOfSpeech": ["noun", "verb", etc],
  "examples": ["example sentence"]
}]`
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    })
    
    const content = response.choices[0]?.message?.content || '[]'
    
    try {
      const wordsWithDef = JSON.parse(content) as Word[]
      return wordsWithDef
    } catch {
      // 파싱 실패시 단어만 반환
      return words.map(word => ({ word }))
    }
  } catch (error) {
    console.error('AI generation error:', error)
    // 에러시 단어만 반환
    return words.map(word => ({ word }))
  }
}

// 파일을 Base64로 변환
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
  })
}