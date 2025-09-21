/**
 * AI Generated Words Service
 * Handles Discovery modal generated words separately from master database
 */

import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import type { UnifiedWord } from '@/types/unified-word'

export class AIGeneratedWordsService {
  private readonly COLLECTION_NAME = 'ai_generated_words'
  
  /**
   * Get AI generated words for a specific user
   */
  async getUserAIWords(userId: string): Promise<UnifiedWord[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('userId', '==', userId)
    )
    
    const snapshot = await getDocs(q)
    const words: UnifiedWord[] = []
    
    snapshot.forEach(doc => {
      const data = doc.data()
      const word: UnifiedWord = {
        id: doc.id,
        word: data.word,
        definition: data.definition || '',
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
          type: 'ai_generated',
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
   * Add new AI generated word
   */
  async addAIWord(wordData: any): Promise<string> {
    const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
      ...wordData,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    return docRef.id
  }
  
  /**
   * Promote AI word to master database (words_v3)
   * This moves high-quality AI words to the main collection
   */
  async promoteToMaster(aiWordId: string): Promise<void> {
    // Get AI word
    const aiDoc = await getDoc(doc(db, this.COLLECTION_NAME, aiWordId))
    if (!aiDoc.exists()) {
      throw new Error('AI word not found')
    }
    
    const aiData = aiDoc.data()
    
    // Convert to words_v3 format
    const masterWordData = {
      ...aiData,
      source: {
        type: 'ai_generated',
        collection: 'ai_generated_words',
        originalId: aiWordId,
        promotedAt: new Date()
      },
      updatedAt: new Date(),
      version: 1
    }
    
    // Add to words_v3
    await addDoc(collection(db, 'words_v3'), masterWordData)
    
    // Remove from AI collection
    await deleteDoc(doc(db, this.COLLECTION_NAME, aiWordId))
    
    console.log(`Promoted AI word "${aiData.word}" to master database`)
  }
  
  /**
   * Clean up old AI words (older than 30 days)
   */
  async cleanupOldWords(): Promise<number> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('createdAt', '<', thirtyDaysAgo)
    )
    
    const snapshot = await getDocs(q)
    let cleanedCount = 0
    
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref)
      cleanedCount++
    }
    
    return cleanedCount
  }
}

export const aiGeneratedWordsService = new AIGeneratedWordsService()
