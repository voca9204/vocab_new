#!/usr/bin/env tsx
/**
 * Verify the actual status of all vocabulary collections
 * This script helps understand the current state of migration
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

async function verifyCollectionStatus() {
  console.log('🔍 Verifying Collection Status and Migration State\n')
  console.log('=' .repeat(60))
  
  const collections = [
    { name: 'words_v3', description: 'NEW unified master pool', expectedStatus: 'PRIMARY' },
    { name: 'words', description: 'Legacy master words', expectedStatus: 'DEPRECATED' },
    { name: 'ai_generated_words', description: 'AI-generated words', expectedStatus: 'ACTIVE' },
    { name: 'veterans_vocabulary', description: 'V.ZIP 3K PDF words', expectedStatus: 'MIGRATED' },
    { name: 'vocabulary', description: 'Old SAT words', expectedStatus: 'MIGRATED' },
    { name: 'photo_vocabulary_words', description: 'OCR extracted words', expectedStatus: 'ACTIVE' },
    { name: 'vocabulary_collections', description: 'Official collections', expectedStatus: 'ACTIVE' },
    { name: 'personal_collections', description: 'User collections', expectedStatus: 'ACTIVE' },
  ]
  
  const results: {
    collection: string
    description: string
    expectedStatus: string
    actualCount: number
    sampleWords: string[]
    assessment: string
  }[] = []
  
  for (const col of collections) {
    console.log(`\n📊 Checking ${col.name}...`)
    
    try {
      // Get exact document count (no limit)
      const snapshot = await db.collection(col.name).get()
      const count = snapshot.size
      
      // Get sample words (if it's a word collection)
      const sampleWords: string[] = []
      if (col.name.includes('word') || col.name === 'vocabulary') {
        const sampleSnapshot = await db.collection(col.name).limit(3).get()
        sampleSnapshot.forEach(doc => {
          const data = doc.data()
          if (data.word) {
            sampleWords.push(data.word)
          } else if (data.name) {
            sampleWords.push(data.name)
          }
        })
      }
      
      // Assess actual status
      let assessment = ''
      if (col.expectedStatus === 'PRIMARY' && count > 0) {
        assessment = '✅ ACTIVE (as expected)'
      } else if (col.expectedStatus === 'DEPRECATED' && count > 0) {
        assessment = '⚠️ STILL HAS DATA (should be empty/migrated)'
      } else if (col.expectedStatus === 'MIGRATED' && count > 0) {
        assessment = '❌ NOT MIGRATED (still has data)'
      } else if (col.expectedStatus === 'MIGRATED' && count === 0) {
        assessment = '✅ MIGRATED (empty as expected)'
      } else if (col.expectedStatus === 'ACTIVE' && count > 0) {
        assessment = '✅ ACTIVE (as expected)'
      } else if (col.expectedStatus === 'ACTIVE' && count === 0) {
        assessment = '⚠️ EMPTY (expected to have data)'
      } else {
        assessment = '❓ UNKNOWN STATUS'
      }
      
      results.push({
        collection: col.name,
        description: col.description,
        expectedStatus: col.expectedStatus,
        actualCount: count,
        sampleWords,
        assessment
      })
      
      console.log(`   Count: ${count}`)
      if (sampleWords.length > 0) {
        console.log(`   Samples: ${sampleWords.join(', ')}`)
      }
      console.log(`   Status: ${assessment}`)
      
    } catch (error) {
      console.log(`   ❌ Error accessing collection: ${error}`)
      results.push({
        collection: col.name,
        description: col.description,
        expectedStatus: col.expectedStatus,
        actualCount: 0,
        sampleWords: [],
        assessment: '❌ ERROR accessing collection'
      })
    }
  }
  
  // Generate summary report
  console.log('\n' + '=' .repeat(60))
  console.log('📊 COLLECTION STATUS SUMMARY')
  console.log('=' .repeat(60))
  
  console.log('\n📋 Collection Status Table:')
  console.log('┌─────────────────────────┬──────────┬──────────────┬─────────────────────────┐')
  console.log('│ Collection              │ Count    │ Expected     │ Assessment              │')
  console.log('├─────────────────────────┼──────────┼──────────────┼─────────────────────────┤')
  
  results.forEach(r => {
    const colName = r.collection.padEnd(23)
    const count = r.actualCount.toString().padEnd(8)
    const expected = r.expectedStatus.padEnd(12)
    const assessment = r.assessment.padEnd(23)
    console.log(`│ ${colName} │ ${count} │ ${expected} │ ${assessment} │`)
  })
  
  console.log('└─────────────────────────┴──────────┴──────────────┴─────────────────────────┘')
  
  // Migration status analysis
  console.log('\n🔄 Migration Status Analysis:')
  
  const wordsV3 = results.find(r => r.collection === 'words_v3')
  const wordsLegacy = results.find(r => r.collection === 'words')
  const veteransLegacy = results.find(r => r.collection === 'veterans_vocabulary')
  const vocabularyLegacy = results.find(r => r.collection === 'vocabulary')
  
  if (wordsV3 && wordsV3.actualCount > 0) {
    console.log(`✅ words_v3 is ACTIVE with ${wordsV3.actualCount} words`)
  } else {
    console.log('❌ words_v3 is EMPTY - migration may have failed')
  }
  
  if (wordsLegacy && wordsLegacy.actualCount > 0) {
    console.log(`⚠️ Legacy 'words' collection still contains ${wordsLegacy.actualCount} documents`)
    console.log('   → This collection should be deprecated but is still being used as fallback')
    console.log('   → Recommendation: Complete migration to words_v3 and remove from collectionPriority')
  }
  
  if (veteransLegacy && veteransLegacy.actualCount > 0) {
    console.log(`⚠️ 'veterans_vocabulary' still contains ${veteransLegacy.actualCount} documents`)
    console.log('   → Should have been migrated to words_v3')
  }
  
  if (vocabularyLegacy && vocabularyLegacy.actualCount > 0) {
    console.log(`⚠️ 'vocabulary' still contains ${vocabularyLegacy.actualCount} documents`)
    console.log('   → Should have been migrated to words_v3')
  }
  
  // Architecture recommendations
  console.log('\n' + '=' .repeat(60))
  console.log('🏗️ ARCHITECTURE RECOMMENDATIONS')
  console.log('=' .repeat(60))
  
  const hasLegacyData = (wordsLegacy?.actualCount || 0) > 0 || 
                        (veteransLegacy?.actualCount || 0) > 0 || 
                        (vocabularyLegacy?.actualCount || 0) > 0
  
  if (hasLegacyData) {
    console.log('\n⚠️ INCOMPLETE MIGRATION DETECTED')
    console.log('\nRecommended Actions:')
    console.log('1. Complete migration of remaining legacy data to words_v3')
    console.log('2. Update collectionPriority to remove legacy collections:')
    console.log('   - Remove "words" from priority list')
    console.log('   - Remove "veterans_vocabulary" from priority list')
    console.log('   - Remove "vocabulary" from priority list')
    console.log('3. Update WordAdapter to only use words_v3 as primary source')
    console.log('4. Archive or delete legacy collections after verification')
    console.log('\nCurrent Issue:')
    console.log('The "words" collection is still being used as a fallback source,')
    console.log('which explains why your analysis found 2249 words there.')
    console.log('This creates confusion and potential data inconsistency.')
  } else if (wordsV3 && wordsV3.actualCount > 0) {
    console.log('\n✅ MIGRATION APPEARS COMPLETE')
    console.log('All legacy collections are empty and words_v3 is populated.')
    console.log('Consider removing legacy collections from collectionPriority.')
  }
  
  console.log('\n' + '=' .repeat(60))
  console.log('✨ Verification Complete!')
}

verifyCollectionStatus()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })