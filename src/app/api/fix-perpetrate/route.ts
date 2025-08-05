import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // perpetrate 단어 찾기
    const wordsSnapshot = await db.collection('words')
      .where('word', '==', 'perpetrate')
      .get()
    
    if (wordsSnapshot.empty) {
      return NextResponse.json({ error: 'Word "perpetrate" not found' }, { status: 404 })
    }
    
    const doc = wordsSnapshot.docs[0]
    const data = doc.data()
    
    // 정의 수정
    const updatedDefinitions = data.definitions.map((def: any) => {
      if (def.definition === '저지르다' || def.text === '저지르다') {
        return {
          ...def,
          definition: '(범죄, 악행 등을) 저지르다, 범하다',
          text: '(범죄, 악행 등을) 저지르다, 범하다'
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
      message: 'perpetrate definition updated successfully',
      oldDefinition: '저지르다',
      newDefinition: '(범죄, 악행 등을) 저지르다, 범하다'
    })
    
  } catch (error) {
    console.error('Error fixing perpetrate:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}