import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

export async function POST(request: NextRequest) {
  try {
    // Admin 권한 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    
    // Admin 사용자만 실행 가능
    const adminEmails = ['sinclair.kevin.kr@gmail.com', 'vocanet@gmail.com', 'admin@vocabulary-app.com']
    if (!adminEmails.includes(decodedToken.email || '')) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const db = getAdminFirestore()
    
    // 마이그레이션할 컬렉션들
    const collections = ['words', 'ai_generated_words', 'photo_vocabulary_words']
    
    const results = {
      total: 0,
      migrated: 0,
      skipped: 0,
      errors: 0,
      collections: {} as Record<string, any>
    }
    
    for (const collectionName of collections) {
      console.log(`Processing collection: ${collectionName}`)
      
      const collectionResult = {
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: 0,
        samples: [] as string[]
      }
      
      try {
        const snapshot = await db.collection(collectionName).get()
        collectionResult.total = snapshot.size
        results.total += snapshot.size
        
        // Process in batches
        const batch = db.batch()
        let batchCount = 0
        const maxBatchSize = 500
        
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
            
            if (collectionResult.samples.length < 3) {
              collectionResult.samples.push(`${data.word}: etymology → englishDefinition`)
            }
          }
          
          // Case 2: Has realEtymology field
          if (data.realEtymology !== undefined) {
            if (!data.etymology || typeof data.etymology === 'string') {
              updates.etymology = data.realEtymology
            }
            // Mark realEtymology for deletion
            updates.realEtymology = null
            needsUpdate = true
            
            if (collectionResult.samples.length < 3) {
              collectionResult.samples.push(`${data.word}: realEtymology → etymology`)
            }
          }
          
          // Case 3: Already has correct structure
          if (data.englishDefinition && !data.realEtymology && data.realEtymology !== '') {
            collectionResult.skipped++
            results.skipped++
            continue
          }
          
          if (needsUpdate) {
            try {
              batch.update(doc.ref, {
                ...updates,
                updatedAt: new Date()
              })
              
              batchCount++
              collectionResult.migrated++
              results.migrated++
              
              // Commit batch if it's full
              if (batchCount >= maxBatchSize) {
                await batch.commit()
                batchCount = 0
              }
            } catch (error) {
              console.error(`Error updating document ${doc.id}:`, error)
              collectionResult.errors++
              results.errors++
            }
          } else {
            collectionResult.skipped++
            results.skipped++
          }
        }
        
        // Commit remaining batch operations
        if (batchCount > 0) {
          await batch.commit()
        }
        
      } catch (error) {
        console.error(`Error processing collection ${collectionName}:`, error)
        collectionResult.errors++
        results.errors++
      }
      
      results.collections[collectionName] = collectionResult
    }
    
    // Verification step
    const verification = {} as Record<string, boolean>
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName)
        .where('realEtymology', '!=', null)
        .limit(1)
        .get()
      
      verification[collectionName] = snapshot.empty
    }
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      results,
      verification,
      summary: {
        totalDocuments: results.total,
        successfullyMigrated: results.migrated,
        alreadyCorrect: results.skipped,
        failedMigrations: results.errors,
        migrationRate: results.total > 0 
          ? `${((results.migrated / results.total) * 100).toFixed(1)}%`
          : '0%'
      }
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Migration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check migration status
export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    const collections = ['words', 'ai_generated_words', 'photo_vocabulary_words']
    
    const status = {} as Record<string, any>
    
    for (const collectionName of collections) {
      const totalSnapshot = await db.collection(collectionName).count().get()
      const oldFieldSnapshot = await db.collection(collectionName)
        .where('realEtymology', '!=', null)
        .count()
        .get()
      
      const newFieldSnapshot = await db.collection(collectionName)
        .where('englishDefinition', '!=', null)
        .count()
        .get()
      
      status[collectionName] = {
        total: totalSnapshot.data().count,
        withOldField: oldFieldSnapshot.data().count,
        withNewField: newFieldSnapshot.data().count,
        needsMigration: oldFieldSnapshot.data().count > 0
      }
    }
    
    return NextResponse.json({
      success: true,
      status,
      summary: {
        allMigrated: Object.values(status).every((s: any) => !s.needsMigration),
        collections: Object.keys(status),
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to check migration status',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}