import VocabularyPDFExtractor, { VocabularyEntry } from './vocabulary-pdf-extractor'
import IntelligentPDFExtractor from './intelligent-pdf-extractor'
import PDFVisionService from './pdf-vision-service'

export interface ExtractionOptions {
  useAI?: boolean
  useVision?: boolean
  fallbackToRegex?: boolean
  customPatterns?: RegExp[]
  maxRetries?: number
  maxPages?: number
}

export interface ExtractionResult {
  entries: VocabularyEntry[]
  method: 'AI' | 'VISION' | 'REGEX' | 'HYBRID'
  confidence: number
  stats: {
    totalExtracted: number
    aiExtracted: number
    regexExtracted: number
    visionExtracted: number
    duplicatesRemoved: number
    errors: number
  }
}

/**
 * 하이브리드 PDF 추출기
 * AI, Vision, 정규식을 조합하여 최적의 추출 결과 제공
 */
export class HybridPDFExtractor {
  private regexExtractor: VocabularyPDFExtractor
  private aiExtractor: IntelligentPDFExtractor
  private visionService: PDFVisionService

  constructor() {
    this.regexExtractor = new VocabularyPDFExtractor()
    this.aiExtractor = new IntelligentPDFExtractor()
    this.visionService = new PDFVisionService()
  }

  /**
   * 하이브리드 추출 - 모든 방법을 조합하여 최적의 결과 도출
   */
  async extract(
    file: File,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    const {
      useAI = true,
      useVision = false,
      fallbackToRegex = true,
      maxRetries = 3,
      maxPages
    } = options

    const stats = {
      totalExtracted: 0,
      aiExtracted: 0,
      regexExtracted: 0,
      visionExtracted: 0,
      duplicatesRemoved: 0,
      errors: 0
    }

    let allEntries: VocabularyEntry[] = []
    let method: ExtractionResult['method'] = 'HYBRID'
    let confidence = 0

    try {
      // 1. PDF에서 텍스트 추출
      console.log('📄 PDF 텍스트 추출 시작...')
      const { text, images } = await this.visionService.extractCompleteContent(file, maxPages)
      
      // 2. AI 형식 감지 및 추출 시도
      if (useAI) {
        console.log('🤖 AI 형식 감지 및 추출 시도...')
        try {
          // 먼저 형식 감지
          const formatDetection = await this.detectFormatWithAI(text)
          if (formatDetection) {
            console.log(`📋 감지된 형식: ${formatDetection.name} (신뢰도: ${(formatDetection.confidence * 100).toFixed(1)}%)`)
            
            // 감지된 형식에 따라 추출
            if (formatDetection.confidence > 0.7) {
              const formatEntries = await this.extractWithFormat(text, formatDetection)
              if (formatEntries.length > 0) {
                allEntries.push(...formatEntries)
                stats.aiExtracted = formatEntries.length
                confidence = formatDetection.confidence
                console.log(`✅ AI 형식 기반 추출 성공: ${formatEntries.length}개`)
              }
            }
          }
          
          // AI 추출이 부족하면 기존 AI 방식도 시도
          if (allEntries.length === 0) {
            const aiResult = await this.aiExtractor.extractWithAI(text)
            if (aiResult.success && aiResult.entries.length > 0) {
              allEntries.push(...aiResult.entries)
              stats.aiExtracted = aiResult.entries.length
              confidence = Math.max(confidence, aiResult.confidence)
              console.log(`✅ AI 추출 성공: ${aiResult.entries.length}개`)
            }
          }
        } catch (error) {
          console.error('AI 추출 실패:', error)
          stats.errors++
        }
      }

      // 3. 정규식 추출 (폴백 또는 보완)
      if (fallbackToRegex || allEntries.length === 0) {
        console.log('🔍 정규식 기반 추출 시도...')
        const regexEntries = this.regexExtractor.extractWithFlexibleFormat(text)
        
        // AI 결과와 병합 (중복 제거)
        const newEntries = this.mergeEntries(allEntries, regexEntries)
        stats.regexExtracted = newEntries.length - allEntries.length
        allEntries = newEntries
        
        if (stats.regexExtracted > 0) {
          console.log(`✅ 정규식 추출: ${stats.regexExtracted}개 추가`)
        }
      }

      // 4. Vision API 추출 (이미지가 있고 텍스트 추출이 부족한 경우)
      if (useVision && images.length > 0 && allEntries.length < 50) {
        console.log('👁️ Vision API 추출 시도...')
        for (const image of images.slice(0, 5)) { // 처음 5개 이미지만
          try {
            const visionResult = await this.aiExtractor.extractFromImage(image)
            if (visionResult.success) {
              const newEntries = this.mergeEntries(allEntries, visionResult.entries)
              stats.visionExtracted += newEntries.length - allEntries.length
              allEntries = newEntries
            }
          } catch (error) {
            console.error('Vision 추출 실패:', error)
            stats.errors++
          }
        }
        
        if (stats.visionExtracted > 0) {
          console.log(`✅ Vision 추출: ${stats.visionExtracted}개 추가`)
        }
      }

      // 5. 후처리: 데이터 정제 및 보완
      allEntries = await this.postProcess(allEntries)
      
      // 최종 통계
      stats.totalExtracted = allEntries.length
      const duplicatesBeforeRemoval = allEntries.length
      allEntries = this.removeDuplicates(allEntries)
      stats.duplicatesRemoved = duplicatesBeforeRemoval - allEntries.length

      // 추출 방법 결정
      if (stats.aiExtracted > stats.regexExtracted && stats.aiExtracted > stats.visionExtracted) {
        method = 'AI'
      } else if (stats.regexExtracted > stats.visionExtracted) {
        method = 'REGEX'
      } else if (stats.visionExtracted > 0) {
        method = 'VISION'
      }

      // 신뢰도 계산
      confidence = this.calculateConfidence(allEntries, stats)

      console.log(`\n📊 추출 완료 통계:`)
      console.log(`- 총 추출: ${stats.totalExtracted}개`)
      console.log(`- AI 추출: ${stats.aiExtracted}개`)
      console.log(`- 정규식 추출: ${stats.regexExtracted}개`)
      console.log(`- Vision 추출: ${stats.visionExtracted}개`)
      console.log(`- 중복 제거: ${stats.duplicatesRemoved}개`)
      console.log(`- 신뢰도: ${(confidence * 100).toFixed(1)}%`)

    } catch (error) {
      console.error('하이브리드 추출 오류:', error)
      stats.errors++
    }

    return {
      entries: allEntries,
      method,
      confidence,
      stats
    }
  }

  /**
   * 항목 병합 (중복 제거 및 데이터 보완)
   */
  private mergeEntries(
    existing: VocabularyEntry[], 
    newEntries: VocabularyEntry[]
  ): VocabularyEntry[] {
    const merged = [...existing]
    const existingWords = new Set(existing.map(e => e.word.toLowerCase()))

    for (const entry of newEntries) {
      const wordKey = entry.word.toLowerCase()
      
      if (!existingWords.has(wordKey)) {
        merged.push(entry)
        existingWords.add(wordKey)
      } else {
        // 기존 항목 보완
        const existingEntry = merged.find(e => e.word.toLowerCase() === wordKey)
        if (existingEntry) {
          // 누락된 정보 보완
          if (!existingEntry.example && entry.example) {
            existingEntry.example = entry.example
          }
          if (!existingEntry.englishDefinition && entry.englishDefinition) {
            existingEntry.englishDefinition = entry.englishDefinition
          }
          if (!existingEntry.partOfSpeech && entry.partOfSpeech) {
            existingEntry.partOfSpeech = entry.partOfSpeech
          }
        }
      }
    }

    return merged
  }

  /**
   * 후처리: 데이터 정제 및 보완
   */
  private async postProcess(entries: VocabularyEntry[]): Promise<VocabularyEntry[]> {
    return entries.map(entry => {
      // 품사 정규화
      if (entry.partOfSpeech) {
        entry.partOfSpeech = this.normalizePartOfSpeech(entry.partOfSpeech)
      }

      // 단어 정규화
      entry.word = entry.word.toLowerCase().trim()

      // 정의가 없으면 영어 정의 사용
      if (!entry.definition && entry.englishDefinition) {
        entry.definition = entry.englishDefinition
      }

      // 예문에서 단어 하이라이트
      if (entry.example && entry.word) {
        const regex = new RegExp(`\\b${entry.word}\\b`, 'gi')
        if (regex.test(entry.example)) {
          // 예문에 단어가 포함되어 있음 - 유효한 예문
        } else {
          // 예문에 단어가 없으면 제거
          entry.example = ''
        }
      }

      return entry
    })
  }

  /**
   * 품사 정규화
   */
  private normalizePartOfSpeech(pos: string): string {
    const mapping: Record<string, string> = {
      'noun': 'n.',
      'verb': 'v.',
      'adjective': 'adj.',
      'adverb': 'adv.',
      'preposition': 'prep.',
      'conjunction': 'conj.',
      'pronoun': 'pron.',
      'interjection': 'int.',
      'n': 'n.',
      'v': 'v.',
      'adj': 'adj.',
      'adv': 'adv.',
      'prep': 'prep.',
      'conj': 'conj.',
      'pron': 'pron.',
      'int': 'int.'
    }

    const normalized = pos.toLowerCase().replace(/[.\s]/g, '')
    return mapping[normalized] || pos
  }

  /**
   * 중복 제거
   */
  private removeDuplicates(entries: VocabularyEntry[]): VocabularyEntry[] {
    const seen = new Map<string, VocabularyEntry>()
    
    for (const entry of entries) {
      const key = entry.word.toLowerCase()
      const existing = seen.get(key)
      
      if (!existing || this.isMoreComplete(entry, existing)) {
        seen.set(key, entry)
      }
    }

    return Array.from(seen.values())
  }

  /**
   * 더 완전한 항목인지 확인
   */
  private isMoreComplete(a: VocabularyEntry, b: VocabularyEntry): boolean {
    let scoreA = 0
    let scoreB = 0

    if (a.definition) scoreA += 2
    if (b.definition) scoreB += 2
    if (a.englishDefinition) scoreA += 1
    if (b.englishDefinition) scoreB += 1
    if (a.example) scoreA += 2
    if (b.example) scoreB += 2
    if (a.partOfSpeech) scoreA += 1
    if (b.partOfSpeech) scoreB += 1
    if (a.number) scoreA += 0.5
    if (b.number) scoreB += 0.5

    return scoreA > scoreB
  }

  /**
   * AI를 사용한 형식 감지
   */
  private async detectFormatWithAI(text: string): Promise<any> {
    try {
      // 처음 500자 또는 30줄만 샘플로 사용
      const lines = text.split('\n').filter(line => line.trim())
      const sample = lines.slice(0, 30).join('\n')
      
      const response = await fetch('/api/detect-pdf-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample })
      })
      
      if (!response.ok) {
        console.error('PDF 형식 감지 API 실패')
        return null
      }
      
      const result = await response.json()
      return result.pattern
    } catch (error) {
      console.error('AI 형식 감지 오류:', error)
      return null
    }
  }

  /**
   * 감지된 형식에 따라 추출
   */
  private async extractWithFormat(text: string, formatPattern: any): Promise<VocabularyEntry[]> {
    const entries: VocabularyEntry[] = []
    
    try {
      // 형식에 따라 다른 추출 로직 적용
      switch (formatPattern.name) {
        case 'SUNEUNG':
        case '수능 기출 형식':
          return this.regexExtractor.extractSuneungFormat(text)
          
        case 'VZIP':
        case 'V.ZIP 형식':
          return this.regexExtractor.extractWithFlexibleFormat(text).filter(entry => entry.word)
          
        case 'TOEFL':
        case 'TOEFL 형식':
          return this.regexExtractor.extractTOEFLFormat(text)
          
        default:
          // 일반적인 패턴 시도
          console.log(`알 수 없는 형식: ${formatPattern.name}, 일반 추출 시도`)
          return this.regexExtractor.extractWithFlexibleFormat(text)
      }
    } catch (error) {
      console.error('형식 기반 추출 오류:', error)
      return []
    }
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(entries: VocabularyEntry[], stats: ExtractionResult['stats']): number {
    if (entries.length === 0) return 0

    let confidence = 0.5 // 기본 신뢰도

    // AI 추출 비율에 따른 보너스
    const aiRatio = stats.aiExtracted / entries.length
    confidence += aiRatio * 0.3

    // 데이터 완전성에 따른 보너스
    const completeness = entries.reduce((sum, entry) => {
      let score = 0
      if (entry.definition) score += 0.4
      if (entry.partOfSpeech) score += 0.2
      if (entry.example) score += 0.2
      if (entry.englishDefinition) score += 0.2
      return sum + score
    }, 0) / entries.length

    confidence += completeness * 0.2

    // 오류율에 따른 패널티
    const errorRate = stats.errors / (stats.errors + entries.length)
    confidence -= errorRate * 0.2

    return Math.max(0, Math.min(1, confidence))
  }
}

export default HybridPDFExtractor