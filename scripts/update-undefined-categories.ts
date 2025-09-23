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

async function updateUndefinedCategories() {
  console.log('🔄 Starting category update process...\n')

  // Step 1: Get A학원 collection word IDs
  console.log('📚 Step 1: Getting A학원 collection word IDs...')
  const academyCollection = await db.collection('vocabulary_collections')
    .where('category', '==', '학원')
    .limit(1)
    .get()

  if (academyCollection.empty) {
    console.error('❌ A학원 collection not found!')
    return
  }

  const academyData = academyCollection.docs[0].data()
  const academyWordIds = new Set(academyData.wordIds || [])
  console.log(`   Found ${academyWordIds.size} A학원 word IDs\n`)

  // Step 2: Get all words with undefined category
  console.log('🔍 Step 2: Fetching all words with undefined category...')
  const undefinedWords = await db.collection('words_v3').get()

  const wordsToUpdate = {
    academy: [] as string[],
    unknown: [] as string[]
  }

  let undefinedCount = 0
  undefinedWords.forEach((doc: any) => {
    const data = doc.data()
    if (data.category === undefined || data.category === null) {
      undefinedCount++
      if (academyWordIds.has(doc.id)) {
        wordsToUpdate.academy.push(doc.id)
      } else {
        wordsToUpdate.unknown.push(doc.id)
      }
    }
  })

  console.log(`   Found ${undefinedCount} words with undefined/null category`)
  console.log(`   - ${wordsToUpdate.academy.length} are A학원 words`)
  console.log(`   - ${wordsToUpdate.unknown.length} are other words\n`)

  // Step 3: Update A학원 words to category='학원'
  console.log('✏️ Step 3: Updating A학원 words to category="학원"...')
  let batch = db.batch()
  let batchCount = 0
  let academyUpdated = 0

  for (const wordId of wordsToUpdate.academy) {
    const wordRef = db.collection('words_v3').doc(wordId)
    batch.update(wordRef, {
      category: '학원',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    batchCount++
    academyUpdated++

    // Commit batch if it reaches 500 operations
    if (batchCount >= 500) {
      await batch.commit()
      console.log(`   ✅ Batch committed (${batchCount} operations)`)
      batch = db.batch()
      batchCount = 0
    }
  }

  // Commit remaining batch for academy words
  if (batchCount > 0) {
    await batch.commit()
    console.log(`   ✅ Final batch for A학원 words committed (${batchCount} operations)`)
  }

  console.log(`   ✅ Updated ${academyUpdated} A학원 words to category="학원"\n`)

  // Step 4: Update remaining words to category='Unknown'
  console.log('✏️ Step 4: Updating remaining words to category="Unknown"...')
  batch = db.batch()
  batchCount = 0
  let unknownUpdated = 0

  for (const wordId of wordsToUpdate.unknown) {
    const wordRef = db.collection('words_v3').doc(wordId)
    batch.update(wordRef, {
      category: 'Unknown',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    batchCount++
    unknownUpdated++

    // Commit batch if it reaches 500 operations
    if (batchCount >= 500) {
      await batch.commit()
      console.log(`   ✅ Batch committed (${batchCount} operations)`)
      batch = db.batch()
      batchCount = 0
    }
  }

  // Commit remaining batch for unknown words
  if (batchCount > 0) {
    await batch.commit()
    console.log(`   ✅ Final batch for Unknown words committed (${batchCount} operations)`)
  }

  console.log(`   ✅ Updated ${unknownUpdated} words to category="Unknown"\n`)

  // Step 5: Verify the updates
  console.log('🔍 Step 5: Verifying updates...')

  // Check a sample of A학원 words
  const sampleAcademyIds = Array.from(academyWordIds).slice(0, 5)
  const sampleAcademyDocs = await db.collection('words_v3')
    .where(admin.firestore.FieldPath.documentId(), 'in', sampleAcademyIds)
    .get()

  console.log('   Sample of updated A학원 words:')
  sampleAcademyDocs.forEach((doc: any) => {
    const data = doc.data()
    console.log(`     - ${data.word}: category="${data.category}"`)
  })

  // Check overall category distribution
  console.log('\n📊 Final Statistics:')
  console.log('=====================')
  console.log(`✅ Updated ${academyUpdated} words to category="학원"`)
  console.log(`✅ Updated ${unknownUpdated} words to category="Unknown"`)
  console.log(`📚 Total words updated: ${academyUpdated + unknownUpdated}`)
}

updateUndefinedCategories()
  .then(() => {
    console.log('\n✅ Category update completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })