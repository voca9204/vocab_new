#!/usr/bin/env tsx
/**
 * Create Special Collection Adapters
 * Separate access methods for temporary/special collections
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

function createSpecialCollectionAdapters() {
  console.log('🔧 Creating Special Collection Adapters\n')
  
  // 1. AI Generated Words Service
  const aiWordsServicePath = '/Users/sinclair/projects/vocabulary-v2/src/lib/services/ai-generated-words-service.ts'
  const aiWordsService = `/**
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
    
    console.log(\`Promoted AI word "\${aiData.word}" to master database\`)
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
`

  // 2. Photo Vocabulary Service
  const photoWordsServicePath = '/Users/sinclair/projects/vocabulary-v2/src/lib/services/photo-vocabulary-service.ts'
  const photoWordsService = `/**
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
`

  // 3. Updated Word Adapter Bridge
  const updatedBridgePath = '/Users/sinclair/projects/vocabulary-v2/src/lib/adapters/word-adapter-bridge-v2.ts'
  const updatedBridge = `/**
 * Word Adapter Bridge V2 - Post Migration
 * Simplified adapter that only uses words_v3 as primary source
 * Special collections handled by dedicated services
 */

import { UnifiedWordAdapter } from './word-adapter-v3'
import { AIGeneratedWordsService } from '@/lib/services/ai-generated-words-service'
import { PhotoVocabularyService } from '@/lib/services/photo-vocabulary-service'
import type { UnifiedWord } from '@/types/unified-word'

export class WordAdapterBridgeV2 {
  private wordsV3Adapter: UnifiedWordAdapter
  private aiWordsService: AIGeneratedWordsService
  private photoWordsService: PhotoVocabularyService
  
  constructor() {
    this.wordsV3Adapter = new UnifiedWordAdapter()
    this.aiWordsService = new AIGeneratedWordsService()
    this.photoWordsService = new PhotoVocabularyService()
  }
  
  /**
   * Get word by ID - Only from words_v3 (master database)
   */
  async getWordById(id: string): Promise<UnifiedWord | null> {
    return await this.wordsV3Adapter.getWordById(id)
  }
  
  /**
   * Get multiple words by IDs - Only from words_v3
   */
  async getWordsByIds(ids: string[]): Promise<UnifiedWord[]> {
    return await this.wordsV3Adapter.getWordsByIds(ids)
  }
  
  /**
   * Search word by text - Only from words_v3
   */
  async searchWordByText(wordText: string): Promise<UnifiedWord | null> {
    return await this.wordsV3Adapter.searchWordByText(wordText)
  }
  
  /**
   * Get words by collection - Uses words_v3 with collectionIds
   */
  async getWordsByCollection(collectionId: string): Promise<UnifiedWord[]> {
    return await this.wordsV3Adapter.getWordsByCollectionId(collectionId)
  }
  
  /**
   * Get AI generated words for user - Uses dedicated service
   */
  async getUserAIWords(userId: string): Promise<UnifiedWord[]> {
    return await this.aiWordsService.getUserAIWords(userId)
  }
  
  /**
   * Get photo extraction session words - Uses dedicated service
   */
  async getPhotoSessionWords(sessionId: string): Promise<UnifiedWord[]> {
    return await this.photoWordsService.getSessionWords(sessionId)
  }
  
  /**
   * Legacy method compatibility - Maps to words_v3 only
   */
  async getWordsByWordbookId(
    collectionId: string, 
    wordbookType?: string, 
    limit?: number
  ): Promise<UnifiedWord[]> {
    if (wordbookType === 'ai-generated') {
      const userId = collectionId.replace('ai-generated-', '')
      return await this.getUserAIWords(userId)
    }
    
    if (wordbookType === 'photo') {
      return await this.getPhotoSessionWords(collectionId)
    }
    
    // All other collections use words_v3
    return await this.getWordsByCollection(collectionId)
  }
}

export const wordAdapterBridgeV2 = new WordAdapterBridgeV2()
`

  // Write all files
  const files = [
    { path: aiWordsServicePath, content: aiWordsService, name: 'AI Generated Words Service' },
    { path: photoWordsServicePath, content: photoWordsService, name: 'Photo Vocabulary Service' },
    { path: updatedBridgePath, content: updatedBridge, name: 'Word Adapter Bridge V2' }
  ]
  
  files.forEach(file => {
    // Create directory if it doesn't exist
    const dir = path.dirname(file.path)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    fs.writeFileSync(file.path, file.content)
    console.log(`✅ Created ${file.name}`)
    console.log(`   📄 ${path.relative(process.cwd(), file.path)}`)
  })
  
  console.log('\n🎉 Special Collection Adapters Created!')
  console.log('\nNext Steps:')
  console.log('1. Update imports in components to use new services')
  console.log('2. Replace WordAdapterBridge with WordAdapterBridgeV2')
  console.log('3. Test AI word generation and photo extraction flows')
  console.log('4. Set up cleanup jobs for temporary data')
}

createSpecialCollectionAdapters()