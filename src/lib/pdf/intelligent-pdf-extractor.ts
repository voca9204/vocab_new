import { VocabularyEntry } from './vocabulary-pdf-extractor'

export interface IntelligentExtractionResult {
  success: boolean
  entries: VocabularyEntry[]
  format: string
  confidence: number
  errors?: string[]
}

export class IntelligentPDFExtractor {
  constructor() {}

  /**
   * AI를 사용하여 텍스트에서 단어장 형식을 자동 감지하고 추출
   */
  async extractWithAI(text: string): Promise<IntelligentExtractionResult> {
    try {
      // 텍스트가 너무 길면 샘플링
      const sampleText = this.getSampleText(text)
      
      // 1단계: API를 통해 형식 감지
      const formatDetection = await this.detectFormat(sampleText)
      console.log('감지된 형식:', formatDetection)

      // 2단계: 형식에 맞게 전체 텍스트 파싱
      const entries = await this.parseWithFormat(text, formatDetection.format)

      return {
        success: true,
        entries,
        format: formatDetection.format,
        confidence: formatDetection.confidence
      }
    } catch (error) {
      console.error('AI 추출 오류:', error)
      return {
        success: false,
        entries: [],
        format: 'unknown',
        confidence: 0,
        errors: [error instanceof Error ? error.message : '알 수 없는 오류']
      }
    }
  }

  /**
   * 단어장 형식 자동 감지
   */
  private async detectFormat(sampleText: string): Promise<{ format: string; confidence: number }> {
    try {
      const response = await fetch('/api/extract-vocabulary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sampleText })
      })

      if (!response.ok) {
        throw new Error('Format detection API failed')
      }

      const result = await response.json()
      return {
        format: result.format || 'UNKNOWN',
        confidence: result.confidence || 0
      }
    } catch (error) {
      console.error('형식 감지 오류:', error)
      return {
        format: 'UNKNOWN',
        confidence: 0
      }
    }
  }

  /**
   * 감지된 형식에 맞게 텍스트 파싱
   */
  private async parseWithFormat(text: string, format: string): Promise<VocabularyEntry[]> {
    // 텍스트를 청크로 나누어 처리 (토큰 제한 고려)
    const chunks = this.splitIntoChunks(text, 4000)
    const allEntries: VocabularyEntry[] = []
    const totalChunks = chunks.length

    for (let i = 0; i < chunks.length; i++) {
      try {
        const response = await fetch('/api/extract-vocabulary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: chunks[i],
            format,
            chunkIndex: i + 1,
            totalChunks
          })
        })

        if (!response.ok) {
          console.error(`청크 ${i + 1} 추출 실패`)
          continue
        }

        const result = await response.json()
        if (result.success && result.entries) {
          allEntries.push(...result.entries)
        }
      } catch (error) {
        console.error(`청크 ${i + 1} 파싱 오류:`, error)
      }
    }

    // 중복 제거
    const uniqueEntries = this.removeDuplicates(allEntries)
    return uniqueEntries
  }

  /**
   * 텍스트 샘플링 (형식 감지용)
   */
  private getSampleText(text: string): string {
    const lines = text.split('\n').filter(line => line.trim())
    
    // 처음, 중간, 끝에서 샘플 추출
    const sampleSize = 20
    const samples: string[] = []
    
    // 처음 부분
    samples.push(...lines.slice(0, sampleSize))
    
    // 중간 부분
    const middle = Math.floor(lines.length / 2)
    samples.push(...lines.slice(middle - sampleSize/2, middle + sampleSize/2))
    
    // 끝 부분
    samples.push(...lines.slice(-sampleSize))
    
    return samples.join('\n')
  }

  /**
   * 텍스트를 청크로 분할
   */
  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const lines = text.split('\n')
    const chunks: string[] = []
    let currentChunk = ''

    for (const line of lines) {
      if (currentChunk.length + line.length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk)
          currentChunk = ''
        }
      }
      currentChunk += line + '\n'
    }

    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  /**
   * 중복 제거
   */
  private removeDuplicates(entries: VocabularyEntry[]): VocabularyEntry[] {
    const seen = new Set<string>()
    return entries.filter(entry => {
      const key = entry.word.toLowerCase()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  /**
   * 이미지 기반 추출 (GPT-4 Vision) - 현재는 비활성화
   */
  async extractFromImage(imageBase64: string): Promise<IntelligentExtractionResult> {
    // Vision API는 별도 구현 필요
    console.warn('이미지 기반 추출은 현재 지원되지 않습니다.')
    return {
      success: false,
      entries: [],
      format: 'IMAGE',
      confidence: 0,
      errors: ['이미지 기반 추출은 현재 지원되지 않습니다.']
    }
  }

  /**
   * 형식 학습 (사용자 피드백 기반) - 추후 구현
   */
  async learnFormat(
    sampleText: string, 
    correctEntries: VocabularyEntry[]
  ): Promise<{ pattern: string; description: string }> {
    // 추후 구현 예정
    console.warn('형식 학습 기능은 현재 개발 중입니다.')
    return {
      pattern: '',
      description: '사용자 정의 형식'
    }
  }
}

export default IntelligentPDFExtractor