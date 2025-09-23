/**
 * Script to import TOEIC vocabulary from markdown file
 * Imports 2000 TOEIC words organized by difficulty levels:
 * - Beginner: 500 words
 * - Intermediate: 1000 words
 * - Advanced: 500 words
 */

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Initialize Firebase Admin
const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT
let serviceAccount: any

if (serviceAccountJson) {
  // If full service account JSON is provided
  serviceAccount = JSON.parse(serviceAccountJson)
} else {
  // Use individual env vars
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

// Function to parse the markdown file
function parseTOEICFile(filePath: string): { beginner: string[], intermediate: string[], advanced: string[] } {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')

  const result = {
    beginner: [] as string[],
    intermediate: [] as string[],
    advanced: [] as string[]
  }

  let currentLevel = ''
  let inWordSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Detect level markers
    if (line.includes('Part 1: Beginner Level')) {
      currentLevel = 'beginner'
      continue
    } else if (line.includes('Part 2: Intermediate Level')) {
      currentLevel = 'intermediate'
      continue
    } else if (line.includes('Part 3: Advanced Level')) {
      currentLevel = 'advanced'
      continue
    }

    // Skip headers and empty lines
    if (line.startsWith('#') || line === '') {
      continue
    }

    // Detect word section headers
    if (line.startsWith('**') && line.endsWith(':**')) {
      inWordSection = true
      continue
    }

    // Skip other markdown formatting
    if (line.startsWith('*') || line.startsWith('---')) {
      continue
    }

    // Extract words from content lines
    if (currentLevel && inWordSection) {
      // Process lines that don't look like headers
      if (!line.includes('Target:') && !line.includes('TOEIC') && !line.includes('CEFR')) {
        // This line contains words separated by commas
        const words = line.split(',').map((w: string) => w.trim())
          .filter((w: string) => {
            // Filter out non-words
            return w &&
                   w.length > 1 &&
                   !w.includes('**') &&
                   !w.includes('(') &&
                   !w.includes(':') &&
                   !/^\d+$/.test(w) // not just numbers
          })

        if (words.length > 0) {
          if (currentLevel === 'beginner') {
            result.beginner.push(...words)
          } else if (currentLevel === 'intermediate') {
            result.intermediate.push(...words)
          } else if (currentLevel === 'advanced') {
            result.advanced.push(...words)
          }
        }
      }
    }
  }

  // Remove duplicates within each level
  result.beginner = [...new Set(result.beginner)]
  result.intermediate = [...new Set(result.intermediate)]
  result.advanced = [...new Set(result.advanced)]

  return result
}

// Function to check if word already exists in words_v3
async function checkWordExists(word: string): Promise<string | null> {
  try {
    // First check exact match
    const exactQuery = await db.collection('words_v3')
      .where('word', '==', word.toLowerCase())
      .limit(1)
      .get()

    if (!exactQuery.empty) {
      return exactQuery.docs[0].id
    }

    return null
  } catch (error) {
    console.error(`Error checking word ${word}:`, error)
    return null
  }
}

// Function to create word document
async function createWord(word: string, category: string, difficulty: string): Promise<string | null> {
  try {
    // Check if word already exists
    const existingId = await checkWordExists(word)
    if (existingId) {
      console.log(`Word already exists: ${word} (${existingId})`)
      return existingId
    }

    // Create new word
    const wordData: any = {
      word: word.toLowerCase(),
      definitions: [],
      partOfSpeech: [],
      examples: [],
      synonyms: [],
      antonyms: [],
      etymology: '',
      difficulty: difficulty,
      category: category,
      contextSentences: [],
      audioUrl: '',
      relatedWords: [],
      confusables: [],
      collocations: [],
      notes: `Imported from TOEIC vocabulary list - ${difficulty} level`,
      frequency: 5,
      isSAT: false,
      source: {
        type: 'manual',
        collection: 'words_v3',
        originalId: ''
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    const docRef = await db.collection('words_v3').add(wordData)
    console.log(`Created word: ${word} (${docRef.id})`)
    return docRef.id
  } catch (error) {
    console.error(`Error creating word ${word}:`, error)
    return null
  }
}

// Main import function
async function importTOEICVocabulary() {
  console.log('Starting TOEIC vocabulary import...')

  // Parse the markdown file
  const filePath = '/Users/sinclair/Downloads/toeic-vocabulary-guide-2000-words.md'
  const { beginner, intermediate, advanced } = parseTOEICFile(filePath)

  console.log(`Parsed words:`)
  console.log(`- Beginner: ${beginner.length} words`)
  console.log(`- Intermediate: ${intermediate.length} words`)
  console.log(`- Advanced: ${advanced.length} words`)

  // Collections to store word IDs
  const beginnerWordIds: string[] = []
  const intermediateWordIds: string[] = []
  const advancedWordIds: string[] = []

  // Import beginner words (limit to 500)
  console.log('\n📚 Importing Beginner Level Words...')
  const beginnerWords = beginner.slice(0, 500)
  for (let i = 0; i < beginnerWords.length; i++) {
    const word = beginnerWords[i]
    const wordId = await createWord(word, 'TOEIC', 'beginner')
    if (wordId) {
      beginnerWordIds.push(wordId)
    }

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${beginnerWords.length} beginner words`)
    }
  }

  // Import intermediate words (limit to 1000)
  console.log('\n📚 Importing Intermediate Level Words...')
  const intermediateWords = intermediate.slice(0, 1000)
  for (let i = 0; i < intermediateWords.length; i++) {
    const word = intermediateWords[i]
    const wordId = await createWord(word, 'TOEIC', 'intermediate')
    if (wordId) {
      intermediateWordIds.push(wordId)
    }

    if ((i + 1) % 100 === 0) {
      console.log(`Progress: ${i + 1}/${intermediateWords.length} intermediate words`)
    }
  }

  // Import advanced words (limit to 500)
  console.log('\n📚 Importing Advanced Level Words...')
  const advancedWords = advanced.slice(0, 500)
  for (let i = 0; i < advancedWords.length; i++) {
    const word = advancedWords[i]
    const wordId = await createWord(word, 'TOEIC', 'advanced')
    if (wordId) {
      advancedWordIds.push(wordId)
    }

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${advancedWords.length} advanced words`)
    }
  }

  // Create or update TOEIC collections in vocabulary_collections
  console.log('\n📚 Creating TOEIC collections...')

  // TOEIC Beginner Collection
  const beginnerCollection = {
    name: 'TOEIC 초급',
    description: 'TOEIC 초급 단어 500개 (10-450점 대상)',
    category: 'TOEIC',
    difficulty: 'beginner',
    wordCount: beginnerWordIds.length,
    words: beginnerWordIds,
    isOfficial: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system',
    tags: ['TOEIC', '초급', 'beginner', 'business'],
    order: 31
  }

  // TOEIC Intermediate Collection
  const intermediateCollection = {
    name: 'TOEIC 중급',
    description: 'TOEIC 중급 단어 1000개 (450-750점 대상)',
    category: 'TOEIC',
    difficulty: 'intermediate',
    wordCount: intermediateWordIds.length,
    words: intermediateWordIds,
    isOfficial: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system',
    tags: ['TOEIC', '중급', 'intermediate', 'business'],
    order: 32
  }

  // TOEIC Advanced Collection
  const advancedCollection = {
    name: 'TOEIC 고급',
    description: 'TOEIC 고급 단어 500개 (750-990점 대상)',
    category: 'TOEIC',
    difficulty: 'advanced',
    wordCount: advancedWordIds.length,
    words: advancedWordIds,
    isOfficial: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system',
    tags: ['TOEIC', '고급', 'advanced', 'business'],
    order: 33
  }

  // Add collections to database
  const beginnerRef = await db.collection('vocabulary_collections').add(beginnerCollection)
  console.log(`Created TOEIC Beginner collection: ${beginnerRef.id}`)

  const intermediateRef = await db.collection('vocabulary_collections').add(intermediateCollection)
  console.log(`Created TOEIC Intermediate collection: ${intermediateRef.id}`)

  const advancedRef = await db.collection('vocabulary_collections').add(advancedCollection)
  console.log(`Created TOEIC Advanced collection: ${advancedRef.id}`)

  // Summary
  console.log('\n✅ TOEIC Import Complete!')
  console.log(`- Beginner: ${beginnerWordIds.length} words imported`)
  console.log(`- Intermediate: ${intermediateWordIds.length} words imported`)
  console.log(`- Advanced: ${advancedWordIds.length} words imported`)
  console.log(`- Total: ${beginnerWordIds.length + intermediateWordIds.length + advancedWordIds.length} words`)
  console.log('\nCollection IDs:')
  console.log(`- TOEIC Beginner: ${beginnerRef.id}`)
  console.log(`- TOEIC Intermediate: ${intermediateRef.id}`)
  console.log(`- TOEIC Advanced: ${advancedRef.id}`)
}

// Run the import
importTOEICVocabulary()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Import failed:', error)
    process.exit(1)
  })