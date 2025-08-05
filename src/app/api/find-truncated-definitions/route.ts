import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // 모든 단어 가져오기
    const wordsSnapshot = await db.collection('words').get()
    
    const truncatedWords: any[] = []
    
    for (const doc of wordsSnapshot.docs) {
      const data = doc.data()
      const word = data.word
      const definitions = data.definitions || []
      
      for (const def of definitions) {
        const defText = def.definition || def.text || ''
        
        // 잘린 것으로 의심되는 패턴들
        const suspiciousPatterns = [
          /\s+(주|받|보|하|되|시|있|없|줄|준|않|적|것|함|함|알|모|나|가|오|되|이|히|게|로|은|는|을|를|의|에|와|과|도|만|까지|부터|에서|으로|라고|처럼|같이|대로|따라|위해|때문|덕분|탓|대신|뿐|조차|마저|밖에|제외|빼고|말고)$/,
          /[,，]\s*$/,  // 쉼표로 끝나는 경우
          /\(\s*$/,     // 여는 괄호로 끝나는 경우
          /~\s*$/,      // 물결표로 끝나는 경우
          /[가-힣]\s+[a-zA-Z]+$/,  // 한글 뒤에 영어로 끝나는 경우
          /\s+\([^)]*$/,  // 닫히지 않은 괄호
          /\s+[a-zA-Z]{1,3}$/,  // 1-3글자 영어로 끝나는 경우
        ]
        
        let isTruncated = false
        let matchedPattern = ''
        
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(defText)) {
            isTruncated = true
            matchedPattern = pattern.toString()
            break
          }
        }
        
        // 너무 짧은 정의 (10자 미만)도 포함
        if (defText.length > 0 && defText.length < 10) {
          isTruncated = true
          matchedPattern = 'too short'
        }
        
        if (isTruncated) {
          truncatedWords.push({
            id: doc.id,
            word: word,
            definition: defText,
            pattern: matchedPattern,
            fullData: data
          })
        }
      }
    }
    
    // 패턴별로 그룹화
    const groupedByPattern: { [key: string]: any[] } = {}
    for (const item of truncatedWords) {
      if (!groupedByPattern[item.pattern]) {
        groupedByPattern[item.pattern] = []
      }
      groupedByPattern[item.pattern].push({
        word: item.word,
        definition: item.definition
      })
    }
    
    console.log('Found truncated definitions:')
    for (const [pattern, words] of Object.entries(groupedByPattern)) {
      console.log(`\nPattern: ${pattern}`)
      console.log(`Count: ${words.length}`)
      console.log('Examples:', words.slice(0, 5))
    }
    
    return NextResponse.json({
      total: truncatedWords.length,
      byPattern: groupedByPattern,
      allWords: truncatedWords.map(w => ({
        id: w.id,
        word: w.word,
        definition: w.definition,
        pattern: w.pattern
      }))
    })
    
  } catch (error) {
    console.error('Error finding truncated definitions:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}