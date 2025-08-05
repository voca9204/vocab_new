import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // advocate 단어 찾기
    const wordsSnapshot = await db.collection('words')
      .where('word', '==', 'advocate')
      .get()
    
    if (wordsSnapshot.empty) {
      return NextResponse.json({ error: 'Word "advocate" not found' }, { status: 404 })
    }
    
    const doc = wordsSnapshot.docs[0]
    const data = doc.data()
    
    // 정의 수정
    const updatedDefinitions = data.definitions.map((def: any) => {
      if (def.definition === '지지하다, 옹호하다, (~를 하자고) 주') {
        return {
          ...def,
          definition: '지지하다, 옹호하다, (~를 하자고) 주장하다'
        }
      }
      return def
    })
    
    // 업데이트
    await doc.ref.update({
      definitions: updatedDefinitions,
      updatedAt: new Date()
    })
    
    return NextResponse.json({
      success: true,
      message: 'advocate definition updated successfully',
      oldDefinition: '지지하다, 옹호하다, (~를 하자고) 주',
      newDefinition: '지지하다, 옹호하다, (~를 하자고) 주장하다'
    })
    
  } catch (error) {
    console.error('Error fixing advocate:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}