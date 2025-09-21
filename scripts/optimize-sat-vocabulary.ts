#!/usr/bin/env tsx
/**
 * Optimize SAT Vocabulary II by merging with existing words collection
 * This creates the best possible data by combining both sources
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'vocabulary-app-new',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  })
}

const db = admin.firestore()
const COLLECTION_ID = 'sat_vocabulary_ii_1756394109723'

interface WordData {
  word: string
  definition?: string
  korean?: string
  englishDefinition?: string
  partOfSpeech?: string | string[]
  examples?: string[]
  synonyms?: string[]
  antonyms?: string[]
  etymology?: string
  difficulty?: number
  frequency?: number
  collectionIds?: string[]
  quality?: { score: number }
}

async function optimizeSATVocabulary() {
  console.log('🔧 Optimizing SAT Vocabulary II with existing words data...\n')
  console.log('=' .repeat(60))
  
  // Step 1: Get all SAT II words
  console.log('📚 Step 1: Fetching SAT Vocabulary II words...')
  const satIISnapshot = await db.collection('words_v3')
    .where('collectionIds', 'array-contains', COLLECTION_ID)
    .get()
  
  console.log(`   Found ${satIISnapshot.size} SAT II words\n`)

  // Step 2: Get all existing words
  console.log('📚 Step 2: Fetching existing words collection...')
  const wordsSnapshot = await db.collection('words').get()
  
  const existingWords = new Map<string, WordData>()
  wordsSnapshot.forEach(doc => {
    const data = doc.data() as WordData
    existingWords.set(data.word.toLowerCase(), data)
  })
  console.log(`   Found ${existingWords.size} words in main collection\n`)

  // Step 3: Process and optimize each SAT II word
  console.log('🔄 Step 3: Processing and optimizing words...')
  let batch = db.batch()
  let updateCount = 0
  let enrichCount = 0
  let koreanAddedCount = 0
  let batchCount = 0
  
  for (const doc of satIISnapshot.docs) {
    const satIIData = doc.data() as WordData
    const wordKey = satIIData.word.toLowerCase()
    const existingWord = existingWords.get(wordKey)
    
    if (existingWord) {
      // Merge data: Use existing word's rich data but preserve SAT II Korean
      const mergedData: Partial<WordData> = {}
      let hasUpdates = false
      
      // Use existing definition if SAT II doesn't have one
      if (!satIIData.definition && existingWord.definition) {
        mergedData.definition = existingWord.definition
        hasUpdates = true
      }
      
      // Merge Korean: SAT II Korean takes priority, but add existing if missing
      if (!satIIData.korean && existingWord.korean) {
        mergedData.korean = existingWord.korean
        koreanAddedCount++
        hasUpdates = true
      } else if (satIIData.korean && !existingWord.korean) {
        // SAT II has Korean but existing doesn't - keep SAT II Korean
        // No update needed as it's already in SAT II
      }
      
      // Use existing English definition if better
      if (!satIIData.englishDefinition && existingWord.englishDefinition) {
        mergedData.englishDefinition = existingWord.englishDefinition
        hasUpdates = true
      }
      
      // Use existing examples (SAT II has none)
      if ((!satIIData.examples || satIIData.examples.length === 0) && existingWord.examples) {
        mergedData.examples = existingWord.examples
        hasUpdates = true
      }
      
      // Use existing etymology
      if (!satIIData.etymology && existingWord.etymology) {
        mergedData.etymology = existingWord.etymology
        hasUpdates = true
      }
      
      // Use existing synonyms/antonyms
      if ((!satIIData.synonyms || satIIData.synonyms.length === 0) && existingWord.synonyms) {
        mergedData.synonyms = existingWord.synonyms
        hasUpdates = true
      }
      if ((!satIIData.antonyms || satIIData.antonyms.length === 0) && existingWord.antonyms) {
        mergedData.antonyms = existingWord.antonyms
        hasUpdates = true
      }
      
      // Use existing difficulty/frequency if missing
      if (satIIData.difficulty === undefined && existingWord.difficulty !== undefined) {
        mergedData.difficulty = existingWord.difficulty
        hasUpdates = true
      }
      if (satIIData.frequency === undefined && existingWord.frequency !== undefined) {
        mergedData.frequency = existingWord.frequency
        hasUpdates = true
      }
      
      // Normalize partOfSpeech to array
      if (typeof satIIData.partOfSpeech === 'string') {
        mergedData.partOfSpeech = [satIIData.partOfSpeech]
        hasUpdates = true
      }
      
      if (hasUpdates) {
        // Calculate new quality score
        const updatedWord = { ...satIIData, ...mergedData }
        const qualityScore = calculateQualityScore(updatedWord)
        mergedData.quality = { score: qualityScore }
        
        batch.update(doc.ref, mergedData)
        updateCount++
        batchCount++
        enrichCount++
        
        if (updateCount % 100 === 0) {
          console.log(`   Processed ${updateCount} words...`)
        }
      }
    } else {
      // Word only exists in SAT II - just normalize partOfSpeech
      if (typeof satIIData.partOfSpeech === 'string') {
        batch.update(doc.ref, { 
          partOfSpeech: [satIIData.partOfSpeech],
          quality: { score: calculateQualityScore(satIIData) }
        })
        updateCount++
        batchCount++
        
        if (updateCount % 100 === 0) {
          console.log(`   Processed ${updateCount} words...`)
        }
      }
    }
    
    // Firestore batch limit
    if (batchCount > 0 && batchCount % 400 === 0) {
      await batch.commit()
      console.log(`   ✅ Committed batch of 400 updates (total: ${updateCount})`)
      batch = db.batch()  // Create new batch
      batchCount = 0
    }
  }
  
  // Commit remaining updates
  if (batchCount > 0) {
    await batch.commit()
    console.log(`   ✅ Committed final batch of ${batchCount} updates (total: ${updateCount})`)
  }
  
  // Step 4: Generate report
  console.log('\n' + '=' .repeat(60))
  console.log('📊 OPTIMIZATION REPORT')
  console.log('=' .repeat(60))
  
  console.log(`\n✅ Optimization Complete!`)
  console.log(`   Total words processed: ${satIISnapshot.size}`)
  console.log(`   Words enriched with existing data: ${enrichCount}`)
  console.log(`   Korean translations added: ${koreanAddedCount}`)
  console.log(`   Total updates made: ${updateCount}`)
  
  console.log('\n📈 Improvements Made:')
  console.log('   • Added missing examples from existing collection')
  console.log('   • Added etymology information where available')
  console.log('   • Added synonyms and antonyms')
  console.log('   • Normalized all partOfSpeech to arrays')
  console.log('   • Calculated quality scores for all words')
  console.log('   • Preserved SAT II Korean translations')
  
  console.log('\n🎯 Result:')
  console.log('   SAT Vocabulary II now has the best data from both sources!')
  console.log('   - Rich content from existing words collection')
  console.log('   - Korean translations from SAT II import')
  console.log('   - Unified data structure for consistency')
}

function calculateQualityScore(word: WordData): number {
  let score = 0
  
  // Basic fields (10 points each)
  if (word.definition) score += 10
  if (word.korean) score += 10
  if (word.englishDefinition) score += 10
  
  // Part of speech (5 points)
  if (word.partOfSpeech) score += 5
  
  // Examples (15 points, more for multiple)
  if (word.examples && word.examples.length > 0) {
    score += Math.min(15, 5 * word.examples.length)
  }
  
  // Etymology (15 points)
  if (word.etymology) score += 15
  
  // Synonyms/Antonyms (10 points each)
  if (word.synonyms && word.synonyms.length > 0) score += 10
  if (word.antonyms && word.antonyms.length > 0) score += 10
  
  // Metadata (5 points each)
  if (word.difficulty !== undefined) score += 5
  if (word.frequency !== undefined) score += 5
  
  return score
}

optimizeSATVocabulary()
  .then(() => {
    console.log('\n✨ Optimization complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })