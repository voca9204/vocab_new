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

async function checkAllWordsDefinitions() {
  console.log('🔍 Checking all words in words_v3 collection...\n')

  // Get all words from words_v3
  const wordsSnapshot = await db.collection('words_v3').get()

  console.log(`📚 Total words in database: ${wordsSnapshot.size}\n`)

  const stats = {
    total: 0,
    withDefinition: 0,
    withoutDefinition: 0,
    byCategory: {} as Record<string, { total: number; missing: number }>,
    byDifficulty: {} as Record<string, { total: number; missing: number }>,
    missingWords: [] as any[]
  }

  wordsSnapshot.forEach((doc: any) => {
    const data = doc.data()
    stats.total++

    // Category tracking
    const category = data.category || 'Unknown'
    if (!stats.byCategory[category]) {
      stats.byCategory[category] = { total: 0, missing: 0 }
    }
    stats.byCategory[category].total++

    // Difficulty tracking
    const difficulty = data.difficulty || 'Unknown'
    if (!stats.byDifficulty[difficulty]) {
      stats.byDifficulty[difficulty] = { total: 0, missing: 0 }
    }
    stats.byDifficulty[difficulty].total++

    // Check if definition exists and is valid
    const hasDefinition = data.definition &&
                         data.definition !== '' &&
                         data.definition !== 'No definition available'

    if (hasDefinition) {
      stats.withDefinition++
    } else {
      stats.withoutDefinition++
      stats.byCategory[category].missing++
      stats.byDifficulty[difficulty].missing++

      // Store sample of missing words
      if (stats.missingWords.length < 20) {
        stats.missingWords.push({
          id: doc.id,
          word: data.word,
          category: category,
          difficulty: difficulty
        })
      }
    }
  })

  // Display results
  console.log('📊 Overall Statistics:')
  console.log('======================')
  console.log(`✅ Words with definitions: ${stats.withDefinition} (${(stats.withDefinition/stats.total*100).toFixed(1)}%)`)
  console.log(`❌ Words without definitions: ${stats.withoutDefinition} (${(stats.withoutDefinition/stats.total*100).toFixed(1)}%)`)
  console.log(`📚 Total words: ${stats.total}\n`)

  console.log('📊 By Category:')
  console.log('===============')
  Object.entries(stats.byCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([category, data]) => {
      const percentage = ((data.total - data.missing) / data.total * 100).toFixed(1)
      console.log(`${category}: ${data.total} total, ${data.missing} missing (${percentage}% complete)`)
    })

  console.log('\n📊 By Difficulty:')
  console.log('=================')
  Object.entries(stats.byDifficulty)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([difficulty, data]) => {
      const percentage = ((data.total - data.missing) / data.total * 100).toFixed(1)
      console.log(`${difficulty}: ${data.total} total, ${data.missing} missing (${percentage}% complete)`)
    })

  console.log('\n📝 Sample of words without definitions:')
  console.log('========================================')
  stats.missingWords.forEach(word => {
    console.log(`  - ${word.word} (${word.category}, ${word.difficulty})`)
  })

  // Save to file for reference
  fs.writeFileSync('words-definition-status.json', JSON.stringify(stats, null, 2))
  console.log('\n💾 Full statistics saved to words-definition-status.json')
}

checkAllWordsDefinitions()
  .then(() => {
    console.log('\n✅ Analysis complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })