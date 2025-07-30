export interface VocabularyEntry {
  number?: string
  word: string
  partOfSpeech: string
  example: string
  definition: string
  englishDefinition?: string // 영어 정의 추가
}

export class VocabularyPDFExtractor {
  /**
   * PDF 텍스트에서 단어장 항목들을 추출
   * 형식: 번호/단어/품사/예문/뜻
   */
  extractVocabularyEntries(pdfText: string): VocabularyEntry[] {
    const entries: VocabularyEntry[] = []
    const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    console.log(`=== 슬래시 형식 파싱 시도 (총 ${lines.length}줄) ===`)
    
    for (const line of lines) {
      // 슬래시로 구분된 형식 파싱 (공백 포함 가능)
      const parts = line.split(/\s*\/\s*/).map(part => part.trim())
      
      if (parts.length >= 5) {
        // 번호/단어/품사/예문/뜻
        console.log(`5개 파트 발견: ${parts.join(' | ')}`)
        entries.push({
          number: parts[0],
          word: parts[1].toLowerCase(),
          partOfSpeech: parts[2],
          example: parts[3],
          definition: parts[4]
        })
      } else if (parts.length === 4) {
        // 번호가 없는 경우: 단어/품사/예문/뜻
        console.log(`4개 파트 발견: ${parts.join(' | ')}`)
        entries.push({
          word: parts[0].toLowerCase(),
          partOfSpeech: parts[1],
          example: parts[2],
          definition: parts[3]
        })
      }
    }
    
    console.log(`슬래시 형식으로 추출된 항목: ${entries.length}개`)
    return entries
  }

  /**
   * 다양한 단어장 형식 지원 (기본: 슬래시 구분 형식)
   */
  extractWithFlexibleFormat(pdfText: string): VocabularyEntry[] {
    // 먼저 슬래시 형식 시도
    const slashFormatEntries = this.extractVocabularyEntries(pdfText)
    if (slashFormatEntries.length > 0) {
      return slashFormatEntries
    }
    
    console.log('슬래시 형식에서 단어를 찾지 못함. V.ZIP 형식 파싱 시도...')
    
    // V.ZIP 형식 파싱 (번호 word품사 / 영어정의 / 한글뜻)
    const entries: VocabularyEntry[] = []
    const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    // V.ZIP 형식 파싱: 번호 + 단어품사가 한 줄에 (다양한 형식 지원)
    const patterns = [
      /^(\d+)\s+([a-zA-Z]+)(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|int\.)$/,
      /^(\d+)\s+([a-zA-Z]+)(n|v|adj|adv|prep|conj|pron|int)\.$/,
      /^(\d+)\s+([a-zA-Z-]+)(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|int\.)$/, // 하이픈 포함
      /^(\d+)\s+([a-zA-Z-]+)(n|v|adj|adv|prep|conj|pron|int)\.$/, // 하이픈 포함
      /^(\d+)\s+([a-zA-Z]+)([a-z]+)\.$/, // 품사가 붙어있는 모든 경우 (pompousadj.)
      /^(\d+)\s+([a-zA-Z-]+)([a-z]+)\.$/, // 하이픈 포함 + 품사 붙어있는 경우
      /^(\d+)\s+([a-zA-Z\s]+)(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|int\.)$/, // 공백 포함 단어
      /^(\d+)\s+(.+?)(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|int\.|[a-z]+\.)$/ // 더 유연한 패턴
    ]
    
    // 통계 정보
    const numberLines = lines.filter(line => /^\d+\s+/.test(line))
    console.log(`\n=== PDF 통계 ===`)
    console.log(`총 라인 수: ${lines.length}`)
    console.log(`숫자로 시작하는 라인: ${numberLines.length}`)
    console.log(`예상 단어 수: ${numberLines.length}`)
    
    // 처음 몇 줄 출력해서 형식 확인
    console.log('\n=== 처음 20줄 ===')
    lines.slice(0, 20).forEach((line, idx) => {
      console.log(`${idx + 1}: ${line}`)
    })
    
    // 첫 번째 단어 항목 찾아서 상세 분석
    for (let j = 0; j < lines.length; j++) {
      let matched = false
      for (const pattern of patterns) {
        if (lines[j].match(pattern)) {
          matched = true
          break
        }
      }
      if (matched) {
        console.log('\n=== 첫 번째 단어 항목 분석 ===')
        for (let k = j; k < Math.min(j + 10, lines.length); k++) {
          console.log(`줄 ${k + 1}: "${lines[k]}"`)
        }
        break
      }
    }
    
    let i = 0
    let debugCount = 0
    let lastNumber = 0
    let unmatchedCount = 0
    const unmatchedSamples: string[] = []
    
    while (i < lines.length) {
      const line = lines[i]
      let match = null
      
      // 모든 패턴 시도
      for (const pattern of patterns) {
        match = line.match(pattern)
        if (match) break
      }
      
      // 디버깅: 숫자 패턴이 있는 모든 줄 확인
      if (/^\d+\s+/.test(line)) {
        if (!match) {
          unmatchedCount++
          if (unmatchedSamples.length < 20) {
            unmatchedSamples.push(line)
          }
        }
        if (debugCount < 30) {
          console.log(`라인 ${i + 1}: "${line}" - 매치: ${match ? 'O' : 'X'}`)
          debugCount++
        }
      }
      
      if (match) {
        const number = match[1]
        const word = match[2]
        const partOfSpeech = match[3]
        
        // 번호 연속성 체크
        const currentNumber = parseInt(number)
        if (lastNumber > 0 && currentNumber !== lastNumber + 1) {
          console.warn(`⚠️ 번호 누락 감지: ${lastNumber} → ${currentNumber} (${lastNumber + 1}부터 ${currentNumber - 1}까지 누락)`)
          
          // 누락된 번호 주변 라인 확인
          console.log('누락 지점 주변 라인 확인:')
          const startIdx = Math.max(0, i - 20)
          const endIdx = Math.min(lines.length, i + 5)
          for (let j = startIdx; j < endIdx; j++) {
            const prefix = j === i ? '>>> ' : '    '
            if (/^\d+\s+/.test(lines[j])) {
              console.log(`${prefix}라인 ${j + 1}: "${lines[j]}"`)
            }
          }
        }
        lastNumber = currentNumber
        
        // 디버깅: 처음 20개 단어의 전체 구조 출력
        if (debugCount < 20) {
          console.log(`\n=== 단어 ${number}: ${word} (${partOfSpeech}) [라인 ${i + 1}] ===`)
          debugCount++
        }
        
        // 다음 줄들에서 영어 정의 수집
        let definition = ''
        let koreanMeaning = ''
        i++
        
        // 영어 정의 수집 (한글이 나올 때까지)
        const definitionLines: string[] = []
        let lineCount = 0
        while (i < lines.length && !/[가-힣]/.test(lines[i])) {
          // 다음 단어 패턴인지 확인
          let isNextWord = false
          for (const pattern of patterns) {
            if (lines[i].match(pattern)) {
              isNextWord = true
              break
            }
          }
          if (isNextWord) break
          if (lines[i] !== '○ ○ ○' && lines[i] !== 'V.ZIP 3K') {
            definitionLines.push(lines[i])
            if (debugCount <= 5) {
              console.log(`  영어 줄 ${++lineCount}: "${lines[i]}"`)
            }
          }
          i++
        }
        
        // 영어 정의와 예문 분리
        const fullDefinition = definitionLines.join(' ').trim()
        let englishDefinition = fullDefinition
        let example = ''
        
        // 예문 패턴 찾기
        // 1. 전체 문장에서 해당 단어를 포함하는 완전한 문장 찾기
        const sentences = fullDefinition.match(/[A-Z][^.!?]+[.!?]/g) || []
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(word.toLowerCase())) {
            example = sentence.trim()
            englishDefinition = fullDefinition.replace(sentence, '').trim()
            break
          }
        }
        
        // 2. 예문을 못 찾았고, 정의가 충분히 길면 정의 자체에 예문이 포함되어 있을 수 있음
        if (!example && fullDefinition.length > 50) {
          // "예: " 또는 "e.g." 패턴 찾기
          const exampleMatch = fullDefinition.match(/(?:e\.g\.|ex\.|예:|example:)\s*(.+)/i)
          if (exampleMatch) {
            example = exampleMatch[1].trim()
          }
        }
        
        if (debugCount <= 5 && example) {
          console.log(`  예문 찾음: "${example}"`)
        }
        
        // 한글 뜻 수집
        if (i < lines.length && /[가-힣]/.test(lines[i])) {
          koreanMeaning = lines[i]
          if (debugCount <= 5) {
            console.log(`  한글 뜻: "${lines[i]}"`)
          }
          i++
        }
        
        entries.push({
          number,
          word: word.toLowerCase(),
          partOfSpeech,
          example,
          definition: koreanMeaning || englishDefinition, // 한글 뜻을 우선으로
          englishDefinition: fullDefinition // 영어 정의 전체 저장
        })
        
        console.log(`추출: ${number}. ${word} (${partOfSpeech})`)
        console.log(`  영어 정의 전체: ${fullDefinition}`)
        console.log(`  한글 뜻: ${koreanMeaning}`)
        console.log(`  예문 추출됨: ${example || '없음'}`)
      } else {
        i++
      }
    }
    
    console.log(`\n=== 최종 결과 ===`)
    console.log(`V.ZIP 형식으로 추출된 항목: ${entries.length}개`)
    console.log(`매칭되지 않은 숫자 라인: ${unmatchedCount}개`)
    console.log(`실제 추출률: ${((entries.length / (entries.length + unmatchedCount)) * 100).toFixed(1)}%`)
    
    if (unmatchedSamples.length > 0) {
      console.log('\n=== 매칭 실패 샘플 ===')
      unmatchedSamples.forEach(sample => {
        console.log(`"${sample}"`)
        // 어떤 부분이 문제인지 분석
        const parts = sample.split(/\s+/)
        if (parts.length >= 2) {
          console.log(`  → 번호: "${parts[0]}", 나머지: "${parts.slice(1).join(' ')}"`)
        }
      })
    }
    
    // 다른 패턴들 시도
    if (entries.length === 0) {
      const patterns = [
        // 패턴 1: word (품사) 뜻
        /^([a-zA-Z]+)\s*\(([^)]+)\)\s*(.+)$/,
        // 패턴 2: word: 뜻 (품사)
        /^([a-zA-Z]+):\s*(.+)\s*\(([^)]+)\)$/,
        // 패턴 3: word - 뜻
        /^([a-zA-Z]+)\s*[-–]\s*(.+)$/,
        // 패턴 4: 번호. word (품사) 뜻
        /^\d+\.\s*([a-zA-Z]+)\s*\(([^)]+)\)\s*(.+)$/,
      ]
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        let matched = false
      
      // 각 패턴 시도
      for (const pattern of patterns) {
        const match = line.match(pattern)
        if (match) {
          let word = ''
          let partOfSpeech = ''
          let definition = ''
          
          // 패턴별로 다르게 파싱
          if (pattern === patterns[0] || pattern === patterns[3]) {
            word = match[1].toLowerCase()
            partOfSpeech = match[2] || 'n.'
            definition = match[3] || match[2]
          } else if (pattern === patterns[1]) {
            word = match[1].toLowerCase()
            definition = match[2]
            partOfSpeech = match[3]
          } else if (pattern === patterns[2]) {
            word = match[1].toLowerCase()
            definition = match[2]
            partOfSpeech = 'n.' // 기본값
          }
          
          // 예문 찾기
          let example = ''
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1]
            // 다음 줄이 새로운 단어가 아니면 예문으로 간주
            const isNewWord = patterns.some(p => nextLine.match(p))
            if (!isNewWord && nextLine.length > 10) {
              example = nextLine
              i++
            }
          }
          
          entries.push({
            word: word.trim(),
            partOfSpeech: partOfSpeech.trim(),
            definition: definition.trim(),
            example: example.trim()
          })
          
          matched = true
          break
        }
      }
    }
    }
    
    return entries
  }

  /**
   * SAT 단어인지 확인
   */
  isSATWord(word: string): boolean {
    const satWords = [
      'abandon', 'aberration', 'abhor', 'abstruse', 'acquiesce', 'acrimony',
      'admonish', 'adroit', 'aesthetic', 'affable', 'alacrity', 'alleviate',
      'altruistic', 'ambiguous', 'ambivalent', 'ameliorate', 'amiable',
      'amorphous', 'anachronism', 'anarchy', 'anomaly', 'antagonist',
      'antipathy', 'apathy', 'appease', 'arbitrary', 'arcane', 'archaic',
      'arduous', 'articulate', 'ascetic', 'assiduous', 'assuage', 'astute',
      'audacious', 'austere', 'autonomous', 'avarice', 'aversion',
      // ... 더 많은 SAT 단어
    ]
    
    return satWords.includes(word.toLowerCase())
  }
}

export default VocabularyPDFExtractor