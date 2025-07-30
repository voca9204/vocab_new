/**
 * Update pronunciations for words in the new DB structure
 */

async function updatePronunciations() {
  console.log('🔄 Starting pronunciation update...\n')
  
  try {
    const response = await fetch('http://localhost:3000/api/update-pronunciations-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: 100 // Process 100 words at a time
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    
    console.log('📊 Update Results:')
    console.log(`- Total words without pronunciation: ${result.stats.totalWordsWithoutPronunciation}`)
    console.log(`- Words processed: ${result.stats.processed}`)
    console.log(`- Successfully updated: ${result.stats.updated}`)
    console.log(`- Failed: ${result.stats.failed}`)
    console.log(`- Remaining: ${result.stats.remaining}`)
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Failed words:', result.errors.join(', '))
    }
    
    if (result.stats.remaining > 0) {
      console.log(`\n⚠️  There are still ${result.stats.remaining} words without pronunciation.`)
      console.log('Run this script again to process more words.')
    } else {
      console.log('\n✅ All words have been processed!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\nMake sure the development server is running (npm run dev)')
  }
}

// Make sure dev server is running
console.log('⚠️  Make sure the development server is running on port 3000')
console.log('If not, run: npm run dev\n')

// Add a delay to give user time to read the message
setTimeout(() => {
  updatePronunciations()
}, 2000)