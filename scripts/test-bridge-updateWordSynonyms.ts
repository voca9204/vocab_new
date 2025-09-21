#!/usr/bin/env tsx
/**
 * Test WordAdapterBridge updateWordSynonyms method
 */

// Import the bridge
import { wordAdapterBridge } from '../src/lib/adapters/word-adapter-bridge'

async function testBridge() {
  console.log('🔍 Testing WordAdapterBridge updateWordSynonyms method...\n')
  
  console.log('📋 Available methods on wordAdapterBridge:')
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(wordAdapterBridge))
    .filter(method => typeof (wordAdapterBridge as any)[method] === 'function')
  methods.forEach(method => console.log(`  - ${method}()`))
  console.log('')
  
  const hasMethod = typeof (wordAdapterBridge as any).updateWordSynonyms === 'function'
  
  if (hasMethod) {
    console.log('✅ updateWordSynonyms method found on WordAdapterBridge!')
    console.log('🎉 The error should now be resolved!')
  } else {
    console.log('❌ updateWordSynonyms method still not found')
  }
}

testBridge()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
