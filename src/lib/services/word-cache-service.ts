/**
 * Word Cache Service
 * AI 호출 비용 절감을 위한 단어 캐싱 서비스
 */

import { db } from '@/lib/firebase/config'
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore'

export interface CachedWord {
  word: string
  definition?: string
  korean?: string
  pronunciation?: string
  etymology?: string
  example?: string
  partOfSpeech?: string[]
  synonyms?: string[]
  source: {
    type: 'master' | 'ai_generated' | 'personal' | 'cached'
    originalSource?: string
    userId?: string
    generatedAt?: Date
  }
  createdAt: Date
  updatedAt: Date
  aiGenerated?: boolean
}

class WordCacheService {
  private readonly COLLECTIONS = {
    MASTER: 'words',
    AI_CACHE: 'ai_generated_words', 
    PERSONAL: 'personal_collection_words'
  }

  /**
   * 단어 검색 (캐시 우선순위 적용)
   * 1. 마스터 DB 확인
   * 2. AI 캐시 확인
   * 3. 개인 컬렉션 확인
   * 4. 없으면 null 반환 (AI 호출 필요)
   */
  async findWord(word: string, userId?: string): Promise<CachedWord | null> {
    const normalizedWord = word.toLowerCase().trim()
    
    // 1. 마스터 DB 확인
    const masterWord = await this.findInMaster(normalizedWord)
    if (masterWord) {
      console.log(`✅ [WordCache] 마스터 DB에서 찾음: ${normalizedWord}`)
      return masterWord
    }

    // 2. AI 캐시 확인
    const aiCachedWord = await this.findInAICache(normalizedWord)
    if (aiCachedWord) {
      console.log(`✅ [WordCache] AI 캐시에서 찾음: ${normalizedWord}`)
      return aiCachedWord
    }

    // 3. 개인 컬렉션 확인 (userId 필요)
    if (userId) {
      const personalWord = await this.findInPersonal(normalizedWord, userId)
      if (personalWord) {
        console.log(`✅ [WordCache] 개인 컬렉션에서 찾음: ${normalizedWord}`)
        return personalWord
      }
    }

    console.log(`❌ [WordCache] 캐시에 없음, AI 호출 필요: ${normalizedWord}`)
    return null
  }

  /**
   * AI 생성 결과를 캐시에 저장
   * - ai_generated_words에 저장
   * - 관리자 검증 후 master DB로 이동 가능
   */
  async saveAIGeneratedWord(wordData: Partial<CachedWord>): Promise<void> {
    if (!wordData.word) return

    const normalizedWord = wordData.word.toLowerCase().trim()
    
    try {
      // AI 캐시에 저장
      const docRef = doc(db, this.COLLECTIONS.AI_CACHE, normalizedWord)
      await setDoc(docRef, {
        ...wordData,
        word: normalizedWord,
        source: {
          type: 'ai_generated',
          generatedAt: new Date(),
          ...wordData.source
        },
        aiGenerated: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      console.log(`✅ [WordCache] AI 생성 단어 캐시 저장: ${normalizedWord}`)
    } catch (error) {
      console.error('❌ [WordCache] AI 단어 저장 실패:', error)
    }
  }

  /**
   * 개인 단어를 마스터 DB로 승격 (관리자 기능)
   */
  async promoteToMaster(word: string, adminId: string): Promise<boolean> {
    const normalizedWord = word.toLowerCase().trim()
    
    try {
      // AI 캐시에서 찾기
      const aiWord = await this.findInAICache(normalizedWord)
      if (!aiWord) {
        console.error('❌ [WordCache] 승격할 단어를 찾을 수 없음')
        return false
      }

      // 마스터 DB에 저장
      const masterRef = doc(db, this.COLLECTIONS.MASTER, normalizedWord)
      await setDoc(masterRef, {
        ...aiWord,
        source: {
          type: 'master',
          originalSource: 'ai_generated',
          promotedBy: adminId,
          promotedAt: new Date()
        },
        updatedAt: serverTimestamp()
      })

      console.log(`✅ [WordCache] 마스터 DB로 승격: ${normalizedWord}`)
      return true
    } catch (error) {
      console.error('❌ [WordCache] 승격 실패:', error)
      return false
    }
  }

  // Private methods
  private async findInMaster(word: string): Promise<CachedWord | null> {
    try {
      const docRef = doc(db, this.COLLECTIONS.MASTER, word)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return {
          ...docSnap.data(),
          source: { type: 'master' }
        } as CachedWord
      }
    } catch (error) {
      console.error('❌ [WordCache] 마스터 DB 검색 실패:', error)
    }
    return null
  }

  private async findInAICache(word: string): Promise<CachedWord | null> {
    try {
      const docRef = doc(db, this.COLLECTIONS.AI_CACHE, word)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return {
          ...docSnap.data(),
          source: { type: 'ai_generated' }
        } as CachedWord
      }
    } catch (error) {
      console.error('❌ [WordCache] AI 캐시 검색 실패:', error)
    }
    return null
  }

  private async findInPersonal(word: string, userId: string): Promise<CachedWord | null> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.PERSONAL),
        where('word', '==', word),
        where('source.userId', '==', userId)
      )
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        return {
          ...doc.data(),
          source: { type: 'personal', userId }
        } as CachedWord
      }
    } catch (error) {
      console.error('❌ [WordCache] 개인 컬렉션 검색 실패:', error)
    }
    return null
  }

  /**
   * 통계 정보 조회
   */
  async getStats(): Promise<{
    masterCount: number
    aiCacheCount: number
    cacheHitRate: number
  }> {
    try {
      const [masterSnapshot, aiCacheSnapshot] = await Promise.all([
        getDocs(collection(db, this.COLLECTIONS.MASTER)),
        getDocs(collection(db, this.COLLECTIONS.AI_CACHE))
      ])

      return {
        masterCount: masterSnapshot.size,
        aiCacheCount: aiCacheSnapshot.size,
        cacheHitRate: 0 // TODO: 실제 히트율 계산 로직 추가
      }
    } catch (error) {
      console.error('❌ [WordCache] 통계 조회 실패:', error)
      return {
        masterCount: 0,
        aiCacheCount: 0,
        cacheHitRate: 0
      }
    }
  }
}

export const wordCacheService = new WordCacheService()