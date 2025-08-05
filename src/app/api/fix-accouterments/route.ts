import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // accouterments 단어 찾기
    const wordsSnapshot = await db.collection('words')
      .where('word', '==', 'accouterments')
      .get()
    
    if (wordsSnapshot.empty) {
      return NextResponse.json({ error: 'Word "accouterments" not found' }, { status: 404 })
    }
    
    const doc = wordsSnapshot.docs[0]
    const data = doc.data()
    
    // 정의 수정
    const updatedDefinitions = data.definitions.map((def: any) => {
      if (def.definition === '[군복과 무기 이외의] 장비, 장구, 마') {
        return {
          ...def,
          definition: '[군복과 무기 이외의] 장비, 장구, 마구류; 부속품, 액세서리'
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
      message: 'accouterments definition updated successfully',
      oldDefinition: '[군복과 무기 이외의] 장비, 장구, 마',
      newDefinition: '[군복과 무기 이외의] 장비, 장구, 마구류; 부속품, 액세서리'
    })
    
  } catch (error) {
    console.error('Error fixing accouterments:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}