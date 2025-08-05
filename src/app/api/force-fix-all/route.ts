import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    console.log('🔧 강제 수정 시작...')
    
    // words 컬렉션에서 모든 문서 가져오기
    const wordsSnapshot = await db.collection('words').get()
    
    let totalWords = 0
    let fixedWords = 0
    const fixedWordsList: Array<{word: string, before: string, after: string}> = []
    
    // 배치 처리를 위한 준비
    const batchSize = 500
    let batch = db.batch()
    let batchCount = 0
    
    for (const doc of wordsSnapshot.docs) {
      totalWords++
      const data = doc.data()
      const word = data.word
      const definitions = data.definitions || []
      
      let hasChanges = false
      const updatedDefinitions = definitions.map((def: any) => {
        const originalText = def.text || def.definition || ''
        if (!originalText) return def
        
        // 강제로 문제가 있는 패턴을 찾아서 수정
        let cleanedText = originalText
        
        // 패턴 1: 다른 영어 단어와 그 정의가 섞여있는 경우
        // 예: "삐다 weather forecast 일기 예보, 기상 통보"
        const matches = originalText.match(/^([가-힣,\s]+)\s+([a-zA-Z]{4,}[\sa-zA-Z]*)\s+([가-힣,\s]+.*)$/);
        if (matches) {
          cleanedText = matches[1].trim()
          hasChanges = true
          console.log(`Pattern 1 match for "${word}": "${originalText}" -> "${cleanedText}"`)
        }
        
        // 패턴 2: 영어 단어가 중간에 있는 경우
        // 예: "기업 devalue 가치가 떨어지다"
        if (!hasChanges) {
          const pattern2 = originalText.match(/^([가-힣,\s]+)\s+([a-zA-Z]{4,})\s+([가-힣,\s]+)$/);
          if (pattern2) {
            cleanedText = pattern2[1].trim()
            hasChanges = true
            console.log(`Pattern 2 match for "${word}": "${originalText}" -> "${cleanedText}"`)
          }
        }
        
        // 패턴 3: 특정 문제 단어들 직접 처리
        const problemWords = ['weather', 'forecast', 'devalue', 'process', 'liberation', 'practical', 'into', 'limit', 'recommend', 'with', 'over', 'from', 'very', 'the very'];
        for (const problemWord of problemWords) {
          if (originalText.includes(problemWord) && word.toLowerCase() !== problemWord.toLowerCase()) {
            // 해당 영어 단어부터 끝까지 제거
            const idx = originalText.indexOf(problemWord)
            if (idx > 0) {
              cleanedText = originalText.substring(0, idx).trim()
              // 끝에 있는 쉼표 제거
              cleanedText = cleanedText.replace(/,\s*$/, '').trim()
              hasChanges = true
              console.log(`Pattern 3 match for "${word}": "${originalText}" -> "${cleanedText}"`)
              break
            }
          }
        }
        
        // 패턴 4: 전치사 + to/from 패턴 처리
        if (!hasChanges) {
          const prepPattern = originalText.match(/^([가-힣,\s]+)\s+(with|over|from|the very)\s+.+$/);
          if (prepPattern) {
            cleanedText = prepPattern[1].trim()
            hasChanges = true
            console.log(`Pattern 4 match for "${word}": "${originalText}" -> "${cleanedText}"`)
          }
        }
        
        if (hasChanges && cleanedText !== originalText) {
          fixedWordsList.push({
            word,
            before: originalText,
            after: cleanedText
          })
          
          const updatedDef = { ...def }
          if (def.text !== undefined) {
            updatedDef.text = cleanedText
          }
          if (def.definition !== undefined) {
            updatedDef.definition = cleanedText
          }
          return updatedDef
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
          fixedWords++
          
          if (batchCount >= batchSize) {
            await batch.commit()
            console.log(`✅ ${batchCount}개 단어 수정 완료 (누적: ${fixedWords}개)`)
            batch = db.batch()
            batchCount = 0
          }
        } catch (error) {
          console.error(`단어 "${word}" 수정 실패:`, error)
        }
      }
    }
    
    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit()
      console.log(`✅ 마지막 ${batchCount}개 단어 수정 완료`)
    }
    
    console.log('\n📊 강제 수정 완료!')
    console.log(`- 전체 단어: ${totalWords}개`)
    console.log(`- 수정된 단어: ${fixedWords}개`)
    
    return NextResponse.json({
      success: true,
      totalWords,
      fixedWords,
      sampleFixes: fixedWordsList.slice(0, 30),
      message: `${fixedWords}개의 단어 정의가 성공적으로 수정되었습니다.`
    })
    
  } catch (error) {
    console.error('강제 수정 중 오류:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}