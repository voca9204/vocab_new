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

async function deleteOldSuneungCollection() {
  console.log('🗑️ 기존 수능 공식 단어장 삭제 시작...\n')

  const collectionId = '2DUcX7Fu7AD9cThwzOZr'

  // First, get the collection to confirm it exists
  const doc = await db.collection('vocabulary_collections').doc(collectionId).get()

  if (!doc.exists) {
    console.log('❌ Collection not found!')
    return
  }

  const data = doc.data()
  console.log('📚 삭제할 컬렉션 정보:')
  console.log(`   Name: ${data.name}`)
  console.log(`   Category: ${data.category}`)
  console.log(`   Word Count: ${data.wordCount}`)
  console.log(`   Created At: ${data.createdAt ? new Date(data.createdAt._seconds * 1000).toISOString() : 'N/A'}`)

  // Delete the collection
  await db.collection('vocabulary_collections').doc(collectionId).delete()
  console.log('\n✅ 컬렉션 삭제 완료!')

  // Verify deletion
  console.log('\n🔍 삭제 확인 중...')
  const verifyDoc = await db.collection('vocabulary_collections').doc(collectionId).get()

  if (!verifyDoc.exists) {
    console.log('✅ 컬렉션이 성공적으로 삭제되었습니다.')
  } else {
    console.log('❌ 삭제 실패! 컬렉션이 여전히 존재합니다.')
  }

  // Show remaining 수능 collections
  console.log('\n📊 남은 수능 컬렉션 목록:')
  const remaining = await db.collection('vocabulary_collections')
    .where('category', '==', '수능')
    .get()

  remaining.forEach((doc: any) => {
    const colData = doc.data()
    const actualWordCount = (colData.wordIds || []).length
    console.log(`\n📚 ${colData.name}:`)
    console.log(`   ID: ${doc.id}`)
    console.log(`   Difficulty: ${colData.difficulty}`)
    console.log(`   Word Count: ${actualWordCount}`)
  })
}

deleteOldSuneungCollection()
  .then(() => {
    console.log('\n✅ 삭제 프로세스 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })