import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

// 잘린 정의를 수정하는 매핑
const definitionFixes: { [key: string]: string } = {
  // advocate 같은 패턴
  '지지하다, 옹호하다, (~를 하자고) 주': '지지하다, 옹호하다, (~를 하자고) 주장하다',
  
  // 기운 없다로 끝나는 패턴
  '마음 내키지 않는; 활기 없는, 기운 없': '마음 내키지 않는; 활기 없는, 기운 없는',
  
  // 오용으로 끝나는 패턴
  '말라프로피즘; 우스꽝스러운 말의 오': '말라프로피즘; 우스꽝스러운 말의 오용',
  
  // 쉼표로 끝나는 패턴 - 이런 경우는 보통 뒤에 더 있었을 가능성이 높음
  '[보통 나쁜 일]을 미리 나타내다,': '[보통 나쁜 일]을 미리 나타내다, 예고하다',
  '[녹은 금속의] 불순물, 가치 없는 것,': '[녹은 금속의] 불순물, 가치 없는 것, 찌꺼기',
  
  // 너무 짧은 정의들 - 영어 설명이나 다른 정보 추가
  '굼뜬': '굼뜬, 활동하지 않는, 불활성의',
  '객관적인': '객관적인, 공정한, 편견 없는',
  '참을 수 없는': '참을 수 없는, 견딜 수 없는',
  
  // 기타 잘린 것으로 보이는 패턴들
  '신비롭거나 신기한 것': '신비롭거나 신기한 것, 변덕, 기발한 생각',
}

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    let fixedCount = 0
    const fixedWords: any[] = []
    const failedWords: any[] = []
    
    // 모든 단어 가져오기
    const wordsSnapshot = await db.collection('words').get()
    
    // 배치 처리
    const batchSize = 500
    let batch = db.batch()
    let batchCount = 0
    
    for (const doc of wordsSnapshot.docs) {
      const data = doc.data()
      const word = data.word
      const definitions = data.definitions || []
      
      let hasChanges = false
      const updatedDefinitions = definitions.map((def: any) => {
        const defText = def.definition || def.text || ''
        
        // 정확히 매칭되는 수정사항이 있는지 확인
        if (definitionFixes[defText]) {
          hasChanges = true
          return {
            ...def,
            definition: definitionFixes[defText],
            text: definitionFixes[defText]
          }
        }
        
        // 패턴 기반 수정
        let fixedText = defText
        
        // 1. 잘린 것으로 보이는 조사/어미 수정
        if (/\s+없$/.test(defText) && !defText.includes('없는') && !defText.includes('없이')) {
          fixedText = defText + '는'
          hasChanges = true
        } else if (/\s+주$/.test(defText) && !defText.includes('주는') && !defText.includes('주다')) {
          fixedText = defText + '장하다'
          hasChanges = true
        } else if (/\s+오$/.test(defText)) {
          fixedText = defText + '용'
          hasChanges = true
        } else if (/[,，]\s*$/.test(defText)) {
          // 쉼표로 끝나는 경우는 일단 쉼표만 제거
          fixedText = defText.replace(/[,，]\s*$/, '')
          hasChanges = true
        }
        
        if (fixedText !== defText) {
          return {
            ...def,
            definition: fixedText,
            text: fixedText
          }
        }
        
        return def
      })
      
      if (hasChanges) {
        try {
          batch.update(doc.ref, {
            definitions: updatedDefinitions,
            updatedAt: new Date()
          })
          batchCount++
          fixedCount++
          
          fixedWords.push({
            word,
            oldDefinitions: definitions.map((d: any) => d.definition || d.text),
            newDefinitions: updatedDefinitions.map((d: any) => d.definition || d.text)
          })
          
          if (batchCount >= batchSize) {
            await batch.commit()
            console.log(`Committed batch of ${batchCount} updates`)
            batch = db.batch()
            batchCount = 0
          }
        } catch (error) {
          console.error(`Failed to update word "${word}":`, error)
          failedWords.push({ word, error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }
    }
    
    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit()
      console.log(`Committed final batch of ${batchCount} updates`)
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} truncated definitions`,
      fixedCount,
      sampleFixes: fixedWords.slice(0, 20),
      failedCount: failedWords.length,
      failedWords: failedWords.slice(0, 10)
    })
    
  } catch (error) {
    console.error('Error fixing truncated definitions:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}