import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // impose 단어 찾기
    const wordsSnapshot = await db.collection('words')
      .where('word', '==', 'impose')
      .get()
    
    if (wordsSnapshot.empty) {
      return NextResponse.json({ error: 'Word "impose" not found' }, { status: 404 })
    }
    
    const doc = wordsSnapshot.docs[0]
    const data = doc.data()
    
    // 정의 수정
    const updatedDefinitions = data.definitions.map((def: any) => {
      if (def.definition === '~에게 ~을 내세우다, 받아들이게 하' || 
          def.text === '~에게 ~을 내세우다, 받아들이게 하') {
        return {
          ...def,
          definition: '~에게 ~을 내세우다, 받아들이게 하다; 부과하다, 강요하다',
          text: '~에게 ~을 내세우다, 받아들이게 하다; 부과하다, 강요하다'
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
      message: 'impose definition updated successfully',
      oldDefinition: '~에게 ~을 내세우다, 받아들이게 하',
      newDefinition: '~에게 ~을 내세우다, 받아들이게 하다; 부과하다, 강요하다'
    })
    
  } catch (error) {
    console.error('Error fixing impose:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}