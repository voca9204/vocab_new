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

async function checkGRECollections() {
  console.log('🔍 Checking GRE collections...\n')

  // Check all GRE collections
  const snapshot = await db.collection('vocabulary_collections')
    .where('category', '==', 'GRE')
    .get()

  if (snapshot.empty) {
    console.log('❌ No GRE collections found!')
    return
  }

  const collections: any[] = []
  snapshot.forEach((doc: any) => {
    collections.push({
      id: doc.id,
      ...doc.data()
    })
  })

  // Sort by order
  collections.sort((a, b) => (a.order || 0) - (b.order || 0))

  console.log(`✅ Found ${collections.length} GRE collections:\n`)

  let totalWords = 0
  for (const col of collections) {
    const wordCount = col.wordCount || 0
    const actualWords = (col.wordIds || []).length
    totalWords += actualWords

    console.log(`📚 ${col.name}:`)
    console.log(`   ID: ${col.id}`)
    console.log(`   Difficulty: ${col.difficulty}`)
    console.log(`   Word Count: ${wordCount} (actual: ${actualWords})`)
    console.log(`   Order: ${col.order}`)

    if (actualWords > 0) {
      // Sample first 5 words
      const sampleIds = (col.wordIds || []).slice(0, 5)
      if (sampleIds.length > 0) {
        const wordsQuery = await db.collection('words_v3')
          .where(admin.firestore.FieldPath.documentId(), 'in', sampleIds)
          .get()

        const sampleWords: string[] = []
        wordsQuery.forEach((doc: any) => {
          const data = doc.data()
          sampleWords.push(data.word)
        })

        console.log(`   Sample words: ${sampleWords.join(', ')}`)
      }
    }
    console.log('')
  }

  console.log('─'.repeat(50))
  console.log(`📊 Total GRE words: ${totalWords}`)

  // Check for duplicates across levels
  console.log('\n🔍 Checking for duplicate words across levels...')
  const allWordIds: Record<string, string[]> = {}

  for (const col of collections) {
    const wordIds = col.wordIds || []
    for (const id of wordIds) {
      if (!allWordIds[id]) {
        allWordIds[id] = []
      }
      allWordIds[id].push(col.name)
    }
  }

  const duplicates = Object.entries(allWordIds).filter(([_, collections]) => collections.length > 1)

  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} words in multiple collections`)

    // Show sample of duplicates
    const sampleDuplicates = duplicates.slice(0, 5)
    for (const [wordId, colNames] of sampleDuplicates) {
      const wordDoc = await db.collection('words_v3').doc(wordId).get()
      if (wordDoc.exists) {
        const word = wordDoc.data().word
        console.log(`   "${word}" appears in: ${colNames.join(', ')}`)
      }
    }
  } else {
    console.log('✅ No duplicate words found across levels')
  }
}

checkGRECollections()
  .then(() => {
    console.log('\n✅ Check complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })