#!/usr/bin/env tsx
import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Initialize Firebase Admin
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

async function verifyPartOfSpeech() {
  console.log('🔍 Checking partOfSpeech field types in words_v3...\n')
  
  // Get sample words from words_v3
  const snapshot = await db.collection('words_v3')
    .where('collectionIds', 'array-contains', 'sat_vocabulary_ii_1756388149781')
    .limit(10)
    .get()
  
  let stringCount = 0
  let arrayCount = 0
  let missingCount = 0
  
  snapshot.forEach(doc => {
    const data = doc.data()
    if (!data.partOfSpeech) {
      missingCount++
      console.log(`⚠️  ${data.word}: partOfSpeech is missing`)
    } else if (typeof data.partOfSpeech === 'string') {
      stringCount++
      console.log(`📝 ${data.word}: partOfSpeech is STRING: "${data.partOfSpeech}"`)
    } else if (Array.isArray(data.partOfSpeech)) {
      arrayCount++
      console.log(`✅ ${data.word}: partOfSpeech is ARRAY: [${data.partOfSpeech.join(', ')}]`)
    }
  })
  
  console.log('\n📊 Summary:')
  console.log(`  - Arrays: ${arrayCount}`)
  console.log(`  - Strings: ${stringCount}`)
  console.log(`  - Missing: ${missingCount}`)
  
  if (stringCount > 0) {
    console.log('\n⚠️  Some words still have string partOfSpeech. The adapter should handle this.')
  }
}

verifyPartOfSpeech()
  .then(() => {
    console.log('\n✅ Verification completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
