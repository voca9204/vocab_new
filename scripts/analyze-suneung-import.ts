const fs = require('fs')
const path = require('path')

function analyzeFile() {
  console.log('📊 수능 단어 파일 분석...\n')

  const content = fs.readFileSync('/Users/sinclair/Downloads/suneung-english-vocabulary-2000-words.md', 'utf-8')
  const lines = content.split('\n')

  let currentLevel = ''
  let beginnerWords: string[] = []
  let intermediateWords: string[] = []
  let advancedWords: string[] = []

  for (const line of lines) {
    if (line.includes('## Part 1: 초급')) {
      currentLevel = 'beginner'
      console.log('✅ 초급 섹션 발견')
    } else if (line.includes('## Part 2: 중급')) {
      currentLevel = 'intermediate'
      console.log('✅ 중급 섹션 발견')
    } else if (line.includes('## Part 3: 고급')) {
      currentLevel = 'advanced'
      console.log('✅ 고급 섹션 발견')
    } else if (currentLevel && line.match(/^[a-z]/)) {
      // This line contains words
      const words = line.split(',').map((w: string) => w.trim()).filter((w: string) => w && w.match(/^[a-z]/))

      if (currentLevel === 'beginner') {
        beginnerWords.push(...words)
      } else if (currentLevel === 'intermediate') {
        intermediateWords.push(...words)
      } else if (currentLevel === 'advanced') {
        advancedWords.push(...words)
      }
    }
  }

  console.log('\n📊 파일 내 단어 개수:')
  console.log(`  초급: ${beginnerWords.length}개`)
  console.log(`  중급: ${intermediateWords.length}개`)
  console.log(`  고급: ${advancedWords.length}개`)
  console.log(`  총합: ${beginnerWords.length + intermediateWords.length + advancedWords.length}개`)

  // Check for unique words
  const allWords = [...beginnerWords, ...intermediateWords, ...advancedWords]
  const uniqueWords = new Set(allWords)

  console.log('\n📊 중복 분석:')
  console.log(`  전체 단어: ${allWords.length}개`)
  console.log(`  고유 단어: ${uniqueWords.size}개`)
  console.log(`  중복 단어: ${allWords.length - uniqueWords.size}개`)

  // Sample some words from each level
  console.log('\n📊 각 레벨 샘플 단어:')
  console.log('  초급 첫 5개:', beginnerWords.slice(0, 5).join(', '))
  console.log('  중급 첫 5개:', intermediateWords.slice(0, 5).join(', '))
  console.log('  고급 첫 5개:', advancedWords.slice(0, 5).join(', '))

  return {
    beginner: beginnerWords.length,
    intermediate: intermediateWords.length,
    advanced: advancedWords.length,
    total: allWords.length,
    unique: uniqueWords.size
  }
}

analyzeFile()