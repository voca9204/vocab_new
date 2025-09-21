/**
 * Photo Vocabulary Service
 * Handles OCR extracted words with 48-hour session lifecycle
 */

import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore'
import type { UnifiedWord } from '@/types/unified-word'

export class PhotoVocabularyService {
  private readonly COLLECTION_NAME = 'photo_vocabulary_words'
  private readonly SESSION_LIFETIME_HOURS = 48
  
  /**
   * Get words from temporary photo extraction session
   */
  async getSessionWords(sessionId: string): Promise<UnifiedWord[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('sessionId', '==', sessionId)
    )
    
    const snapshot = await getDocs(q)
    const words: UnifiedWord[] = []
    
    snapshot.forEach(doc => {
      const data = doc.data()
      const word: UnifiedWord = {
        id: doc.id,
        word: data.word,
        definition: data.context || data.definition || '',
        examples: data.examples || [],
        partOfSpeech: Array.isArray(data.partOfSpeech) ? data.partOfSpeech : [data.partOfSpeech || ''],
        pronunciation: data.pronunciation,
        englishDefinition: data.englishDefinition,
        etymology: data.etymology,
        synonyms: data.synonyms || [],
        antonyms: data.antonyms || [],
        difficulty: data.difficulty || 5,
        frequency: data.frequency || 5,
        isSAT: data.isSAT || false,
        source: {
          type: 'photo_vocabulary',
          collection: this.COLLECTION_NAME,
          originalId: doc.id
        },
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      }
      words.push(word)
    })
    
    return words
  }
  
  /**
   * Save photo session to permanent collection
   * This converts temporary session to permanent user collection
   */
  async saveSessionToPermanent(sessionId: string, userId: string, collectionName: string): Promise<string> {
    const sessionWords = await this.getSessionWords(sessionId)
    
    if (sessionWords.length === 0) {
      throw new Error('No words in session to save')
    }
    
    // Create permanent collection
    const collectionData = {
      name: collectionName,
      type: 'personal',
      visibility: 'private',
      ownerId: userId,
      ownerType: 'user',
      wordCount: sessionWords.length,
      source: {
        type: 'photo_extraction',
        sessionId,
        originalPhotoCount: sessionWords.length
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const collectionRef = await addDoc(collection(db, 'personal_collections'), collectionData)
    
    // Move words to words_v3 with collection reference
    for (const word of sessionWords) {
      const wordData = {
        ...word,
        collectionIds: [collectionRef.id],
        source: {
          type: 'photo_extraction',
          collection: 'photo_vocabulary_words',
          originalId: word.id,
          sessionId,
          savedAt: new Date()
        },
        version: 1
      }
      
      await addDoc(collection(db, 'words_v3'), wordData)
    }
    
    // Clean up temporary session
    await this.cleanupSession(sessionId)
    
    return collectionRef.id
  }
  
  /**
   * Clean up expired sessions (>48 hours)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const expirationTime = new Date()
    expirationTime.setHours(expirationTime.getHours() - this.SESSION_LIFETIME_HOURS)
    
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('createdAt', '<', Timestamp.fromDate(expirationTime))
    )
    
    const snapshot = await getDocs(q)
    let cleanedCount = 0
    
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref)
      cleanedCount++
    }
    
    return cleanedCount
  }
  
  /**
   * Clean up specific session
   */
  private async cleanupSession(sessionId: string): Promise<void> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('sessionId', '==', sessionId)
    )
    
    const snapshot = await getDocs(q)
    
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref)
    }
  }
}

export const photoVocabularyService = new PhotoVocabularyService()
