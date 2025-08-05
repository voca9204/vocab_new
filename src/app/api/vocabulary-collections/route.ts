import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // 모든 vocabulary_collections 가져오기
    const collectionsSnapshot = await db
      .collection('vocabulary_collections')
      .orderBy('createdAt', 'desc')
      .get()
    
    const collections = collectionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
    }))
    
    console.log(`📚 Found ${collections.length} vocabulary collections`)
    
    return NextResponse.json({
      success: true,
      collections,
      totalCount: collections.length
    })
    
  } catch (error) {
    console.error('Vocabulary collections fetch error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}