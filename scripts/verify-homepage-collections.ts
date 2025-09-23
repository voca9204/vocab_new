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

async function verifyHomepageCollections() {
  console.log('🔍 홈페이지에서 보여야 할 컬렉션 확인 중...\n')

  // 모든 vocabulary_collections 가져오기
  const snapshot = await db.collection('vocabulary_collections').get()

  const collections: any[] = []
  snapshot.forEach((doc: any) => {
    const data = doc.data()
    collections.push({
      id: doc.id,
      name: data.name,
      category: data.category,
      difficulty: data.difficulty,
      wordCount: data.wordCount || (data.wordIds || []).length,
      isOfficial: data.isOfficial,
      createdAt: data.createdAt
    })
  })

  // 카테고리별로 그룹화
  const grouped: any = {}
  collections.forEach(col => {
    const category = col.category || '기본'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(col)
  })

  // 결과 출력
  console.log('📊 카테고리별 컬렉션:\n')

  const targetCategories = ['SAT', 'TOEFL', 'TOEIC', '수능', 'GRE', 'IELTS', '기본']

  targetCategories.forEach(category => {
    console.log(`\n${category}:`)
    console.log('─'.repeat(50))

    if (grouped[category]) {
      grouped[category].forEach((col: any) => {
        console.log(`  📚 ${col.name}`)
        console.log(`     - ID: ${col.id}`)
        console.log(`     - Difficulty: ${col.difficulty || 'N/A'}`)
        console.log(`     - Word Count: ${col.wordCount}`)
        console.log(`     - Is Official: ${col.isOfficial !== undefined ? col.isOfficial : 'N/A'}`)
      })

      // 난이도별 정리
      const byDifficulty: any = {}
      grouped[category].forEach((col: any) => {
        const diff = col.difficulty || 'unknown'
        if (!byDifficulty[diff]) {
          byDifficulty[diff] = []
        }
        byDifficulty[diff].push(col.name)
      })

      console.log(`\n  난이도별:`)
      Object.entries(byDifficulty).forEach(([diff, names]) => {
        console.log(`    ${diff}: ${(names as string[]).join(', ')}`)
      })

      const total = grouped[category].reduce((sum: number, col: any) => sum + col.wordCount, 0)
      console.log(`\n  총 단어 수: ${total}`)
    } else {
      console.log('  ❌ 컬렉션 없음')
    }
  })

  // 문제 진단
  console.log('\n\n🔍 문제 진단:')

  // 수능과 GRE 체크
  if (!grouped['수능'] || grouped['수능'].length === 0) {
    console.log('⚠️  수능 컬렉션이 없습니다!')
  } else {
    console.log('✅ 수능 컬렉션 발견: ' + grouped['수능'].length + '개')
  }

  if (!grouped['GRE'] || grouped['GRE'].length === 0) {
    console.log('⚠️  GRE 컬렉션이 없습니다!')
  } else {
    console.log('✅ GRE 컬렉션 발견: ' + grouped['GRE'].length + '개')
  }

  // isOfficial이 없는 컬렉션 확인
  const withoutOfficial = collections.filter(c => c.isOfficial === undefined)
  if (withoutOfficial.length > 0) {
    console.log(`\n⚠️  isOfficial 필드가 없는 컬렉션: ${withoutOfficial.length}개`)
    withoutOfficial.forEach(col => {
      console.log(`  - ${col.name} (${col.category})`)
    })
  }
}

verifyHomepageCollections()
  .then(() => {
    console.log('\n✅ 검증 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })