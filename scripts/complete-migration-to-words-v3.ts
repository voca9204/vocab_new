#!/usr/bin/env tsx
/**
 * Complete Migration Script: words → words_v3
 * This script completes the migration by transferring remaining 2,548 words
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

interface LegacyWord {
  word: string
  korean?: string
  definition?: string
  englishDefinition?: string
  partOfSpeech?: string | string[]
  examples?: string[]
  synonyms?: string[]
  antonyms?: string[]
  etymology?: string
  difficulty?: number
  frequency?: number
  isSAT?: boolean
  source?: any
  createdAt?: any
  updatedAt?: any
  [key: string]: any
}

interface WordsV3Document {
  word: string
  normalizedWord: string
  korean?: string
  definition?: string
  englishDefinition?: string
  partOfSpeech: string[]
  examples: string[]
  synonyms: string[]
  antonyms: string[]
  etymology?: string
  difficulty: number
  frequency: number
  isSAT: boolean
  source: {
    type: 'legacy_migration'
    collection: 'words'
    originalId: string
    migrationId: string
    addedAt: Date
  }
  quality: {
    score: number
    hasKorean: boolean
    hasDefinition: boolean
    hasExamples: boolean
    hasEtymology: boolean
  }
  createdAt: Date
  updatedAt: Date
  version: number
}

async function completeMigration() {
  console.log('🚀 Starting Complete Migration: words → words_v3\n')
  console.log('=' .repeat(60))
  
  const migrationId = `migration_${Date.now()}`
  console.log(`📋 Migration ID: ${migrationId}`)
  
  // Step 1: Get current state
  console.log('\n📊 Step 1: Analyzing current state...')
  
  const wordsSnapshot = await db.collection('words').get()
  const wordsV3Snapshot = await db.collection('words_v3').get()
  
  console.log(`   Legacy words collection: ${wordsSnapshot.size} documents`)
  console.log(`   Current words_v3: ${wordsV3Snapshot.size} documents`)
  
  if (wordsSnapshot.empty) {
    console.log('✅ No words to migrate. Migration already complete.')
    return
  }
  
  // Step 2: Check for duplicates
  console.log('\n🔍 Step 2: Checking for duplicates...')
  
  const existingWords = new Set<string>()
  wordsV3Snapshot.forEach(doc => {
    const data = doc.data()
    if (data.normalizedWord) {
      existingWords.add(data.normalizedWord)
    } else if (data.word) {
      existingWords.add(data.word.toLowerCase().replace(/[^a-z]/g, ''))
    }
  })
  
  console.log(`   Found ${existingWords.size} existing normalized words in words_v3`)
  
  // Step 3: Process words in batches
  console.log('\n⚡ Step 3: Processing migration...')
  
  const batchSize = 500
  const allWords = wordsSnapshot.docs
  let processedCount = 0
  let migratedCount = 0
  let skippedCount = 0
  let errorCount = 0
  
  const migrationLog: {
    word: string
    action: 'migrated' | 'skipped' | 'error'
    reason?: string
  }[] = []
  
  for (let i = 0; i < allWords.length; i += batchSize) {
    const batch = db.batch()
    const currentBatch = allWords.slice(i, i + batchSize)
    let batchMigrations = 0
    
    console.log(`\n   📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allWords.length/batchSize)} (${currentBatch.length} words)`)
    
    for (const doc of currentBatch) {
      try {
        const legacyData = doc.data() as LegacyWord
        processedCount++
        
        // Normalize word for duplicate checking
        const normalizedWord = legacyData.word.toLowerCase().replace(/[^a-z]/g, '')
        
        // Skip if already exists in words_v3
        if (existingWords.has(normalizedWord)) {
          skippedCount++
          migrationLog.push({
            word: legacyData.word,
            action: 'skipped',
            reason: 'duplicate'
          })
          continue
        }
        
        // Convert to words_v3 format
        const wordsV3Doc: WordsV3Document = {
          word: legacyData.word,
          normalizedWord,
          korean: legacyData.korean || undefined,
          definition: legacyData.definition || undefined,
          englishDefinition: legacyData.englishDefinition || undefined,
          partOfSpeech: Array.isArray(legacyData.partOfSpeech) 
            ? legacyData.partOfSpeech 
            : legacyData.partOfSpeech 
              ? [legacyData.partOfSpeech] 
              : [],
          examples: Array.isArray(legacyData.examples) ? legacyData.examples : [],
          synonyms: Array.isArray(legacyData.synonyms) ? legacyData.synonyms : [],
          antonyms: Array.isArray(legacyData.antonyms) ? legacyData.antonyms : [],
          etymology: legacyData.etymology || undefined,
          difficulty: typeof legacyData.difficulty === 'number' ? legacyData.difficulty : 5,
          frequency: typeof legacyData.frequency === 'number' ? legacyData.frequency : 5,
          isSAT: Boolean(legacyData.isSAT),
          source: {
            type: 'legacy_migration',
            collection: 'words',
            originalId: doc.id,
            migrationId,
            addedAt: new Date()
          },
          quality: {
            score: calculateQualityScore({
              definition: legacyData.definition,
              korean: legacyData.korean,
              examples: legacyData.examples,
              etymology: legacyData.etymology,
              synonyms: legacyData.synonyms,
              antonyms: legacyData.antonyms
            }),
            hasKorean: Boolean(legacyData.korean),
            hasDefinition: Boolean(legacyData.definition),
            hasExamples: Boolean(legacyData.examples && legacyData.examples.length > 0),
            hasEtymology: Boolean(legacyData.etymology)
          },
          createdAt: legacyData.createdAt?.toDate ? legacyData.createdAt.toDate() : new Date(),
          updatedAt: new Date(),
          version: 1
        }
        
        // Add to batch
        const newDocRef = db.collection('words_v3').doc()
        batch.set(newDocRef, wordsV3Doc)
        
        batchMigrations++
        migratedCount++
        existingWords.add(normalizedWord) // Add to set to avoid duplicates in same batch
        
        migrationLog.push({
          word: legacyData.word,
          action: 'migrated'
        })
        
      } catch (error) {
        errorCount++
        console.error(`     ❌ Error processing ${doc.id}:`, error)
        
        migrationLog.push({
          word: doc.id,
          action: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Commit batch if there are migrations
    if (batchMigrations > 0) {
      await batch.commit()
      console.log(`     ✅ Committed ${batchMigrations} migrations`)
    } else {
      console.log(`     ⚠️ No new words to migrate in this batch`)
    }
    
    // Progress update
    console.log(`     📊 Progress: ${processedCount}/${allWords.length} processed`)
  }
  
  // Step 4: Generate migration report
  console.log('\n' + '=' .repeat(60))
  console.log('📊 MIGRATION REPORT')
  console.log('=' .repeat(60))
  
  console.log(`\n✅ Migration Complete!`)
  console.log(`   Migration ID: ${migrationId}`)
  console.log(`   Total processed: ${processedCount}`)
  console.log(`   Successfully migrated: ${migratedCount}`)
  console.log(`   Skipped (duplicates): ${skippedCount}`)
  console.log(`   Errors: ${errorCount}`)
  console.log(`   Success rate: ${((migratedCount / processedCount) * 100).toFixed(1)}%`)
  
  // Final verification
  const finalWordsV3Snapshot = await db.collection('words_v3').get()
  console.log(`   Final words_v3 count: ${finalWordsV3Snapshot.size}`)
  
  // Sample migrated words
  if (migratedCount > 0) {
    console.log(`\n📝 Sample migrated words (first 5):`)
    const migratedSamples = migrationLog.filter(log => log.action === 'migrated').slice(0, 5)
    migratedSamples.forEach(log => {
      console.log(`   • ${log.word}`)
    })
  }
  
  // Error summary
  if (errorCount > 0) {
    console.log(`\n❌ Errors encountered (first 5):`)
    const errorSamples = migrationLog.filter(log => log.action === 'error').slice(0, 5)
    errorSamples.forEach(log => {
      console.log(`   • ${log.word}: ${log.reason}`)
    })
  }
  
  console.log('\n' + '=' .repeat(60))
  console.log('🎉 Migration Complete!')
  console.log('\nNext steps:')
  console.log('1. Verify data integrity with verification script')
  console.log('2. Update collectionPriority configuration')
  console.log('3. Archive or remove legacy "words" collection')
  console.log('4. Update documentation')
}

function calculateQualityScore(data: any): number {
  let score = 0
  
  // Basic fields (10 points each)
  if (data.definition) score += 10
  if (data.korean) score += 10
  
  // Examples (15 points)
  if (data.examples && data.examples.length > 0) {
    score += Math.min(15, 5 * data.examples.length)
  }
  
  // Etymology (15 points)
  if (data.etymology) score += 15
  
  // Synonyms/Antonyms (10 points each)
  if (data.synonyms && data.synonyms.length > 0) score += 10
  if (data.antonyms && data.antonyms.length > 0) score += 10
  
  return Math.min(score, 100) // Cap at 100
}

completeMigration()
  .then(() => {
    console.log('\n✨ Script execution complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })