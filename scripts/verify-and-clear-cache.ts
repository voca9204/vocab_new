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

async function verifyStrategyWord() {
  console.log('🔍 Verifying "strategy" word in words_v3...\n')

  // Get the strategy word directly by ID
  const wordRef = db.collection('words_v3').doc('LMRwOcHOcrelMEl8GB4N')
  const wordDoc = await wordRef.get()

  if (wordDoc.exists) {
    const data = wordDoc.data()
    console.log('✅ Found "strategy" word:')
    console.log(`  ID: ${wordDoc.id}`)
    console.log(`  Word: ${data.word}`)
    console.log(`  Definition: ${data.definition || 'EMPTY'}`)
    console.log(`  Has definition: ${!!data.definition}`)

    if (data.definition) {
      console.log('\n📋 Full definition:')
      console.log(`  "${data.definition}"`)
    }

    if (data.definitions && Array.isArray(data.definitions)) {
      console.log('\n📚 Definitions array:')
      data.definitions.forEach((def: string, idx: number) => {
        console.log(`  [${idx}]: "${def}"`)
      })
    }

    console.log('\n🏷️ Other fields:')
    console.log(`  Part of Speech: ${JSON.stringify(data.partOfSpeech || [])}`)
    console.log(`  Examples: ${JSON.stringify(data.examples || [])}`)
    console.log(`  Synonyms: ${JSON.stringify(data.synonyms || [])}`)
    console.log(`  Antonyms: ${JSON.stringify(data.antonyms || [])}`)
    console.log(`  Etymology: ${data.etymology || 'N/A'}`)
    console.log(`  Pronunciation: ${data.pronunciation || 'N/A'}`)

    console.log('\n📅 Timestamps:')
    console.log(`  Created: ${data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt}`)
    console.log(`  Updated: ${data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt}`)

    // Check if definition is empty and needs to be added
    if (!data.definition || data.definition === '') {
      console.log('\n⚠️ Definition is EMPTY! Word needs definition.')
    } else {
      console.log('\n✅ Definition is present in the database.')
    }
  } else {
    console.log('❌ "strategy" word not found with ID: LMRwOcHOcrelMEl8GB4N')
  }

  // Also check by querying
  console.log('\n🔍 Double-checking by query...')
  const querySnapshot = await db.collection('words_v3')
    .where('word', '==', 'strategy')
    .get()

  console.log(`Found ${querySnapshot.size} word(s) with word="strategy"`)
  querySnapshot.forEach((doc: any) => {
    const data = doc.data()
    console.log(`  - ID: ${doc.id}, Definition: "${data.definition || 'EMPTY'}"`)
  })
}

async function clearCacheInstructions() {
  console.log('\n🧹 To clear the cache in the browser:\n')
  console.log('1. Open the app in the browser')
  console.log('2. Open Developer Tools (F12)')
  console.log('3. Go to the Console tab')
  console.log('4. Run this command:')
  console.log('   localStorage.clear()')
  console.log('5. Refresh the page (Cmd+R or Ctrl+R)')
  console.log('\nThis will clear all cached data and force the app to fetch fresh data from the database.')
}

verifyStrategyWord()
  .then(() => {
    clearCacheInstructions()
    console.log('\n✅ Verification complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })