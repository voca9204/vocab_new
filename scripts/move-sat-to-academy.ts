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

async function moveSATToAcademy() {
  console.log('📚 SAT 고급 단어를 학원 카테고리로 이동 시작...\n')

  // 1. SAT 고급 컬렉션 찾기
  console.log('1️⃣ SAT 고급 컬렉션 찾기...')
  const satQuery = await db.collection('vocabulary_collections')
    .where('category', '==', 'SAT')
    .where('difficulty', '==', 'advanced')
    .get()

  if (satQuery.empty) {
    console.log('❌ SAT 고급 컬렉션을 찾을 수 없습니다.')
    return
  }

  const satDoc = satQuery.docs[0]
  const satData = satDoc.data()
  console.log(`✅ SAT 고급 컬렉션 발견: ${satData.name} (ID: ${satDoc.id})`)
  console.log(`   단어 수: ${satData.wordCount || satData.wordIds?.length || 0}개`)

  // 2. wordIds 가져오기 (words 필드도 체크)
  const wordIds = satData.wordIds || satData.words || []
  if (wordIds.length === 0) {
    console.log('❌ SAT 고급 컬렉션에 단어가 없습니다.')
    console.log('   Available fields:', Object.keys(satData))
    return
  }
  console.log(`✅ ${wordIds.length}개의 단어 ID 발견`)

  // 3. 'A학원' 컬렉션 생성 (학원 카테고리)
  console.log('\n2️⃣ A학원 컬렉션 생성 중...')
  const academyRef = await db.collection('vocabulary_collections').add({
    name: 'A학원',
    displayName: 'A학원 특별 단어장',
    category: '학원',
    description: 'A학원 수업용 특별 단어 모음집',
    difficulty: 'advanced',
    wordIds: wordIds,
    wordCount: wordIds.length,
    isOfficial: true,
    createdBy: 'system',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  console.log(`✅ A학원 컬렉션 생성 완료 (ID: ${academyRef.id})`)
  console.log(`   카테고리: 학원`)
  console.log(`   단어 수: ${wordIds.length}개`)

  // 4. SAT 고급 컬렉션에서 단어 제거 (선택적 - 이동인 경우)
  console.log('\n3️⃣ SAT 고급 컬렉션에서 단어 제거 중...')
  await db.collection('vocabulary_collections').doc(satDoc.id).update({
    wordIds: [],
    wordCount: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  console.log('✅ SAT 고급 컬렉션에서 단어 제거 완료')

  // 5. 검증
  console.log('\n4️⃣ 검증 중...')

  // A학원 컬렉션 확인
  const academyDoc = await db.collection('vocabulary_collections').doc(academyRef.id).get()
  const academyData = academyDoc.data()
  console.log(`\n📊 A학원 컬렉션 상태:`)
  console.log(`   - 이름: ${academyData?.name}`)
  console.log(`   - 카테고리: ${academyData?.category}`)
  console.log(`   - 단어 수: ${academyData?.wordCount}`)

  // SAT 고급 컬렉션 확인
  const updatedSatDoc = await db.collection('vocabulary_collections').doc(satDoc.id).get()
  const updatedSatData = updatedSatDoc.data()
  console.log(`\n📊 SAT 고급 컬렉션 상태:`)
  console.log(`   - 이름: ${updatedSatData?.name}`)
  console.log(`   - 단어 수: ${updatedSatData?.wordCount}`)

  console.log('\n✅ 이동 작업 완료!')
  console.log(`   ${wordIds.length}개의 단어가 SAT 고급에서 A학원으로 이동되었습니다.`)
}

moveSATToAcademy()
  .then(() => {
    console.log('\n✅ 스크립트 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })