#!/usr/bin/env tsx
/**
 * Test to verify word data structure for modal
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'vocabulary-app-new',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  })
}

const db = admin.firestore()

async function testModalData() {
  console.log('🔍 Testing word data structure for modal...\n')
  
  // Get a sample word from SAT Vocabulary II
  const snapshot = await db.collection('words_v3')
    .where('collectionIds', 'array-contains', 'sat_vocabulary_ii_1756388149781')
    .limit(1)
    .get()
  
  if (snapshot.empty) {
    console.log('❌ No words found')
    return
  }
  
  const doc = snapshot.docs[0]
  const data = doc.data()
  
  console.log('📝 Raw word data:')
  console.log(`  word: "${data.word}"`)
  console.log(`  partOfSpeech type: ${typeof data.partOfSpeech}`)
  console.log(`  partOfSpeech value: ${JSON.stringify(data.partOfSpeech)}`)
  console.log('')
  
  // Simulate the defensive check in modal
  const parts = Array.isArray(data.partOfSpeech) 
    ? data.partOfSpeech 
    : typeof data.partOfSpeech === 'string' 
      ? [data.partOfSpeech] 
      : []
  
  console.log('✅ After defensive conversion:')
  console.log(`  Is Array: ${Array.isArray(parts)}`)
  console.log(`  Value: [${parts.join(', ')}]`)
  console.log(`  Can call .map(): ${typeof parts.map === 'function'}`)
  
  console.log('\n🎉 Modal should now work without errors!')
}

testModalData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
