import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // words 컬렉션에서 몇 개 샘플 가져오기
    const snapshot = await db
      .collection('words')
      .limit(5)
      .get()
    
    const samples = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }))
    
    // source 타입별로 카운트
    const allWordsSnapshot = await db.collection('words').get()
    const sourceTypes: Record<string, number> = {}
    const sourceDetails: Record<string, any[]> = {}
    
    allWordsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const sourceType = data.source?.type || 'unknown'
      sourceTypes[sourceType] = (sourceTypes[sourceType] || 0) + 1
      
      // 각 소스 타입별로 샘플 저장
      if (!sourceDetails[sourceType]) {
        sourceDetails[sourceType] = []
      }
      if (sourceDetails[sourceType].length < 2) {
        sourceDetails[sourceType].push({
          word: data.word,
          source: data.source,
          isSAT: data.isSAT,
          difficulty: data.difficulty
        })
      }
    })
    
    return NextResponse.json({
      success: true,
      totalWords: allWordsSnapshot.size,
      samples,
      sourceTypes,
      sourceDetails
    })
    
  } catch (error) {
    console.error('Error checking words structure:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}