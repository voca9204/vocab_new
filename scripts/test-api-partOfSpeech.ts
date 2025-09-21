#!/usr/bin/env tsx
/**
 * Test API endpoints with partOfSpeech handling
 */

async function testAPICall() {
  console.log('🧪 Testing API with partOfSpeech handling...\n')
  
  const testData = {
    word: 'abandon',
    definition: 'to give up completely',
    partOfSpeech: 'verb', // This is a string, not an array
    wordId: 'sat2_abandon_ee849fac'
  }
  
  try {
    console.log('📤 Making API call to generate-examples-unified...')
    const response = await fetch('http://localhost:3100/api/generate-examples-unified', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
    
    if (response.ok) {
      console.log('✅ API call successful!')
      const result = await response.json()
      console.log('📊 Response:', result)
    } else {
      console.log(`❌ API call failed: ${response.status}`)
      const error = await response.text()
      console.log('Error:', error)
    }
  } catch (error) {
    console.log('❌ Request failed:', error)
  }
}

testAPICall()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
