// Manual Dictionary API Test
import { vocabularyService } from './src/lib/api/vocabulary-service.js'

async function testDictionaryAPI() {
  console.log('🧪 Dictionary API 실제 테스트 시작...\n')

  const testWords = ['sophisticated', 'eloquent', 'test']

  for (const word of testWords) {
    try {
      console.log(`📚 Testing word: "${word}"`)
      const start = Date.now()
      
      const result = await vocabularyService.fetchAndProcessWord(word)
      const duration = Date.now() - start

      if (result.success && result.word) {
        console.log(`✅ Success (${duration}ms)`)
        console.log(`   Definition: ${result.word.definition.substring(0, 100)}...`)
        console.log(`   Part of Speech: ${result.word.partOfSpeech}`)
        console.log(`   Difficulty: ${result.word.difficulty}/10`)
        console.log(`   SAT Level: ${result.word.satLevel ? 'Yes' : 'No'}`)
        console.log(`   API Source: ${result.apiSource}`)
        console.log(`   Cache Hit: ${result.cacheHit ? 'Yes' : 'No'}`)
      } else {
        console.log(`❌ Failed: ${result.error}`)
      }
      
      console.log('') // Empty line for readability
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
      console.log('')
    }
  }

  // Test cache functionality
  console.log('🔄 Testing cache with repeated request...')
  try {
    const start = Date.now()
    const cachedResult = await vocabularyService.fetchAndProcessWord('sophisticated')
    const duration = Date.now() - start
    
    console.log(`✅ Cached request completed in ${duration}ms`)
    console.log(`   Cache should be faster: ${duration < 50 ? 'Yes ✅' : 'No ❌'}`)
  } catch (error) {
    console.log(`❌ Cache test failed: ${error.message}`)
  }

  // Display cache stats
  const stats = vocabularyService.getCacheStats()
  console.log(`📊 Cache Statistics: ${stats.size} items cached`)
}

// Run the test
testDictionaryAPI().then(() => {
  console.log('🎉 Dictionary API test completed!')
}).catch(error => {
  console.error('💥 Test failed:', error)
})
