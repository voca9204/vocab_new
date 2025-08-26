import { db } from '../firebase/config'
import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  getDocs,
  addDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import { ExtractedVocabulary } from '../../types/extracted-vocabulary'
import HybridPDFExtractor from '../pdf/hybrid-pdf-extractor'

/**
 * 새로운 DB 구조를 사용하는 PDF 서비스
 * words, vocabulary_collections, user_words 컬렉션 사용
 */
export class VocabularyPDFServiceV2 {
  private hybridExtractor: HybridPDFExtractor

  constructor() {
    this.hybridExtractor = new HybridPDFExtractor()
  }

  /**
   * 한글 정의에서 혼재된 영어 단어들 제거 (개선된 버전)
   */
  private cleanKoreanDefinition(koreanText: string, currentWord: string): string {
    if (!koreanText) return ''
    
    // 영어 단어를 구분자로 사용하여 텍스트를 분할
    const suspiciousEnglishWords = koreanText.match(/\b[a-zA-Z]{4,}\b/g) || []
    
    // 현재 단어가 아닌 영어 단어들 찾기 (기본 영어 단어는 제외)
    const foreignWords = suspiciousEnglishWords.filter(word => 
      word.toLowerCase() !== currentWord.toLowerCase() &&
      !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were', 'said', 'each', 'which', 'their', 'time', 'word', 'look', 'like', 'into', 'such', 'more', 'very', 'what', 'know', 'just', 'first', 'over', 'after', 'back', 'other', 'many', 'than', 'then', 'them', 'these', 'some', 'come', 'could', 'only', 'long', 'make', 'when', 'also', 'find'].includes(word.toLowerCase())
    )
    
    if (foreignWords.length === 0) {
      return koreanText // 의심스러운 단어가 없으면 원본 반환
    }
    
    let cleanedText = koreanText
    
    // 각 의심스러운 영어 단어와 그 주변 텍스트를 제거
    for (const foreignWord of foreignWords) {
      console.log(`[VocabularyPDFServiceV2] Removing foreign word "${foreignWord}" from "${koreanText}"`)
      
      // 해당 영어 단어와 그 직후의 한글 정의 부분을 제거
      // 패턴: 영어단어 + 공백 + 한글정의
      const contextPattern = new RegExp(`\\s*\\b${foreignWord}\\b\\s*[가-힣][^a-zA-Z]*`, 'gi')
      cleanedText = cleanedText.replace(contextPattern, '')
      
      // 남은 영어 단어만 제거
      cleanedText = cleanedText.replace(new RegExp(`\\b${foreignWord}\\b`, 'gi'), '')
    }
    
    // 연속된 공백과 구두점 정리
    cleanedText = cleanedText
      .replace(/\s+/g, ' ')           // 연속 공백을 하나로
      .replace(/\s*,\s*/g, ', ')      // 쉼표 앞뒤 공백 정리
      .replace(/^\s*,\s*/, '')        // 시작부분 쉼표 제거
      .replace(/\s*,\s*$/, '')        // 끝부분 쉼표 제거
      .trim()
    
    // 결과가 너무 짧거나 한글이 없으면 원본 반환 (과도한 필터링 방지)
    if (cleanedText.length < 3 || !/[가-힣]/.test(cleanedText)) {
      console.log(`[VocabularyPDFServiceV2] Over-filtered, returning original: "${koreanText}"`)
      return koreanText
    }
    
    console.log(`[VocabularyPDFServiceV2] Cleaned: "${koreanText}" -> "${cleanedText}"`)
    return cleanedText
  }

  /**
   * PDF에서 단어만 추출 (저장하지 않음)
   */
  async extractWordsFromPDF(file: File, collectionType: 'SAT' | 'SUNEUNG' | 'TOEFL' | 'GENERAL' = 'GENERAL'): Promise<ExtractedVocabulary[]> {
    try {
      console.log('🔍 PDF에서 단어 추출 시작...')
      
      const result = await this.hybridExtractor.extract(file, {
        useAI: !!process.env.OPENAI_API_KEY,
        useVision: false,
        fallbackToRegex: true
      })

      console.log(`✅ 추출 완료: ${result.entries.length}개 단어`)
      console.log(`📊 추출 방법: ${result.method}, 신뢰도: ${(result.confidence * 100).toFixed(1)}%`)

      // ExtractedVocabulary 형식으로 변환
      const extractedWords = result.entries.map((entry, index) => ({
        number: index + 1,
        word: entry.word,
        definition: entry.definition,
        partOfSpeech: entry.partOfSpeech ? [entry.partOfSpeech] : [],
        examples: entry.examples || [],
        pronunciation: null,
        etymology: entry.etymology || null,
        difficulty: this.estimateDifficulty(entry.word),
        frequency: Math.floor(Math.random() * 10) + 1,
        source: {
          type: 'pdf' as const,
          filename: file.name,
          uploadedAt: new Date()
        },
        userId: '', // 나중에 저장할 때 설정
        createdAt: new Date(),
        updatedAt: new Date(),
        isSAT: collectionType === 'SAT', // SAT 단어장인 경우만 true
        studyStatus: {
          studied: false,
          masteryLevel: 0,
          reviewCount: 0
        }
      }))

      return extractedWords
    } catch (error) {
      console.error('❌ PDF 추출 오류:', error)
      throw error
    }
  }

  /**
   * words 컬렉션에서 중복 단어 확인
   */
  async checkExistingWords(words: string[]): Promise<string[]> {
    try {
      const existingWords: string[] = []
      
      // 빈 단어 필터링
      const validWords = words.filter(word => word && word.trim() !== '')
      
      // 배치로 조회 (한 번에 10개씩)
      const batchSize = 10
      for (let i = 0; i < validWords.length; i += batchSize) {
        const batch = validWords.slice(i, i + batchSize).map(w => w.toLowerCase())
        const q = query(
          collection(db, 'words'),
          where('word', 'in', batch)
        )
        
        const snapshot = await getDocs(q)
        snapshot.forEach(doc => {
          existingWords.push(doc.data().word)
        })
      }
      
      console.log(`🔍 중복 확인 완료: ${existingWords.length}개 단어가 이미 존재`)
      return existingWords
    } catch (error) {
      console.error('중복 확인 오류:', error)
      return []
    }
  }

  /**
   * 기존 단어들의 정보를 DB에서 가져오기
   */
  async getExistingWordDetails(words: string[]): Promise<ExtractedVocabulary[]> {
    try {
      const wordDetails: ExtractedVocabulary[] = []
      
      // 빈 단어 필터링
      const validWords = words.filter(word => word && word.trim() !== '')
      
      // 배치로 조회 (한 번에 10개씩)
      const batchSize = 10
      for (let i = 0; i < validWords.length; i += batchSize) {
        const batch = validWords.slice(i, i + batchSize).map(w => w.toLowerCase())
        const q = query(
          collection(db, 'words'),
          where('word', 'in', batch)
        )
        
        const snapshot = await getDocs(q)
        snapshot.forEach(doc => {
          const data = doc.data()
          
          // 첫 번째 정의 가져오기
          const firstDefinition = data.definitions?.[0] || {}
          
          wordDetails.push({
            number: wordDetails.length + 1,
            word: data.word,
            definition: firstDefinition.definition || '정의 없음',
            partOfSpeech: data.partOfSpeech || ['n.'],
            examples: firstDefinition.examples || [],
            pronunciation: data.pronunciation || null,
            etymology: data.etymology?.origin || null,
            difficulty: data.difficulty || 5,
            frequency: data.frequency || 5,
            source: {
              type: 'database' as any,  // 기존 DB 단어임을 표시
              filename: 'existing',
              uploadedAt: new Date()
            },
            userId: '',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            isSAT: data.isSAT || false,
            studyStatus: {
              studied: false,
              masteryLevel: 0,
              reviewCount: 0
            }
          })
        })
      }
      
      console.log(`📚 기존 단어 정보 ${wordDetails.length}개 로드 완료`)
      return wordDetails
    } catch (error) {
      console.error('기존 단어 정보 가져오기 오류:', error)
      return []
    }
  }

  /**
   * 사용자의 개인 단어장 가져오기 (없으면 생성)
   */
  private async getUserVocabularyCollection(
    userId: string, 
    isAdmin: boolean = false,
    collectionType: 'SAT' | 'SUNEUNG' | 'TOEFL' | 'GENERAL' = 'GENERAL'
  ): Promise<string> {
    try {
      // 관리자가 올리는 경우 공식 단어장 사용
      if (isAdmin) {
        const collectionNames = {
          'SAT': 'SAT 공식 단어장',
          'SUNEUNG': '수능 공식 단어장',
          'TOEFL': 'TOEFL 공식 단어장',
          'GENERAL': '일반 공식 단어장'
        }
        
        const collectionName = collectionNames[collectionType]
        
        const q = query(
          collection(db, 'vocabulary_collections'),
          where('type', '==', 'official'),
          where('name', '==', collectionName)
        )
        
        const snapshot = await getDocs(q)
        
        if (!snapshot.empty) {
          return snapshot.docs[0].id
        }
        
        // 공식 단어장이 없으면 생성
        const newCollection = await addDoc(collection(db, 'vocabulary_collections'), {
          name: collectionName,
          description: `관리자가 추가한 공식 ${collectionType} 단어들`,
          type: 'official',
          vocabularyType: collectionType,
          userId: 'admin',
          words: [],
          isPrivate: false, // 공개
          isOfficial: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        
        console.log(`✅ 새 공식 단어장 생성: ${collectionName}`, newCollection.id)
        return newCollection.id
      }
      
      // 일반 사용자의 "내가 추가한 단어" 컬렉션 찾기
      const q = query(
        collection(db, 'vocabulary_collections'),
        where('userId', '==', userId),
        where('type', '==', 'user_added')
      )
      
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        return snapshot.docs[0].id
      }
      
      // 없으면 생성
      const newCollection = await addDoc(collection(db, 'vocabulary_collections'), {
        name: '내가 추가한 단어',
        description: 'PDF에서 추출하거나 직접 추가한 단어들',
        type: 'user_added',
        userId: userId,
        words: [],
        isPrivate: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      console.log('✅ 새 개인 단어장 생성:', newCollection.id)
      return newCollection.id
      
    } catch (error) {
      console.error('단어장 가져오기 오류:', error)
      throw error
    }
  }

  /**
   * 선택된 단어들을 새 DB 구조에 저장
   * 개선: 중복 단어도 단어장에 포함 (참조 방식)
   */
  async saveSelectedWords(
    words: ExtractedVocabulary[], 
    userId: string, 
    isAdminUpload: boolean = false,
    collectionType: 'SAT' | 'SUNEUNG' | 'TOEFL' | 'GENERAL' = 'GENERAL'
  ): Promise<{saved: number, skipped: number, failed: number, linked: number}> {
    const result = {
      saved: 0,      // 새로 생성된 단어
      linked: 0,     // 기존 단어 연결
      skipped: 0,    // 이미 단어장에 있는 단어
      failed: 0      // 처리 실패
    }

    // 사용자의 개인 단어장 ID 가져오기 (관리자는 공식 단어장 사용)
    const collectionId = await this.getUserVocabularyCollection(userId, isAdminUpload, collectionType)
    const savedWordIds: string[] = []

    for (const word of words) {
      try {
        // 단어 유효성 검사
        if (!word.word || word.word.trim() === '') {
          console.warn(`유효하지 않은 단어 건너뜀:`, word)
          result.failed++
          continue
        }
        
        // words 컬렉션에 단어가 이미 있는지 확인
        const wordQuery = query(
          collection(db, 'words'),
          where('word', '==', word.word.toLowerCase())
        )
        const wordSnapshot = await getDocs(wordQuery)
        
        let wordId: string
        
        if (!wordSnapshot.empty) {
          // 이미 존재하는 단어 - 단어장에 연결만 함
          wordId = wordSnapshot.docs[0].id
          console.log(`기존 단어 연결: ${word.word} (${wordId})`)
          
          // 사용자 단어장에 이미 있는지 확인
          const collectionDoc = await getDocs(
            query(
              collection(db, 'vocabulary_collections'),
              where('__name__', '==', collectionId)
            )
          )
          
          if (collectionDoc.docs[0]?.data().words?.includes(wordId)) {
            result.skipped++
            continue
          }
          
          // 기존 단어를 단어장에 추가 (연결)
          result.linked++
        } else {
          // 새 단어 추가
          const wordData = {
            word: word.word.toLowerCase(),
            definitions: [{
              id: `def_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              definition: this.cleanKoreanDefinition(word.definition, word.word),
              examples: word.examples || [],
              source: 'pdf' as const,
              language: 'ko' as const,  // 한글 정의
              partOfSpeech: word.partOfSpeech[0] || 'n.',
              createdAt: new Date()
            }],
            partOfSpeech: word.partOfSpeech,
            pronunciation: word.pronunciation,
            synonyms: word.synonyms || [],        // ✅ 추가
            antonyms: word.antonyms || [],        // ✅ 추가
            englishDefinition: word.englishDefinition,  // ✅ 영어 정의 추가
            etymology: word.etymology ? {
              origin: word.etymology,
              history: []
            } : null,
            examples: word.examples,
            difficulty: word.difficulty,
            frequency: word.frequency,
            source: {
              type: 'pdf',
              origin: word.source.filename,
              addedBy: userId,
              addedAt: serverTimestamp(),
              verified: isAdminUpload // 관리자가 올린 것은 검증됨으로 표시
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }
          
          const newWordDoc = await addDoc(collection(db, 'words'), wordData)
          wordId = newWordDoc.id
          console.log(`새 단어 추가: ${word.word} (${wordId})`)
          result.saved++
        }
        
        // 단어장에 단어 ID 추가
        savedWordIds.push(wordId)
        
        // user_words에 학습 상태 추가
        const userWordId = `${userId}_${wordId}`
        await setDoc(doc(db, 'user_words', userWordId), {
          userId: userId,
          wordId: wordId,
          studyStatus: {
            studied: false,
            masteryLevel: 0,
            reviewCount: 0,
            lastReviewedAt: null
          },
          addedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      } catch (error) {
        console.error(`단어 저장 실패: ${word.word}`, error)
        result.failed++
      }
    }
    
    // 단어장에 단어 ID들 추가 (배치 업데이트)
    if (savedWordIds.length > 0) {
      try {
        await updateDoc(doc(db, 'vocabulary_collections', collectionId), {
          words: arrayUnion(...savedWordIds),
          updatedAt: serverTimestamp()
        })
        console.log(`✅ 단어장에 ${savedWordIds.length}개 단어 추가 완료`)
        
        // 사용자 설정 업데이트 - 새로 생성된 단어장을 자동으로 선택된 상태로 추가
        try {
          // 단어장 정보 가져오기
          const collectionDoc = await getDocs(
            query(
              collection(db, 'vocabulary_collections'),
              where('__name__', '==', collectionId)
            )
          )
          
          if (!collectionDoc.empty) {
            const collectionData = collectionDoc.docs[0].data()
            const collectionName = collectionData.name
            
            // 사용자 설정 업데이트 (공식 단어장인 경우 모든 사용자, 개인 단어장인 경우 본인만)
            if (isAdminUpload) {
              // 관리자가 올린 공식 단어장은 자동으로 모든 사용자에게 표시
              console.log(`📢 공식 단어장 "${collectionName}" 생성 - 모든 사용자에게 자동 표시됨`)
              // 참고: 공식 단어장은 사용자가 빈 배열 설정일 때 자동으로 포함됨
            } else {
              // 개인 단어장은 해당 사용자의 selectedVocabularies에 추가
              const { UserSettingsService } = await import('@/lib/settings/user-settings-service')
              const settingsService = new UserSettingsService()
              const userSettings = await settingsService.getUserSettings(userId)
              
              if (userSettings) {
                const currentSelected = userSettings.selectedVocabularies || []
                
                // 이미 선택되어 있지 않으면 추가
                if (!currentSelected.includes(collectionName)) {
                  const updatedSelected = [...currentSelected, collectionName]
                  await settingsService.updateSelectedVocabularies(userId, updatedSelected)
                  console.log(`✅ 사용자 설정에 "${collectionName}" 단어장 자동 추가`)
                }
              }
            }
          }
        } catch (settingsError) {
          console.error('사용자 설정 업데이트 오류:', settingsError)
          // 설정 업데이트 실패해도 단어 저장은 성공으로 처리
        }
      } catch (error) {
        console.error('단어장 업데이트 오류:', error)
      }
    }

    console.log(`💾 저장 완료: 새 단어 ${result.saved}, 연결 ${result.linked}, 중복 ${result.skipped}, 실패 ${result.failed}`)
    return result
  }

  /**
   * 난이도 추정
   */
  private estimateDifficulty(word: string): number {
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
}

export default VocabularyPDFServiceV2