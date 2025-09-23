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

// Function to generate consistent ID for a word
function generateWordId(word: string): string {
  // Simple hash function for generating ID
  let hash = 0
  for (let i = 0; i < word.length; i++) {
    const char = word.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(20, '0').substring(0, 20)
}

// Function to extract words from content
function extractWords(content: string): string[] {
  const words: string[] = []

  // Split by common delimiters
  const items = content.split(/[,\s]+/)

  items.forEach(item => {
    // Clean the word
    const word = item
      .trim()
      .toLowerCase()
      .replace(/[^a-z-]/g, '') // Keep only letters and hyphens

    // Skip if empty or too short
    if (word && word.length > 2) {
      words.push(word)
    }
  })

  return [...new Set(words)] // Remove duplicates
}

async function parseGREFile(filePath: string) {
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

    // Skip section dividers and headers
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

async function createOrUpdateGRECollections() {
  const collectionData = [
    { name: 'GRE 초급', difficulty: 'beginner', order: 1 },
    { name: 'GRE 중급', difficulty: 'intermediate', order: 2 },
    { name: 'GRE 고급', difficulty: 'advanced', order: 3 }
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
        category: 'GRE',
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
        category: 'GRE',
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

async function importGREWords(
  words: string[],
  category: string,
  difficulty: string,
  collectionId: string
) {
  const wordIds: string[] = []
  let newWordsCount = 0
  let existingWordsCount = 0

  for (const word of words) {
    // Check if word already exists
    const existingQuery = await db.collection('words_v3')
      .where('word', '==', word)
      .limit(1)
      .get()

    let wordId: string

    if (!existingQuery.empty) {
      // Word exists - just get its ID
      wordId = existingQuery.docs[0].id
      existingWordsCount++

      // Update to add GRE category if not already present
      const existingData = existingQuery.docs[0].data()
      const categories = existingData.categories || []
      if (!categories.includes('GRE')) {
        categories.push('GRE')
        await db.collection('words_v3').doc(wordId).update({
          categories,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }
    } else {
      // Create new word (without definition - will be added later)
      const newWordRef = await db.collection('words_v3').add({
        word,
        normalizedWord: word.toLowerCase(),
        definition: '', // Empty definition - will be filled by AI later
        categories: ['GRE'],
        category: 'GRE',
        difficulty,
        source: {
          type: 'import',
          collection: 'GRE Vocabulary Guide',
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
        notes: `Imported from GRE vocabulary list - ${difficulty} level`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      wordId = newWordRef.id
      newWordsCount++
    }

    wordIds.push(wordId)
  }

  // Update collection with word IDs
  await db.collection('vocabulary_collections').doc(collectionId).update({
    wordIds,
    wordCount: wordIds.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  return { newWordsCount, existingWordsCount, totalWords: wordIds.length }
}

async function main() {
  console.log('🎓 Starting GRE vocabulary import...\n')

  const filePath = '/Users/sinclair/Downloads/gre-vocabulary-guide-2000-words.md'

  // Parse the file
  console.log('📖 Parsing GRE vocabulary file...')
  const wordsByLevel = await parseGREFile(filePath)

  console.log('\n📊 Words found:')
  console.log(`  초급 (Common/High-Frequency): ${wordsByLevel.beginner.length} words`)
  console.log(`  중급 (Basic/Core Academic): ${wordsByLevel.intermediate.length} words`)
  console.log(`  고급 (Advanced/Esoteric): ${wordsByLevel.advanced.length} words`)
  console.log(`  Total: ${wordsByLevel.beginner.length + wordsByLevel.intermediate.length + wordsByLevel.advanced.length} words\n`)

  // Create or update collections
  console.log('📚 Creating/updating GRE collections...')
  const collectionIds = await createOrUpdateGRECollections()

  // Import words by level
  console.log('\n📝 Importing words...\n')

  // Import beginner words
  console.log('Importing 초급 words...')
  const beginnerStats = await importGREWords(
    wordsByLevel.beginner,
    'GRE',
    'beginner',
    collectionIds.beginner
  )
  console.log(`  ✅ 초급: ${beginnerStats.newWordsCount} new, ${beginnerStats.existingWordsCount} existing`)

  // Import intermediate words
  console.log('Importing 중급 words...')
  const intermediateStats = await importGREWords(
    wordsByLevel.intermediate,
    'GRE',
    'intermediate',
    collectionIds.intermediate
  )
  console.log(`  ✅ 중급: ${intermediateStats.newWordsCount} new, ${intermediateStats.existingWordsCount} existing`)

  // Import advanced words
  console.log('Importing 고급 words...')
  const advancedStats = await importGREWords(
    wordsByLevel.advanced,
    'GRE',
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
  console.log(`  - GRE 초급: ${beginnerStats.totalWords} words`)
  console.log(`  - GRE 중급: ${intermediateStats.totalWords} words`)
  console.log(`  - GRE 고급: ${advancedStats.totalWords} words`)

  // Write log file
  const logContent = {
    timestamp: new Date().toISOString(),
    summary: {
      totalProcessed: totalWords,
      newWords: totalNew,
      existingWords: totalExisting
    },
    byLevel: {
      beginner: beginnerStats,
      intermediate: intermediateStats,
      advanced: advancedStats
    },
    collections: collectionIds
  }

  fs.writeFileSync('gre_import.log', JSON.stringify(logContent, null, 2))
  console.log('\n📄 Log saved to gre_import.log')

  console.log('\n⚠️  Note: Words were imported without definitions.')
  console.log('Run add-missing-definitions.ts to generate definitions using AI.')
}

main()
  .then(() => {
    console.log('\n✅ GRE vocabulary import completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error during import:', error)
    process.exit(1)
  })