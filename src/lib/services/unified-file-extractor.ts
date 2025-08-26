/**
 * 통합 파일 추출 서비스
 * 모든 파일 형식(TXT, CSV, PDF, 이미지)에서 단어를 추출하는 통합 서비스
 */

import HybridPDFExtractor from '../pdf/hybrid-pdf-extractor'

// 추출된 단어 인터페이스
export interface ExtractedWord {
  word: string
  definition?: string
  partOfSpeech?: string[]
  examples?: string[]
  etymology?: string
  pronunciation?: string
  context?: string // 원본 문맥 (이미지/PDF에서 추출 시)
}

// 추출 결과 인터페이스
export interface ExtractionResult {
  success: boolean
  words: ExtractedWord[]
  totalCount: number
  method: 'txt' | 'csv' | 'pdf' | 'image' | 'manual'
  confidence?: number // 추출 신뢰도 (0-1)
  metadata?: {
    fileName?: string
    fileSize?: number
    pages?: number // PDF의 경우
    extractedAt?: Date
    processingTime?: number // ms
  }
  error?: string
}

// 추출 옵션
export interface ExtractionOptions {
  // 공통 옵션
  removeCommonWords?: boolean // 일반적인 단어 제거
  minWordLength?: number // 최소 단어 길이
  maxWords?: number // 최대 추출 단어 수
  
  // PDF 옵션
  useAI?: boolean // AI 사용 여부 (PDF)
  useVision?: boolean // Vision API 사용 (PDF/이미지)
  
  // 언어 옵션
  targetLanguage?: 'en' | 'ko' | 'mixed' // 대상 언어
  
  // 형식별 옵션
  csvDelimiter?: string // CSV 구분자
  csvHasHeader?: boolean // CSV 헤더 여부
}

// 일반적인 영어 단어 (필터링용)
const COMMON_WORDS = new Set([
  // Articles & Determiners
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  
  // Pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'us', 'them',
  
  // Common Verbs
  'be', 'is', 'am', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing', 'will', 'would', 'shall', 'should', 'may', 'might',
  'must', 'can', 'could', 'get', 'got', 'gotten', 'getting', 'go', 'goes', 'went', 'going', 'gone',
  
  // Common Prepositions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'down', 'out', 'over',
  'under', 'about', 'into', 'through', 'during', 'before', 'after', 'between', 'among',
  
  // Common Conjunctions
  'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while', 'when', 'where', 'so', 'than',
])

export class UnifiedFileExtractor {
  private pdfExtractor: HybridPDFExtractor
  
  constructor() {
    this.pdfExtractor = new HybridPDFExtractor()
  }
  
  /**
   * 파일에서 단어 추출 (메인 메서드)
   */
  async extractFromFile(
    file: File,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now()
    
    try {
      // 파일 타입 감지
      const fileType = this.detectFileType(file)
      
      let result: ExtractionResult
      
      // 파일 타입별 처리
      switch (fileType) {
        case 'txt':
          result = await this.extractFromText(file, options)
          break
          
        case 'csv':
          result = await this.extractFromCSV(file, options)
          break
          
        case 'pdf':
          result = await this.extractFromPDF(file, options)
          break
          
        case 'image':
          result = await this.extractFromImage(file, options)
          break
          
        default:
          // 파일 확장자로 한번 더 시도
          const fileName = file.name.toLowerCase()
          if (fileName.endsWith('.txt')) {
            result = await this.extractFromText(file, options)
          } else if (fileName.endsWith('.csv')) {
            result = await this.extractFromCSV(file, options)
          } else if (fileName.endsWith('.pdf')) {
            result = await this.extractFromPDF(file, options)
          } else {
            throw new Error(`Unsupported file type: ${file.type || 'unknown'} (${file.name})`)
          }
      }
      
      // 공통 후처리
      if (result.success) {
        result = this.postProcess(result, options)
      }
      
      // 메타데이터 추가
      result.metadata = {
        ...result.metadata,
        fileName: file.name,
        fileSize: file.size,
        extractedAt: new Date(),
        processingTime: Date.now() - startTime
      }
      
      return result
      
    } catch (error) {
      console.error('[UnifiedFileExtractor] Extraction error:', error)
      return {
        success: false,
        words: [],
        totalCount: 0,
        method: 'manual',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
  
  /**
   * 파일 타입 감지
   */
  private detectFileType(file: File): 'txt' | 'csv' | 'pdf' | 'image' | 'unknown' {
    const mimeType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    
    // 파일 확장자를 우선적으로 확인
    if (fileName.endsWith('.txt')) {
      return 'txt'
    }
    
    if (fileName.endsWith('.csv')) {
      return 'csv'
    }
    
    if (fileName.endsWith('.pdf')) {
      return 'pdf'
    }
    
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
      return 'image'
    }
    
    // MIME 타입으로 재확인
    if (mimeType === 'text/plain') {
      return 'txt'
    }
    
    if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
      return 'csv'
    }
    
    if (mimeType === 'application/pdf') {
      return 'pdf'
    }
    
    if (mimeType.startsWith('image/')) {
      return 'image'
    }
    
    // 빈 MIME 타입일 경우 확장자로만 판단
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (fileName.endsWith('.txt')) return 'txt'
      if (fileName.endsWith('.csv')) return 'csv'
      if (fileName.endsWith('.pdf')) return 'pdf'
    }
    
    return 'unknown'
  }
  
  /**
   * TXT 파일에서 추출
   */
  private async extractFromText(
    file: File,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    const words: ExtractedWord[] = []
    
    for (const line of lines) {
      // 다양한 형식 지원
      // 1. "word - definition"
      // 2. "word: definition"
      // 3. "word, definition"
      // 4. "word\tdefinition"
      // 5. "word = definition"
      
      let parts: string[] = []
      if (line.includes(' - ')) {
        parts = line.split(' - ')
      } else if (line.includes(': ')) {
        parts = line.split(': ')
      } else if (line.includes('\t')) {
        parts = line.split('\t')
      } else if (line.includes(' = ')) {
        parts = line.split(' = ')
      } else if (line.includes(',')) {
        parts = line.split(',')
      }
      
      if (parts.length >= 2) {
        const word = parts[0].trim().toLowerCase()
        const definition = parts.slice(1).join(' ').trim()
        
        if (word && definition) {
          words.push({
            word,
            definition
          })
        }
      } else {
        // 단어만 있는 경우
        const word = line.trim().toLowerCase()
        if (word && word.length >= (options.minWordLength || 2)) {
          words.push({ word })
        }
      }
    }
    
    return {
      success: true,
      words,
      totalCount: words.length,
      method: 'txt',
      confidence: 1.0
    }
  }
  
  /**
   * CSV 파일에서 추출
   */
  private async extractFromCSV(
    file: File,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    const words: ExtractedWord[] = []
    
    const delimiter = options.csvDelimiter || ','
    const hasHeader = options.csvHasHeader !== false // 기본값 true
    
    // 헤더 처리
    let startIdx = 0
    if (hasHeader && lines[0]) {
      const firstLine = lines[0].toLowerCase()
      if (firstLine.includes('word') || firstLine.includes('definition')) {
        startIdx = 1
      }
    }
    
    // CSV 파싱
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i]
      const parts = this.parseCSVLine(line, delimiter)
      
      if (parts.length >= 1) {
        const word = parts[0].trim().toLowerCase()
        const definition = parts[1]?.trim() || ''
        const partOfSpeech = parts[2]?.trim().split(',').map(p => p.trim())
        const examples = parts[3]?.trim().split(';').map(e => e.trim())
        
        if (word) {
          words.push({
            word,
            definition: definition || undefined,
            partOfSpeech: partOfSpeech?.length ? partOfSpeech : undefined,
            examples: examples?.length ? examples : undefined
          })
        }
      }
    }
    
    return {
      success: true,
      words,
      totalCount: words.length,
      method: 'csv',
      confidence: 1.0
    }
  }
  
  /**
   * CSV 라인 파싱 (quoted values 지원)
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current)
    return result.map(s => s.replace(/^["']|["']$/g, ''))
  }
  
  /**
   * PDF 파일에서 추출
   */
  private async extractFromPDF(
    file: File,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    try {
      // OpenAI API 키가 없으면 간단한 추출로 fallback
      if (!process.env.OPENAI_API_KEY && !process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
        console.log('[UnifiedFileExtractor] No OpenAI API key, using simple PDF extraction')
        return this.extractFromPDFSimple(file, options)
      }
      
      const result = await this.pdfExtractor.extract(file, {
        useAI: options.useAI !== false,
        useVision: options.useVision === true,
        fallbackToRegex: true
      })
      
      const words: ExtractedWord[] = result.entries.map(entry => ({
        word: entry.word.toLowerCase(),
        definition: entry.definition || '',
        context: entry.context
      }))
      
      return {
        success: true,
        words,
        totalCount: words.length,
        method: 'pdf',
        confidence: result.confidence,
        metadata: {
          pages: result.pages
        }
      }
    } catch (error) {
      console.error('[UnifiedFileExtractor] PDF extraction error:', error)
      // Fallback to simple PDF extraction
      return this.extractFromPDFSimple(file, options)
    }
  }
  
  /**
   * 단순 PDF 추출 (fallback)
   */
  private async extractFromPDFSimple(
    file: File,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    try {
      const pdf = await import('pdf-parse/lib/pdf-parse')
      const buffer = Buffer.from(await file.arrayBuffer())
      const data = await pdf.default(buffer)
      
      const text = data.text
      const wordMatches = text.match(/\b[a-zA-Z]{3,}\b/g) || []
      const uniqueWords = [...new Set(wordMatches.map(w => w.toLowerCase()))]
      
      const words: ExtractedWord[] = uniqueWords.map(word => ({ word }))
      
      return {
        success: true,
        words,
        totalCount: words.length,
        method: 'pdf',
        confidence: 0.5,
        metadata: {
          pages: data.numpages
        }
      }
    } catch (error) {
      throw new Error('PDF extraction failed')
    }
  }
  
  /**
   * 이미지에서 추출
   */
  private async extractFromImage(
    file: File,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    // 현재 이미지 추출은 서버 사이드 API가 필요함
    // 클라이언트에서는 지원하지 않음
    return {
      success: false,
      words: [],
      totalCount: 0,
      method: 'image',
      error: '이미지 파일에서 단어 추출은 현재 지원되지 않습니다. TXT, CSV, PDF 파일을 사용해주세요.'
    }
  }
  
  /**
   * 파일을 Base64로 변환
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }
  
  /**
   * 후처리 (공통 필터링 및 정제)
   */
  private postProcess(
    result: ExtractionResult,
    options: ExtractionOptions
  ): ExtractionResult {
    let words = result.words
    
    // 일반적인 단어 제거
    if (options.removeCommonWords !== false) {
      words = words.filter(w => !COMMON_WORDS.has(w.word.toLowerCase()))
    }
    
    // 최소 길이 필터
    if (options.minWordLength) {
      words = words.filter(w => w.word.length >= options.minWordLength)
    }
    
    // 중복 제거
    const uniqueMap = new Map<string, ExtractedWord>()
    for (const word of words) {
      const key = word.word.toLowerCase()
      if (!uniqueMap.has(key) || 
          (word.definition && !uniqueMap.get(key)?.definition)) {
        uniqueMap.set(key, word)
      }
    }
    words = Array.from(uniqueMap.values())
    
    // 최대 개수 제한
    if (options.maxWords && words.length > options.maxWords) {
      words = words.slice(0, options.maxWords)
    }
    
    // 정렬 (알파벳순)
    words.sort((a, b) => a.word.localeCompare(b.word))
    
    return {
      ...result,
      words,
      totalCount: words.length
    }
  }
  
  /**
   * 텍스트에서 단어 목록 추출 (유틸리티)
   */
  extractWordsFromText(text: string, options: ExtractionOptions = {}): ExtractedWord[] {
    const wordMatches = text.match(/\b[a-zA-Z]{2,}\b/g) || []
    const uniqueWords = [...new Set(wordMatches.map(w => w.toLowerCase()))]
    
    let words: ExtractedWord[] = uniqueWords.map(word => ({ word }))
    
    // 필터링
    if (options.removeCommonWords !== false) {
      words = words.filter(w => !COMMON_WORDS.has(w.word))
    }
    
    if (options.minWordLength) {
      words = words.filter(w => w.word.length >= options.minWordLength)
    }
    
    return words
  }
}

// 싱글톤 인스턴스
let extractorInstance: UnifiedFileExtractor | null = null

export function getUnifiedExtractor(): UnifiedFileExtractor {
  if (!extractorInstance) {
    extractorInstance = new UnifiedFileExtractor()
  }
  return extractorInstance
}