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

async function verifyAcademyCollection() {
  console.log('🔍 학원 카테고리 컬렉션 확인 중...\n')

  // 학원 카테고리 컬렉션 찾기
  const snapshot = await db.collection('vocabulary_collections')
    .where('category', '==', '학원')
    .get()

  console.log(`📊 학원 카테고리 컬렉션: ${snapshot.size}개\n`)

  snapshot.forEach((doc: any) => {
    const data = doc.data()
    console.log(`📚 ${data.name} (${doc.id})`)
    console.log(`   - Category: ${data.category}`)
    console.log(`   - Difficulty: ${data.difficulty}`)
    console.log(`   - Is Official: ${data.isOfficial}`)
    console.log(`   - Word Count: ${data.wordCount}`)
    console.log(`   - Description: ${data.description || 'N/A'}`)
    console.log()
  })

  // SAT 고급 컬렉션 상태 확인
  console.log('📊 SAT 고급 컬렉션 상태:\n')
  const satQuery = await db.collection('vocabulary_collections')
    .where('category', '==', 'SAT')
    .where('difficulty', '==', 'advanced')
    .get()

  satQuery.forEach((doc: any) => {
    const data = doc.data()
    console.log(`📚 ${data.name} (${doc.id})`)
    console.log(`   - Word Count: ${data.wordCount}`)
    console.log(`   - Words/WordIds Length: ${(data.words || data.wordIds || []).length}`)
    console.log()
  })

  // 모든 카테고리 요약
  console.log('📊 전체 카테고리 요약:\n')
  const allCollections = await db.collection('vocabulary_collections').get()
  const categories: Record<string, number> = {}

  allCollections.forEach((doc: any) => {
    const data = doc.data()
    const category = data.category || '기타'
    categories[category] = (categories[category] || 0) + 1
  })

  Object.entries(categories).forEach(([category, count]) => {
    console.log(`  ${category}: ${count}개 컬렉션`)
  })
}

verifyAcademyCollection()
  .then(() => {
    console.log('\n✅ 검증 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })