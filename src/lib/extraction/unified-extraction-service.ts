/**
 * 통합 파일 추출 서비스 v2
 * 
 * 추출 전략:
 * 1. 이미지/사진: Google Cloud Vision API (OCR)
 * 2. PDF/TXT/CSV: 텍스트 추출 → OpenAI로 단어+정의 생성
 * 3. Discovery: OpenAI로 새 단어 생성
 */

import { ImageAnnotatorClient } from '@google-cloud/vision'
import OpenAI from 'openai'

// Dynamic import to avoid pdf-parse issues in Next.js
let pdfParse: any = null
if (typeof window === 'undefined') {
  try {
    pdfParse = require('pdf-parse')
  } catch (error) {
    console.warn('pdf-parse module not available:', error)
  }
}

// ==================== 타입 정의 ====================

export interface ExtractedWord {
  word: string
  definition?: string
  partOfSpeech?: string[]
  examples?: string[]
  etymology?: string
  pronunciation?: string
  confidence?: number
  context?: string // 원본 문맥
  source?: {
    type: 'ocr' | 'ai' | 'manual' | 'discovery'
    method?: string
  }
}

export interface ExtractionOptions {
  // 공통 옵션
  maxWords?: number
  targetLanguage?: 'en' | 'ko' | 'both'
  removeCommonWords?: boolean
  
  // AI 옵션
  useAI?: boolean
  aiModel?: 'gpt-4' | 'gpt-3.5-turbo'
  generateDefinitions?: boolean
  
  // OCR 옵션
  ocrProvider?: 'google' | 'openai'
  ocrConfidenceThreshold?: number
  
  // 파일별 옵션
  pdfMaxPages?: number
  csvDelimiter?: string
  csvHasHeader?: boolean
}

export interface ExtractionResult {
  success: boolean
  words: ExtractedWord[]
  totalCount: number
  method: 'ocr' | 'ai' | 'hybrid' | 'manual'
  confidence?: number
  metadata?: {
    fileName?: string
    fileType?: string
    pages?: number
    processingTime?: number
    ocrProvider?: string
    aiModel?: string
  }
  error?: string
}

// ==================== 공통 유틸리티 ====================

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
  'above', 'below', 'between', 'through', 'during', 'about', 'against',
  'among', 'into', 'through', 'during', 'before', 'after', 'above', 'below'
])

// ==================== 메인 서비스 클래스 ====================

export class UnifiedExtractionService {
  private openai: OpenAI | null = null
  private visionClient: ImageAnnotatorClient | null = null
  
  constructor(openaiKey?: string, googleCredentials?: any) {
    // OpenAI 초기화
    if (openaiKey || process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: openaiKey || process.env.OPENAI_API_KEY
      })
    }
    
    // Google Cloud Vision 초기화 (서버 사이드에서만)
    if (typeof window === 'undefined' && googleCredentials) {
      this.visionClient = new ImageAnnotatorClient({
        credentials: googleCredentials
      })
    }
  }
  
  // ==================== 메인 추출 메서드 ====================
  
  /**
   * 파일에서 단어 추출 (자동 타입 감지)
   */
  async extractFromFile(
    file: File | Buffer,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now()
    
    try {
      // 파일 타입 감지
      const fileType = this.detectFileType(file)
      
      let result: ExtractionResult
      
      switch (fileType) {
        case 'image':
          result = await this.extractFromImage(file, options)
          break
          
        case 'pdf':
          result = await this.extractFromPDF(file, options)
          break
          
        case 'txt':
          result = await this.extractFromText(file, options)
          break
          
        case 'csv':
          result = await this.extractFromCSV(file, options)
          break
          
        default:
          throw new Error(`Unsupported file type: ${fileType}`)
      }
      
      // 후처리
      if (result.success) {
        result = await this.postProcess(result, options)
      }
      
      // 메타데이터 추가
      result.metadata = {
        ...result.metadata,
        processingTime: Date.now() - startTime
      }
      
      return result
      
    } catch (error) {
      console.error('[UnifiedExtractionService] Error:', error)
      return {
        success: false,
        words: [],
        totalCount: 0,
        method: 'manual',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  // ==================== 이미지 추출 (OCR) ====================
  
  /**
   * 이미지에서 단어 추출 (Google Cloud Vision 우선)
   */
  private async extractFromImage(
    file: File | Buffer,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const provider = options.ocrProvider || 'google'
    
    try {
      // Google Cloud Vision 사용
      if (provider === 'google' && this.visionClient) {
        return await this.extractWithGoogleVision(file, options)
      }
      
      // OpenAI Vision 사용
      if (this.openai) {
        return await this.extractWithOpenAIVision(file, options)
      }
      
      throw new Error('No OCR provider available')
      
    } catch (error) {
      // Fallback 처리
      if (provider === 'google' && this.openai) {
        console.log('Google Vision failed, falling back to OpenAI')
        return await this.extractWithOpenAIVision(file, options)
      }
      
      throw error
    }
  }
  
  /**
   * Google Cloud Vision으로 OCR
   */
  private async extractWithGoogleVision(
    file: File | Buffer,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    if (!this.visionClient) {
      throw new Error('Google Vision client not initialized')
    }
    
    // 이미지를 base64로 변환
    const base64 = await this.toBase64(file)
    
    // OCR 실행
    const [result] = await this.visionClient.textDetection({
      image: { content: base64.split(',')[1] }
    })
    
    const detections = result.textAnnotations || []
    if (detections.length === 0) {
      return {
        success: true,
        words: [],
        totalCount: 0,
        method: 'ocr',
        metadata: { ocrProvider: 'google' }
      }
    }
    
    // 전체 텍스트
    const fullText = detections[0].description || ''
    
    // AI로 단어 + 정의 추출
    if (options.generateDefinitions !== false && this.openai) {
      const words = await this.extractWordsWithAI(fullText, options)
      return {
        success: true,
        words,
        totalCount: words.length,
        method: 'hybrid',
        confidence: 0.9,
        metadata: {
          ocrProvider: 'google',
          aiModel: options.aiModel || 'gpt-4'
        }
      }
    }
    
    // 단순 단어 추출
    const words = this.extractWordsFromText(fullText, options)
    return {
      success: true,
      words,
      totalCount: words.length,
      method: 'ocr',
      confidence: 0.8,
      metadata: { ocrProvider: 'google' }
    }
  }
  
  /**
   * OpenAI Vision으로 OCR
   */
  private async extractWithOpenAIVision(
    file: File | Buffer,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }
    
    const base64 = await this.toBase64(file)
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all vocabulary words and their definitions from this image. Return as JSON array with {word, definition} objects.'
            },
            {
              type: 'image_url',
              image_url: { url: base64 }
            }
          ]
        }
      ],
      max_tokens: 4096
    })
    
    const content = response.choices[0]?.message?.content || '[]'
    
    try {
      const extractedWords = JSON.parse(content) as ExtractedWord[]
      return {
        success: true,
        words: extractedWords,
        totalCount: extractedWords.length,
        method: 'hybrid',
        confidence: 0.85,
        metadata: {
          ocrProvider: 'openai',
          aiModel: 'gpt-4-vision'
        }
      }
    } catch (error) {
      // JSON 파싱 실패 시 텍스트로 처리
      const words = this.extractWordsFromText(content, options)
      return {
        success: true,
        words,
        totalCount: words.length,
        method: 'ocr',
        confidence: 0.7,
        metadata: { ocrProvider: 'openai' }
      }
    }
  }
  
  // ==================== PDF 추출 ====================
  
  /**
   * PDF에서 단어 추출
   */
  private async extractFromPDF(
    file: File | Buffer,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    if (!pdfParse) {
      throw new Error('PDF parsing is not available. Please install pdf-parse module.')
    }
    
    // PDF 텍스트 추출
    const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file
    const data = await pdfParse(buffer)
    
    const fullText = data.text
    const pages = data.numpages
    
    // AI로 단어 + 정의 추출
    if (options.generateDefinitions !== false && this.openai) {
      const words = await this.extractWordsWithAI(fullText, options)
      return {
        success: true,
        words,
        totalCount: words.length,
        method: 'hybrid',
        confidence: 0.9,
        metadata: {
          fileType: 'pdf',
          pages,
          aiModel: options.aiModel || 'gpt-4'
        }
      }
    }
    
    // 단순 단어 추출
    const words = this.extractWordsFromText(fullText, options)
    return {
      success: true,
      words,
      totalCount: words.length,
      method: 'manual',
      confidence: 0.6,
      metadata: {
        fileType: 'pdf',
        pages
      }
    }
  }
  
  // ==================== 텍스트 파일 추출 ====================
  
  /**
   * TXT 파일에서 추출
   */
  private async extractFromText(
    file: File | Buffer,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const text = file instanceof File ? await file.text() : file.toString()
    
    // 형식 감지: word - definition 패턴인지 확인
    const hasDefinitions = /\w+\s*[-:=]\s*.+/m.test(text)
    
    if (hasDefinitions) {
      // 패턴 기반 추출
      const words = this.extractWordsWithPattern(text)
      return {
        success: true,
        words,
        totalCount: words.length,
        method: 'manual',
        confidence: 0.95
      }
    }
    
    // AI로 단어 + 정의 생성
    if (options.generateDefinitions !== false && this.openai) {
      const words = await this.extractWordsWithAI(text, options)
      return {
        success: true,
        words,
        totalCount: words.length,
        method: 'ai',
        confidence: 0.85,
        metadata: {
          aiModel: options.aiModel || 'gpt-4'
        }
      }
    }
    
    // 단순 단어 추출
    const words = this.extractWordsFromText(text, options)
    return {
      success: true,
      words,
      totalCount: words.length,
      method: 'manual',
      confidence: 0.5
    }
  }
  
  // ==================== CSV 파일 추출 ====================
  
  /**
   * CSV 파일에서 추출
   */
  private async extractFromCSV(
    file: File | Buffer,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const text = file instanceof File ? await file.text() : file.toString()
    const delimiter = options.csvDelimiter || ','
    const hasHeader = options.csvHasHeader !== false
    
    const lines = text.split('\n').filter(line => line.trim())
    const words: ExtractedWord[] = []
    
    const startIdx = hasHeader ? 1 : 0
    
    for (let i = startIdx; i < lines.length; i++) {
      const parts = this.parseCSVLine(lines[i], delimiter)
      
      if (parts.length >= 1) {
        words.push({
          word: parts[0].toLowerCase().trim(),
          definition: parts[1]?.trim(),
          partOfSpeech: parts[2]?.split(',').map(p => p.trim()),
          examples: parts[3]?.split(';').map(e => e.trim())
        })
      }
    }
    
    return {
      success: true,
      words,
      totalCount: words.length,
      method: 'manual',
      confidence: 1.0
    }
  }
  
  // ==================== AI 기반 추출 ====================
  
  /**
   * AI로 텍스트에서 단어와 정의 추출
   */
  private async extractWordsWithAI(
    text: string,
    options: ExtractionOptions
  ): Promise<ExtractedWord[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }
    
    const maxWords = options.maxWords || 100
    const targetLang = options.targetLanguage || 'both'
    
    const prompt = `
Extract vocabulary words and their definitions from the following text.
Target: SAT/TOEFL level vocabulary
Max words: ${maxWords}
Language: ${targetLang === 'both' ? 'Include both Korean and English definitions' : targetLang}

Return as JSON array with this format:
[{
  "word": "string",
  "definition": "string",
  "partOfSpeech": ["noun", "verb", etc],
  "examples": ["example sentence"],
  "etymology": "word origin"
}]

Text:
${text.substring(0, 8000)}
`
    
    const response = await this.openai.chat.completions.create({
      model: options.aiModel || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4096
    })
    
    const content = response.choices[0]?.message?.content || '[]'
    
    try {
      const words = JSON.parse(content) as ExtractedWord[]
      return words.map(w => ({
        ...w,
        source: { type: 'ai', method: options.aiModel || 'gpt-4' }
      }))
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      return []
    }
  }
  
  /**
   * Discovery: 새 단어에 대한 정의 생성
   */
  async discoverWord(
    word: string,
    context?: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractedWord | null> {
    if (!this.openai) {
      console.error('OpenAI client not initialized. Please check OPENAI_API_KEY environment variable.')
      throw new Error('OpenAI client not initialized. Please check OPENAI_API_KEY environment variable.')
    }
    
    const prompt = `
Generate a comprehensive definition for the word "${word}".
${context ? `Context: ${context}` : ''}

Include:
1. Definition (both Korean and English)
2. Part of speech
3. Example sentences
4. Etymology
5. Pronunciation
6. Synonyms and antonyms

Return as JSON with this format:
{
  "word": "${word}",
  "definition": "string",
  "partOfSpeech": ["string"],
  "examples": ["string"],
  "etymology": "string",
  "pronunciation": "string",
  "synonyms": ["string"],
  "antonyms": ["string"]
}
`
    
    const response = await this.openai.chat.completions.create({
      model: options.aiModel || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    })
    
    const content = response.choices[0]?.message?.content || '{}'
    
    try {
      const wordData = JSON.parse(content) as ExtractedWord
      return {
        ...wordData,
        source: { type: 'discovery', method: 'openai' }
      }
    } catch (error) {
      console.error('Failed to parse discovery response:', error)
      return null
    }
  }
  
  // ==================== 유틸리티 메서드 ====================
  
  /**
   * 파일 타입 감지
   */
  private detectFileType(file: File | Buffer): string {
    if (file instanceof Buffer) {
      // Buffer인 경우 내용으로 판단
      const header = file.slice(0, 4).toString('hex')
      if (header === '25504446') return 'pdf' // %PDF
      if (header.startsWith('ffd8ff')) return 'image' // JPEG
      if (header === '89504e47') return 'image' // PNG
      return 'txt' // 기본값
    }
    
    const name = file.name.toLowerCase()
    const type = file.type.toLowerCase()
    
    if (name.endsWith('.pdf') || type === 'application/pdf') return 'pdf'
    if (name.endsWith('.txt') || type === 'text/plain') return 'txt'
    if (name.endsWith('.csv') || type === 'text/csv') return 'csv'
    if (type.startsWith('image/')) return 'image'
    if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'image'
    
    return 'txt' // 기본값
  }
  
  /**
   * 파일을 Base64로 변환
   */
  private async toBase64(file: File | Buffer): Promise<string> {
    if (file instanceof Buffer) {
      return `data:image/jpeg;base64,${file.toString('base64')}`
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }
  
  /**
   * 패턴 기반 단어 추출
   */
  private extractWordsWithPattern(text: string): ExtractedWord[] {
    const words: ExtractedWord[] = []
    const lines = text.split('\n')
    
    for (const line of lines) {
      // 다양한 패턴 매칭
      const patterns = [
        /^(.+?)\s*[-–—]\s*(.+)$/,  // word - definition
        /^(.+?)\s*[:：]\s*(.+)$/,   // word: definition
        /^(.+?)\s*[=]\s*(.+)$/,     // word = definition
        /^(\d+\.\s*)?(.+?)\s*[-–—]\s*(.+)$/, // 1. word - definition
      ]
      
      for (const pattern of patterns) {
        const match = line.match(pattern)
        if (match) {
          const word = (match[2] || match[1]).trim().toLowerCase()
          const definition = match[match.length - 1].trim()
          
          if (word && definition) {
            words.push({ word, definition })
            break
          }
        }
      }
    }
    
    return words
  }
  
  /**
   * 단순 단어 추출
   */
  private extractWordsFromText(
    text: string,
    options: ExtractionOptions
  ): ExtractedWord[] {
    const words: ExtractedWord[] = []
    const wordSet = new Set<string>()
    
    // 단어 추출
    const matches = text.match(/\b[a-zA-Z]{3,}\b/g) || []
    
    for (const match of matches) {
      const word = match.toLowerCase()
      
      // 중복 제거
      if (wordSet.has(word)) continue
      
      // 일반 단어 필터링
      if (options.removeCommonWords !== false && COMMON_WORDS.has(word)) {
        continue
      }
      
      wordSet.add(word)
      words.push({ word })
    }
    
    return words
  }
  
  /**
   * CSV 라인 파싱
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }
  
  /**
   * 후처리
   */
  private async postProcess(
    result: ExtractionResult,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    let words = result.words
    
    // 최대 개수 제한
    if (options.maxWords && words.length > options.maxWords) {
      words = words.slice(0, options.maxWords)
    }
    
    // 정렬
    words.sort((a, b) => a.word.localeCompare(b.word))
    
    return {
      ...result,
      words,
      totalCount: words.length
    }
  }
}

// ==================== 싱글톤 인스턴스 ====================

let serviceInstance: UnifiedExtractionService | null = null

export function getExtractionService(): UnifiedExtractionService {
  if (!serviceInstance) {
    // OpenAI API 키를 환경변수에서 가져와서 초기화
    const openaiKey = process.env.OPENAI_API_KEY
    serviceInstance = new UnifiedExtractionService(openaiKey)
  }
  return serviceInstance
}

// ==================== Express/Next.js 헬퍼 ====================

/**
 * API 라우트에서 사용할 수 있는 헬퍼 함수
 */
export async function handleExtractionRequest(
  file: File | Buffer,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const service = getExtractionService()
  return await service.extractFromFile(file, options)
}

/**
 * Discovery 요청 처리
 */
export async function handleDiscoveryRequest(
  word: string,
  context?: string,
  options: ExtractionOptions = {}
): Promise<ExtractedWord | null> {
  const service = getExtractionService()
  return await service.discoverWord(word, context, options)
}