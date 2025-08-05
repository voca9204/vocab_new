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
    console.log(`[fix-single] Removing foreign word "${foreignWord}" from "${koreanText}"`)
    
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
    console.log(`[fix-single] Over-filtered, returning original: "${koreanText}"`)
    return koreanText
  }
  
  console.log(`[fix-single] Cleaned: "${koreanText}" -> "${cleanedText}"`)
  return cleanedText
}

export async function POST(request: NextRequest) {
  try {
    const { word: targetWord } = await request.json()
    
    if (!targetWord) {
      return NextResponse.json({
        success: false,
        error: 'Word is required'
      }, { status: 400 })
    }
    
    const db = getAdminFirestore()
    const wordQuery = await db.collection('words').where('word', '==', targetWord).get()
    
    if (wordQuery.empty) {
      return NextResponse.json({ 
        success: false, 
        error: `Word "${targetWord}" not found` 
      })
    }
    
    const doc = wordQuery.docs[0]
    const data = doc.data()
    const definitions = data.definitions || []
    
    console.log(`[fix-single] Processing word: ${data.word}`)
    console.log(`[fix-single] Original definitions:`, JSON.stringify(definitions, null, 2))
    
    let hasChanges = false
    const updatedDefinitions = definitions.map((def: any) => {
      // text 필드와 definition 필드 모두 확인
      const originalText = def.text || def.definition || ''
      if (!originalText) return def
      
      // 다른 영어 단어가 섞여있는지 확인
      const words = originalText.split(/\s+/)
      const suspiciousWords = words.filter((w: string) => 
        /^[a-zA-Z]+$/.test(w) && w.length > 3 && w.toLowerCase() !== targetWord.toLowerCase()
      )
      
      if (suspiciousWords.length > 0) {
        console.log(`[fix-single] Found suspicious words:`, suspiciousWords)
        const cleanedText = cleanKoreanDefinition(originalText, targetWord)
        
        if (cleanedText !== originalText) {
          hasChanges = true
          console.log(`[fix-single] Cleaned definition: "${originalText}" -> "${cleanedText}"`)
          
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
      console.log(`[fix-single] Updating word with cleaned definitions`)
      await doc.ref.update({
        definitions: updatedDefinitions,
        updatedAt: new Date()
      })
      
      return NextResponse.json({
        success: true,
        message: `Word "${targetWord}" has been fixed`,
        before: definitions,
        after: updatedDefinitions
      })
    } else {
      return NextResponse.json({
        success: true,
        message: `Word "${targetWord}" has no issues`,
        definitions
      })
    }
    
  } catch (error) {
    console.error('Fix single word error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}