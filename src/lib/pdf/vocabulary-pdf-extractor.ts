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
   * 한글 정의에서 혼재된 영어 단어들 제거 (개선된 버전)
   */
  private cleanKoreanDefinition(koreanText: string, currentWord: string): string {
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
      console.log(`[cleanKoreanDefinition] Removing foreign word "${foreignWord}" from "${koreanText}"`)
      
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
      console.log(`[cleanKoreanDefinition] Over-filtered, returning original: "${koreanText}"`)
      return koreanText
    }
    
    console.log(`[cleanKoreanDefinition] Cleaned: "${koreanText}" -> "${cleanedText}"`)
    return cleanedText
  }

  /**
   * 품사 정규화
   */
  private normalizePartOfSpeech(pos: string): string {
    const mapping: Record<string, string> = {
      'noun': 'n.',
      'verb': 'v.',
      'adjective': 'adj.',
      'adverb': 'adv.',
      'preposition': 'prep.',
      'conjunction': 'conj.',
      'pronoun': 'pron.',
      'interjection': 'int.',
      'n': 'n.',
      'v': 'v.',
      'adj': 'adj.',
      'adv': 'adv.',
      'prep': 'prep.',
      'conj': 'conj.',
      'pron': 'pron.',
      'int': 'int.',
      // 한글 품사
      '명': 'n.',
      '동': 'v.',
      '형': 'adj.',
      '부': 'adv.',
      '전': 'prep.',
      '접': 'conj.',
      '대': 'pron.',
      '감': 'int.'
    }

    const normalized = pos.toLowerCase().replace(/[.\s]/g, '')
    return mapping[normalized] || pos
  }
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
    let entries: VocabularyEntry[] = []
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
        const definition = ''
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
        
        // 한글 뜻 수집 (개선된 로직) - 여러 줄에 걸친 한글 정의 처리
        const koreanLines: string[] = []
        while (i < lines.length && /[가-힣]/.test(lines[i])) {
          // 다음 단어 패턴인지 확인
          let isNextWord = false
          for (const pattern of patterns) {
            if (lines[i].match(pattern)) {
              isNextWord = true
              break
            }
          }
          if (isNextWord) break
          
          // 구분자 라인이나 특수 패턴 제외
          if (lines[i] !== '○ ○ ○' && lines[i] !== 'V.ZIP 3K' && lines[i].trim().length > 0) {
            koreanLines.push(lines[i])
            if (debugCount <= 5) {
              console.log(`  한글 줄 ${koreanLines.length}: "${lines[i]}"`)
            }
          }
          i++
        }
        
        // 모든 한글 줄을 합치고 정제
        if (koreanLines.length > 0) {
          const rawKoreanText = koreanLines.join(' ').trim()
          koreanMeaning = this.cleanKoreanDefinition(rawKoreanText, word)
          
          if (debugCount <= 5) {
            console.log(`  원본 한글 전체: "${rawKoreanText}"`)
            console.log(`  정제된 한글 뜻: "${koreanMeaning}"`)
          }
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
    
    // 수능 기출 형식 시도
    if (entries.length === 0) {
      console.log('V.ZIP 형식 실패, 수능 기출 형식 시도...')
      entries = this.extractSuneungFormat(pdfText)
    }
    
    // 표 형식 시도
    if (entries.length === 0) {
      console.log('수능 형식 실패, 표 형식 시도...')
      entries = this.extractTableFormat(pdfText)
    }
    
    // TOEFL 형식 시도
    if (entries.length === 0) {
      console.log('표 형식 실패, TOEFL 형식 시도...')
      entries = this.extractTOEFLFormat(pdfText)
    }
    
    // 다른 패턴들 시도
    if (entries.length === 0) {
      console.log('모든 표준 형식 실패, 일반 패턴 시도...')
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
   * 수능 기출 형식 추출
   * 형식:
   * 번호
   * (연도) 영어 표현
   * 한글 번역
   * 단어
   * [발음]
   * (품사) 정의
   */
  extractSuneungFormat(text: string): VocabularyEntry[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    const entries: VocabularyEntry[] = []
    
    console.log('=== 수능 기출 형식 추출 시도 ===')
    
    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()
      
      // 숫자로만 된 라인 찾기
      if (/^\d+$/.test(line)) {
        const number = line
        
        // 다음 라인들 확인
        if (i + 5 < lines.length) {
          const expressionLine = lines[i + 1].trim() // (연도) 영어 표현
          const koreanLine = lines[i + 2].trim()     // 한글 번역
          const wordLine = lines[i + 3].trim()       // 단어
          const pronunciationLine = lines[i + 4].trim() // [발음]
          const definitionLine = lines[i + 5].trim()    // (품사) 정의
          
          // 단어 추출 (알파벳으로만 구성)
          if (/^[a-zA-Z]+$/.test(wordLine) && wordLine.length > 2) {
            // 품사와 정의 추출
            const posMatch = definitionLine.match(/^\((동|형|명|부)\)\s*(.+)$/)
            let partOfSpeech = 'n.'
            let definition = definitionLine
            
            if (posMatch) {
              // 한글 품사를 영어로 변환
              const posMap: Record<string, string> = {
                '동': 'v.',
                '형': 'adj.',
                '명': 'n.',
                '부': 'adv.'
              }
              partOfSpeech = posMap[posMatch[1]] || 'n.'
              definition = posMatch[2]
            }
            
            entries.push({
              number: number,
              word: wordLine.toLowerCase(),
              partOfSpeech: partOfSpeech,
              definition: koreanLine, // 한글 번역을 주 정의로
              englishDefinition: definition, // 상세 정의
              example: expressionLine // 예문으로 사용
            })
            
            if (entries.length <= 5) {
              console.log(`추출: ${number}. ${wordLine} (${partOfSpeech}) - ${koreanLine}`)
            }
            
            i += 6
            continue
          }
        }
      }
      i++
    }
    
    console.log(`수능 기출 형식으로 추출된 단어: ${entries.length}개`)
    return entries
  }

  /**
   * 메가스터디/표 형식 추출
   * 다양한 표 형식을 지원
   */
  extractTableFormat(text: string): VocabularyEntry[] {
    const lines = text.split('\n')
    const entries: VocabularyEntry[] = []
    
    console.log('=== 표 형식 추출 시도 ===')
    console.log(`총 라인 수: ${lines.length}`)
    
    // 다양한 구분자 패턴
    const separators = [
      /\s{2,}/,  // 2개 이상의 공백
      /\t+/,     // 탭
      /\|/,      // 파이프
      /,/        // 쉼표
    ]
    
    // 더 간단한 패턴들도 시도
    const simplePatterns = [
      // 패턴 1: word 한글뜻
      /^([a-zA-Z]+)\s+([가-힣].+)$/,
      // 패턴 2: 숫자. word 한글뜻
      /^\d+\.?\s*([a-zA-Z]+)\s+([가-힣].+)$/,
      // 패턴 3: word (품사) 한글뜻
      /^([a-zA-Z]+)\s*\(([^)]+)\)\s*([가-힣].+)$/,
      // 패턴 4: word: 한글뜻
      /^([a-zA-Z]+):\s*([가-힣].+)$/,
      // 패턴 5: word - 한글뜻
      /^([a-zA-Z]+)\s*[-–]\s*([가-힣].+)$/
    ]
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.length < 5) continue
      
      // 먼저 간단한 패턴들 시도
      let matched = false
      for (const pattern of simplePatterns) {
        const match = line.match(pattern)
        if (match) {
          let word = ''
          let definition = ''
          let partOfSpeech = 'n.'
          
          if (pattern === simplePatterns[0]) {
            // word 한글뜻
            word = match[1]
            definition = match[2]
          } else if (pattern === simplePatterns[1]) {
            // 숫자. word 한글뜻
            word = match[1]
            definition = match[2]
          } else if (pattern === simplePatterns[2]) {
            // word (품사) 한글뜻
            word = match[1]
            partOfSpeech = this.normalizePartOfSpeech(match[2])
            definition = match[3]
          } else if (pattern === simplePatterns[3] || pattern === simplePatterns[4]) {
            // word: 한글뜻 또는 word - 한글뜻
            word = match[1]
            definition = match[2]
          }
          
          if (word && definition) {
            entries.push({
              word: word.toLowerCase(),
              partOfSpeech: partOfSpeech,
              definition: definition,
              example: ''
            })
            
            if (entries.length <= 10) {
              console.log(`추출 (패턴): ${word} - ${definition}`)
            }
            matched = true
            break
          }
        }
      }
      
      // 간단한 패턴으로 매칭 안되면 구분자 패턴 시도
      if (!matched && /^(\d+\.?\s*)?[a-zA-Z]{2,}/.test(line)) {
        // 각 구분자로 시도
        for (const separator of separators) {
          const parts = line.split(separator).map(p => p.trim()).filter(p => p)
          
          if (parts.length >= 2) {
            // 단어 찾기 (영어 단어)
            let word = ''
            let definition = ''
            let partOfSpeech = ''
            
            // 첫 번째 부분에서 숫자 제거하고 단어 추출
            const firstPart = parts[0].replace(/^\d+\.?\s*/, '')
            if (/^[a-zA-Z]+$/.test(firstPart)) {
              word = firstPart
              
              // 나머지 부분에서 정의와 품사 찾기
              const remainingParts = parts.slice(1).join(' ')
              
              // 한글이 포함된 부분을 정의로
              if (/[가-힣]/.test(remainingParts)) {
                definition = remainingParts
                
                // 품사 패턴 찾기
                const posPatterns = [
                  /\((n|v|adj|adv|prep|conj|pron|int)\)/,
                  /\((명|동|형|부|전|접|대|감)\)/,
                  /(n\.|v\.|adj\.|adv\.)/
                ]
                
                for (const posPattern of posPatterns) {
                  const posMatch = remainingParts.match(posPattern)
                  if (posMatch) {
                    partOfSpeech = this.normalizePartOfSpeech(posMatch[1])
                    definition = remainingParts.replace(posMatch[0], '').trim()
                    break
                  }
                }
                
                if (word && definition) {
                  entries.push({
                    word: word.toLowerCase(),
                    partOfSpeech: partOfSpeech || 'n.',
                    definition: definition,
                    example: ''
                  })
                  
                  if (entries.length <= 10) {
                    console.log(`추출 (구분자): ${word} - ${definition}`)
                  }
                  break // 구분자 찾았으면 다음 라인으로
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`표 형식으로 추출된 단어: ${entries.length}개`)
    return entries
  }

  /**
   * TOEFL/일반 단어장 형식 추출
   * 형식: 
   * word
   * pos. definition
   * pos. definition
   */
  extractTOEFLFormat(text: string): VocabularyEntry[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    const entries: VocabularyEntry[] = []
    
    console.log('=== TOEFL 형식 추출 시도 ===')
    
    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()
      
      // 단어인지 확인 (알파벳으로만 구성된 한 단어)
      if (/^[a-zA-Z]+$/.test(line) && line.length > 2) {
        const word = line.toLowerCase()
        const definitions: { pos: string; def: string }[] = []
        
        // 다음 줄들에서 정의 찾기
        let j = i + 1
        while (j < lines.length) {
          const defLine = lines[j].trim()
          
          // 품사로 시작하는 정의 라인 (예: "v. forsake, leave behind")
          const defMatch = defLine.match(/^([a-z]+)\. (.+)$/)
          if (defMatch) {
            definitions.push({
              pos: defMatch[1],
              def: defMatch[2]
            })
            j++
          } else if (/^[a-zA-Z]+$/.test(defLine) && defLine.length > 2) {
            // 새로운 단어를 만나면 중단
            break
          } else {
            // 정의의 연속이거나 다른 내용
            j++
          }
        }
        
        // 정의가 있으면 추가
        if (definitions.length > 0) {
          entries.push({
            word: word,
            partOfSpeech: definitions[0].pos + '.',
            definition: definitions.map(d => d.def).join('; '),
            englishDefinition: definitions[0].def,
            example: ''
          })
          
          if (entries.length <= 5) {
            console.log(`추출: ${word} (${definitions[0].pos}.) - ${definitions[0].def.substring(0, 50)}...`)
          }
        }
        
        i = j
      } else {
        i++
      }
    }
    
    console.log(`TOEFL 형식으로 추출된 단어: ${entries.length}개`)
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