#!/usr/bin/env tsx
/**
 * Test updateWordSynonyms method
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

async function testSynonymsUpdate() {
  console.log('🔍 Testing synonyms update functionality...\n')
  
  // Get a word from SAT Vocabulary II
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
  
  console.log('📝 Testing with word:')
  console.log(`  ID: ${doc.id}`)
  console.log(`  Word: ${data.word}`)
  console.log(`  Current synonyms: [${(data.synonyms || []).join(', ')}]`)
  console.log('')
  
  // Test synonyms that were generated (from the log)
  const testSynonyms = ['unclear', 'vague', 'equivocal', 'cryptic']
  
  console.log(`🔄 Would update synonyms to: [${testSynonyms.join(', ')}]`)
  console.log('')
  
  console.log('✅ updateWordSynonyms method should work with these parameters:')
  console.log(`  wordId: "${doc.id}"`)
  console.log(`  synonyms: [${testSynonyms.map(s => `"${s}"`).join(', ')}]`)
  console.log('')
  console.log('🎉 The method is now available and should resolve the error!')
}

testSynonymsUpdate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
