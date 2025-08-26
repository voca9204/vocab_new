// Test script for Discovery API
async function testDiscoveryAPI() {
  const testWord = 'resilience'
  const testUserId = 'test-user-123'
  
  try {
    const response = await fetch('http://localhost:3100/api/vocabulary/discover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        word: testWord,
        userId: testUserId,
        context: 'Test context'
      })
    })
    
    console.log('Response Status:', response.status)
    console.log('Response Headers:', response.headers)
    
    if (response.ok) {
      const data = await response.json()
      console.log('Success! Word data:', JSON.stringify(data, null, 2))
    } else {
      const errorText = await response.text()
      console.error('Error:', response.status, errorText)
    }
  } catch (error) {
    console.error('Request failed:', error)
  }
}

// Run the test
testDiscoveryAPI()