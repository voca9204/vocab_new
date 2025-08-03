// Firebase Storage imports removed - using API route instead

export interface ExtractedWord {
  word: string
  confidence: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface PDFExtractionResult {
  text: string
  words: ExtractedWord[]
  pages: number
  satWords: string[]
  allWords: string[] // 모든 추출된 단어
  images?: string[] // base64 encoded images
  metadata?: {
    title?: string
    author?: string
    subject?: string
    keywords?: string
  }
}

export interface CompleteExtractionResult {
  text: string
  pages: number
  images: string[] // base64 encoded images
  metadata?: {
    title?: string
    author?: string
    subject?: string
    keywords?: string
  }
}

export class PDFVisionService {
  constructor() {}

  /**
   * PDF 파일에서 텍스트 추출 (Cloud Vision API 사용)
   */
  async extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
    try {
      // 파일 크기에 따라 처리 방법 결정
      if (file.size > 5 * 1024 * 1024) {
        // 5MB 이상은 클라이언트에서 직접 처리
        return await this.extractTextFromLargePDF(file, 10)
      }

      // 작은 파일은 클라이언트에서 PDF.js로 처리
      const pdfjsLib = (await import('pdfjs-dist')) as any
      
      if (typeof window !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      let fullText = ''
      const allWords: ExtractedWord[] = []

      // 모든 페이지에서 텍스트 추출
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        
        // 줄 단위로 텍스트 재구성
        let currentLine = ''
        let currentY = null
        const lines: string[] = []
        
        for (const item of textContent.items) {
          // Y 좌표가 변경되면 새로운 줄
          if (currentY !== null && Math.abs(item.transform[5] - currentY) > 2) {
            if (currentLine.trim()) {
              lines.push(currentLine.trim())
            }
            currentLine = ''
          }
          currentY = item.transform[5]
          currentLine += item.str
        }
        
        // 마지막 줄 추가
        if (currentLine.trim()) {
          lines.push(currentLine.trim())
        }
        
        const pageText = lines.join('\n')
        fullText += pageText + '\n'
        
        // 단어 추출 (기존 방식 유지하되, 단어장 형식 분석은 별도로)
        const words = pageText.split(/\s+/)
          .filter(word => word.length > 2 && /^[a-zA-Z]+$/.test(word))
          .map(word => ({
            word: word.toLowerCase(),
            confidence: 1
          }))
        
        allWords.push(...words)
      }

      const satWords = await this.identifySATWords(allWords)

      return {
        text: fullText,
        words: allWords,
        pages: pdf.numPages,
        satWords,
        allWords: [...new Set(allWords.map(w => w.word))]
      }
    } catch (error) {
      console.error('PDF extraction error:', error)
      throw new Error('PDF 텍스트 추출 실패: ' + (error as Error).message)
    }
  }

  /**
   * Vision API 결과에서 단어 추출
   */
  private extractWords(result: any): ExtractedWord[] {
    const words: ExtractedWord[] = []
    
    if (!result.textAnnotations) return words

    // 첫 번째 요소는 전체 텍스트이므로 스킵
    for (let i = 1; i < result.textAnnotations.length; i++) {
      const annotation = result.textAnnotations[i]
      
      // 단어만 추출 (공백이나 특수문자 제외)
      const text = annotation.description?.trim()
      if (text && /^[a-zA-Z]+$/.test(text) && text.length > 2) {
        words.push({
          word: text.toLowerCase(),
          confidence: annotation.confidence || 1,
          boundingBox: this.getBoundingBox(annotation.boundingPoly)
        })
      }
    }

    return words
  }

  /**
   * Bounding polygon에서 bounding box 계산
   */
  private getBoundingBox(boundingPoly: any) {
    if (!boundingPoly?.vertices || boundingPoly.vertices.length < 4) {
      return undefined
    }

    const vertices = boundingPoly.vertices
    const x = Math.min(vertices[0].x, vertices[3].x)
    const y = Math.min(vertices[0].y, vertices[1].y)
    const width = Math.abs(vertices[1].x - vertices[0].x)
    const height = Math.abs(vertices[3].y - vertices[0].y)

    return { x, y, width, height }
  }

  /**
   * SAT 단어 식별 (Firestore의 SAT 단어 DB와 비교)
   */
  private async identifySATWords(words: ExtractedWord[]): Promise<string[]> {
    // 확장된 SAT 단어 목록
    const commonSATWords = [
      // A
      'aberration', 'abhor', 'abstruse', 'acquiesce', 'acrimony', 'admonish', 
      'adroit', 'aesthetic', 'affable', 'alacrity', 'alleviate', 'altruistic',
      'ambiguous', 'ambivalent', 'ameliorate', 'amiable', 'amorphous', 'anachronism',
      'anarchy', 'anomaly', 'antagonist', 'antipathy', 'apathy', 'appease',
      'arbitrary', 'arcane', 'archaic', 'arduous', 'articulate', 'ascetic',
      'assiduous', 'assuage', 'astute', 'audacious', 'austere', 'autonomous',
      'avarice', 'aversion',
      
      // B
      'banal', 'belie', 'belligerent', 'benevolent', 'benign', 'bequeath',
      'bias', 'bombastic', 'brazen', 'brevity', 'brusque', 'bucolic',
      
      // C
      'cacophony', 'cajole', 'callous', 'candor', 'cantankerous', 'capricious',
      'castigate', 'catalyst', 'caustic', 'censure', 'chide', 'circumlocution',
      'circumspect', 'clandestine', 'coerce', 'cognizant', 'coherent', 'colloquial',
      'complacency', 'compliant', 'conciliatory', 'concise', 'condone', 'conflagration',
      'congruity', 'conjecture', 'connive', 'consternation', 'contempt', 'contentious',
      'contrite', 'conundrum', 'convergence', 'convoluted', 'copious', 'cordial',
      'corroborate', 'cosmopolitan', 'credulous', 'culpable', 'cursory', 'cynical',
      
      // D
      'dearth', 'debacle', 'debase', 'debilitate', 'decorum', 'deference',
      'deleterious', 'delineate', 'demure', 'denigrate', 'deplore', 'deride',
      'derivative', 'desiccate', 'despondent', 'despot', 'deter', 'dexterous',
      'diaphanous', 'dichotomy', 'didactic', 'diffident', 'digress', 'diligent',
      'discern', 'discord', 'discredit', 'disdain', 'disparage', 'disparate',
      'disseminate', 'divergent', 'docile', 'dogmatic', 'dubious', 'duplicity',
      
      // E
      'ebullient', 'eclectic', 'efficacy', 'egregious', 'elated', 'eloquent',
      'elucidate', 'elusive', 'emaciated', 'embellish', 'eminent', 'empirical',
      'emulate', 'enervate', 'engender', 'enigma', 'enmity', 'ephemeral',
      'equanimity', 'equivocal', 'erudite', 'esoteric', 'eulogy', 'euphemism',
      'evanescent', 'exacerbate', 'exculpate', 'exemplary', 'exhaustive', 'exhort',
      'exonerate', 'expedient', 'explicit', 'extant', 'extraneous', 'extrapolate'
    ]

    const uniqueWords = [...new Set(words.map(w => w.word.toLowerCase()))]
    return uniqueWords.filter(word => 
      commonSATWords.includes(word)
    )
  }

  /**
   * 대용량 PDF 처리 (페이지별 처리)
   */
  async extractTextFromLargePDF(file: File, maxPages?: number): Promise<PDFExtractionResult> {
    try {
      // PDF.js 동적 로드
      const pdfjsLib = (await import('pdfjs-dist')) as any
      
      // Worker 설정
      if (typeof window !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      const totalPages = Math.min(pdf.numPages, maxPages || 10) // 최대 10페이지로 제한
      let fullText = ''
      const allWords: ExtractedWord[] = []

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i)
        
        // 텍스트 콘텐츠 직접 추출
        const textContent = await page.getTextContent()
        
        // 줄 단위로 텍스트 재구성
        let currentLine = ''
        let currentY = null
        const lines: string[] = []
        
        for (const item of textContent.items) {
          // Y 좌표가 변경되면 새로운 줄
          if (currentY !== null && Math.abs(item.transform[5] - currentY) > 2) {
            if (currentLine.trim()) {
              lines.push(currentLine.trim())
            }
            currentLine = ''
          }
          currentY = item.transform[5]
          currentLine += item.str
        }
        
        // 마지막 줄 추가
        if (currentLine.trim()) {
          lines.push(currentLine.trim())
        }
        
        const pageText = lines.join('\n')
        fullText += pageText + '\n'
        
        // 단어 추출
        const words = pageText.split(/\s+/)
          .filter(word => word.length > 2 && /^[a-zA-Z]+$/.test(word))
          .map(word => ({
            word: word.toLowerCase(),
            confidence: 1
          }))
        
        allWords.push(...words)
      }

      const satWords = await this.identifySATWords(allWords)

      return {
        text: fullText,
        words: allWords,
        pages: totalPages,
        satWords,
        allWords: [...new Set(allWords.map(w => w.word))]
      }
    } catch (error) {
      console.error('Large PDF processing error:', error)
      throw new Error('대용량 PDF 처리 실패')
    }
  }

  /**
   * 이미지에서 텍스트 추출
   */
  private async extractTextFromImage(blob: Blob): Promise<{ text: string; words: ExtractedWord[] }> {
    const formData = new FormData()
    formData.append('file', blob, 'page.png')

    const response = await fetch('/api/vision', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Vision API 호출 실패')
    }

    const result = await response.json()

    return {
      text: result.text || '',
      words: (result.words || []).map((w: string) => ({ word: w.toLowerCase(), confidence: 1 }))
    }
  }

  /**
   * PDF에서 텍스트와 이미지를 모두 추출
   */
  async extractCompleteContent(file: File, maxPages?: number): Promise<CompleteExtractionResult> {
    const result = maxPages 
      ? await this.extractTextFromLargePDF(file, maxPages)
      : await this.extractTextFromPDF(file)
    return {
      text: result.text,
      pages: result.pages,
      images: [], // 이미지 추출은 필요시 구현
      metadata: {}
    }
  }

  /**
   * 구조화된 텍스트 추출 (레이아웃 보존)
   */
  private extractStructuredText(textContent: any): string {
    const items = textContent.items
    if (!items || items.length === 0) return ''

    // 아이템을 Y 좌표로 그룹화 (같은 줄)
    const lines = new Map<number, any[]>()
    
    items.forEach((item: any) => {
      const y = Math.round(item.transform[5]) // Y 좌표
      if (!lines.has(y)) {
        lines.set(y, [])
      }
      lines.get(y)!.push(item)
    })

    // Y 좌표로 정렬 (위에서 아래로)
    const sortedLines = Array.from(lines.entries())
      .sort((a, b) => b[0] - a[0]) // PDF는 아래에서 위로 좌표가 증가

    // 각 줄을 X 좌표로 정렬하고 텍스트 추출
    const textLines = sortedLines.map(([y, items]) => {
      const sortedItems = items.sort((a, b) => a.transform[4] - b.transform[4]) // X 좌표로 정렬
      
      let lineText = ''
      let lastX = 0
      
      sortedItems.forEach((item, index) => {
        const x = item.transform[4]
        const text = item.str
        
        // 단어 간 공백 추가 (X 좌표 차이가 크면)
        if (index > 0 && x - lastX > item.width * 0.2) {
          lineText += ' '
        }
        
        lineText += text
        lastX = x + item.width
      })
      
      return lineText.trim()
    })

    return textLines.filter(line => line.length > 0).join('\n')
  }

  /**
   * 단어장 형식 자동 감지
   */
  detectVocabularyFormat(text: string): string {
    const lines = text.split('\n').slice(0, 100) // 처음 100줄만 분석
    
    // 각 형식의 패턴 매칭 점수
    const scores = {
      SLASH: 0,
      VZIP: 0,
      TABLE: 0,
      NUMBERED: 0,
      DEFINITION: 0
    }
    
    lines.forEach(line => {
      // 슬래시 형식
      if (/^\d+\/\w+\/\w+\.?\//.test(line)) {
        scores.SLASH++
      }
      
      // V.ZIP 형식
      if (/^\d+\s+[a-zA-Z]+[a-z]+\.$/.test(line)) {
        scores.VZIP++
      }
      
      // 표 형식 (탭이나 여러 공백으로 구분)
      if (/\w+\s{2,}\w+\s{2,}/.test(line) || /\w+\t\w+/.test(line)) {
        scores.TABLE++
      }
      
      // 번호가 있는 형식
      if (/^\d+\.\s+\w+/.test(line)) {
        scores.NUMBERED++
      }
      
      // 정의 형식 (단어: 설명 또는 단어 - 설명)
      if (/^\w+\s*[:：-]\s*.+/.test(line)) {
        scores.DEFINITION++
      }
    })
    
    // 가장 높은 점수의 형식 반환
    const maxScore = Math.max(...Object.values(scores))
    const detectedFormat = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'UNKNOWN'
    
    console.log('형식 감지 점수:', scores)
    console.log('감지된 형식:', detectedFormat)
    
    return detectedFormat
  }
}


export default PDFVisionService

/**
 * PDF에서 단어를 추출하는 헬퍼 함수 (테스트 모드 지원)
 */
export async function extractVocabularyFromPDF(
  file: File,
  options?: {
    maxPages?: number
    testMode?: boolean
  }
): Promise<import('../../types/extracted-vocabulary').ExtractedVocabulary[]> {
  const hybridExtractor = new (await import('./hybrid-pdf-extractor')).HybridPDFExtractor()
  const vocabularyExtractor = new (await import('./vocabulary-pdf-extractor')).default()
  
  try {
    // 테스트 모드인 경우 처음 몇 페이지만 처리
    if (options?.testMode && options.maxPages) {
      // PDF.js로 직접 텍스트 추출
      const pdfjsLib = (await import('pdfjs-dist')) as any
      
      if (typeof window !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      const pagesToProcess = Math.min(pdf.numPages, options.maxPages)
      let fullText = ''
      
      for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        
        // 줄 단위로 텍스트 재구성
        let currentLine = ''
        let currentY = null
        const lines: string[] = []
        
        for (const item of textContent.items) {
          // Y 좌표가 변경되면 새로운 줄
          if (currentY !== null && Math.abs(item.transform[5] - currentY) > 2) {
            if (currentLine.trim()) {
              lines.push(currentLine.trim())
            }
            currentLine = ''
          }
          currentY = item.transform[5]
          currentLine += item.str
        }
        
        // 마지막 줄 추가
        if (currentLine.trim()) {
          lines.push(currentLine.trim())
        }
        
        fullText += lines.join('\n') + '\n'
      }
      
      // V.ZIP 형식으로 단어 추출
      const entries = vocabularyExtractor.extractWithFlexibleFormat(fullText)
      
      // ExtractedWord 형식으로 변환
      return entries.map(entry => ({
        word: entry.word,
        definition: entry.definition,
        etymology: entry.englishDefinition,
        partOfSpeech: entry.partOfSpeech ? [entry.partOfSpeech] : [],
        examples: entry.example ? [entry.example] : [],
        pronunciation: null,
        difficulty: estimateDifficulty(entry.word),
        frequency: Math.floor(Math.random() * 10) + 1,
        isSAT: vocabularyExtractor.isSATWord(entry.word),
        userId: 'test-user',
        source: {
          type: 'pdf' as const,
          filename: file.name,
          uploadedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        studyStatus: {
          studied: false,
          masteryLevel: 0,
          reviewCount: 0
        }
      } as import('../../types/extracted-vocabulary').ExtractedVocabulary))
    }
    
    // 일반 모드는 하이브리드 추출기 사용 (AI 형식 감지 포함)
    const result = await hybridExtractor.extract(file, {
      useAI: true, // AI 형식 감지 활성화
      useVision: false,
      fallbackToRegex: true
    })
    
    return result.entries.map(entry => ({
      word: entry.word,
      definition: entry.definition,
      etymology: entry.englishDefinition,
      partOfSpeech: entry.partOfSpeech ? [entry.partOfSpeech] : [],
      examples: entry.example ? [entry.example] : [],
      pronunciation: null,
      difficulty: estimateDifficulty(entry.word),
      frequency: Math.floor(Math.random() * 10) + 1,
      isSAT: vocabularyExtractor.isSATWord(entry.word),
      source: {
        type: 'pdf' as const,
        filename: file.name,
        uploadedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      studyStatus: {
        studied: false,
        masteryLevel: 0,
        reviewCount: 0
      }
    } as any))
    
  } catch (error) {
    console.error('PDF 단어 추출 오류:', error)
    throw error
  }
}

// 난이도 추정 함수
function estimateDifficulty(word: string): number {
  const length = word.length
  let difficulty = Math.min(10, Math.floor(length / 2))
  
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with']
  if (commonWords.includes(word.toLowerCase())) {
    difficulty = 1
  }
  
  const academicPrefixes = ['anti', 'dis', 'un', 'pre', 'post', 'sub', 'super', 'trans']
  const academicSuffixes = ['tion', 'sion', 'ment', 'ness', 'ity', 'ous', 'ive', 'ary']
  
  if (academicPrefixes.some(prefix => word.startsWith(prefix))) {
    difficulty = Math.min(10, difficulty + 1)
  }
  
  if (academicSuffixes.some(suffix => word.endsWith(suffix))) {
    difficulty = Math.min(10, difficulty + 1)
  }
  
  return difficulty
}