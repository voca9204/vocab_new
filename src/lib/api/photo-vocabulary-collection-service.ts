/**
 * Photo Vocabulary Collection Service
 * Manages persistent photo vocabulary collections and learning progress
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  writeBatch,
  Timestamp,
  startAt,
  endAt
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { 
  PhotoVocabularyCollection,
  PhotoVocabularyWord,
  PhotoVocabularyCollectionSummary,
  PhotoVocabularyTestSession,
  DailyVocabularyStats
} from '@/types/photo-vocabulary-collection'

export class PhotoVocabularyCollectionService {
  private readonly COLLECTION_COLLECTIONS = 'photo_vocabulary_collections'
  private readonly COLLECTION_WORDS = 'photo_vocabulary_words'
  private readonly COLLECTION_STATS = 'photo_vocabulary_stats'
  private readonly COLLECTION_SESSIONS = 'photo_vocabulary_test_sessions'

  /**
   * 임시 세션을 영구 컬렉션으로 변환
   */
  async convertSessionToCollection(
    sessionId: string,
    userId: string,
    title?: string,
    category?: string,
    tags: string[] = []
  ): Promise<PhotoVocabularyCollection> {
    // 기존 세션 데이터 가져오기
    const sessionWords = await this.getSessionWords(sessionId, userId)
    
    if (sessionWords.length === 0) {
      throw new Error('세션에 저장할 단어가 없습니다')
    }

    const today = new Date()
    const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD
    
    const collectionId = doc(collection(db, this.COLLECTION_COLLECTIONS)).id
    
    // 컬렉션 생성 (undefined 값들을 안전하게 처리)
    const newCollection: PhotoVocabularyCollection = {
      id: collectionId,
      userId,
      title: title || `사진 단어장 ${dateStr}`,
      description: `${sessionWords.length}개 단어 추출`,
      date: dateStr,
      photoUrl: sessionWords[0]?.photoUrl || '',
      thumbnailUrl: null,
      category: category || '기타',
      source: null,
      tags: tags || [],
      totalWords: sessionWords.length,
      studiedWords: 0,
      masteredWords: 0,
      accuracyRate: 0,
      firstStudiedAt: null,
      lastStudiedAt: null,
      studyCount: 0,
      averageScore: null,
      createdAt: today,
      updatedAt: today,
      isArchived: false
    }

    const batch = writeBatch(db)
    
    // 컬렉션 저장 (undefined 제거된 데이터로)
    const collectionData = {
      ...newCollection,
      createdAt: Timestamp.fromDate(newCollection.createdAt),
      updatedAt: Timestamp.fromDate(newCollection.updatedAt),
      firstStudiedAt: newCollection.firstStudiedAt ? 
        Timestamp.fromDate(newCollection.firstStudiedAt) : null,
      lastStudiedAt: newCollection.lastStudiedAt ? 
        Timestamp.fromDate(newCollection.lastStudiedAt) : null
    }
    
    batch.set(doc(db, this.COLLECTION_COLLECTIONS, collectionId), collectionData)

    // 단어들을 새 컬렉션으로 이전
    sessionWords.forEach(word => {
      const wordId = doc(collection(db, this.COLLECTION_WORDS)).id
      
      console.log('[convertSessionToCollection] Processing word:', word.word, 'context:', word.context)
      
      // undefined 값들을 안전한 기본값으로 변환
      const cleanedWord = {
        id: wordId,
        userId,
        collectionId,
        word: word.word || '',
        normalizedWord: (word.word || '').toLowerCase(),
        definition: word.context || null,  // context가 실제 정의를 담고 있음
        context: word.context || null,
        // PhotoVocabularyEntry에는 position이 없으므로 제거하거나 기본값 설정
        position: null,
        pronunciation: null,
        difficulty: null,
        frequency: null,
        relatedWords: [],
        studyStatus: {
          studied: Boolean(word.tested),
          masteryLevel: (word.tested && word.correct) ? 70 : 0,
          reviewCount: word.tested ? 1 : 0,
          correctCount: (word.correct && word.tested) ? 1 : 0,
          incorrectCount: (!word.correct && word.tested) ? 1 : 0,
          firstStudiedAt: word.tested && word.createdAt ? word.createdAt : null,
          lastStudiedAt: word.tested && word.createdAt ? word.createdAt : null,
          nextReviewAt: null
        },
        createdAt: word.createdAt || today,
        updatedAt: today,
        isActive: true
      }

      // Firestore에 저장할 데이터 준비 (Date → Timestamp 변환)
      const firestoreData = {
        ...cleanedWord,
        createdAt: Timestamp.fromDate(cleanedWord.createdAt),
        updatedAt: Timestamp.fromDate(cleanedWord.updatedAt),
        studyStatus: {
          ...cleanedWord.studyStatus,
          firstStudiedAt: cleanedWord.studyStatus.firstStudiedAt ? 
            Timestamp.fromDate(cleanedWord.studyStatus.firstStudiedAt) : null,
          lastStudiedAt: cleanedWord.studyStatus.lastStudiedAt ? 
            Timestamp.fromDate(cleanedWord.studyStatus.lastStudiedAt) : null,
          nextReviewAt: cleanedWord.studyStatus.nextReviewAt ? 
            Timestamp.fromDate(cleanedWord.studyStatus.nextReviewAt) : null
        }
      }

      batch.set(doc(db, this.COLLECTION_WORDS, wordId), firestoreData)
    })

    await batch.commit()
    return newCollection
  }

  /**
   * 사용자의 모든 컬렉션 목록 가져오기
   */
  async getUserCollections(
    userId: string, 
    includeArchived: boolean = false
  ): Promise<PhotoVocabularyCollectionSummary[]> {
    console.log('[getUserCollections] Fetching collections for user:', userId, 'includeArchived:', includeArchived)
    
    try {
      let q = query(
        collection(db, this.COLLECTION_COLLECTIONS),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(50)
      )

      if (!includeArchived) {
        q = query(
          collection(db, this.COLLECTION_COLLECTIONS),
          where('userId', '==', userId),
          where('isArchived', '==', false),
          orderBy('date', 'desc'),
          limit(50)
        )
      }

      const snapshot = await getDocs(q)
      console.log('[getUserCollections] Found', snapshot.docs.length, 'collections')
      
      const collections = snapshot.docs.map(doc => {
        const data = doc.data()
        console.log('[getUserCollections] Collection:', doc.id, 'title:', data.title)
        
        return {
          id: doc.id,
          title: data.title,
          date: data.date,
          photoUrl: data.photoUrl,
          totalWords: data.totalWords,
          studiedWords: data.studiedWords,
          accuracyRate: data.accuracyRate,
          lastStudiedAt: data.lastStudiedAt?.toDate(),
          category: data.category,
          tags: data.tags
        } as PhotoVocabularyCollectionSummary
      })
      
      console.log('[getUserCollections] Returning collections:', collections.map(c => ({ id: c.id, title: c.title })))
      return collections
    } catch (error) {
      console.error('[getUserCollections] Error fetching collections:', error)
      throw error
    }
  }

  /**
   * 특정 컬렉션 상세 정보 가져오기
   */
  async getCollection(collectionId: string): Promise<PhotoVocabularyCollection | null> {
    console.log('[getCollection] Attempting to fetch collection:', collectionId)
    
    try {
      const docSnap = await getDoc(doc(db, this.COLLECTION_COLLECTIONS, collectionId))
      
      console.log('[getCollection] Document exists:', docSnap.exists())
      
      if (!docSnap.exists()) {
        console.log('[getCollection] Collection not found:', collectionId)
        return null
      }

      const data = docSnap.data()
      console.log('[getCollection] Collection data:', data)
      
      const result = {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        firstStudiedAt: data.firstStudiedAt?.toDate(),
        lastStudiedAt: data.lastStudiedAt?.toDate()
      } as PhotoVocabularyCollection
      
      console.log('[getCollection] Returning processed collection:', result)
      return result
    } catch (error) {
      console.error('[getCollection] Error fetching collection:', error)
      throw error
    }
  }

  /**
   * 컬렉션의 단어들 가져오기
   */
  async getCollectionWords(collectionId: string): Promise<PhotoVocabularyWord[]> {
    console.log('[getCollectionWords] Fetching words for collection:', collectionId)
    
    try {
      const q = query(
        collection(db, this.COLLECTION_WORDS),
        where('collectionId', '==', collectionId),
        where('isActive', '==', true),
        orderBy('word', 'asc')
      )

      const snapshot = await getDocs(q)
      console.log('[getCollectionWords] Found', snapshot.docs.length, 'words')
      
      const words = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          studyStatus: {
            ...data.studyStatus,
            firstStudiedAt: data.studyStatus?.firstStudiedAt?.toDate(),
            lastStudiedAt: data.studyStatus?.lastStudiedAt?.toDate(),
            nextReviewAt: data.studyStatus?.nextReviewAt?.toDate()
          }
        } as PhotoVocabularyWord
      })
      
      console.log('[getCollectionWords] Sample word:', words[0])
      return words
    } catch (error) {
      console.error('[getCollectionWords] Error fetching words:', error)
      throw error
    }
  }

  /**
   * 날짜별 컬렉션 그룹화
   */
  async getCollectionsByDate(userId: string): Promise<Record<string, PhotoVocabularyCollectionSummary[]>> {
    const collections = await this.getUserCollections(userId)
    
    const grouped: Record<string, PhotoVocabularyCollectionSummary[]> = {}
    
    collections.forEach(collection => {
      const date = collection.date
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(collection)
    })

    return grouped
  }

  /**
   * 복습 필요한 단어들 가져오기
   */
  async getWordsForReview(userId: string): Promise<PhotoVocabularyWord[]> {
    const today = new Date()
    today.setHours(23, 59, 59, 999) // 오늘 끝까지

    const q = query(
      collection(db, this.COLLECTION_WORDS),
      where('userId', '==', userId),
      where('studyStatus.studied', '==', true),
      where('studyStatus.nextReviewAt', '<=', Timestamp.fromDate(today)),
      orderBy('studyStatus.nextReviewAt', 'asc'),
      limit(50)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        studyStatus: {
          ...data.studyStatus,
          firstStudiedAt: data.studyStatus?.firstStudiedAt?.toDate(),
          lastStudiedAt: data.studyStatus?.lastStudiedAt?.toDate(),
          nextReviewAt: data.studyStatus?.nextReviewAt?.toDate()
        }
      } as PhotoVocabularyWord
    })
  }

  /**
   * 학습 진도 업데이트
   */
  async updateWordProgress(
    wordId: string, 
    correct: boolean, 
    timeSpentSeconds: number = 0
  ): Promise<void> {
    const wordRef = doc(db, this.COLLECTION_WORDS, wordId)
    const wordSnap = await getDoc(wordRef)
    
    if (!wordSnap.exists()) {
      throw new Error('단어를 찾을 수 없습니다')
    }

    const wordData = wordSnap.data()
    const currentStatus = wordData.studyStatus || {}
    
    const now = new Date()
    
    // 복습 간격 계산 (간단한 스페이싱 알고리즘)
    let nextInterval = 1 // days
    if (correct) {
      nextInterval = Math.min((currentStatus.reviewCount || 0) + 1, 30)
    } else {
      nextInterval = 1 // 틀리면 다음날 다시
    }
    
    const nextReviewAt = new Date(now)
    nextReviewAt.setDate(nextReviewAt.getDate() + nextInterval)

    const updatedStatus = {
      studied: true,
      masteryLevel: Math.min(100, 
        correct ? 
          (currentStatus.masteryLevel || 0) + 20 : 
          Math.max(0, (currentStatus.masteryLevel || 0) - 10)
      ),
      reviewCount: (currentStatus.reviewCount || 0) + 1,
      correctCount: (currentStatus.correctCount || 0) + (correct ? 1 : 0),
      incorrectCount: (currentStatus.incorrectCount || 0) + (correct ? 0 : 1),
      firstStudiedAt: currentStatus.firstStudiedAt || Timestamp.fromDate(now),
      lastStudiedAt: Timestamp.fromDate(now),
      nextReviewAt: Timestamp.fromDate(nextReviewAt)
    }

    await updateDoc(wordRef, {
      studyStatus: updatedStatus,
      updatedAt: Timestamp.fromDate(now)
    })
  }

  /**
   * 기존 세션 단어들 가져오기 (임시용)
   */
  private async getSessionWords(sessionId: string, userId: string) {
    const { photoVocabularyService } = await import('./photo-vocabulary-service')
    return await photoVocabularyService.getSessionWords(sessionId, userId)
  }

  /**
   * 컬렉션 통계 업데이트
   */
  async updateCollectionStats(collectionId: string): Promise<void> {
    const words = await this.getCollectionWords(collectionId)
    
    const studiedWords = words.filter(w => w.studyStatus.studied).length
    const masteredWords = words.filter(w => w.studyStatus.masteryLevel >= 80).length
    
    const totalCorrect = words.reduce((sum, w) => sum + (w.studyStatus.correctCount || 0), 0)
    const totalAttempts = words.reduce((sum, w) => 
      sum + (w.studyStatus.correctCount || 0) + (w.studyStatus.incorrectCount || 0), 0
    )
    
    const accuracyRate = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

    await updateDoc(doc(db, this.COLLECTION_COLLECTIONS, collectionId), {
      studiedWords,
      masteredWords,
      accuracyRate,
      updatedAt: Timestamp.now()
    })
  }

  /**
   * 컬렉션과 관련 단어들 삭제
   */
  async deleteCollection(collectionId: string): Promise<void> {
    console.log('[deleteCollection] Deleting collection:', collectionId)
    
    try {
      // 1. 먼저 해당 컬렉션의 모든 단어 삭제
      const wordsQuery = query(
        collection(db, this.COLLECTION_WORDS),
        where('collectionId', '==', collectionId)
      )
      
      const wordsSnapshot = await getDocs(wordsQuery)
      console.log('[deleteCollection] Found', wordsSnapshot.docs.length, 'words to delete')
      
      // Batch delete words
      const batch = writeBatch(db)
      wordsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      
      // 2. 컬렉션 문서 삭제
      const collectionRef = doc(db, this.COLLECTION_COLLECTIONS, collectionId)
      batch.delete(collectionRef)
      
      // 3. Commit all deletions
      await batch.commit()
      
      console.log('[deleteCollection] Successfully deleted collection and', wordsSnapshot.docs.length, 'words')
    } catch (error) {
      console.error('[deleteCollection] Error:', error)
      throw error
    }
  }
}

// Singleton instance
export const photoVocabularyCollectionService = new PhotoVocabularyCollectionService()