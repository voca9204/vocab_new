import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // 모든 마스터 단어 컬렉션
    const collections = ['words', 'ai_generated_words', 'photo_vocabulary_words']
    let totalCount = 0
    const collectionCounts: Record<string, number> = {}
    
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).count().get()
        const count = snapshot.data().count
        collectionCounts[collectionName] = count
        totalCount += count
        console.log(`📊 Collection ${collectionName} has ${count} documents`)
      } catch (error) {
        console.error(`Error counting ${collectionName}:`, error)
        collectionCounts[collectionName] = 0
      }
    }
    
    return NextResponse.json({
      success: true,
      totalCount,
      collectionCounts,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting total vocabulary count:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}