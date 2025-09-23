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

async function deleteEmptyGRECollection() {
  console.log('🗑️ 빈 GRE 공식 단어장 삭제 중...\n')

  const collectionId = 'ZCfBJ9Dgmj2q65bSnjcj'

  // 컬렉션 확인
  const doc = await db.collection('vocabulary_collections').doc(collectionId).get()

  if (!doc.exists) {
    console.log('❌ 컬렉션을 찾을 수 없습니다.')
    return
  }

  const data = doc.data()
  console.log(`📚 삭제할 컬렉션: ${data.name}`)
  console.log(`   - Category: ${data.category}`)
  console.log(`   - Difficulty: ${data.difficulty}`)
  console.log(`   - Word Count: ${data.wordCount || 0}`)
  console.log(`   - Words: ${data.words?.length || 0}`)
  console.log(`   - Word IDs: ${data.wordIds?.length || 0}`)

  // 삭제 확인
  console.log('\n🗑️ 삭제 중...')
  await db.collection('vocabulary_collections').doc(collectionId).delete()
  console.log('✅ 빈 GRE 공식 단어장을 삭제했습니다!')

  // 남은 GRE 컬렉션 확인
  console.log('\n📊 남은 GRE 컬렉션:')
  const remaining = await db.collection('vocabulary_collections')
    .where('category', '==', 'GRE')
    .get()

  remaining.forEach((doc: any) => {
    const data = doc.data()
    const wordCount = data.wordCount || data.words?.length || data.wordIds?.length || 0
    console.log(`  📚 ${data.name} (${data.difficulty}): ${wordCount} words`)
  })
}

deleteEmptyGRECollection()
  .then(() => {
    console.log('\n✅ 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })