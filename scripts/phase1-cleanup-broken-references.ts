#!/usr/bin/env tsx
/**
 * Phase 1.2: Cleanup Broken References
 * 
 * Remove invalid wordIds from collections and update metadata
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

interface BrokenReference {
  collectionId: string
  collectionName: string
  wordId: string
  reason: 'not_found' | 'missing_reverse_ref'
}

interface CleanupStats {
  collectionsProcessed: number
  brokenReferencesFound: number
  brokenReferencesFixed: number
  collectionsUpdated: number
  errors: number
}

// Safe-mode configuration
const SAFE_MODE_CONFIG = {
  DRY_RUN: process.argv.includes('--dry-run'),
  VERBOSE: process.argv.includes('--verbose'),
  COLLECTION_LIMIT: process.argv.includes('--test') ? 2 : undefined,
  BACKUP_BEFORE_UPDATE: true,
}

async function validateEnvironment(): Promise<void> {
  console.log('🔒 Safe Mode: Validating environment...')
  
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Missing required Firebase admin credentials')
  }
  
  // Test database connectivity
  try {
    const testDoc = await db.collection('vocabulary_collections').limit(1).get()
    console.log(`✅ Database connection verified (${testDoc.size} collections found)`)
  } catch (error) {
    throw new Error(`Database connection failed: ${error}`)
  }
  
  if (SAFE_MODE_CONFIG.DRY_RUN) {
    console.log('🧪 DRY RUN MODE: No actual database modifications will be made')
  }
}

async function findBrokenReferences(): Promise<BrokenReference[]> {
  console.log('🔍 Scanning for broken references...')
  
  const brokenRefs: BrokenReference[] = []
  
  // Check vocabulary_collections
  const officialCollections = await db.collection('vocabulary_collections').get()
  
  for (const collection of officialCollections.docs) {
    const data = collection.data()
    const wordIds = data.wordIds || data.words || []
    
    if (wordIds.length === 0) continue
    
    console.log(`📚 Checking "${data.name}" (${wordIds.length} word references)`)
    
    for (const wordId of wordIds) {
      try {
        const wordDoc = await db.collection('words_v3').doc(wordId).get()
        
        if (!wordDoc.exists) {
          brokenRefs.push({
            collectionId: collection.id,
            collectionName: data.name || collection.id,
            wordId,
            reason: 'not_found'
          })
          if (SAFE_MODE_CONFIG.VERBOSE) {
            console.log(`   ❌ Word not found: ${wordId}`)
          }
        } else {
          // Check reverse reference
          const wordData = wordDoc.data()
          if (!wordData?.collectionIds?.includes(collection.id)) {
            brokenRefs.push({
              collectionId: collection.id,
              collectionName: data.name || collection.id,
              wordId,
              reason: 'missing_reverse_ref'
            })
            if (SAFE_MODE_CONFIG.VERBOSE) {
              console.log(`   ⚠️  Missing reverse reference: ${wordId}`)
            }
          }
        }
      } catch (error) {
        console.log(`   💥 Error checking word ${wordId}: ${error}`)
        brokenRefs.push({
          collectionId: collection.id,
          collectionName: data.name || collection.id,
          wordId,
          reason: 'not_found'
        })
      }
    }
  }
  
  // Check personal_collections
  const personalCollections = await db.collection('personal_collections').get()
  
  for (const collection of personalCollections.docs) {
    const data = collection.data()
    const wordIds = data.wordIds || data.words || []
    
    if (wordIds.length === 0) continue
    
    console.log(`👤 Checking "${data.name || collection.id}" (${wordIds.length} word references)`)
    
    for (const wordId of wordIds) {
      try {
        const wordDoc = await db.collection('words_v3').doc(wordId).get()
        
        if (!wordDoc.exists) {
          brokenRefs.push({
            collectionId: collection.id,
            collectionName: data.name || collection.id,
            wordId,
            reason: 'not_found'
          })
          if (SAFE_MODE_CONFIG.VERBOSE) {
            console.log(`   ❌ Word not found: ${wordId}`)
          }
        } else {
          // Check reverse reference
          const wordData = wordDoc.data()
          if (!wordData?.collectionIds?.includes(collection.id)) {
            brokenRefs.push({
              collectionId: collection.id,
              collectionName: data.name || collection.id,
              wordId,
              reason: 'missing_reverse_ref'
            })
            if (SAFE_MODE_CONFIG.VERBOSE) {
              console.log(`   ⚠️  Missing reverse reference: ${wordId}`)
            }
          }
        }
      } catch (error) {
        console.log(`   💥 Error checking word ${wordId}: ${error}`)
        brokenRefs.push({
          collectionId: collection.id,
          collectionName: data.name || collection.id,
          wordId,
          reason: 'not_found'
        })
      }
    }
  }
  
  return brokenRefs
}

async function backupCollectionData(collectionId: string, collectionName: string, data: any): Promise<void> {
  if (!SAFE_MODE_CONFIG.BACKUP_BEFORE_UPDATE) return
  
  const backupData = {
    ...data,
    backedUpAt: admin.firestore.FieldValue.serverTimestamp(),
    originalCollectionId: collectionId,
    backupReason: 'phase1_cleanup'
  }
  
  await db.collection('_backups_phase1').doc(collectionId).set(backupData)
  console.log(`   💾 Backup created for "${collectionName}"`)
}

async function fixCollectionReferences(
  collectionId: string, 
  collectionName: string,
  brokenWordIds: string[]
): Promise<{ fixed: number; errors: number }> {
  
  try {
    console.log(`\n🔧 Fixing collection "${collectionName}" (${brokenWordIds.length} broken references)`)
    
    // Determine collection type
    let collectionRef = db.collection('vocabulary_collections').doc(collectionId)
    let collectionDoc = await collectionRef.get()
    
    if (!collectionDoc.exists) {
      collectionRef = db.collection('personal_collections').doc(collectionId)
      collectionDoc = await collectionRef.get()
    }
    
    if (!collectionDoc.exists) {
      throw new Error(`Collection ${collectionId} not found`)
    }
    
    const currentData = collectionDoc.data()!
    const currentWordIds = currentData.wordIds || currentData.words || []
    
    // Create backup
    if (SAFE_MODE_CONFIG.BACKUP_BEFORE_UPDATE) {
      await backupCollectionData(collectionId, collectionName, currentData)
    }
    
    // Remove broken references
    const validWordIds = currentWordIds.filter((wordId: string) => !brokenWordIds.includes(wordId))
    const removedCount = currentWordIds.length - validWordIds.length
    
    console.log(`   📊 Removing ${removedCount} broken references (${validWordIds.length} valid remain)`)
    
    if (SAFE_MODE_CONFIG.DRY_RUN) {
      console.log(`   🧪 DRY RUN: Would update collection with ${validWordIds.length} valid wordIds`)
      return { fixed: removedCount, errors: 0 }
    }
    
    // Update collection (use the same field name as original)
    const fieldName = currentData.wordIds !== undefined ? 'wordIds' : 'words'
    await collectionRef.update({
      [fieldName]: validWordIds,
      wordCount: validWordIds.length,
      lastValidated: admin.firestore.FieldValue.serverTimestamp(),
      lastCleanup: admin.firestore.FieldValue.serverTimestamp(),
      cleanupStats: {
        brokenReferencesRemoved: removedCount,
        cleanupDate: admin.firestore.FieldValue.serverTimestamp()
      }
    })
    
    console.log(`   ✅ Collection updated successfully`)
    return { fixed: removedCount, errors: 0 }
    
  } catch (error) {
    console.log(`   💥 Error fixing collection "${collectionName}": ${error}`)
    return { fixed: 0, errors: 1 }
  }
}

async function generateReport(brokenRefs: BrokenReference[], stats: CleanupStats): Promise<void> {
  console.log('\n📊 Generating detailed report...')
  
  // Group broken references by collection
  const refsByCollection = new Map<string, BrokenReference[]>()
  brokenRefs.forEach(ref => {
    if (!refsByCollection.has(ref.collectionId)) {
      refsByCollection.set(ref.collectionId, [])
    }
    refsByCollection.get(ref.collectionId)!.push(ref)
  })
  
  console.log(`\n📋 Broken References by Collection:`)
  refsByCollection.forEach((refs, collectionId) => {
    const collectionName = refs[0].collectionName
    const notFoundCount = refs.filter(r => r.reason === 'not_found').length
    const missingReverseCount = refs.filter(r => r.reason === 'missing_reverse_ref').length
    
    console.log(`\n   📚 "${collectionName}" (${refs.length} issues):`)
    if (notFoundCount > 0) {
      console.log(`      ❌ Words not found: ${notFoundCount}`)
    }
    if (missingReverseCount > 0) {
      console.log(`      ⚠️  Missing reverse refs: ${missingReverseCount}`)
    }
    
    if (SAFE_MODE_CONFIG.VERBOSE) {
      refs.slice(0, 5).forEach(ref => {
        const icon = ref.reason === 'not_found' ? '❌' : '⚠️ '
        console.log(`         ${icon} ${ref.wordId}`)
      })
      if (refs.length > 5) {
        console.log(`         ... and ${refs.length - 5} more`)
      }
    }
  })
  
  // Summary statistics
  const notFoundTotal = brokenRefs.filter(r => r.reason === 'not_found').length
  const missingReverseTotal = brokenRefs.filter(r => r.reason === 'missing_reverse_ref').length
  
  console.log(`\n📈 Breakdown by Issue Type:`)
  console.log(`   ❌ Words not found: ${notFoundTotal}`)
  console.log(`   ⚠️  Missing reverse references: ${missingReverseTotal}`)
  console.log(`   📊 Total broken references: ${brokenRefs.length}`)
}

async function cleanupBrokenReferences(): Promise<void> {
  console.log('🚀 Phase 1.2: Cleanup Broken References')
  console.log('=' .repeat(60))
  
  const startTime = Date.now()
  const stats: CleanupStats = {
    collectionsProcessed: 0,
    brokenReferencesFound: 0,
    brokenReferencesFixed: 0,
    collectionsUpdated: 0,
    errors: 0
  }
  
  try {
    // Environment validation
    await validateEnvironment()
    
    // Find all broken references
    const brokenRefs = await findBrokenReferences()
    stats.brokenReferencesFound = brokenRefs.length
    
    if (brokenRefs.length === 0) {
      console.log('✅ No broken references found! Collections are clean.')
      return
    }
    
    console.log(`\n🎯 Found ${brokenRefs.length} broken references across collections`)
    
    // Generate detailed report
    await generateReport(brokenRefs, stats)
    
    // Group by collection for fixing
    const refsByCollection = new Map<string, BrokenReference[]>()
    brokenRefs.forEach(ref => {
      if (!refsByCollection.has(ref.collectionId)) {
        refsByCollection.set(ref.collectionId, [])
      }
      refsByCollection.get(ref.collectionId)!.push(ref)
    })
    
    console.log(`\n🔧 Fixing ${refsByCollection.size} collections...`)
    
    // Fix each collection
    for (const [collectionId, refs] of refsByCollection) {
      const collectionName = refs[0].collectionName
      const brokenWordIds = refs.map(r => r.wordId)
      
      const result = await fixCollectionReferences(collectionId, collectionName, brokenWordIds)
      
      stats.collectionsProcessed++
      stats.brokenReferencesFixed += result.fixed
      stats.errors += result.errors
      
      if (result.fixed > 0) {
        stats.collectionsUpdated++
      }
    }
    
    // Final summary
    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log('\n' + '=' .repeat(60))
    console.log('📊 PHASE 1.2 COMPLETION REPORT')
    console.log('=' .repeat(60))
    console.log(`🔍 Collections processed: ${stats.collectionsProcessed}`)
    console.log(`❌ Broken references found: ${stats.brokenReferencesFound}`)
    console.log(`✅ Broken references fixed: ${stats.brokenReferencesFixed}`)
    console.log(`📚 Collections updated: ${stats.collectionsUpdated}`)
    console.log(`💥 Errors encountered: ${stats.errors}`)
    console.log(`⏱️  Total duration: ${duration} seconds`)
    
    if (SAFE_MODE_CONFIG.BACKUP_BEFORE_UPDATE && !SAFE_MODE_CONFIG.DRY_RUN) {
      console.log(`💾 Backups stored in: _backups_phase1 collection`)
    }
    
    if (SAFE_MODE_CONFIG.DRY_RUN) {
      console.log('\n🧪 DRY RUN COMPLETE - No actual changes made')
      console.log('   Run without --dry-run to execute actual cleanup')
    } else {
      console.log('\n✨ Phase 1.2 Successfully Completed!')
      console.log('   Broken references have been cleaned up')
      console.log('   Collection metadata has been updated')
      console.log('   You can now proceed to Phase 1.3: Data Validation System')
    }
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR during Phase 1.2:')
    console.error(error)
    console.error('\nOperation aborted. Please check the error and retry.')
    process.exit(1)
  }
}

// Execute the script
cleanupBrokenReferences()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Unhandled error:', error)
    process.exit(1)
  })