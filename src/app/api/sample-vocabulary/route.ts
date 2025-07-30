import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { collection, query, limit, getDocs, orderBy } from 'firebase/firestore'

export async function GET(request: Request) {
  try {
    // 최근 저장된 단어 5개 가져오기
    const q = query(
      collection(db, 'veterans_vocabulary'),
      orderBy('createdAt', 'desc'),
      limit(5)
    )
    
    const snapshot = await getDocs(q)
    const words = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Timestamp를 문자열로 변환
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      source: {
        ...doc.data().source,
        uploadedAt: doc.data().source?.uploadedAt?.toDate?.()?.toISOString() || null
      }
    }))
    
    return NextResponse.json({ 
      success: true, 
      count: words.length,
      words: words 
    })
  } catch (error) {
    console.error('Error fetching sample vocabulary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vocabulary' }, 
      { status: 500 }
    )
  }
}