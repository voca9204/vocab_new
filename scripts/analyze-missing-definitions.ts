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

async function analyzeMissingDefinitions() {
  console.log('🔍 Wave 1: Analyzing words with missing definitions...\n')

  // Get all TOEFL and TOEIC collections
  const collectionsSnap = await db.collection('vocabulary_collections')
    .where('category', 'in', ['TOEFL', 'TOEIC'])
    .get()

  const collections: any[] = []
  collectionsSnap.forEach((doc: any) => {
    const data = doc.data()
    if ((data.wordIds || data.words || []).length > 0) {
      collections.push({
        id: doc.id,
        name: data.name,
        category: data.category,
        difficulty: data.difficulty,
        wordIds: data.wordIds || data.words || []
      })
    }
  })

  console.log(`📚 Found ${collections.length} TOEFL/TOEIC collections\n`)

  // Collect all unique word IDs
  const allWordIds = new Set<string>()
  collections.forEach(col => {
    col.wordIds.forEach((id: string) => allWordIds.add(id))
  })

  console.log(`📊 Total unique words to check: ${allWordIds.size}\n`)

  // Check each word for missing definition
  const missingDefinitions: any[] = []
  const batchSize = 30
  const wordIdArray = Array.from(allWordIds)

  for (let i = 0; i < wordIdArray.length; i += batchSize) {
    const batch = wordIdArray.slice(i, i + batchSize)

    // Query words_v3
    const wordsQuery = await db.collection('words_v3')
      .where(admin.firestore.FieldPath.documentId(), 'in', batch)
      .get()

    wordsQuery.forEach((doc: any) => {
      const data = doc.data()

      // Check if definition is missing or empty
      if (!data.definition || data.definition === '' || data.definition === 'No definition available') {
        missingDefinitions.push({
          id: doc.id,
          word: data.word,
          category: data.category,
          difficulty: data.difficulty,
          hasPartOfSpeech: !!data.partOfSpeech && data.partOfSpeech.length > 0,
          hasExamples: !!data.examples && data.examples.length > 0,
          hasSynonyms: !!data.synonyms && data.synonyms.length > 0
        })
      }
    })

    // Progress indicator
    const processed = Math.min(i + batchSize, wordIdArray.length)
    process.stdout.write(`\r⏳ Checked ${processed}/${wordIdArray.length} words...`)
  }

  console.log('\n')

  // Analyze results by collection
  console.log('📈 Analysis Results:\n')
  console.log(`❌ Words missing definitions: ${missingDefinitions.length} / ${allWordIds.size}`)
  console.log(`✅ Words with definitions: ${allWordIds.size - missingDefinitions.length} / ${allWordIds.size}`)
  console.log(`📊 Percentage missing: ${((missingDefinitions.length / allWordIds.size) * 100).toFixed(1)}%\n`)

  // Group by category and difficulty
  const byCategory: Record<string, number> = {}
  const byDifficulty: Record<string, number> = {}

  missingDefinitions.forEach(word => {
    byCategory[word.category || 'unknown'] = (byCategory[word.category || 'unknown'] || 0) + 1
    byDifficulty[word.difficulty || 'unknown'] = (byDifficulty[word.difficulty || 'unknown'] || 0) + 1
  })

  console.log('🏷️ By Category:')
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} words`)
  })

  console.log('\n📊 By Difficulty:')
  Object.entries(byDifficulty).forEach(([diff, count]) => {
    console.log(`  ${diff}: ${count} words`)
  })

  // Sample of missing words
  console.log('\n📝 Sample of words missing definitions:')
  missingDefinitions.slice(0, 10).forEach(word => {
    console.log(`  - ${word.word} (${word.category}, ${word.difficulty})`)
  })

  // Save list to file for next step
  const fs = require('fs')
  fs.writeFileSync(
    'missing-definitions.json',
    JSON.stringify(missingDefinitions, null, 2)
  )

  console.log(`\n💾 Saved ${missingDefinitions.length} words to missing-definitions.json`)

  return missingDefinitions
}

analyzeMissingDefinitions()
  .then((missing) => {
    console.log('\n✅ Wave 1 Complete: Analysis finished!')
    console.log(`📊 Found ${missing.length} words that need definitions`)
    console.log('\n📋 Next Step: Run add-missing-definitions.ts to generate and add definitions')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })