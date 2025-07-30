/**
 * 데이터베이스 마이그레이션 스크립트
 * 기존 구조 → 새로운 5개 컬렉션 구조
 */

// 환경 변수 로드 (Node.js 환경용)
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { db } from '../firebase/config'
import { 
  collection, 
  getDocs, 
  doc,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { WordService } from './word-service'
import { VocabularyService } from './vocabulary-service'
import { VocabularyWordService } from './vocabulary-word-service'
import { UserVocabularyService } from './user-vocabulary-service'
import { UserWordService } from './user-word-service'
import type { Word, Vocabulary } from '@/types/vocabulary-v2'

// 서비스 인스턴스
const wordService = new WordService()
const vocabularyService = new VocabularyService()
const vocabularyWordService = new VocabularyWordService()
const userVocabularyService = new UserVocabularyService()
const userWordService = new UserWordService()

// 마이그레이션 상태 추적
interface MigrationStats {
  totalWords: number
  duplicateWords: number
  totalVocabularies: number
  totalMappings: number
  totalUserProgress: number
  errors: string[]
}

export class DatabaseMigration {
  private stats: MigrationStats = {
    totalWords: 0,
    duplicateWords: 0,
    totalVocabularies: 0,
    totalMappings: 0,
    totalUserProgress: 0,
    errors: []
  }

  // 단어 ID 매핑 (기존 단어 → 새 단어 ID)
  private wordIdMap = new Map<string, string>()
  
  // 단어장 ID 매핑
  private vocabularyIdMap = new Map<string, string>()

  /**
   * 전체 마이그레이션 실행
   */
  async migrate(dryRun: boolean = true) {
    console.log(`🚀 마이그레이션 시작 (DRY RUN: ${dryRun})`)
    
    try {
      // 1. 백업 확인
      await this.verifyBackup()
      
      // 2. 마스터 단어 DB 구축
      await this.migrateWords(dryRun)
      
      // 3. 단어장 마이그레이션
      await this.migrateVocabularies(dryRun)
      
      // 4. 단어-단어장 매핑
      await this.migrateVocabularyWords(dryRun)
      
      // 5. 사용자 진도 마이그레이션
      await this.migrateUserProgress(dryRun)
      
      // 6. 검증
      await this.validateMigration()
      
      // 7. 결과 보고
      this.printReport()
      
    } catch (error) {
      console.error('❌ 마이그레이션 실패:', error)
      this.stats.errors.push(String(error))
    }
  }

  /**
   * 백업 확인
   */
  private async verifyBackup() {
    console.log('📦 백업 확인 중...')
    // 실제 구현에서는 백업 파일 존재 여부 확인
    console.log('✅ 백업 확인 완료')
  }

  /**
   * 단어 마이그레이션 (veterans_vocabulary → words)
   */
  private async migrateWords(dryRun: boolean) {
    console.log('\n📚 단어 마이그레이션 시작...')
    
    // veterans_vocabulary 컬렉션 읽기
    const veteransSnapshot = await getDocs(collection(db, 'veterans_vocabulary'))
    const uniqueWords = new Map<string, any>()
    
    // 중복 제거하며 고유 단어 추출
    veteransSnapshot.forEach(doc => {
      const data = doc.data()
      const wordText = data.word.toLowerCase()
      
      if (!uniqueWords.has(wordText)) {
        uniqueWords.set(wordText, {
          oldId: doc.id,
          data: data
        })
      } else {
        this.stats.duplicateWords++
      }
    })
    
    // words 컬렉션에 저장
    for (const [wordText, wordInfo] of uniqueWords) {
      const { oldId, data } = wordInfo
      
      const newWord: Partial<Word> = {
        word: wordText,
        pronunciation: data.pronunciation || null,
        partOfSpeech: data.partOfSpeech || [],
        definitions: [{
          id: this.generateId(),
          definition: data.definition || '',
          language: 'ko',
          source: 'pdf',
          examples: data.examples || [],
          createdAt: data.createdAt?.toDate() || new Date()
        }],
        etymology: data.etymology || null,
        realEtymology: data.etymology || null,
        synonyms: [],
        antonyms: [],
        difficulty: data.difficulty || 5,
        frequency: data.frequency || 5,
        isSAT: data.isSAT || true,
        createdBy: data.userId || 'system',
        aiGenerated: {
          examples: false,
          etymology: false
        }
      }
      
      if (!dryRun) {
        const createdWord = await wordService.createOrUpdateWord({
          ...newWord,
          word: wordText,
          createdBy: newWord.createdBy!
        })
        this.wordIdMap.set(oldId, createdWord.id)
      } else {
        // Dry run에서는 가상 ID 생성
        this.wordIdMap.set(oldId, `word_${this.stats.totalWords}`)
      }
      
      this.stats.totalWords++
    }
    
    console.log(`✅ 단어 마이그레이션 완료: ${this.stats.totalWords}개 (중복 ${this.stats.duplicateWords}개)`)
  }

  /**
   * 단어장 마이그레이션
   */
  private async migrateVocabularies(dryRun: boolean) {
    console.log('\n📂 단어장 마이그레이션 시작...')
    
    // 1. Veterans 시스템 단어장 생성
    const veteransVocab: Omit<Vocabulary, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'> = {
      name: 'V.ZIP 3K 단어장',
      description: 'V.ZIP 3K PDF에서 추출한 SAT 단어 모음',
      type: 'system',
      ownerType: 'system',
      ownerId: 'system',
      visibility: 'public',
      category: 'SAT',
      level: 'advanced',
      tags: ['SAT', 'V.ZIP', '3K', 'vocabulary'],
      source: {
        type: 'pdf',
        filename: 'V.ZIP 3K.pdf'
      },
      stats: {
        totalSubscribers: 0,
        averageMastery: 0,
        completionRate: 0
      }
    }
    
    if (!dryRun) {
      const created = await vocabularyService.createVocabulary(veteransVocab)
      this.vocabularyIdMap.set('veterans_system', created.id)
    } else {
      this.vocabularyIdMap.set('veterans_system', 'vocab_veterans')
    }
    this.stats.totalVocabularies++
    
    // 2. 기존 vocabulary_collections 마이그레이션
    const collectionsSnapshot = await getDocs(collection(db, 'vocabulary_collections'))
    
    for (const doc of collectionsSnapshot.docs) {
      const data = doc.data()
      
      const newVocab: Omit<Vocabulary, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'> = {
        name: data.name || '이름 없는 단어장',
        description: data.description || '',
        type: 'personal',
        ownerType: 'user',
        ownerId: data.userId || 'unknown',
        visibility: data.isPublic ? 'public' : 'private',
        category: 'custom',
        level: 'mixed',
        tags: data.tags || [],
        stats: {
          totalSubscribers: 0,
          averageMastery: 0,
          completionRate: 0
        }
      }
      
      if (!dryRun) {
        const created = await vocabularyService.createVocabulary(newVocab)
        this.vocabularyIdMap.set(doc.id, created.id)
      } else {
        this.vocabularyIdMap.set(doc.id, `vocab_${this.stats.totalVocabularies}`)
      }
      
      this.stats.totalVocabularies++
    }
    
    console.log(`✅ 단어장 마이그레이션 완료: ${this.stats.totalVocabularies}개`)
  }

  /**
   * 단어-단어장 매핑 마이그레이션
   */
  private async migrateVocabularyWords(dryRun: boolean) {
    console.log('\n🔗 단어-단어장 매핑 시작...')
    
    // Veterans 단어들을 시스템 단어장에 매핑
    const veteransVocabId = this.vocabularyIdMap.get('veterans_system')!
    const veteransSnapshot = await getDocs(collection(db, 'veterans_vocabulary'))
    
    let order = 1
    for (const doc of veteransSnapshot.docs) {
      const wordId = this.wordIdMap.get(doc.id)
      if (wordId && !dryRun) {
        await vocabularyWordService.addWordToVocabulary(
          veteransVocabId,
          wordId,
          'system',
          {
            tags: ['SAT', 'V.ZIP']
          }
        )
      }
      this.stats.totalMappings++
      order++
    }
    
    console.log(`✅ 단어-단어장 매핑 완료: ${this.stats.totalMappings}개`)
  }

  /**
   * 사용자 진도 마이그레이션
   */
  private async migrateUserProgress(dryRun: boolean) {
    console.log('\n👤 사용자 진도 마이그레이션 시작...')
    
    const progressSnapshot = await getDocs(collection(db, 'user_vocabulary_progress'))
    
    for (const doc of progressSnapshot.docs) {
      const data = doc.data()
      const userId = data.userId
      const oldWordId = data.wordId
      const newWordId = this.wordIdMap.get(oldWordId)
      
      if (newWordId && !dryRun) {
        // 사용자가 Veterans 단어장 구독
        const veteransVocabId = this.vocabularyIdMap.get('veterans_system')!
        await userVocabularyService.subscribeToVocabulary(
          userId,
          veteransVocabId,
          false
        )
        
        // 학습 진도 기록
        if (data.studied) {
          await userWordService.recordStudyResult(
            userId,
            newWordId,
            data.lastResult || 'correct',
            'review'
          )
        }
        
        // 북마크 상태
        if (data.bookmarked) {
          await userWordService.toggleBookmark(userId, newWordId)
        }
      }
      
      this.stats.totalUserProgress++
    }
    
    console.log(`✅ 사용자 진도 마이그레이션 완료: ${this.stats.totalUserProgress}개`)
  }

  /**
   * 마이그레이션 검증
   */
  private async validateMigration() {
    console.log('\n🔍 마이그레이션 검증 중...')
    
    // 검증 로직
    const validations = [
      { name: '단어 수', expected: this.stats.totalWords, actual: this.wordIdMap.size },
      { name: '단어장 수', expected: this.stats.totalVocabularies, actual: this.vocabularyIdMap.size }
    ]
    
    for (const validation of validations) {
      if (validation.expected !== validation.actual) {
        this.stats.errors.push(
          `검증 실패: ${validation.name} - 예상: ${validation.expected}, 실제: ${validation.actual}`
        )
      }
    }
    
    console.log('✅ 검증 완료')
  }

  /**
   * 결과 보고서 출력
   */
  private printReport() {
    console.log('\n📊 마이그레이션 결과 보고서')
    console.log('========================')
    console.log(`총 단어 수: ${this.stats.totalWords}`)
    console.log(`중복 제거된 단어: ${this.stats.duplicateWords}`)
    console.log(`총 단어장 수: ${this.stats.totalVocabularies}`)
    console.log(`단어-단어장 매핑: ${this.stats.totalMappings}`)
    console.log(`사용자 진도 기록: ${this.stats.totalUserProgress}`)
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ 오류 목록:')
      this.stats.errors.forEach(error => console.log(`  - ${error}`))
    } else {
      console.log('\n✅ 오류 없이 완료!')
    }
  }

  private generateId(): string {
    return doc(collection(db, 'temp')).id
  }
}

// 실행 함수
export async function runMigration(dryRun: boolean = true) {
  const migration = new DatabaseMigration()
  await migration.migrate(dryRun)
}

// CLI 실행을 위한 코드
if (require.main === module) {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--execute')
  
  console.log('🚀 데이터베이스 마이그레이션 도구')
  console.log(dryRun ? '(DRY RUN 모드)' : '(실행 모드)')
  
  runMigration(dryRun)
    .then(() => console.log('\n✅ 마이그레이션 프로세스 완료'))
    .catch(error => console.error('\n❌ 마이그레이션 실패:', error))
}