import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { VocabularyWord, NewsArticle, UserProgress } from '@/types'
import { FIREBASE_COLLECTIONS } from '@/lib/constants'

// 컬렉션 참조 헬퍼
export const getCollectionRef = (collectionName: string) => {
  return collection(db, collectionName)
}

export const getDocRef = (collectionName: string, docId: string) => {
  return doc(db, collectionName, docId)
}

// 어휘 관련 함수들
export const vocabularyService = {
  // 모든 어휘 가져오기 (페이지네이션 지원)
  async getAll(
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
    limitCount: number = 50
  ): Promise<{ words: VocabularyWord[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    try {
      const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)
      let q = query(
        vocabularyRef,
        orderBy('frequency', 'desc'),
        limit(limitCount)
      )

      if (lastDoc) {
        q = query(
          vocabularyRef,
          orderBy('frequency', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        )
      }

      const snapshot = await getDocs(q)
      const words = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as VocabularyWord[]

      const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null

      return { words, lastDoc: newLastDoc }
    } catch (error) {
      console.error('Error fetching vocabulary:', error)
      throw error
    }
  },

  // SAT 레벨 어휘만 가져오기
  async getSATWords(limitCount: number = 50): Promise<VocabularyWord[]> {
    try {
      const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)
      const q = query(
        vocabularyRef,
        where('satLevel', '==', true),
        orderBy('frequency', 'desc'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as VocabularyWord[]
    } catch (error) {
      console.error('Error fetching SAT words:', error)
      throw error
    }
  },

  // 난이도별 어휘 가져오기
  async getByDifficulty(
    difficulty: number,
    limitCount: number = 50
  ): Promise<VocabularyWord[]> {
    try {
      const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)
      const q = query(
        vocabularyRef,
        where('difficulty', '==', difficulty),
        orderBy('frequency', 'desc'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as VocabularyWord[]
    } catch (error) {
      console.error('Error fetching words by difficulty:', error)
      throw error
    }
  },

  // 특정 어휘 가져오기
  async getById(wordId: string): Promise<VocabularyWord | null> {
    try {
      const wordRef = doc(db, FIREBASE_COLLECTIONS.VOCABULARY, wordId)
      const snapshot = await getDoc(wordRef)

      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data(),
        } as VocabularyWord
      }

      return null
    } catch (error) {
      console.error('Error fetching word by ID:', error)
      throw error
    }
  },

  // 어휘 추가 (관리자용)
  async add(word: Omit<VocabularyWord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)
      const docRef = await addDoc(vocabularyRef, {
        ...word,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return docRef.id
    } catch (error) {
      console.error('Error adding vocabulary word:', error)
      throw error
    }
  },

  // 어휘 업데이트 (관리자용)
  async update(wordId: string, updates: Partial<VocabularyWord>): Promise<void> {
    try {
      const wordRef = doc(db, FIREBASE_COLLECTIONS.VOCABULARY, wordId)
      await updateDoc(wordRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('Error updating vocabulary word:', error)
      throw error
    }
  },
}

// 사용자 진도 관련 함수들
export const progressService = {
  // 사용자의 단어별 진도 가져오기
  async getUserProgress(userId: string, wordId: string): Promise<UserProgress | null> {
    try {
      const progressRef = doc(db, FIREBASE_COLLECTIONS.PROGRESS, userId, 'words', wordId)
      const snapshot = await getDoc(progressRef)

      if (snapshot.exists()) {
        return {
          userId,
          wordId,
          ...snapshot.data(),
        } as UserProgress
      }

      return null
    } catch (error) {
      console.error('Error fetching user progress:', error)
      throw error
    }
  },

  // 사용자 진도 업데이트
  async updateProgress(progress: UserProgress): Promise<void> {
    try {
      const progressRef = doc(
        db,
        FIREBASE_COLLECTIONS.PROGRESS,
        progress.userId,
        'words',
        progress.wordId
      )

      await setDoc(progressRef, {
        correctAttempts: progress.correctAttempts,
        totalAttempts: progress.totalAttempts,
        streak: progress.streak,
        nextReviewDate: progress.nextReviewDate,
        lastUpdated: serverTimestamp(),
      }, { merge: true })
    } catch (error) {
      console.error('Error updating user progress:', error)
      throw error
    }
  },

  // 사용자의 모든 진도 가져오기
  async getAllUserProgress(userId: string): Promise<UserProgress[]> {
    try {
      const progressRef = collection(db, FIREBASE_COLLECTIONS.PROGRESS, userId, 'words')
      const snapshot = await getDocs(progressRef)

      return snapshot.docs.map(doc => ({
        userId,
        wordId: doc.id,
        ...doc.data(),
      })) as UserProgress[]
    } catch (error) {
      console.error('Error fetching all user progress:', error)
      throw error
    }
  },
}

// 뉴스 관련 함수들
export const newsService = {
  // 최신 뉴스 기사 가져오기
  async getLatest(limitCount: number = 20): Promise<NewsArticle[]> {
    try {
      const newsRef = collection(db, FIREBASE_COLLECTIONS.NEWS)
      const q = query(
        newsRef,
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as NewsArticle[]
    } catch (error) {
      console.error('Error fetching latest news:', error)
      throw error
    }
  },

  // SAT 단어가 포함된 뉴스 기사 가져오기
  async getWithSATWords(limitCount: number = 20): Promise<NewsArticle[]> {
    try {
      const newsRef = collection(db, FIREBASE_COLLECTIONS.NEWS)
      const q = query(
        newsRef,
        where('satWords', '!=', []),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as NewsArticle[]
    } catch (error) {
      console.error('Error fetching news with SAT words:', error)
      throw error
    }
  },
}

// Export new vocabulary services
export { VocabularySearchService } from './vocabulary-search'
export { VocabularyBatchService } from './vocabulary-batch'
export { SATVocabularyUtils } from './sat-vocabulary-utils'
export * from './vocabulary-validation'

export { db }
