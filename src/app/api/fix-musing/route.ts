import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // musing 단어 찾기
    const wordsSnapshot = await db.collection('words')
      .where('word', '==', 'musing')
      .get()
    
    if (wordsSnapshot.empty) {
      return NextResponse.json({ error: 'Word "musing" not found' }, { status: 404 })
    }
    
    const doc = wordsSnapshot.docs[0]
    const data = doc.data()
    
    // 정의 수정
    const updatedDefinitions = data.definitions.map((def: any) => {
      if (def.definition === '깊고 차분하게 한 생각 (중요하지 않' || 
          def.text === '깊고 차분하게 한 생각 (중요하지 않') {
        return {
          ...def,
          definition: '깊고 차분하게 한 생각 (중요하지 않을 수도 있는); 명상, 묵상',
          text: '깊고 차분하게 한 생각 (중요하지 않을 수도 있는); 명상, 묵상'
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
      message: 'musing definition updated successfully',
      oldDefinition: '깊고 차분하게 한 생각 (중요하지 않',
      newDefinition: '깊고 차분하게 한 생각 (중요하지 않을 수도 있는); 명상, 묵상'
    })
    
  } catch (error) {
    console.error('Error fixing musing:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}