import { db } from '../firebase/config'
import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore'
import { ExtractedVocabulary } from '../../types/extracted-vocabulary'
import VocabularyPDFExtractor, { VocabularyEntry } from '../pdf/vocabulary-pdf-extractor'
import HybridPDFExtractor from '../pdf/hybrid-pdf-extractor'

/**
 * @deprecated 이 서비스는 구 DB 구조를 사용합니다. 
 * 새로운 PDF 업로드 기능 구현 시 새 DB 구조(words, vocabularies)를 사용하도록 수정 필요
 */
export class VocabularyPDFService {
  private extractor: VocabularyPDFExtractor
  private hybridExtractor: HybridPDFExtractor
  private readonly collectionName = 'extracted_vocabulary' // TODO: 새 구조로 마이그레이션 필요

  constructor() {
    this.extractor = new VocabularyPDFExtractor()
    this.hybridExtractor = new HybridPDFExtractor()
  }

  /**
   * 하이브리드 방식으로 PDF 처리 (AI + 정규식)
   */
  async processVocabularyPDFHybrid(
    file: File,
    userId: string,
    isAdminUpload: boolean = false
  ): Promise<ExtractedVocabulary[]> {
    try {
      console.log('🚀 하이브리드 PDF 추출 시작...')
      
      // 하이브리드 추출
      const result = await this.hybridExtractor.extract(file, {
        useAI: !!process.env.OPENAI_API_KEY,
        useVision: false, // 이미지 기반 추출은 필요시 활성화
        fallbackToRegex: true
      })

      console.log(`✅ 추출 완료: ${result.entries.length}개 단어`)
      console.log(`📊 추출 방법: ${result.method}, 신뢰도: ${(result.confidence * 100).toFixed(1)}%`)

      // ExtractedVocabulary 형식으로 변환 및 DB 저장
      const processedWords: ExtractedVocabulary[] = []
      
      for (const entry of result.entries) {
        const vocabulary = await this.convertToExtractedVocabulary(
          entry,
          userId,
          file.name,
          isAdminUpload
        )
        
        // 중복 확인
        const exists = await this.checkExistingWord(vocabulary.word, userId, isAdminUpload)
        if (!exists) {
          const savedWord = await this.saveWord(vocabulary)
          processedWords.push(savedWord)
        }
      }

      console.log(`💾 DB 저장 완료: ${processedWords.length}개`)
      return processedWords

    } catch (error) {
      console.error('하이브리드 PDF 처리 오류:', error)
      throw error
    }
  }

  /**
   * 단어장 PDF에서 추출한 텍스트를 처리하고 DB에 저장 (기존 방식)
   * 관리자가 업로드하는 경우 isAdminUpload를 true로 설정
   */
  async processVocabularyPDF(
    pdfText: string,
    userId: string,
    source: { filename: string },
    isAdminUpload: boolean = false
  ): Promise<ExtractedVocabulary[]> {
    // 디버깅: PDF 텍스트 내용 확인
    console.log('=== PDF 텍스트 내용 (처음 500자) ===')
    console.log(pdfText.substring(0, 500))
    console.log('=== PDF 텍스트 길이:', pdfText.length, '===')
    
    // PDF 텍스트에서 단어장 항목 추출
    const entries = this.extractor.extractWithFlexibleFormat(pdfText)
    console.log(`추출된 단어 수: ${entries.length}`)
    
    const processedWords: ExtractedVocabulary[] = []
    let skippedCount = 0
    let errorCount = 0
    const skippedWords: string[] = []
    const errorWords: string[] = []
    
    console.log(`처리 시작: 총 ${entries.length}개의 단어`)
    
    for (let idx = 0; idx < entries.length; idx++) {
      const entry = entries[idx]
      
      if ((idx + 1) % 500 === 0) {
        console.log(`진행 상황: ${idx + 1}/${entries.length} 처리 중...`)
      }
      try {
        // 이미 존재하는 단어인지 확인
        const existing = await this.checkExistingWord(entry.word, userId, isAdminUpload)
        if (existing) {
          skippedCount++
          skippedWords.push(entry.word)
          if (skippedCount <= 10) {
            console.log(`중복 단어: "${entry.word}"`)
          }
          continue
        }

        // ExtractedVocabulary 형식으로 변환
        const vocabulary: ExtractedVocabulary = {
          number: entry.number ? parseInt(entry.number) : undefined, // 번호 추가
          word: entry.word,
          definition: entry.definition,
          partOfSpeech: entry.partOfSpeech ? [entry.partOfSpeech] : ['n.'],
          examples: entry.example ? [entry.example] : [],
          pronunciation: undefined,
          etymology: entry.englishDefinition, // 영어 정의를 etymology 필드에 저장
          synonyms: [],
          antonyms: [],
          difficulty: this.estimateDifficulty(entry.word),
          frequency: Math.floor(Math.random() * 10) + 1,
          source: {
            type: 'pdf' as const,
            filename: source.filename,
            uploadedAt: new Date()
          },
          userId: isAdminUpload ? 'admin' : userId,
          uploadedBy: isAdminUpload ? userId : undefined, // 관리자가 업로드한 경우 실제 업로더 ID 저장
          isAdminContent: isAdminUpload,
          createdAt: new Date(),
          updatedAt: new Date(),
          isSAT: this.extractor.isSATWord(entry.word),
          studyStatus: {
            studied: false,
            masteryLevel: 0,
            reviewCount: 0
          }
        }
        
        // 처음 10개만 로그 출력
        if (processedWords.length < 10) {
          console.log(`저장 성공: ${entry.number || 'N/A'}. ${entry.word} (${entry.partOfSpeech})`)
        }

        // Firestore에 저장
        const savedWord = await this.saveWord(vocabulary)
        processedWords.push(savedWord)
        
      } catch (error) {
        errorCount++
        errorWords.push(entry.word)
        if (errorCount <= 10) {
          console.error(`오류 발생 단어: "${entry.word}"`, error)
        }
      }
    }

    console.log(`\n=== 최종 처리 결과 ===`)
    console.log(`총 추출된 단어: ${entries.length}개`)
    console.log(`성공적으로 저장된 단어: ${processedWords.length}개`)
    console.log(`중복으로 건너뛴 단어: ${skippedCount}개`)
    console.log(`오류로 실패한 단어: ${errorCount}개`)
    
    // 계산 검증
    const totalProcessed = processedWords.length + skippedCount + errorCount
    console.log(`\n검증: ${processedWords.length} + ${skippedCount} + ${errorCount} = ${totalProcessed}`)
    if (totalProcessed !== entries.length) {
      console.warn(`⚠️  숫자가 맞지 않습니다! 차이: ${entries.length - totalProcessed}개`)
    }
    
    if (skippedCount > 0) {
      console.log(`\n중복 단어 샘플 (최대 20개):`)
      console.log(skippedWords.slice(0, 20).join(', '))
    }
    
    if (errorCount > 0) {
      console.log(`\n오류 단어 샘플 (최대 20개):`)
      console.log(errorWords.slice(0, 20).join(', '))
    }
    
    console.log(`================`)
    return processedWords
  }

  /**
   * 단어가 이미 존재하는지 확인
   */
  private async checkExistingWord(word: string, userId: string, isAdminUpload: boolean = false): Promise<boolean> {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', isAdminUpload ? 'admin' : userId),
      where('word', '==', word.toLowerCase())
    )
    
    const snapshot = await getDocs(q)
    return !snapshot.empty
  }

  /**
   * 단어 저장
   */
  private async saveWord(vocabulary: ExtractedVocabulary): Promise<ExtractedVocabulary> {
    const docRef = doc(collection(db, this.collectionName))
    const wordData = {
      ...vocabulary,
      id: docRef.id,
      createdAt: Timestamp.fromDate(vocabulary.createdAt),
      updatedAt: Timestamp.fromDate(vocabulary.updatedAt),
      source: {
        ...vocabulary.source,
        uploadedAt: Timestamp.fromDate(vocabulary.source.uploadedAt)
      }
    }
    
    await setDoc(docRef, wordData)
    return { ...vocabulary, id: docRef.id }
  }

  /**
   * 난이도 추정 (학술적 방법론 기반)
   */
  private estimateDifficulty(word: string): number {
    // 단어 길이와 일반성을 기반으로 난이도 추정
    const length = word.length
    let difficulty = Math.min(10, Math.floor(length / 2))
    
    // 일반적인 단어는 난이도 감소
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with']
    if (commonWords.includes(word.toLowerCase())) {
      difficulty = 1
    }
    
    // 학술 접두사/접미사가 있으면 난이도 증가
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

  /**
   * 테스트 모드로 PDF 추출 (DB에 저장하지 않고 첫 1-2페이지만 처리)
   */
  async extractVocabularyFromPDFTest(
    file: File,
    options: { maxPages?: number; userId?: string } = {}
  ): Promise<ExtractedVocabulary[]> {
    const { maxPages = 2, userId = 'test-user' } = options
    
    try {
      console.log(`🧪 테스트 모드: PDF에서 첫 ${maxPages}페이지만 추출...`)
      
      // 하이브리드 추출 사용하되 페이지 제한
      const result = await this.hybridExtractor.extract(file, {
        useAI: !!process.env.OPENAI_API_KEY,
        useVision: false,
        fallbackToRegex: true,
        maxPages // 페이지 제한 전달
      })

      console.log(`✅ 테스트 추출 완료: ${result.entries.length}개 단어`)
      console.log(`📊 추출 방법: ${result.method}, 신뢰도: ${(result.confidence * 100).toFixed(1)}%`)

      // ExtractedVocabulary 형식으로 변환 (DB에 저장하지 않음)
      const processedWords: ExtractedVocabulary[] = []
      
      for (const entry of result.entries) {
        const vocabulary = await this.convertToExtractedVocabulary(
          entry,
          userId,
          file.name,
          false // 테스트 모드는 일반 사용자로 처리
        )
        
        processedWords.push(vocabulary)
      }

      console.log(`🔍 테스트 모드 완료: ${processedWords.length}개 단어 변환됨`)
      return processedWords

    } catch (error) {
      console.error('테스트 모드 PDF 처리 오류:', error)
      throw error
    }
  }

  /**
   * VocabularyEntry를 ExtractedVocabulary로 변환
   */
  private async convertToExtractedVocabulary(
    entry: VocabularyEntry,
    userId: string,
    filename: string,
    isAdminUpload: boolean
  ): Promise<ExtractedVocabulary> {
    return {
      number: entry.number ? parseInt(entry.number) : undefined,
      word: entry.word,
      definition: entry.definition,
      partOfSpeech: entry.partOfSpeech ? [entry.partOfSpeech] : ['n.'],
      examples: entry.example ? [entry.example] : [],
      pronunciation: undefined,
      etymology: entry.englishDefinition,
      synonyms: [],
      antonyms: [],
      difficulty: this.estimateDifficulty(entry.word),
      frequency: Math.floor(Math.random() * 10) + 1,
      source: {
        type: 'pdf' as const,
        filename: filename,
        uploadedAt: new Date()
      },
      userId: isAdminUpload ? 'admin' : userId,
      uploadedBy: isAdminUpload ? userId : undefined,
      isAdminContent: isAdminUpload,
      createdAt: new Date(),
      updatedAt: new Date(),
      isSAT: this.extractor.isSATWord(entry.word),
      studyStatus: {
        studied: false,
        masteryLevel: 0,
        reviewCount: 0
      }
    }
  }
}

export default VocabularyPDFService