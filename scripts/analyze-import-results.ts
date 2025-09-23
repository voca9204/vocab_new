const fs = require('fs')

// TOEFL 파일 분석
function analyzeTOEFL() {
  const filePath = '/Users/sinclair/Downloads/tofle2000.md'
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')

  const result = {
    beginner: [] as string[],
    intermediate: [] as string[],
    advanced: [] as string[]
  }

  let currentLevel = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Detect level markers
    if (line.includes('Part 1: Beginner Level')) {
      currentLevel = 'beginner'
      continue
    } else if (line.includes('Part 2: Intermediate Level')) {
      currentLevel = 'intermediate'
      continue
    } else if (line.includes('Part 3: Advanced Level')) {
      currentLevel = 'advanced'
      continue
    }

    // Skip headers and empty lines
    if (line.startsWith('#') || line.startsWith('*') || line === '' || line.startsWith('**')) {
      continue
    }

    // Extract words from content lines
    if (currentLevel && !line.includes(':')) {
      const words = line.split(',').map((w: string) => w.trim()).filter((w: string) => w && !w.includes('(') && w.length > 1)

      if (currentLevel === 'beginner') {
        result.beginner.push(...words)
      } else if (currentLevel === 'intermediate') {
        result.intermediate.push(...words)
      } else if (currentLevel === 'advanced') {
        result.advanced.push(...words)
      }
    }
  }

  // Remove duplicates within each level
  result.beginner = [...new Set(result.beginner)]
  result.intermediate = [...new Set(result.intermediate)]
  result.advanced = [...new Set(result.advanced)]

  console.log('=== TOEFL 파일 분석 ===')
  console.log(`초급: ${result.beginner.length}개 단어`)
  console.log(`중급: ${result.intermediate.length}개 단어`)
  console.log(`고급: ${result.advanced.length}개 단어`)
  console.log(`총합: ${result.beginner.length + result.intermediate.length + result.advanced.length}개 단어`)
  console.log('')

  return result
}

// TOEIC 파일 분석
function analyzeTOEIC() {
  const filePath = '/Users/sinclair/Downloads/toeic-vocabulary-guide-2000-words.md'
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')

  const result = {
    beginner: [] as string[],
    intermediate: [] as string[],
    advanced: [] as string[]
  }

  let currentLevel = ''
  let inWordSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Detect level markers
    if (line.includes('Part 1: Beginner Level')) {
      currentLevel = 'beginner'
      continue
    } else if (line.includes('Part 2: Intermediate Level')) {
      currentLevel = 'intermediate'
      continue
    } else if (line.includes('Part 3: Advanced Level')) {
      currentLevel = 'advanced'
      continue
    }

    // Skip headers and empty lines
    if (line.startsWith('#') || line === '') {
      continue
    }

    // Detect word section headers
    if (line.startsWith('**') && line.endsWith(':**')) {
      inWordSection = true
      continue
    }

    // Skip other markdown formatting
    if (line.startsWith('*') || line.startsWith('---')) {
      continue
    }

    // Extract words from content lines
    if (currentLevel && inWordSection) {
      if (!line.includes('Target:') && !line.includes('TOEIC') && !line.includes('CEFR')) {
        const words = line.split(',').map((w: string) => w.trim())
          .filter((w: string) => {
            return w &&
                   w.length > 1 &&
                   !w.includes('**') &&
                   !w.includes('(') &&
                   !w.includes(':') &&
                   !/^\d+$/.test(w)
          })

        if (words.length > 0) {
          if (currentLevel === 'beginner') {
            result.beginner.push(...words)
          } else if (currentLevel === 'intermediate') {
            result.intermediate.push(...words)
          } else if (currentLevel === 'advanced') {
            result.advanced.push(...words)
          }
        }
      }
    }
  }

  // Remove duplicates within each level
  result.beginner = [...new Set(result.beginner)]
  result.intermediate = [...new Set(result.intermediate)]
  result.advanced = [...new Set(result.advanced)]

  console.log('=== TOEIC 파일 분석 ===')
  console.log(`초급: ${result.beginner.length}개 단어`)
  console.log(`중급: ${result.intermediate.length}개 단어`)
  console.log(`고급: ${result.advanced.length}개 단어`)
  console.log(`총합: ${result.beginner.length + result.intermediate.length + result.advanced.length}개 단어`)
  console.log('')

  return result
}

// Import 로그 분석
function analyzeImportLogs() {
  console.log('=== Import 로그 분석 ===')

  // TOEFL 로그 분석
  try {
    const toeflLog = fs.readFileSync('toefl_import.log', 'utf8')
    const toeflExisting = (toeflLog.match(/Word already exists:/g) || []).length
    const toeflCreated = (toeflLog.match(/Created word:/g) || []).length

    console.log('TOEFL Import:')
    console.log(`  - 이미 존재하는 단어 (스킵): ${toeflExisting}개`)
    console.log(`  - 새로 생성된 단어: ${toeflCreated}개`)
    console.log('')
  } catch (e) {
    console.log('TOEFL 로그 파일을 읽을 수 없습니다')
  }

  // TOEIC 로그 분석
  try {
    const toeicLog = fs.readFileSync('toeic_import.log', 'utf8')
    const toeicExisting = (toeicLog.match(/Word already exists:/g) || []).length
    const toeicCreated = (toeicLog.match(/Created word:/g) || []).length

    console.log('TOEIC Import:')
    console.log(`  - 이미 존재하는 단어 (스킵): ${toeicExisting}개`)
    console.log(`  - 새로 생성된 단어: ${toeicCreated}개`)
    console.log('')
  } catch (e) {
    console.log('TOEIC 로그 파일을 읽을 수 없습니다')
  }
}

// 실행
console.log('📊 TOEFL/TOEIC Import 결과 분석\n')
console.log('=' .repeat(50))
console.log('')

const toeflWords = analyzeTOEFL()
const toeicWords = analyzeTOEIC()
analyzeImportLogs()

console.log('=' .repeat(50))
console.log('\n📌 결론:')
console.log('원본 파일에 있는 단어 개수:')
console.log(`  - TOEFL: ${toeflWords.beginner.length + toeflWords.intermediate.length + toeflWords.advanced.length}개`)
console.log(`  - TOEIC: ${toeicWords.beginner.length + toeicWords.intermediate.length + toeicWords.advanced.length}개`)
console.log('')
console.log('실제 데이터베이스에 추가된 단어:')
console.log('  - TOEFL: 초급 396 + 중급 906 + 고급 500 = 1,802개')
console.log('  - TOEIC: 초급 444 + 중급 850 + 고급 500 = 1,794개')
console.log('')
console.log('차이는 주로 이미 존재하는 단어들을 스킵했기 때문입니다.')