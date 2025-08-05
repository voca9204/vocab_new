import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // words 컬렉션에서 문제가 있는 정의들 찾기
    const wordsSnapshot = await db.collection('words').get()
    
    const problematicWords: Array<{
      id: string
      word: string
      definitions: any[]
      issues: string[]
    }> = []
    
    wordsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const word = data.word
      const definitions = data.definitions || []
      
      definitions.forEach((def: any, index: number) => {
        const definitionText = def.definition || def.text || ''
        const issues: string[] = []
        
        // 다른 영어 단어가 섞여있는지 확인
        const words = definitionText.split(/\s+/)
        const suspiciousWords = words.filter((w: string) => 
          /^[a-zA-Z]+$/.test(w) && w.length > 3 && w !== word
        )
        
        if (suspiciousWords.length > 0) {
          issues.push(`Suspicious English words: ${suspiciousWords.join(', ')}`)
        }
        
        // 정의가 너무 긴 경우
        if (definitionText.length > 200) {
          issues.push('Definition too long')
        }
        
        if (issues.length > 0) {
          problematicWords.push({
            id: doc.id,
            word,
            definitions,
            issues
          })
        }
      })
    })
    
    return NextResponse.json({
      success: true,
      totalWords: wordsSnapshot.size,
      problematicWords: problematicWords.slice(0, 50), // 처음 50개만
      problematicCount: problematicWords.length
    })
    
  } catch (error) {
    console.error('Fix definitions check error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}

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
    console.log(`[fix-definitions] Removing foreign word "${foreignWord}" from "${koreanText}"`)
    
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
    console.log(`[fix-definitions] Over-filtered, returning original: "${koreanText}"`)
    return koreanText
  }
  
  console.log(`[fix-definitions] Cleaned: "${koreanText}" -> "${cleanedText}"`)
  return cleanedText
}

export async function POST(request: NextRequest) {
  try {
    const { wordId, definitionIndex, newDefinition } = await request.json()
    
    if (!wordId || definitionIndex === undefined || !newDefinition) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    const db = getAdminFirestore()
    const wordDoc = await db.collection('words').doc(wordId).get()
    
    if (!wordDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Word not found'
      }, { status: 404 })
    }
    
    const wordData = wordDoc.data()!
    const definitions = wordData.definitions || []
    
    if (definitionIndex >= definitions.length) {
      return NextResponse.json({
        success: false,
        error: 'Definition index out of range'
      }, { status: 400 })
    }
    
    // 자동 정의 정제 (요청받은 정의가 아직 정제되지 않은 경우)
    const cleanedDefinition = cleanKoreanDefinition(newDefinition, wordData.word)
    
    // 정의 수정
    definitions[definitionIndex] = {
      ...definitions[definitionIndex],
      definition: cleanedDefinition,
      text: cleanedDefinition  // 호환성을 위해 둘 다 설정
    }
    
    await db.collection('words').doc(wordId).update({
      definitions,
      updatedAt: new Date()
    })
    
    console.log(`[fix-definitions] Updated word "${wordData.word}": "${newDefinition}" -> "${cleanedDefinition}"`)
    
    return NextResponse.json({
      success: true,
      message: 'Definition updated successfully',
      word: wordData.word,
      originalDefinition: newDefinition,
      cleanedDefinition: cleanedDefinition
    })
    
  } catch (error) {
    console.error('Fix definition error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}