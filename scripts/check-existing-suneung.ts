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

async function checkExistingSuneung() {
  console.log('🔍 기존 수능 공식 단어장 확인...\n')

  // Get the existing collection
  const doc = await db.collection('vocabulary_collections').doc('2DUcX7Fu7AD9cThwzOZr').get()

  if (!doc.exists) {
    console.log('❌ Collection not found!')
    return
  }

  const data = doc.data()
  console.log('📚 수능 공식 단어장:')
  console.log(`   Name: ${data.name}`)
  console.log(`   Category: ${data.category}`)
  console.log(`   Word Count (stored): ${data.wordCount}`)
  console.log(`   Word IDs array length: ${(data.wordIds || []).length}`)
  console.log(`   Words array length: ${(data.words || []).length}`)

  // Check if it has any word references
  if (data.wordIds && data.wordIds.length > 0) {
    console.log('\n📝 Word IDs found:')
    console.log(`   Total: ${data.wordIds.length}`)

    // Sample first 5 word IDs
    const sampleIds = data.wordIds.slice(0, 5)
    console.log(`   Sample IDs: ${sampleIds.join(', ')}`)

    // Try to fetch these words
    const wordsQuery = await db.collection('words_v3')
      .where(admin.firestore.FieldPath.documentId(), 'in', sampleIds)
      .get()

    if (!wordsQuery.empty) {
      console.log('\n   Sample words from words_v3:')
      wordsQuery.forEach((doc: any) => {
        const wordData = doc.data()
        console.log(`     - ${wordData.word}: ${wordData.definition || 'No definition'}`)
      })
    } else {
      console.log('   ⚠️  None of the sample word IDs exist in words_v3!')
    }
  } else if (data.words && data.words.length > 0) {
    console.log('\n📝 Words array found (legacy format):')
    console.log(`   Total: ${data.words.length}`)
    console.log(`   Sample words: ${data.words.slice(0, 5).join(', ')}`)
  } else {
    console.log('\n⚠️  No words found in this collection (empty)')
  }

  // Check all 수능 collections
  console.log('\n\n🔍 모든 수능 컬렉션 확인...')
  const allSuneung = await db.collection('vocabulary_collections')
    .where('category', '==', '수능')
    .get()

  console.log(`\n총 ${allSuneung.size}개의 수능 컬렉션 발견:`)

  allSuneung.forEach((doc: any) => {
    const colData = doc.data()
    const actualWordCount = (colData.wordIds || []).length || (colData.words || []).length
    console.log(`\n📚 ${colData.name} (${doc.id}):`)
    console.log(`   Difficulty: ${colData.difficulty || 'N/A'}`)
    console.log(`   Order: ${colData.order || 'N/A'}`)
    console.log(`   Word Count: ${colData.wordCount} (actual: ${actualWordCount})`)
    console.log(`   Created At: ${colData.createdAt ? new Date(colData.createdAt._seconds * 1000).toISOString() : 'N/A'}`)
  })

  // Check if words from old collection exist in new collections
  if (data.wordIds && data.wordIds.length > 0) {
    console.log('\n\n🔄 기존 단어들의 새 컬렉션 포함 여부 확인...')

    // Get all word IDs from new collections
    const newCollectionWordIds = new Set<string>()

    for (const doc of allSuneung.docs) {
      if (doc.id !== '2DUcX7Fu7AD9cThwzOZr') { // Skip the old collection
        const colData = doc.data()
        const wordIds = colData.wordIds || []
        wordIds.forEach((id: string) => newCollectionWordIds.add(id))
      }
    }

    // Check how many old words are in new collections
    let includedCount = 0
    for (const wordId of data.wordIds) {
      if (newCollectionWordIds.has(wordId)) {
        includedCount++
      }
    }

    console.log(`   기존 ${data.wordIds.length}개 단어 중 ${includedCount}개가 새 컬렉션에 포함됨`)
    console.log(`   포함되지 않은 단어: ${data.wordIds.length - includedCount}개`)
  }
}

checkExistingSuneung()
  .then(() => {
    console.log('\n✅ 확인 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })