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

async function fixOfficialField() {
  console.log('🔧 수능과 GRE 컬렉션에 isOfficial 필드 추가...\n')

  // 수능과 GRE 컬렉션 가져오기
  const snapshot = await db.collection('vocabulary_collections')
    .where('category', 'in', ['수능', 'GRE'])
    .get()

  console.log(`📊 수정할 컬렉션: ${snapshot.size}개\n`)

  const batch = db.batch()

  snapshot.forEach((doc: any) => {
    const data = doc.data()

    // isOfficial 필드가 없으면 추가
    if (data.isOfficial === undefined) {
      console.log(`  📝 ${data.name} (${doc.id})`)
      batch.update(doc.ref, {
        isOfficial: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  })

  // 변경 사항 적용
  await batch.commit()

  console.log('\n✅ isOfficial 필드 추가 완료!')

  // 검증
  console.log('\n🔍 검증 중...')
  const verifySnapshot = await db.collection('vocabulary_collections')
    .where('category', 'in', ['수능', 'GRE'])
    .get()

  let allHaveOfficial = true
  verifySnapshot.forEach((doc: any) => {
    const data = doc.data()
    if (data.isOfficial === undefined) {
      console.log(`  ❌ ${data.name} - 여전히 isOfficial 없음`)
      allHaveOfficial = false
    }
  })

  if (allHaveOfficial) {
    console.log('✅ 모든 수능/GRE 컬렉션에 isOfficial 필드가 있습니다!')
  }
}

fixOfficialField()
  .then(() => {
    console.log('\n✅ 수정 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })