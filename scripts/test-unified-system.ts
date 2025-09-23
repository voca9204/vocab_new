/**
 * Test script for unified collection selection system
 * Tests the complete flow from homepage to learning
 */

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { directWordAdapter } from '../src/lib/adapters/direct-word-adapter'

async function testUnifiedSystem() {
  console.log('🧪 Testing Unified Collection System...\n')

  // Test 1: DirectWordAdapter functionality
  console.log('1️⃣ Testing DirectWordAdapter...')
  try {
    const satIntermediateWords = await directWordAdapter.getWordsByCollection('SAT', 'intermediate')
    console.log(`   ✅ Loaded ${satIntermediateWords.length} SAT intermediate words`)

    if (satIntermediateWords.length > 0) {
      const firstWord = satIntermediateWords[0]
      console.log(`   ✅ Sample word: ${firstWord.word} - ${firstWord.definition}`)
    }
  } catch (error) {
    console.log(`   ❌ DirectWordAdapter error: ${error}`)
  }

  // Test 2: Collection categories and difficulties
  console.log('\n2️⃣ Testing collection structure...')
  const categories = ['SAT', 'TOEFL', 'TOEIC', '수능', 'GRE', 'IELTS', '기본']
  const difficulties = ['beginner', 'intermediate', 'advanced']

  for (const category of categories) {
    console.log(`   Testing ${category}:`)
    for (const difficulty of difficulties) {
      try {
        const words = await directWordAdapter.getWordsByCollection(category, difficulty)
        if (words.length > 0) {
          console.log(`     ✅ ${difficulty}: ${words.length} words`)
        } else {
          console.log(`     ⚠️  ${difficulty}: No words (준비 중)`)
        }
      } catch (error) {
        console.log(`     ❌ ${difficulty}: Error loading`)
      }
    }
  }

  // Test 3: Learning history (localStorage simulation)
  console.log('\n3️⃣ Testing learning history...')
  const mockHistory = {
    collectionId: 'sat-intermediate',
    collectionName: 'SAT Intermediate',
    category: 'SAT',
    difficulty: 'intermediate',
    lastStudiedAt: new Date().toISOString(),
    progress: 45,
    wordsStudied: 450,
    totalWords: 1000,
    sessionCount: 5
  }
  console.log('   ✅ Mock history created:', mockHistory.collectionName)

  // Test 4: Cache functionality
  console.log('\n4️⃣ Testing cache...')
  const cacheStats = directWordAdapter.getCacheStats()
  console.log(`   ✅ Cache size: ${cacheStats.size} words`)
  console.log(`   ✅ Cache timestamp: ${new Date(cacheStats.timestamp).toLocaleTimeString()}`)

  // Test 5: Search functionality
  console.log('\n5️⃣ Testing search...')
  try {
    const searchResults = await directWordAdapter.searchWords('test', 5)
    console.log(`   ✅ Search for "test": ${searchResults.length} results`)
    searchResults.forEach(word => {
      console.log(`     - ${word.word}`)
    })
  } catch (error) {
    console.log(`   ❌ Search error: ${error}`)
  }

  console.log('\n✨ Unified system test complete!')
}

// Run the test
testUnifiedSystem().catch(console.error)