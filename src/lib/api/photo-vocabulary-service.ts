/**
 * Photo Vocabulary Service
 * Handles photo uploads, word extraction, and session management
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase/config'
import { visionService } from './vision-service'
import type { 
  PhotoSession, 
  PhotoVocabularyEntry,
  ExtractedWord 
} from '@/types/photo-vocabulary'
import type { UnifiedWord } from '@/types/unified-word'

export class PhotoVocabularyService {
  private readonly COLLECTION_SESSIONS = 'photo_sessions'
  private readonly COLLECTION_WORDS = 'photo_vocabulary'
  private readonly STORAGE_PATH = 'photo-vocabulary'

  /**
   * Upload photo to Firebase Storage
   */
  async uploadPhoto(file: File, userId: string): Promise<{ url: string; thumbnailUrl?: string }> {
    const timestamp = Date.now()
    const fileName = `${userId}/${timestamp}_${file.name}`
    const storageRef = ref(storage, `${this.STORAGE_PATH}/${fileName}`)

    try {
      const snapshot = await uploadBytes(storageRef, file)
      const url = await getDownloadURL(snapshot.ref)
      
      // TODO: Generate thumbnail in the future
      return { url }
    } catch {
      throw new Error('Failed to upload photo')
    }
  }

  /**
   * Extract text and words from photo
   */
  async extractWordsFromPhoto(photoUrl: string): Promise<ExtractedWord[]> {
    const extractedText = await visionService.extractText(photoUrl)
    const words = visionService.extractVocabularyWords(extractedText.fullText)
    
    // Map words with their context
    return words.map(word => {
      // Find context (sentence containing the word)
      const sentences = extractedText.fullText.split(/[.!?]+/)
      const context = sentences.find(sentence => 
        sentence.toLowerCase().includes(word.toLowerCase())
      )?.trim()

      return {
        word,
        context,
        confidence: 0.9 // Mock confidence for now
      }
    })
  }

  /**
   * Create a new photo session
   */
  async createSession(
    userId: string,
    photoUrl: string,
    words: ExtractedWord[],
    title?: string,
    tags: string[] = [],
    isTemporary: boolean = true
  ): Promise<PhotoSession> {
    const sessionId = doc(collection(db, this.COLLECTION_SESSIONS)).id
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setHours(expiresAt.getHours() + Number(process.env.PHOTO_SESSION_DURATION_HOURS || 48))

    const session: PhotoSession = {
      id: sessionId,
      userId,
      title: title || `Photo Session ${now.toLocaleDateString()}`,
      photoUrl,
      extractedAt: now,
      extractionMethod: 'ocr',
      sourceLanguage: 'en',
      isTemporary,
      expiresAt: isTemporary ? expiresAt : undefined,
      tags,
      wordCount: words.length,
      testedCount: 0,
      masteredCount: 0,
      createdAt: now,
      updatedAt: now
    }

    // Create session document
    await setDoc(doc(db, this.COLLECTION_SESSIONS, sessionId), {
      ...session,
      extractedAt: Timestamp.fromDate(session.extractedAt),
      expiresAt: session.expiresAt ? Timestamp.fromDate(session.expiresAt) : null,
      createdAt: Timestamp.fromDate(session.createdAt),
      updatedAt: Timestamp.fromDate(session.updatedAt)
    })

    // Create word documents in batch
    const batch = writeBatch(db)
    
    words.forEach(word => {
      const wordRef = doc(collection(db, this.COLLECTION_WORDS))
      const photoWord: PhotoVocabularyEntry = {
        id: wordRef.id,
        userId,
        sessionId,
        photoUrl,
        uploadedAt: now,
        word: word.word,
        context: word.context,
        isActive: true,
        expiresAt,
        tested: false,
        correct: false,
        createdAt: now
      }

      batch.set(wordRef, {
        ...photoWord,
        uploadedAt: Timestamp.fromDate(photoWord.uploadedAt),
        expiresAt: Timestamp.fromDate(photoWord.expiresAt),
        createdAt: Timestamp.fromDate(photoWord.createdAt)
      })
    })

    await batch.commit()
    return session
  }

  /**
   * Get user's photo sessions
   */
  async getUserSessions(userId: string, includeExpired: boolean = false): Promise<PhotoSession[]> {
    let q = query(
      collection(db, this.COLLECTION_SESSIONS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    if (!includeExpired) {
      const now = Timestamp.now()
      q = query(
        collection(db, this.COLLECTION_SESSIONS),
        where('userId', '==', userId),
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'desc')
      )
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        extractedAt: data.extractedAt?.toDate(),
        expiresAt: data.expiresAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as PhotoSession
    })
  }

  /**
   * Get words from a session
   */
  async getSessionWords(sessionId: string, userId?: string): Promise<PhotoVocabularyEntry[]> {
    let q = query(
      collection(db, this.COLLECTION_WORDS),
      where('sessionId', '==', sessionId),
      where('isActive', '==', true)
    )

    // Add user filter if provided (required for security)
    if (userId) {
      q = query(
        collection(db, this.COLLECTION_WORDS),
        where('sessionId', '==', sessionId),
        where('userId', '==', userId),
        where('isActive', '==', true)
      )
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        uploadedAt: data.uploadedAt?.toDate(),
        expiresAt: data.expiresAt?.toDate(),
        createdAt: data.createdAt?.toDate()
      } as PhotoVocabularyEntry
    })
  }

  /**
   * Convert photo words to unified format
   */
  convertToUnifiedWords(photoWords: PhotoVocabularyEntry[]): UnifiedWord[] {
    return photoWords.map(pw => ({
      id: pw.id,
      word: pw.word,
      definition: pw.definition || 'Definition pending...',
      etymology: '',
      partOfSpeech: [],
      examples: pw.context ? [pw.context] : [],
      pronunciation: '',
      difficulty: 5,
      frequency: 5,
      isSAT: false,
      source: {
        type: 'manual' as const,
        collection: 'photo_vocabulary',
        originalId: pw.id
      },
      createdAt: pw.createdAt,
      updatedAt: pw.createdAt,
      studyStatus: {
        studied: pw.tested,
        masteryLevel: pw.correct ? 100 : 0,
        reviewCount: pw.tested ? 1 : 0
      }
    }))
  }

  /**
   * Update word test results
   */
  async updateWordTestResult(wordId: string, correct: boolean): Promise<void> {
    await updateDoc(doc(db, this.COLLECTION_WORDS, wordId), {
      tested: true,
      correct,
      updatedAt: Timestamp.now()
    })
  }

  /**
   * Delete expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = Timestamp.now()
    const q = query(
      collection(db, this.COLLECTION_SESSIONS),
      where('isTemporary', '==', true),
      where('expiresAt', '<', now)
    )

    const snapshot = await getDocs(q)
    const batch = writeBatch(db)
    let count = 0

    for (const doc of snapshot.docs) {
      // Delete associated words
      const wordsQuery = query(
        collection(db, this.COLLECTION_WORDS),
        where('sessionId', '==', doc.id)
      )
      const wordsSnapshot = await getDocs(wordsQuery)
      
      wordsSnapshot.docs.forEach(wordDoc => {
        batch.delete(wordDoc.ref)
      })

      // Delete session
      batch.delete(doc.ref)
      
      // Delete photo from storage if exists
      const photoUrl = doc.data().photoUrl
      if (photoUrl && process.env.AUTO_DELETE_PHOTOS === 'true') {
        try {
          const photoRef = ref(storage, photoUrl)
          await deleteObject(photoRef)
        } catch {
          // Error deleting photo - continue with cleanup
        }
      }
      
      count++
    }

    await batch.commit()
    return count
  }

  /**
   * Convert temporary session to permanent
   */
  async convertToPermanent(sessionId: string): Promise<void> {
    await updateDoc(doc(db, this.COLLECTION_SESSIONS, sessionId), {
      isTemporary: false,
      expiresAt: null,
      updatedAt: Timestamp.now()
    })

    // Update all associated words
    const wordsQuery = query(
      collection(db, this.COLLECTION_WORDS),
      where('sessionId', '==', sessionId)
    )
    const wordsSnapshot = await getDocs(wordsQuery)
    
    const batch = writeBatch(db)
    wordsSnapshot.docs.forEach(wordDoc => {
      batch.update(wordDoc.ref, {
        expiresAt: null,
        updatedAt: Timestamp.now()
      })
    })
    
    await batch.commit()
  }
}

// Singleton instance
export const photoVocabularyService = new PhotoVocabularyService()