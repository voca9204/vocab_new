import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const collection = searchParams.get('collection')
    
    if (!collection) {
      return NextResponse.json({
        success: false,
        error: 'Collection parameter is required'
      }, { status: 400 })
    }
    
    const db = getAdminFirestore()
    
    // 컬렉션의 문서 수 확인
    const snapshot = await db.collection(collection).count().get()
    const count = snapshot.data().count
    
    console.log(`📊 Collection ${collection} has ${count} documents`)
    
    return NextResponse.json({
      success: true,
      collection,
      count
    })
    
  } catch (error) {
    console.error('Vocabulary count error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}