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

async function checkNullCategoryWords() {
  console.log('🔍 Checking words with null/undefined category...\n')

  // Get all words
  const allWords = await db.collection('words_v3').get()

  const stats = {
    total: 0,
    withCategory: 0,
    nullCategory: 0,
    emptyCategory: 0,
    unknownCategory: 0,
    samples: [] as any[]
  }

  const categoryBreakdown: Record<string, number> = {}

  allWords.forEach((doc: any) => {
    const data = doc.data()
    stats.total++

    const category = data.category

    // Track different states
    if (category === null) {
      stats.nullCategory++
      categoryBreakdown['null'] = (categoryBreakdown['null'] || 0) + 1
    } else if (category === undefined) {
      stats.nullCategory++ // Count undefined as null
      categoryBreakdown['undefined'] = (categoryBreakdown['undefined'] || 0) + 1
    } else if (category === '') {
      stats.emptyCategory++
      categoryBreakdown['empty_string'] = (categoryBreakdown['empty_string'] || 0) + 1
    } else if (category === 'Unknown') {
      stats.unknownCategory++
      categoryBreakdown['Unknown'] = (categoryBreakdown['Unknown'] || 0) + 1
    } else {
      stats.withCategory++
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1
    }

    // Collect samples of words without proper category
    if (!category || category === '' || category === 'Unknown') {
      if (stats.samples.length < 10) {
        stats.samples.push({
          id: doc.id,
          word: data.word,
          category: category === undefined ? 'undefined' : category === null ? 'null' : category,
          source: data.source,
          hasDefinition: !!(data.definition && data.definition !== '' && data.definition !== 'No definition available')
        })
      }
    }
  })

  console.log('📊 Overall Statistics:')
  console.log('======================')
  console.log(`Total words: ${stats.total}`)
  console.log(`With valid category: ${stats.withCategory}`)
  console.log(`Null/undefined category: ${stats.nullCategory}`)
  console.log(`Empty string category: ${stats.emptyCategory}`)
  console.log(`"Unknown" category: ${stats.unknownCategory}`)

  console.log('\n📊 Category Breakdown:')
  console.log('======================')
  Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const percentage = ((count / stats.total) * 100).toFixed(1)
      console.log(`${category}: ${count} words (${percentage}%)`)
    })

  console.log('\n📝 Sample of words with problematic categories:')
  console.log('================================================')
  stats.samples.forEach(word => {
    console.log(`  - ${word.word} (ID: ${word.id})`)
    console.log(`    Category: ${word.category}, Source: ${word.source}, Has Definition: ${word.hasDefinition}`)
  })

  // Check A학원 words specifically
  console.log('\n🔍 Checking A학원 collection words...')
  const academyCollection = await db.collection('vocabulary_collections')
    .where('category', '==', '학원')
    .limit(1)
    .get()

  if (!academyCollection.empty) {
    const academyData = academyCollection.docs[0].data()
    const academyWordIds = academyData.wordIds || []

    if (academyWordIds.length > 0) {
      // Check first 10 A학원 words
      const sampleIds = academyWordIds.slice(0, 10)
      const sampleDocs = await db.collection('words_v3')
        .where(admin.firestore.FieldPath.documentId(), 'in', sampleIds)
        .get()

      console.log('Sample of A학원 words categories:')
      sampleDocs.forEach((doc: any) => {
        const data = doc.data()
        console.log(`  - ${data.word}: category="${data.category}" (${data.category === undefined ? 'undefined' : data.category === null ? 'null' : 'value'}))`)
      })
    }
  }

  console.log('\n💡 INSIGHT:')
  console.log('===========')
  console.log(`The definition analysis script treats null/undefined as "Unknown".`)
  console.log(`There are ${stats.nullCategory} words with null/undefined category,`)
  console.log(`which explains the 3,141 "Unknown" words in the analysis.`)
  console.log(`These are likely from various imports including A학원 (1,821 words).`)
}

checkNullCategoryWords()
  .then(() => {
    console.log('\n✅ Analysis complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })