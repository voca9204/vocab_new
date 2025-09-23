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

async function checkGREAdvanced() {
  console.log('🔍 GRE 고급 컬렉션 상태 확인...\n')

  // GRE 고급 컬렉션 찾기
  const snapshot = await db.collection('vocabulary_collections')
    .where('category', '==', 'GRE')
    .where('difficulty', '==', 'advanced')
    .get()

  console.log(`📊 GRE 고급 컬렉션: ${snapshot.size}개\n`)

  snapshot.forEach((doc: any) => {
    const data = doc.data()
    console.log(`📚 ${data.name} (${doc.id})`)
    console.log(`   - Category: ${data.category}`)
    console.log(`   - Difficulty: ${data.difficulty}`)
    console.log(`   - Is Official: ${data.isOfficial}`)
    console.log(`   - Word Count: ${data.wordCount || 0}`)
    console.log(`   - Words Array Length: ${data.words?.length || 0}`)
    console.log(`   - Word IDs: ${data.wordIds?.length || 0}`)
    
    // Check if words exist
    if (data.words?.length > 0) {
      console.log(`   ✅ Has words array with ${data.words.length} items`)
    } else if (data.wordIds?.length > 0) {
      console.log(`   ✅ Has wordIds array with ${data.wordIds.length} items`)
    } else {
      console.log(`   ❌ No words or wordIds found!`)
    }
    console.log()
  })

  // 모든 GRE 컬렉션 확인
  console.log('📊 모든 GRE 컬렉션:\n')
  const allGRE = await db.collection('vocabulary_collections')
    .where('category', '==', 'GRE')
    .get()

  allGRE.forEach((doc: any) => {
    const data = doc.data()
    const wordCount = data.wordCount || data.words?.length || data.wordIds?.length || 0
    console.log(`📚 ${data.name} (${data.difficulty})`)
    console.log(`   - ID: ${doc.id}`)
    console.log(`   - Word Count: ${wordCount}`)
    console.log(`   - Has words: ${data.words ? 'Yes' : 'No'}`)
    console.log(`   - Has wordIds: ${data.wordIds ? 'Yes' : 'No'}`)
    console.log()
  })
}

checkGREAdvanced()
  .then(() => {
    console.log('✅ 확인 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
