const admin = require('firebase-admin')
const path = require('path')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Initialize Firebase Admin
const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT
let serviceAccount: any

if (serviceAccountJson) {
  serviceAccount = JSON.parse(serviceAccountJson)
} else {
  serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'vocabulary-app-new',
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId
  })
}

const db = admin.firestore()

async function checkStrategyWord() {
  console.log('Searching for "strategy" in words_v3...\n')

  // Search for strategy in words_v3
  const snapshot = await db.collection('words_v3')
    .where('word', '==', 'strategy')
    .get()

  if (snapshot.empty) {
    console.log('❌ "strategy" not found in words_v3 collection')
  } else {
    snapshot.forEach((doc: any) => {
      const data = doc.data()
      console.log('✅ Found "strategy":')
      console.log(`  ID: ${doc.id}`)
      console.log(`  Word: ${data.word}`)
      console.log(`  Definition: ${data.definition || 'EMPTY'}`)
      console.log(`  Definitions array: ${JSON.stringify(data.definitions || [])}`)
      console.log(`  Part of Speech: ${JSON.stringify(data.partOfSpeech || [])}`)
      console.log(`  Examples: ${JSON.stringify(data.examples || [])}`)
      console.log(`  Category: ${data.category}`)
      console.log(`  Difficulty: ${data.difficulty}`)
      console.log(`  Synonyms: ${JSON.stringify(data.synonyms || [])}`)
      console.log(`  Notes: ${data.notes || ''}`)
      console.log('')

      // Check all fields for any definition-like content
      console.log('🔍 Checking all fields for definition content:')
      Object.keys(data).forEach(key => {
        if (key.toLowerCase().includes('def') || key.toLowerCase().includes('mean')) {
          console.log(`  ${key}: ${JSON.stringify(data[key])}`)
        }
      })
    })
  }

  // Also check which collections contain this word
  console.log('\n📚 Checking which collections contain "strategy":')
  const collSnapshot = await db.collection('vocabulary_collections').get()

  const collectionsWithStrategy: any[] = []

  for (const doc of collSnapshot.docs) {
    const data = doc.data()
    const wordIds = data.wordIds || data.words || []

    // Check if any word ID matches strategy
    for (const wordId of wordIds) {
      if (wordId === 'LMRwOcHOcrelMEl8GB4N' || wordId.includes('strategy')) {
        collectionsWithStrategy.push({
          id: doc.id,
          name: data.name,
          category: data.category
        })
        break
      }
    }
  }

  if (collectionsWithStrategy.length > 0) {
    console.log('Found in collections:')
    collectionsWithStrategy.forEach(col => {
      console.log(`  - ${col.name} (${col.category})`)
    })
  } else {
    console.log('Not found in any collections')
  }
}

checkStrategyWord()
  .then(() => {
    console.log('\n✅ Check complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })