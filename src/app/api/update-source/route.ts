import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore'

export async function POST(request: Request) {
  try {
    const { userId, oldFilename, newFilename } = await request.json()
    
    if (!userId || !oldFilename || !newFilename) {
      return NextResponse.json({ 
        error: 'userId, oldFilename, and newFilename are required' 
      }, { status: 400 })
    }
    
    // 해당 사용자의 특정 파일명을 가진 모든 단어 조회
    const q = query(
      collection(db, 'extracted_vocabulary'),
      where('userId', '==', userId),
      where('source.filename', '==', oldFilename)
    )
    
    const snapshot = await getDocs(q)
    
    // 각 문서의 source.filename 업데이트
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        'source.filename': newFilename
      })
    )
    
    await Promise.all(updatePromises)
    
    return NextResponse.json({ 
      success: true, 
      updatedCount: snapshot.size,
      message: `${snapshot.size}개 단어의 출처를 ${oldFilename}에서 ${newFilename}으로 변경했습니다.`
    })
  } catch (error) {
    console.error('Error updating source:', error)
    return NextResponse.json(
      { error: 'Failed to update source' }, 
      { status: 500 }
    )
  }
}