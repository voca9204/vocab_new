const admin = require('firebase-admin')
const path = require('path')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })

    console.log('✅ Firebase Admin initialized')
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error.message)
    process.exit(1)
  }
}

const db = admin.firestore()

async function checkEnglishOnlyDefinitions() {
  const wordsRef = db.collection('words_v3')

  // 특정 단어들 확인
  const testWords = ['interest', 'charter', 'abandon', 'ability']

  console.log('🔍 영어 정의만 있는 단어들 확인...\n')

  for (const word of testWords) {
    const snapshot = await wordsRef.where('word', '==', word).limit(1).get()

    if (!snapshot.empty) {
      const doc = snapshot.docs[0]
      const data = doc.data()

      console.log(`📌 단어: ${word}`)
      console.log(`   - definition: ${data.definition || '없음'}`)
      console.log(`   - koreanDefinition: ${data.koreanDefinition || '없음'}`)

      if (data.definitions && Array.isArray(data.definitions)) {
        console.log(`   - definitions 배열 (${data.definitions.length}개):`)
        data.definitions.slice(0, 2).forEach((def: any, i: number) => {
          console.log(`     [${i}] text: ${def.text || '없음'}`)
          console.log(`         korean: ${def.korean || '없음'}`)
        })
      }
      console.log('')
    }
  }

  // 전체 통계 - 더 많은 샘플로 확인
  console.log('📊 전체 통계 확인 (1000개 샘플)...')
  const allWords = await wordsRef.limit(1000).get()

  let englishOnly = 0
  let hasKorean = 0
  let noDefinition = 0
  const englishOnlyExamples: string[] = []

  allWords.forEach((doc: any) => {
    const data = doc.data()
    if (data.definition && !data.koreanDefinition) {
      englishOnly++
      if (englishOnlyExamples.length < 10) {
        englishOnlyExamples.push(data.word)
      }
    } else if (data.koreanDefinition) {
      hasKorean++
    } else {
      noDefinition++
    }
  })

  console.log(`   - 영어 정의만: ${englishOnly}개 (${(englishOnly/1000*100).toFixed(1)}%)`)
  console.log(`   - 한국어 정의 있음: ${hasKorean}개 (${(hasKorean/1000*100).toFixed(1)}%)`)
  console.log(`   - 정의 없음: ${noDefinition}개 (${(noDefinition/1000*100).toFixed(1)}%)`)

  if (englishOnlyExamples.length > 0) {
    console.log('\n📝 영어 정의만 있는 단어 예시:')
    englishOnlyExamples.forEach(word => {
      console.log(`   - ${word}`)
    })
  }
}

checkEnglishOnlyDefinitions().catch(console.error)