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

interface VocabularyWord {
  word: string
  category: string
  difficulty: string
}

async function parseSATVocabularyFile(filePath: string): Promise<Map<string, VocabularyWord[]>> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')

  const wordsByDifficulty = new Map<string, VocabularyWord[]>()
  wordsByDifficulty.set('beginner', [])
  wordsByDifficulty.set('intermediate', [])
  wordsByDifficulty.set('advanced', [])

  let currentDifficulty = ''

  for (const line of lines) {
    // Check for difficulty level headers
    if (line.includes('## Basic Level')) {
      currentDifficulty = 'beginner'
      continue
    } else if (line.includes('## Intermediate Level')) {
      currentDifficulty = 'intermediate'
      continue
    } else if (line.includes('## Advanced Level')) {
      currentDifficulty = 'advanced'
      continue
    }

    // Parse word entries (format: "1. word" or just "word")
    const match = line.match(/^\d+\.\s+(.+)$/)
    if (match && currentDifficulty) {
      const word = match[1].trim().toLowerCase()
      if (word) {
        wordsByDifficulty.get(currentDifficulty)?.push({
          word,
          category: 'SAT',
          difficulty: currentDifficulty
        })
      }
    }
  }

  return wordsByDifficulty
}

async function importSATVocabulary() {
  console.log('📚 Starting SAT Vocabulary Import (2000 words)...\n')

  const filePath = '/Users/sinclair/Downloads/compass_artifact_wf-2bb8b4b8-12c6-4af3-9eee-c05cef779f3c_text_markdown.md'

  try {
    // Parse the vocabulary file
    const wordsByDifficulty = await parseSATVocabularyFile(filePath)

    console.log('📊 Parsed vocabulary counts:')
    wordsByDifficulty.forEach((words, difficulty) => {
      console.log(`   ${difficulty}: ${words.length} words`)
    })
    console.log()

    // Process each difficulty level
    for (const [difficulty, words] of wordsByDifficulty) {
      console.log(`\n🔄 Processing ${difficulty} level (${words.length} words)...`)

      if (words.length === 0) {
        console.log('   No words to process')
        continue
      }

      // Process words in batches
      let batch = db.batch()
      let batchCount = 0
      let newWordsCount = 0
      let existingWordsCount = 0
      const wordIds: string[] = []

      for (const vocabWord of words) {
        // Check if word already exists
        const existingWord = await db.collection('words_v3')
          .where('word', '==', vocabWord.word)
          .limit(1)
          .get()

        let wordId: string

        if (!existingWord.empty) {
          // Word exists, use its ID
          wordId = existingWord.docs[0].id
          existingWordsCount++
        } else {
          // Create new word
          const wordRef = db.collection('words_v3').doc()
          wordId = wordRef.id

          const wordData = {
            word: vocabWord.word,
            originalWord: vocabWord.word,
            difficulty: difficulty,
            category: 'SAT',
            source: 'SAT_2000_vocabulary',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }

          batch.set(wordRef, wordData)
          batchCount++
          newWordsCount++

          // Commit batch if it reaches 500 operations
          if (batchCount >= 500) {
            await batch.commit()
            console.log(`   ✅ Batch committed (${batchCount} operations)`)
            batch = db.batch()
            batchCount = 0
          }
        }

        wordIds.push(wordId)
      }

      // Commit remaining batch operations
      if (batchCount > 0) {
        await batch.commit()
        console.log(`   ✅ Final batch committed (${batchCount} operations)`)
      }

      console.log(`   📊 ${difficulty} level results:`)
      console.log(`      - New words: ${newWordsCount}`)
      console.log(`      - Existing words: ${existingWordsCount}`)
      console.log(`      - Total word IDs: ${wordIds.length}`)

      // Update the SAT collection for this difficulty
      const collectionQuery = await db.collection('vocabulary_collections')
        .where('category', '==', 'SAT')
        .where('difficulty', '==', difficulty)
        .limit(1)
        .get()

      if (!collectionQuery.empty) {
        const collectionDoc = collectionQuery.docs[0]
        const currentData = collectionDoc.data()

        // For intermediate, we're adding to an empty collection
        // For others, we might be adding to existing words
        const updatedWordIds = difficulty === 'intermediate'
          ? wordIds
          : [...new Set([...(currentData.wordIds || []), ...wordIds])]

        await collectionDoc.ref.update({
          wordIds: updatedWordIds,
          wordCount: updatedWordIds.length,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        console.log(`   ✅ Updated ${currentData.name} collection`)
        console.log(`      - Previous count: ${currentData.wordCount || 0}`)
        console.log(`      - New count: ${updatedWordIds.length}`)
      } else {
        console.log(`   ⚠️ No SAT ${difficulty} collection found`)
      }
    }

    console.log('\n📊 Final Summary:')
    console.log('=================')

    // Get final collection stats
    const satCollections = await db.collection('vocabulary_collections')
      .where('category', '==', 'SAT')
      .get()

    satCollections.forEach((doc: any) => {
      const data = doc.data()
      console.log(`📚 ${data.name} (${data.difficulty}): ${data.wordCount} words`)
    })

  } catch (error) {
    console.error('❌ Error during import:', error)
    throw error
  }
}

importSATVocabulary()
  .then(() => {
    console.log('\n✅ SAT Vocabulary import completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })