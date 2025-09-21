#!/usr/bin/env tsx
/**
 * Phase 1.1: Fix Bidirectional References
 * 
 * Safely populate missing collectionIds in words_v3 documents
 * Following improvement-plan.md specifications with enhanced safety measures
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

interface CollectionInfo {
  id: string
  name: string
  wordIds: string[]
  type: 'official' | 'personal'
}

interface ProcessingStats {
  collectionsProcessed: number
  wordsUpdated: number
  wordsSkipped: number
  errors: number
  batchesExecuted: number
}

// Safe-mode configuration
const SAFE_MODE_CONFIG = {
  BATCH_SIZE: 100, // Smaller batches for safety
  MAX_RETRIES: 3,
  DELAY_BETWEEN_BATCHES: 1000, // 1 second delay
  DRY_RUN: process.argv.includes('--dry-run'),
  VERBOSE: process.argv.includes('--verbose'),
  COLLECTION_LIMIT: process.argv.includes('--test') ? 2 : undefined, // Test mode limit
}

async function validateEnvironment(): Promise<void> {
  console.log('🔒 Safe Mode: Validating environment...')
  
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Missing required Firebase admin credentials')
  }
  
  // Test database connectivity
  try {
    const testDoc = await db.collection('words_v3').limit(1).get()
    console.log(`✅ Database connection verified (${testDoc.size} test documents found)`)
  } catch (error) {
    throw new Error(`Database connection failed: ${error}`)
  }
  
  if (SAFE_MODE_CONFIG.DRY_RUN) {
    console.log('🧪 DRY RUN MODE: No actual database modifications will be made')
  }
}

async function getAllCollections(): Promise<CollectionInfo[]> {
  console.log('📚 Fetching all collections...')
  
  const [officialCollections, personalCollections] = await Promise.all([
    db.collection('vocabulary_collections').get(),
    db.collection('personal_collections').get()
  ])
  
  const collections: CollectionInfo[] = []
  
  // Process official collections (handle both 'wordIds' and 'words' fields)
  officialCollections.docs.forEach(doc => {
    const data = doc.data()
    const wordIds = data.wordIds || data.words || []
    if (wordIds.length > 0) {
      collections.push({
        id: doc.id,
        name: data.name || doc.id,
        wordIds: wordIds,
        type: 'official'
      })
    }
  })
  
  // Process personal collections (handle both 'wordIds' and 'words' fields)
  personalCollections.docs.forEach(doc => {
    const data = doc.data()
    const wordIds = data.wordIds || data.words || []
    if (wordIds.length > 0) {
      collections.push({
        id: doc.id,
        name: data.name || doc.id,
        wordIds: wordIds,
        type: 'personal'
      })
    }
  })
  
  console.log(`📊 Found ${collections.length} collections with words:`)
  collections.forEach(col => {
    console.log(`   ${col.type === 'official' ? '📚' : '👤'} "${col.name}": ${col.wordIds.length} words`)
  })
  
  return SAFE_MODE_CONFIG.COLLECTION_LIMIT 
    ? collections.slice(0, SAFE_MODE_CONFIG.COLLECTION_LIMIT)
    : collections
}

async function checkWordExists(wordId: string): Promise<boolean> {
  try {
    const wordDoc = await db.collection('words_v3').doc(wordId).get()
    return wordDoc.exists
  } catch {
    return false
  }
}

async function getCurrentCollectionIds(wordId: string): Promise<string[]> {
  try {
    const wordDoc = await db.collection('words_v3').doc(wordId).get()
    if (wordDoc.exists) {
      const data = wordDoc.data()
      return data?.collectionIds || []
    }
    return []
  } catch {
    return []
  }
}

async function processCollectionWithRetry(
  collection: CollectionInfo, 
  retryCount = 0
): Promise<{ updated: number; skipped: number; errors: number }> {
  
  try {
    console.log(`\n🔄 Processing: "${collection.name}" (${collection.wordIds.length} words)`)
    
    const stats = { updated: 0, skipped: 0, errors: 0 }
    let batch = db.batch()
    let batchOperations = 0
    
    for (let i = 0; i < collection.wordIds.length; i++) {
      const wordId = collection.wordIds[i]
      
      try {
        // Check if word exists
        const wordExists = await checkWordExists(wordId)
        if (!wordExists) {
          console.log(`   ⚠️  Word not found: ${wordId}`)
          stats.errors++
          continue
        }
        
        // Check current collectionIds
        const currentCollectionIds = await getCurrentCollectionIds(wordId)
        if (currentCollectionIds.includes(collection.id)) {
          if (SAFE_MODE_CONFIG.VERBOSE) {
            console.log(`   ⏭️  Already has reference: ${wordId}`)
          }
          stats.skipped++
          continue
        }
        
        // Add to batch update
        if (!SAFE_MODE_CONFIG.DRY_RUN) {
          const wordRef = db.collection('words_v3').doc(wordId)
          batch.update(wordRef, {
            collectionIds: admin.firestore.FieldValue.arrayUnion(collection.id),
            lastModified: admin.firestore.FieldValue.serverTimestamp()
          })
          batchOperations++
          stats.updated++
        } else {
          console.log(`   🧪 DRY RUN: Would update ${wordId} with collection ${collection.id}`)
          stats.updated++
        }
        
        // Execute batch when it reaches the limit
        if (batchOperations >= SAFE_MODE_CONFIG.BATCH_SIZE) {
          if (!SAFE_MODE_CONFIG.DRY_RUN) {
            await batch.commit()
            console.log(`   ✅ Batch committed: ${batchOperations} operations`)
          }
          batch = db.batch()
          batchOperations = 0
          
          // Safety delay between batches
          if (SAFE_MODE_CONFIG.DELAY_BETWEEN_BATCHES > 0) {
            await new Promise(resolve => setTimeout(resolve, SAFE_MODE_CONFIG.DELAY_BETWEEN_BATCHES))
          }
        }
        
      } catch (wordError) {
        console.log(`   ❌ Error processing word ${wordId}: ${wordError}`)
        stats.errors++
      }
    }
    
    // Commit remaining operations
    if (batchOperations > 0 && !SAFE_MODE_CONFIG.DRY_RUN) {
      await batch.commit()
      console.log(`   ✅ Final batch committed: ${batchOperations} operations`)
    }
    
    console.log(`   📈 Collection "${collection.name}": ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`)
    return stats
    
  } catch (error) {
    console.log(`❌ Error processing collection "${collection.name}": ${error}`)
    
    if (retryCount < SAFE_MODE_CONFIG.MAX_RETRIES) {
      console.log(`🔄 Retrying collection "${collection.name}" (attempt ${retryCount + 1}/${SAFE_MODE_CONFIG.MAX_RETRIES})`)
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))) // Exponential backoff
      return processCollectionWithRetry(collection, retryCount + 1)
    } else {
      console.log(`💥 Failed to process collection "${collection.name}" after ${SAFE_MODE_CONFIG.MAX_RETRIES} retries`)
      return { updated: 0, skipped: 0, errors: collection.wordIds.length }
    }
  }
}

async function validateResults(): Promise<void> {
  console.log('\n🔍 Validating results...')
  
  // Sample a few collections to verify bidirectional references
  const sampleCollections = await db.collection('vocabulary_collections').limit(3).get()
  
  for (const collection of sampleCollections.docs) {
    const data = collection.data()
    if (!data.wordIds || data.wordIds.length === 0) continue
    
    console.log(`\n📚 Validating "${data.name}":`)
    
    // Check first 5 words
    const sampleWords = data.wordIds.slice(0, 5)
    let validReferences = 0
    
    for (const wordId of sampleWords) {
      const wordDoc = await db.collection('words_v3').doc(wordId).get()
      if (wordDoc.exists) {
        const wordData = wordDoc.data()
        if (wordData?.collectionIds?.includes(collection.id)) {
          validReferences++
        }
      }
    }
    
    const percentage = Math.round((validReferences / sampleWords.length) * 100)
    console.log(`   ✅ Bidirectional integrity: ${validReferences}/${sampleWords.length} (${percentage}%)`)
  }
}

async function fixBidirectionalReferences(): Promise<void> {
  console.log('🚀 Phase 1.1: Fix Bidirectional References')
  console.log('=' .repeat(60))
  
  const startTime = Date.now()
  const overallStats: ProcessingStats = {
    collectionsProcessed: 0,
    wordsUpdated: 0,
    wordsSkipped: 0,
    errors: 0,
    batchesExecuted: 0
  }
  
  try {
    // Environment validation
    await validateEnvironment()
    
    // Get all collections
    const collections = await getAllCollections()
    
    if (collections.length === 0) {
      console.log('⚠️  No collections with words found')
      return
    }
    
    console.log(`\n🎯 Processing ${collections.length} collections...`)
    
    // Process each collection
    for (const collection of collections) {
      const collectionStats = await processCollectionWithRetry(collection)
      
      overallStats.collectionsProcessed++
      overallStats.wordsUpdated += collectionStats.updated
      overallStats.wordsSkipped += collectionStats.skipped
      overallStats.errors += collectionStats.errors
    }
    
    // Final validation
    if (!SAFE_MODE_CONFIG.DRY_RUN) {
      await validateResults()
    }
    
    // Summary report
    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log('\n' + '=' .repeat(60))
    console.log('📊 PHASE 1.1 COMPLETION REPORT')
    console.log('=' .repeat(60))
    console.log(`✅ Collections processed: ${overallStats.collectionsProcessed}`)
    console.log(`📝 Words updated: ${overallStats.wordsUpdated}`)
    console.log(`⏭️  Words skipped: ${overallStats.wordsSkipped}`)
    console.log(`❌ Errors encountered: ${overallStats.errors}`)
    console.log(`⏱️  Total duration: ${duration} seconds`)
    
    if (SAFE_MODE_CONFIG.DRY_RUN) {
      console.log('\n🧪 DRY RUN COMPLETE - No actual changes made')
      console.log('   Run without --dry-run to execute actual updates')
    } else {
      console.log('\n✨ Phase 1.1 Successfully Completed!')
      console.log('   Bidirectional references have been populated')
      console.log('   You can now proceed to Phase 1.2: Broken Reference Cleanup')
    }
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR during Phase 1.1:')
    console.error(error)
    console.error('\nOperation aborted. Please check the error and retry.')
    process.exit(1)
  }
}

// Execute the script
fixBidirectionalReferences()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Unhandled error:', error)
    process.exit(1)
  })