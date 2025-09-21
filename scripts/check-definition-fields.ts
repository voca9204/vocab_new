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

async function checkDefinitions() {
  console.log('🔍 Checking definition fields in SAT Vocabulary II words...\n')
  
  const snapshot = await db.collection('words_v3')
    .where('collectionIds', 'array-contains', 'sat_vocabulary_ii_1756388149781')
    .limit(5)
    .get()
  
  snapshot.forEach(doc => {
    const data = doc.data()
    console.log(`📝 ${data.word}:`)
    console.log(`   definition: ${data.definition || 'NOT FOUND'}`)
    console.log(`   englishDefinition: ${data.englishDefinition || 'NOT FOUND'}`)
    console.log('')
  })
}

checkDefinitions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
