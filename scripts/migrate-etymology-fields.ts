/**
 * 데이터 마이그레이션 스크립트
 * etymology/realEtymology 필드를 englishDefinition/etymology로 변경
 * 
 * 실행 방법:
 * npx tsx scripts/migrate-etymology-fields.ts
 */

import { getAdminFirestore } from '../src/lib/firebase/admin'
import type { Timestamp } from 'firebase-admin/firestore'

async function migrateEtymologyFields() {
  const db = getAdminFirestore()
  
  // 마이그레이션할 컬렉션들
  const collections = ['words', 'ai_generated_words', 'photo_vocabulary_words']
  
  console.log('🚀 Starting etymology field migration...')
  console.log('='.repeat(50))
  
  for (const collectionName of collections) {
    console.log(`\n📂 Processing collection: ${collectionName}`)
    console.log('-'.repeat(40))
    
    try {
      const snapshot = await db.collection(collectionName).get()
      console.log(`   Total documents: ${snapshot.size}`)
      
      let migratedCount = 0
      let skippedCount = 0
      let errorCount = 0
      
      // Process in batches to avoid overloading
      const batchSize = 500
      const batches: any[] = []
      let currentBatch = db.batch()
      let batchCount = 0
      
      for (const doc of snapshot.docs) {
        const data = doc.data()
        const updates: any = {}
        let needsUpdate = false
        
        // Check if migration is needed
        // Case 1: Has old etymology field (string) but no englishDefinition
        if (data.etymology && typeof data.etymology === 'string' && !data.englishDefinition) {
          updates.englishDefinition = data.etymology
          updates.etymology = data.realEtymology || null
          needsUpdate = true
          console.log(`   ✓ Migrating: ${data.word} (etymology → englishDefinition)`)
        }
        
        // Case 2: Has realEtymology field
        if (data.realEtymology !== undefined) {
          if (!data.etymology || typeof data.etymology === 'string') {
            updates.etymology = data.realEtymology
          }
          // Mark realEtymology for deletion by setting to null
          updates.realEtymology = null
          needsUpdate = true
          console.log(`   ✓ Migrating: ${data.word} (realEtymology → etymology)`)
        }
        
        // Case 3: Already has correct structure
        if (data.englishDefinition && !data.realEtymology) {
          skippedCount++
          continue
        }
        
        if (needsUpdate) {
          try {
            currentBatch.update(doc.ref, {
              ...updates,
              updatedAt: new Date()
            })
            
            batchCount++
            migratedCount++
            
            // If batch is full, commit it and start a new one
            if (batchCount >= batchSize) {
              batches.push(currentBatch)
              currentBatch = db.batch()
              batchCount = 0
              console.log(`   📦 Batch full, preparing next batch...`)
            }
          } catch (error) {
            console.error(`   ❌ Error updating document ${doc.id}:`, error)
            errorCount++
          }
        } else {
          skippedCount++
        }
      }
      
      // Add the last batch if it has any operations
      if (batchCount > 0) {
        batches.push(currentBatch)
      }
      
      // Commit all batches
      console.log(`\n   📤 Committing ${batches.length} batch(es)...`)
      for (let i = 0; i < batches.length; i++) {
        await batches[i].commit()
        console.log(`   ✅ Batch ${i + 1}/${batches.length} committed`)
      }
      
      // Summary for this collection
      console.log(`\n   📊 ${collectionName} Summary:`)
      console.log(`      • Migrated: ${migratedCount} documents`)
      console.log(`      • Skipped: ${skippedCount} documents (already correct)`)
      console.log(`      • Errors: ${errorCount} documents`)
      
    } catch (error) {
      console.error(`\n❌ Error processing collection ${collectionName}:`, error)
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('✨ Migration completed!')
  console.log('='.repeat(50))
  
  // Verification step
  console.log('\n🔍 Verifying migration...')
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName)
      .where('realEtymology', '!=', null)
      .limit(5)
      .get()
    
    if (!snapshot.empty) {
      console.log(`⚠️  Warning: ${collectionName} still has ${snapshot.size} documents with realEtymology field`)
    } else {
      console.log(`✅ ${collectionName}: No realEtymology fields found`)
    }
  }
}

// Error handling wrapper
async function main() {
  try {
    await migrateEtymologyFields()
    process.exit(0)
  } catch (error) {
    console.error('Fatal error during migration:', error)
    process.exit(1)
  }
}

// Run the migration
if (require.main === module) {
  console.log('🔧 Etymology Field Migration Script')
  console.log('This will migrate etymology/realEtymology → englishDefinition/etymology')
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n')
  
  setTimeout(() => {
    main()
  }, 3000)
}

export default migrateEtymologyFields