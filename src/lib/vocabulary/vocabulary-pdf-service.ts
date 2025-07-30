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
import { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import VocabularyPDFExtractor, { VocabularyEntry } from '../pdf/vocabulary-pdf-extractor'

export class VocabularyPDFService {
  private extractor: VocabularyPDFExtractor
  private readonly collectionName = 'extracted_vocabulary'

  constructor() {
    this.extractor = new VocabularyPDFExtractor()
  }

  /**
   * 단어장 PDF에서 추출한 텍스트를 처리하고 DB에 저장
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
          pronunciation: null, // Firestore는 undefined를 허용하지 않음
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
   * 난이도 추정
   */
  private estimateDifficulty(word: string): number {
    const length = word.length
    const hasUncommonPatterns = /[xyz]/.test(word)
    const syllables = word.match(/[aeiou]/gi)?.length || 0
    
    let difficulty = Math.min(length / 2, 5)
    if (hasUncommonPatterns) difficulty += 2
    if (syllables > 3) difficulty += 1
    
    return Math.min(Math.round(difficulty), 10)
  }
}

export default VocabularyPDFService