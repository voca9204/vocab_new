import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

// 괄호가 닫히지 않은 정의들을 수정하는 매핑
const parenthesesFixes: { [key: string]: string } = {
  '깊고 차분하게 한 생각 (중요하지 않': '깊고 차분하게 한 생각 (중요하지 않을 수도 있는); 명상, 묵상',
  '자기 의지가 강한 (그래서 반항을 주': '자기 의지가 강한 (그래서 반항적일 수 있는); 고집이 센',
  '비탄에 빠진 (특히 사랑하는 사람을 잃': '비탄에 빠진 (특히 사랑하는 사람을 잃어서); 슬픔에 잠긴',
  '관계가 있는 (특히 주제와': '관계가 있는 (특히 주제와 관련된); 적절한, 타당한',
  '표면상의 (실제와 다른': '표면상의 (실제와 다른); 겉보기의, 외견상의',
  '중요하지 않은 (상황에': '중요하지 않은 (상황에 따라); 사소한, 하찮은',
  '독단적인 (다른 의견을': '독단적인 (다른 의견을 듣지 않는); 완고한, 고집 센',
  '서두르는 (생각 없이': '서두르는 (생각 없이 행동하는); 성급한, 경솔한',
  '번성하는 (특히 경제적으로': '번성하는 (특히 경제적으로); 성공한, 부유한',
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
        
        // 직접 매칭
        if (parenthesesFixes[defText]) {
          hasChanges = true
          return {
            ...def,
            definition: parenthesesFixes[defText],
            text: parenthesesFixes[defText]
          }
        }
        
        // 패턴 기반 수정
        let fixedText = defText
        
        // 열린 괄호가 있는데 닫힌 괄호가 없는 경우
        const openCount = (defText.match(/\(/g) || []).length
        const closeCount = (defText.match(/\)/g) || []).length
        
        if (openCount > closeCount) {
          // 마지막이 한글로 끝나면 괄호를 닫고 보충
          if (/[가-힣]$/.test(defText)) {
            fixedText = defText + ')'
            hasChanges = true
          }
          // 영어나 구두점으로 끝나면 적절히 마무리
          else if (/[a-zA-Z,;]$/.test(defText)) {
            fixedText = defText + '...)'
            hasChanges = true
          }
          // 공백으로 끝나면 공백 제거하고 괄호 닫기
          else if (/\s+$/.test(defText)) {
            fixedText = defText.trim() + ')'
            hasChanges = true
          }
        }
        
        // 중요하지 않, 관계가 있는 등의 특정 패턴 수정
        if (!hasChanges) {
          if (defText.includes('(중요하지 않') && !defText.includes(')')) {
            fixedText = defText + '을 수도 있는)'
            hasChanges = true
          } else if (defText.includes('(관계가 있는') && !defText.includes(')')) {
            fixedText = defText + ')'
            hasChanges = true
          } else if (defText.includes('(특히') && !defText.includes(')')) {
            fixedText = defText + '...)'
            hasChanges = true
          } else if (defText.includes('(그래서') && !defText.includes(')')) {
            fixedText = defText + '...)'
            hasChanges = true
          }
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
    
    console.log('\n수정된 단어들:')
    fixedWords.forEach(item => {
      console.log(`\n${item.word}:`)
      console.log(`  이전: ${item.oldDefinitions.join(', ')}`)
      console.log(`  이후: ${item.newDefinitions.join(', ')}`)
    })
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} definitions with unclosed parentheses`,
      fixedCount,
      fixedWords: fixedWords,
      failedCount: failedWords.length,
      failedWords: failedWords
    })
    
  } catch (error) {
    console.error('Error fixing unclosed parentheses:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}