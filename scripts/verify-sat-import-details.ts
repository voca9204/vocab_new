#!/usr/bin/env tsx
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

async function verifyImportDetails() {
  console.log('🔍 Verifying SAT Vocabulary II import details...\n')
  
  const snapshot = await db.collection('words_v3')
    .where('collectionIds', 'array-contains', 'sat_vocabulary_ii_1756394109723')
    .limit(10)
    .get()
  
  console.log('📋 Sample imported words:')
  snapshot.forEach(doc => {
    const data = doc.data()
    console.log(`• ${data.word} - ${data.korean}`)
    console.log(`  Part of speech: ${data.partOfSpeech}`)
    console.log(`  Meaning: ${data.meaning}`)
    console.log(`  Quality score: ${data.qualityScore}`)
    console.log('')
  })
  
  // Check for specific complex words
  const complexWords = ['affect/effect', 'in addition', 'natural selection']
  console.log('🔍 Checking complex word handling:')
  
  for (const wordText of complexWords) {
    const wordsQuery = await db.collection('words_v3')
      .where('word', '==', wordText)
      .where('collectionIds', 'array-contains', 'sat_vocabulary_ii_1756394109723')
      .get()
    
    if (!wordsQuery.empty) {
      const data = wordsQuery.docs[0].data()
      console.log(`✅ Found: "${wordText}" with ID: ${data.id}`)
    } else {
      console.log(`⚠️  Not found: "${wordText}"`)
    }
  }
}

verifyImportDetails()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
