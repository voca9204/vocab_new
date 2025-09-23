const admin = require('firebase-admin')
const path = require('path')
const dotenv = require('dotenv')
const fs = require('fs')

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

// Function to extract words from content
function extractWords(content: string): string[] {
  const words: string[] = []
  const items = content.split(/[,\s]+/)

  items.forEach(item => {
    const word = item
      .trim()
      .toLowerCase()
      .replace(/[^a-z-]/g, '')

    if (word && word.length > 2) {
      words.push(word)
    }
  })

  return [...new Set(words)]
}

async function parseSuneungFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')

  const result = {
    beginner: [] as string[],
    intermediate: [] as string[],
    advanced: [] as string[]
  }

  let currentLevel = ''
  let inWordSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect level headers
    if (trimmed.includes('Part 1:') && trimmed.includes('초급')) {
      currentLevel = 'beginner'
      inWordSection = false
      console.log('Found beginner section')
      continue
    } else if (trimmed.includes('Part 2:') && trimmed.includes('중급')) {
      currentLevel = 'intermediate'
      inWordSection = false
      console.log('Found intermediate section')
      continue
    } else if (trimmed.includes('Part 3:') && trimmed.includes('고급')) {
      currentLevel = 'advanced'
      inWordSection = false
      console.log('Found advanced section')
      continue
    }

    // Detect word section headers
    if (trimmed.startsWith('**') && trimmed.includes(':')) {
      inWordSection = true
      continue
    }

    // Skip headers and empty lines
    if (trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed === '' ||
        trimmed.startsWith('*') && !inWordSection) {
      continue
    }

    // Extract words from content lines
    if (currentLevel && inWordSection && !trimmed.startsWith('*')) {
      const words = extractWords(trimmed)

      if (words.length > 0) {
        switch (currentLevel) {
          case 'beginner':
            result.beginner.push(...words)
            break
          case 'intermediate':
            result.intermediate.push(...words)
            break
          case 'advanced':
            result.advanced.push(...words)
            break
        }
      }
    }
  }

  // Remove duplicates
  result.beginner = [...new Set(result.beginner)]
  result.intermediate = [...new Set(result.intermediate)]
  result.advanced = [...new Set(result.advanced)]

  return result
}

async function batchImportWords(
  words: string[],
  category: string,
  difficulty: string,
  collectionId: string
) {
  console.log(`  Processing ${words.length} words for ${difficulty}...`)

  const wordIds: string[] = []
  const BATCH_SIZE = 30
  let newWordsCount = 0
  let existingWordsCount = 0

  // First, get all existing words in one batch query
  const existingWordsMap = new Map<string, string>()

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE)

    const existingQuery = await db.collection('words_v3')
      .where('word', 'in', batch)
      .get()

    existingQuery.forEach((doc: any) => {
      existingWordsMap.set(doc.data().word, doc.id)
    })
  }

  // Now process all words
  let batch = db.batch()
  let batchCount = 0

  for (const word of words) {
    if (existingWordsMap.has(word)) {
      // Word exists
      const wordId = existingWordsMap.get(word)!
      wordIds.push(wordId)
      existingWordsCount++

      // Update to add 수능 category if needed
      const wordRef = db.collection('words_v3').doc(wordId)
      batch.update(wordRef, {
        categories: admin.firestore.FieldValue.arrayUnion('수능'),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    } else {
      // Create new word
      const newWordRef = db.collection('words_v3').doc()
      const wordId = newWordRef.id

      batch.set(newWordRef, {
        word,
        normalizedWord: word.toLowerCase(),
        definition: '', // Will be filled by AI later
        categories: ['수능'],
        category: '수능',
        difficulty,
        source: {
          type: 'import',
          collection: '수능 영어 완벽 대비: 2000 필수 단어 가이드',
          importedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        quality: {
          score: 0,
          validated: false,
          needsDefinition: true
        },
        partOfSpeech: [],
        examples: [],
        synonyms: [],
        antonyms: [],
        notes: `Imported from 수능 vocabulary list - ${difficulty} level`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      wordIds.push(wordId)
      newWordsCount++
    }

    batchCount++

    // Commit batch every 500 operations and create new batch
    if (batchCount >= 500) {
      await batch.commit()
      batch = db.batch()  // Create new batch
      batchCount = 0
    }
  }

  // Commit remaining operations
  if (batchCount > 0) {
    await batch.commit()
  }

  // Update collection with word IDs
  await db.collection('vocabulary_collections').doc(collectionId).update({
    wordIds,
    wordCount: wordIds.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  return { newWordsCount, existingWordsCount, totalWords: wordIds.length }
}

async function createOrUpdateSuneungCollections() {
  const collectionData = [
    { name: '수능 초급', difficulty: 'beginner', order: 1 },
    { name: '수능 중급', difficulty: 'intermediate', order: 2 },
    { name: '수능 고급', difficulty: 'advanced', order: 3 }
  ]

  const collectionIds: Record<string, string> = {}

  for (const data of collectionData) {
    // Check if collection already exists
    const existingQuery = await db.collection('vocabulary_collections')
      .where('name', '==', data.name)
      .get()

    let collectionId: string

    if (!existingQuery.empty) {
      // Update existing collection
      collectionId = existingQuery.docs[0].id
      await db.collection('vocabulary_collections').doc(collectionId).update({
        category: '수능',
        difficulty: data.difficulty,
        order: data.order,
        wordCount: 0, // Will update later
        wordIds: [], // Will update later
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log(`Updated existing collection: ${data.name} (${collectionId})`)
    } else {
      // Create new collection
      const newCollectionRef = await db.collection('vocabulary_collections').add({
        name: data.name,
        category: '수능',
        difficulty: data.difficulty,
        order: data.order,
        wordCount: 0,
        wordIds: [],
        createdBy: 'system',
        isPublic: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      collectionId = newCollectionRef.id
      console.log(`Created new collection: ${data.name} (${collectionId})`)
    }

    collectionIds[data.difficulty] = collectionId
  }

  return collectionIds
}

async function main() {
  console.log('📚 Starting 수능 vocabulary import...\n')

  const filePath = '/Users/sinclair/Downloads/suneung-english-vocabulary-2000-words.md'

  // Parse the file
  console.log('📖 Parsing 수능 vocabulary file...')
  const wordsByLevel = await parseSuneungFile(filePath)

  console.log('\n📊 Words found:')
  console.log(`  초급 (기초 필수): ${wordsByLevel.beginner.length} words`)
  console.log(`  중급 (수능 핵심): ${wordsByLevel.intermediate.length} words`)
  console.log(`  고급 (1등급 도약): ${wordsByLevel.advanced.length} words`)
  console.log(`  Total: ${wordsByLevel.beginner.length + wordsByLevel.intermediate.length + wordsByLevel.advanced.length} words\n`)

  // Create or update collections
  console.log('📚 Creating/updating 수능 collections...')
  const collectionIds = await createOrUpdateSuneungCollections()

  // Import words
  console.log('\n📝 Batch importing words...\n')

  // Import beginner
  console.log('Importing 초급 words...')
  const beginnerStats = await batchImportWords(
    wordsByLevel.beginner,
    '수능',
    'beginner',
    collectionIds.beginner
  )
  console.log(`  ✅ 초급: ${beginnerStats.newWordsCount} new, ${beginnerStats.existingWordsCount} existing`)

  // Import intermediate
  console.log('\nImporting 중급 words...')
  const intermediateStats = await batchImportWords(
    wordsByLevel.intermediate,
    '수능',
    'intermediate',
    collectionIds.intermediate
  )
  console.log(`  ✅ 중급: ${intermediateStats.newWordsCount} new, ${intermediateStats.existingWordsCount} existing`)

  // Import advanced
  console.log('\nImporting 고급 words...')
  const advancedStats = await batchImportWords(
    wordsByLevel.advanced,
    '수능',
    'advanced',
    collectionIds.advanced
  )
  console.log(`  ✅ 고급: ${advancedStats.newWordsCount} new, ${advancedStats.existingWordsCount} existing`)

  // Summary
  const totalNew = beginnerStats.newWordsCount + intermediateStats.newWordsCount + advancedStats.newWordsCount
  const totalExisting = beginnerStats.existingWordsCount + intermediateStats.existingWordsCount + advancedStats.existingWordsCount
  const totalWords = totalNew + totalExisting

  console.log('\n' + '='.repeat(50))
  console.log('📊 Import Summary:')
  console.log('='.repeat(50))
  console.log(`Total words processed: ${totalWords}`)
  console.log(`  - New words created: ${totalNew}`)
  console.log(`  - Existing words linked: ${totalExisting}`)
  console.log('\nCollections created/updated:')
  console.log(`  - 수능 초급: ${beginnerStats.totalWords} words`)
  console.log(`  - 수능 중급: ${intermediateStats.totalWords} words`)
  console.log(`  - 수능 고급: ${advancedStats.totalWords} words`)

  // Write log file
  const logContent = `${new Date().toISOString()} - 수능 Vocabulary Import
==================================================
Total words processed: ${totalWords}
  - New words created: ${totalNew}
  - Existing words linked: ${totalExisting}

Collections created/updated:
  - 수능 초급: ${beginnerStats.totalWords} words
  - 수능 중급: ${intermediateStats.totalWords} words
  - 수능 고급: ${advancedStats.totalWords} words

⚠️  Note: Words were imported without definitions.
Run add-missing-definitions.ts to generate definitions using AI.
`

  fs.writeFileSync('suneung_import.log', logContent)
  console.log('\n📄 Log saved to suneung_import.log')

  console.log('\n⚠️  Note: Words were imported without definitions.')
  console.log('Run add-missing-definitions.ts to generate definitions using AI.')
}

main()
  .then(() => {
    console.log('\n✅ 수능 vocabulary import completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error during import:', error)
    process.exit(1)
  })