import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // 특정 문제가 있는 단어 하나만 테스트
    const testWord = 'twist'
    const wordQuery = await db.collection('words').where('word', '==', testWord).get()
    
    if (wordQuery.empty) {
      return NextResponse.json({ 
        success: false, 
        error: `Word "${testWord}" not found` 
      })
    }
    
    const doc = wordQuery.docs[0]
    const data = doc.data()
    
    console.log('Found word:', data.word)
    console.log('Definitions:', JSON.stringify(data.definitions, null, 2))
    
    // 정의 확인
    const definitions = data.definitions || []
    const problematicDefs = []
    
    for (let i = 0; i < definitions.length; i++) {
      const def = definitions[i]
      const defText = def.definition || def.text || ''
      
      console.log(`Definition ${i}: "${defText}"`)
      
      // 문제가 있는지 확인
      const words = defText.split(/\s+/)
      const suspiciousWords = words.filter((w: string) => 
        /^[a-zA-Z]+$/.test(w) && w.length > 3 && w.toLowerCase() !== testWord.toLowerCase()
      )
      
      if (suspiciousWords.length > 0) {
        problematicDefs.push({
          index: i,
          text: defText,
          suspiciousWords
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      word: data.word,
      definitions: definitions,
      problematicDefs,
      definitionStructure: definitions.map((d: any) => ({
        hasDefinition: !!d.definition,
        hasText: !!d.text,
        definition: d.definition,
        text: d.text
      }))
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}