// API for fetching words from personal collections
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    console.log('📚 [Collection Words API] GET 요청 시작')
    
    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const token = authHeader.split('Bearer ')[1]
    const auth = getAdminAuth()
    const decodedToken = await auth.verifyIdToken(token)
    console.log('✅ [Collection Words API] 토큰 검증 완료, 사용자:', decodedToken.uid)
    
    const { searchParams } = new URL(request.url)
    const wordIds = searchParams.get('ids')?.split(',').filter(Boolean) || []
    
    if (wordIds.length === 0) {
      return NextResponse.json({
        success: true,
        words: []
      })
    }
    
    console.log('📚 [Collection Words API] 단어 ID 개수:', wordIds.length)
    
    const db = getAdminFirestore()
    
    // Fetch words from personal_collection_words
    const wordsPromises = wordIds.map(id => 
      db.collection('personal_collection_words').doc(id).get()
    )
    
    const wordDocs = await Promise.all(wordsPromises)
    const words = wordDocs
      .filter(doc => doc.exists)
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    
    console.log('✅ [Collection Words API] 단어 조회 완료:', words.length, '개')
    
    return NextResponse.json({
      success: true,
      words
    })
    
  } catch (error) {
    console.error('❌ [Collection Words API] 오류:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch words' },
      { status: 500 }
    )
  }
}