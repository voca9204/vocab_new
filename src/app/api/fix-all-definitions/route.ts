import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

// 한글 정의에서 혼재된 영어 단어들 제거하는 함수 (개선된 버전)
function cleanKoreanDefinition(koreanText: string, currentWord: string): string {
  if (!koreanText) return ''
  
  // 영어 단어를 구분자로 사용하여 텍스트를 분할
  const suspiciousEnglishWords = koreanText.match(/\b[a-zA-Z]{4,}\b/g) || []
  
  // 현재 단어가 아닌 영어 단어들 찾기 (기본 영어 단어는 제외)
  const foreignWords = suspiciousEnglishWords.filter(word => 
    word.toLowerCase() !== currentWord.toLowerCase() &&
    !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were', 'said', 'each', 'which', 'their', 'time', 'word', 'look', 'like', 'into', 'such', 'more', 'very', 'what', 'know', 'just', 'first', 'over', 'after', 'back', 'other', 'many', 'than', 'then', 'them', 'these', 'some', 'come', 'could', 'only', 'long', 'make', 'when', 'also', 'find'].includes(word.toLowerCase())
  )
  
  if (foreignWords.length === 0) {
    return koreanText // 의심스러운 단어가 없으면 원본 반환
  }
  
  let cleanedText = koreanText
  
  // 각 의심스러운 영어 단어와 그 주변 텍스트를 제거
  for (const foreignWord of foreignWords) {
    // 해당 영어 단어와 그 직후의 한글 정의 부분을 제거
    // 패턴: 영어단어 + 공백 + 한글정의
    const contextPattern = new RegExp(`\\s*\\b${foreignWord}\\b\\s*[가-힣][^a-zA-Z]*`, 'gi')
    cleanedText = cleanedText.replace(contextPattern, '')
    
    // 남은 영어 단어만 제거
    cleanedText = cleanedText.replace(new RegExp(`\\b${foreignWord}\\b`, 'gi'), '')
  }
  
  // 연속된 공백과 구두점 정리
  cleanedText = cleanedText
    .replace(/\s+/g, ' ')           // 연속 공백을 하나로
    .replace(/\s*,\s*/g, ', ')      // 쉼표 앞뒤 공백 정리
    .replace(/^\s*,\s*/, '')        // 시작부분 쉼표 제거
    .replace(/\s*,\s*$/, '')        // 끝부분 쉼표 제거
    .trim()
  
  // 결과가 너무 짧거나 한글이 없으면 원본 반환 (과도한 필터링 방지)
  if (cleanedText.length < 3 || !/[가-힣]/.test(cleanedText)) {
    return koreanText
  }
  
  return cleanedText
}

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    console.log('🔍 모든 단어의 정의를 검사하고 수정합니다...')
    
    // words 컬렉션에서 모든 문서 가져오기
    const wordsSnapshot = await db.collection('words').get()
    
    let totalWords = 0
    let fixedWords = 0
    let failedWords = 0
    const fixedWordsList: Array<{word: string, before: string, after: string}> = []
    
    // 배치 처리를 위한 준비
    const batchSize = 500 // Firestore batch는 최대 500개
    let batch = db.batch()
    let batchCount = 0
    
    for (const doc of wordsSnapshot.docs) {
      totalWords++
      const data = doc.data()
      const word = data.word
      const definitions = data.definitions || []
      
      let hasChanges = false
      const updatedDefinitions = definitions.map((def: any) => {
        // text 필드와 definition 필드 모두 확인
        const originalText = def.text || def.definition || ''
        if (!originalText) return def
        
        // 다른 영어 단어가 섞여있는지 확인
        const words = originalText.split(/\s+/)
        const suspiciousWords = words.filter((w: string) => 
          /^[a-zA-Z]+$/.test(w) && w.length > 3 && w.toLowerCase() !== word.toLowerCase()
        )
        
        if (suspiciousWords.length > 0) {
          const cleanedText = cleanKoreanDefinition(originalText, word)
          if (cleanedText !== originalText) {
            hasChanges = true
            fixedWordsList.push({
              word,
              before: originalText,
              after: cleanedText
            })
            
            // 원본 구조를 유지하면서 업데이트
            const updatedDef = { ...def }
            
            // text 필드가 있으면 text 업데이트
            if (def.text !== undefined) {
              updatedDef.text = cleanedText
            }
            
            // definition 필드가 있으면 definition도 업데이트
            if (def.definition !== undefined) {
              updatedDef.definition = cleanedText
            }
            
            // 둘 다 없으면 text 필드 생성
            if (def.text === undefined && def.definition === undefined) {
              updatedDef.text = cleanedText
            }
            
            return updatedDef
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
          fixedWords++
          
          // 배치가 가득 찼으면 커밋하고 새 배치 시작
          if (batchCount >= batchSize) {
            await batch.commit()
            console.log(`✅ ${batchCount}개 단어 수정 완료 (누적: ${fixedWords}개)`)
            batch = db.batch()
            batchCount = 0
          }
        } catch (error) {
          console.error(`단어 "${word}" 수정 실패:`, error)
          failedWords++
        }
      }
    }
    
    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit()
      console.log(`✅ 마지막 ${batchCount}개 단어 수정 완료`)
    }
    
    console.log('\n📊 수정 완료!')
    console.log(`- 전체 단어: ${totalWords}개`)
    console.log(`- 수정된 단어: ${fixedWords}개`)
    console.log(`- 실패한 단어: ${failedWords}개`)
    
    // 처음 10개 수정 내역 출력
    console.log('\n📝 수정 내역 샘플 (처음 10개):')
    fixedWordsList.slice(0, 10).forEach(item => {
      console.log(`\n단어: ${item.word}`)
      console.log(`이전: ${item.before}`)
      console.log(`이후: ${item.after}`)
    })
    
    return NextResponse.json({
      success: true,
      totalWords,
      fixedWords,
      failedWords,
      sampleFixes: fixedWordsList.slice(0, 20),
      message: `${fixedWords}개의 단어 정의가 성공적으로 수정되었습니다.`
    })
    
  } catch (error) {
    console.error('모든 정의 수정 중 오류:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // 수정이 필요한 단어들의 통계만 반환 (실제 수정하지 않음)
    const wordsSnapshot = await db.collection('words').get()
    
    let totalWords = 0
    let problematicWords = 0
    const sampleProblems: Array<{word: string, definition: string, issues: string[]}> = []
    
    for (const doc of wordsSnapshot.docs) {
      totalWords++
      const data = doc.data()
      const word = data.word
      const definitions = data.definitions || []
      
      for (const def of definitions) {
        const definitionText = def.definition || def.text || ''
        if (!definitionText) continue
        
        // 다른 영어 단어가 섞여있는지 확인
        const words = definitionText.split(/\s+/)
        const suspiciousWords = words.filter((w: string) => 
          /^[a-zA-Z]+$/.test(w) && w.length > 3 && w !== word
        )
        
        if (suspiciousWords.length > 0) {
          problematicWords++
          if (sampleProblems.length < 10) {
            sampleProblems.push({
              word,
              definition: definitionText,
              issues: suspiciousWords
            })
          }
          break // 한 단어에 여러 정의가 있어도 한 번만 카운트
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      totalWords,
      problematicWords,
      sampleProblems,
      message: `${problematicWords}개의 단어에 문제가 있는 정의가 발견되었습니다.`
    })
    
  } catch (error) {
    console.error('정의 검사 중 오류:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}