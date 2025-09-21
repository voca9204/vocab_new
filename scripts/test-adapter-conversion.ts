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

// Simulate the adapter conversion logic
function convertPartOfSpeech(data: any): string[] {
  let partOfSpeech: string[]
  
  if (Array.isArray(data.partOfSpeech)) {
    partOfSpeech = data.partOfSpeech
  } else if (typeof data.partOfSpeech === 'string') {
    partOfSpeech = [data.partOfSpeech]
  } else {
    partOfSpeech = ['n.']
  }
  
  return partOfSpeech
}

async function testConversion() {
  console.log('🧪 Testing adapter conversion for partOfSpeech...\n')
  
  // Get sample words from words_v3
  const snapshot = await db.collection('words_v3')
    .where('collectionIds', 'array-contains', 'sat_vocabulary_ii_1756388149781')
    .limit(5)
    .get()
  
  snapshot.forEach(doc => {
    const data = doc.data()
    const original = data.partOfSpeech
    const converted = convertPartOfSpeech(data)
    
    console.log(`📝 Word: ${data.word}`)
    console.log(`   Original: ${typeof original === 'string' ? `"${original}"` : JSON.stringify(original)}`)
    console.log(`   Converted: [${converted.join(', ')}]`)
    console.log(`   ✅ Is Array: ${Array.isArray(converted)}`)
    console.log('')
  })
}

testConversion()
  .then(() => {
    console.log('✅ Conversion test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
