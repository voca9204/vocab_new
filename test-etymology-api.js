#!/usr/bin/env node

/**
 * Test etymology generation API for personal collection words
 */

const API_BASE = 'http://localhost:3100/api'

async function testEtymologyGeneration() {
  try {
    console.log('Testing etymology generation for personal collection words...\n')
    
    // Test data - you'll need to replace with actual word ID from your personal collection
    const testRequest = {
      userId: 'test-user',
      wordId: 'test-word-id', // Replace with actual word ID
      word: 'vary',
      definition: '변화하다, 다르다'
    }
    
    console.log('Request:', testRequest)
    
    const response = await fetch(`${API_BASE}/generate-etymology-unified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRequest)
    })
    
    console.log('Response status:', response.status)
    
    const data = await response.json()
    console.log('Response data:', JSON.stringify(data, null, 2))
    
    if (data.success) {
      console.log('\n✅ Etymology generated successfully!')
      console.log('Etymology:', data.etymology)
    } else {
      console.log('\n❌ Failed to generate etymology')
      console.log('Error:', data.message)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run test
testEtymologyGeneration()