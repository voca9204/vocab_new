import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

// 포괄적인 잘린 정의 패턴
const truncationPatterns = {
  // 불완전한 한글 조사/어미
  incompleteParticles: /\s+(주|받|보|하|되|시|있|없|줄|준|않|적|것|함|알|모|나|가|오|되|이|히|게|로|은|는|을|를|의|에|와|과|도|만|까지|부터|에서|으로|라고|처럼|같이|대로|따라|위해|때문|덕분|탓|대신|뿐|조차|마저|밖에|제외|빼고|말고|라|며|면|서|고|거|야|겠|네|요|니|데|지|치|키|려|러|며|면서|자|다가|든|든지|건|까|느|ㄴ|ㄹ|ㅂ|습|십|읍|립|했|됐|랐|었|았|였|렸|켰|췄|럽|롭|답|워|와|웠|왔)$/,
  
  // 불완전한 단어
  incompleteWords: /\s+(마|무|바|사|아|자|차|카|타|파|하|가|나|다|라|이|히|기|니|디|리|미|비|시|지|치|피)$/,
  
  // 끝나는 쉼표
  trailingComma: /[,，、]\s*$/,
  
  // 끝나는 물결표
  trailingTilde: /[~∼]\s*$/,
  
  // 끝나는 여는 괄호
  trailingOpenParen: /[\(\[\{\<\（\［\｛\＜]\s*$/,
  
  // 닫히지 않은 괄호
  unclosedParen: (text: string) => {
    const openCount = (text.match(/[\(\[\{\<\（\［\｛\＜]/g) || []).length
    const closeCount = (text.match(/[\)\]\}\>\）\］\｝\＞]/g) || []).length
    return openCount > closeCount
  },
  
  // 끝나는 세미콜론, 콜론
  trailingPunctuation: /[:;：；]\s*$/,
  
  // 불완전한 인용
  incompleteQuote: (text: string) => {
    const singleQuotes = (text.match(/'/g) || []).length
    const doubleQuotes = (text.match(/"/g) || []).length
    return singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0
  },
  
  // 너무 짧은 정의 (한글)
  tooShortKorean: (text: string) => {
    const koreanOnly = text.replace(/[^가-힣\s]/g, '').trim()
    return koreanOnly.length > 0 && koreanOnly.length < 5
  },
  
  // ... 으로 끝나는 경우
  trailingEllipsis: /\.\.\.\s*$/,
  
  // 숫자로 끝나는 경우 (페이지 번호 등)
  trailingNumber: /\s+\d+\s*$/,
  
  // 불완전한 문장 (주어나 서술어가 없는 경우)
  incompleteSentence: (text: string) => {
    // 한글 동사 어미가 없는 경우
    if (/[가-힣]/.test(text) && text.length > 10) {
      return !/(다|요|음|임|함|됨|함|이다|이며|이고|하다|되다|있다|없다|같다|보다|주다|받다|하고|되고|있고|없고)\s*[,;.!?]?\s*$/.test(text)
    }
    return false
  }
}

// 자주 사용되는 완성된 짧은 정의들 (수정하면 안되는 것들)
const validShortDefinitions = [
  '하다', '되다', '있다', '없다', '보다', '주다', '받다', '가다', '오다', 
  '알다', '모르다', '크다', '작다', '많다', '적다', '좋다', '나쁘다',
  '맞다', '틀리다', '같다', '다르다', '쉽다', '어렵다', '빠르다', '느리다'
]

// 특정 잘린 패턴의 자동 수정 규칙
const autoFixRules: { [key: string]: string } = {
  // 조사 완성
  '주': '주다',
  '받': '받다',
  '보': '보다',
  '하': '하다',
  '되': '되다',
  '시': '시키다',
  '있': '있다',
  '없': '없다',
  '않': '않다',
  '알': '알다',
  '모': '모르다',
  '나': '나다',
  '가': '가다',
  '오': '오다',
  '놓': '놓다',
  '둘': '두다',
  '쓰': '쓰다',
  '먹': '먹다',
  '살': '살다',
  '죽': '죽다',
  '만들': '만들다',
  '생각하': '생각하다',
  '사용하': '사용하다',
  '이용하': '이용하다',
  '활용하': '활용하다',
  '적용하': '적용하다',
  '변경하': '변경하다',
  '수정하': '수정하다',
  '추가하': '추가하다',
  '제거하': '제거하다',
  '삭제하': '삭제하다'
}

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    // 통계
    const stats = {
      total: 0,
      checked: 0,
      fixed: 0,
      failed: 0,
      patterns: {} as { [key: string]: number }
    }
    
    const fixedWords: any[] = []
    const failedWords: any[] = []
    
    // 모든 단어 가져오기
    const wordsSnapshot = await db.collection('words').get()
    stats.total = wordsSnapshot.size
    
    // 배치 처리
    const batchSize = 500
    let batch = db.batch()
    let batchCount = 0
    
    for (const doc of wordsSnapshot.docs) {
      const data = doc.data()
      const word = data.word
      const definitions = data.definitions || []
      
      stats.checked++
      
      let hasChanges = false
      const updatedDefinitions = definitions.map((def: any) => {
        const defText = def.definition || def.text || ''
        let fixedText = defText
        const issues: string[] = []
        
        // 각 패턴 체크
        if (truncationPatterns.incompleteParticles.test(defText)) {
          issues.push('incomplete_particle')
          // 자동 수정 시도
          const match = defText.match(truncationPatterns.incompleteParticles)
          if (match) {
            const particle = match[1]
            if (autoFixRules[particle]) {
              fixedText = defText.replace(new RegExp(`\\s+${particle}$`), ` ${autoFixRules[particle]}`)
            }
          }
        }
        
        if (truncationPatterns.incompleteWords.test(defText)) {
          issues.push('incomplete_word')
        }
        
        if (truncationPatterns.trailingComma.test(defText)) {
          issues.push('trailing_comma')
          fixedText = fixedText.replace(truncationPatterns.trailingComma, '')
        }
        
        if (truncationPatterns.trailingTilde.test(defText)) {
          issues.push('trailing_tilde')
          fixedText = fixedText.replace(truncationPatterns.trailingTilde, '')
        }
        
        if (truncationPatterns.trailingOpenParen.test(defText)) {
          issues.push('trailing_open_paren')
          fixedText = fixedText.replace(truncationPatterns.trailingOpenParen, '')
        }
        
        if (truncationPatterns.unclosedParen(defText)) {
          issues.push('unclosed_paren')
          // 간단한 자동 수정: 끝에 닫는 괄호 추가
          if (/[가-힣]$/.test(fixedText)) {
            fixedText = fixedText + ')'
          } else if (/[a-zA-Z,;]$/.test(fixedText)) {
            fixedText = fixedText + '...)'
          }
        }
        
        if (truncationPatterns.trailingPunctuation.test(defText)) {
          issues.push('trailing_punctuation')
          fixedText = fixedText.replace(truncationPatterns.trailingPunctuation, '')
        }
        
        if (truncationPatterns.incompleteQuote(defText)) {
          issues.push('incomplete_quote')
        }
        
        if (truncationPatterns.tooShortKorean(defText) && !validShortDefinitions.includes(defText)) {
          issues.push('too_short')
        }
        
        if (truncationPatterns.trailingEllipsis.test(defText)) {
          issues.push('trailing_ellipsis')
          fixedText = fixedText.replace(truncationPatterns.trailingEllipsis, '')
        }
        
        if (truncationPatterns.trailingNumber.test(defText)) {
          issues.push('trailing_number')
          fixedText = fixedText.replace(truncationPatterns.trailingNumber, '')
        }
        
        if (truncationPatterns.incompleteSentence(defText)) {
          issues.push('incomplete_sentence')
        }
        
        // 통계 업데이트
        issues.forEach(issue => {
          stats.patterns[issue] = (stats.patterns[issue] || 0) + 1
        })
        
        // 변경사항이 있으면 업데이트
        if (fixedText !== defText && fixedText.trim().length > 0) {
          hasChanges = true
          return {
            ...def,
            definition: fixedText.trim(),
            text: fixedText.trim(),
            _original: defText,
            _issues: issues
          }
        }
        
        return def
      })
      
      if (hasChanges) {
        try {
          batch.update(doc.ref, {
            definitions: updatedDefinitions.map((def: any) => {
              // _original과 _issues는 저장하지 않음
              const { _original, _issues, ...cleanDef } = def
              return cleanDef
            }),
            updatedAt: new Date()
          })
          
          batchCount++
          stats.fixed++
          
          fixedWords.push({
            word,
            changes: updatedDefinitions
              .filter((def: any) => def._original)
              .map((def: any) => ({
                original: def._original,
                fixed: def.definition || def.text,
                issues: def._issues
              }))
          })
          
          if (batchCount >= batchSize) {
            await batch.commit()
            console.log(`Committed batch of ${batchCount} updates`)
            batch = db.batch()
            batchCount = 0
          }
        } catch (error) {
          console.error(`Failed to update word "${word}":`, error)
          stats.failed++
          failedWords.push({ word, error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }
    }
    
    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit()
      console.log(`Committed final batch of ${batchCount} updates`)
    }
    
    // 상세 로그
    console.log('\n=== 수정 통계 ===')
    console.log(`총 단어 수: ${stats.total}`)
    console.log(`검사한 단어: ${stats.checked}`)
    console.log(`수정된 단어: ${stats.fixed}`)
    console.log(`실패한 단어: ${stats.failed}`)
    console.log('\n=== 발견된 패턴 ===')
    Object.entries(stats.patterns).forEach(([pattern, count]) => {
      console.log(`${pattern}: ${count}개`)
    })
    
    // 처음 10개 수정 사례 출력
    console.log('\n=== 수정 사례 (처음 10개) ===')
    fixedWords.slice(0, 10).forEach(item => {
      console.log(`\n단어: ${item.word}`)
      item.changes.forEach((change: any) => {
        console.log(`  이전: "${change.original}"`)
        console.log(`  이후: "${change.fixed}"`)
        console.log(`  문제: ${change.issues.join(', ')}`)
      })
    })
    
    return NextResponse.json({
      success: true,
      message: `Comprehensive truncation fix completed`,
      stats,
      fixedWords: fixedWords.slice(0, 100), // 처음 100개만 반환
      totalFixed: fixedWords.length,
      failedWords
    })
    
  } catch (error) {
    console.error('Error in comprehensive truncation fix:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}