const admin = require('firebase-admin')
const path = require('path')
const dotenv = require('dotenv')
const fs = require('fs').promises

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

async function parseSATBeginnerWords(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')

  const words: string[] = []
  let inBeginnerSection = false

  for (const line of lines) {
    // Start of Basic Level section
    if (line.includes('## Basic Level')) {
      inBeginnerSection = true
      continue
    }
    // End of Basic Level section (start of Intermediate)
    if (line.includes('## Intermediate Level')) {
      break
    }

    // Parse word entries in beginner section
    if (inBeginnerSection) {
      const match = line.match(/^\d+\.\s+(.+)$/)
      if (match) {
        const word = match[1].trim().toLowerCase()
        if (word) {
          words.push(word)
        }
      }
    }
  }

  return words
}

async function createSATBeginnerCollection() {
  console.log('📚 Creating SAT Beginner Collection...\n')

  const filePath = '/Users/sinclair/Downloads/compass_artifact_wf-2bb8b4b8-12c6-4af3-9eee-c05cef779f3c_text_markdown.md'

  try {
    // Step 1: Check if SAT beginner collection already exists
    const existingCollection = await db.collection('vocabulary_collections')
      .where('category', '==', 'SAT')
      .where('difficulty', '==', 'beginner')
      .get()

    if (!existingCollection.empty) {
      console.log('⚠️ SAT beginner collection already exists!')
      const doc = existingCollection.docs[0]
      const data = doc.data()
      console.log(`   Name: ${data.name}`)
      console.log(`   Word count: ${data.wordCount}`)
      console.log('   Skipping creation...')
      return
    }

    // Step 2: Parse beginner words from file
    console.log('📖 Parsing beginner words from file...')
    const beginnerWords = await parseSATBeginnerWords(filePath)
    console.log(`   Found ${beginnerWords.length} beginner words\n`)

    // Step 3: Get word IDs for these words
    console.log('🔍 Finding word IDs in database...')
    const wordIds: string[] = []
    let foundCount = 0
    let notFoundCount = 0

    for (const word of beginnerWords) {
      const wordQuery = await db.collection('words_v3')
        .where('word', '==', word)
        .limit(1)
        .get()

      if (!wordQuery.empty) {
        wordIds.push(wordQuery.docs[0].id)
        foundCount++
      } else {
        notFoundCount++
        console.log(`   ⚠️ Word not found: ${word}`)
      }
    }

    console.log(`\n📊 Word lookup results:`)
    console.log(`   - Found: ${foundCount} words`)
    console.log(`   - Not found: ${notFoundCount} words`)
    console.log(`   - Total word IDs: ${wordIds.length}\n`)

    // Step 4: Create the SAT beginner collection
    console.log('✨ Creating SAT beginner collection...')
    const newCollection = {
      name: 'SAT Vocabulary I',
      displayName: 'SAT Vocabulary I',
      category: 'SAT',
      difficulty: 'beginner',
      description: 'Essential SAT vocabulary for beginners (1200-1300 score target)',
      wordIds: wordIds,
      wordCount: wordIds.length,
      isOfficial: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    const collectionRef = await db.collection('vocabulary_collections').add(newCollection)
    console.log(`   ✅ Collection created with ID: ${collectionRef.id}`)
    console.log(`   📚 Collection name: ${newCollection.name}`)
    console.log(`   📊 Word count: ${newCollection.wordCount}`)

    // Step 5: Verify all SAT collections
    console.log('\n📋 Final SAT Collections Status:')
    const satCollections = await db.collection('vocabulary_collections')
      .where('category', '==', 'SAT')
      .orderBy('difficulty')
      .get()

    satCollections.forEach((doc: any) => {
      const data = doc.data()
      const difficultyLabel =
        data.difficulty === 'beginner' ? '초급' :
        data.difficulty === 'intermediate' ? '중급' :
        data.difficulty === 'advanced' ? '고급' : data.difficulty

      console.log(`   📚 ${data.name} (${difficultyLabel}): ${data.wordCount} words`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

createSATBeginnerCollection()
  .then(() => {
    console.log('\n✅ SAT Beginner collection created successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })