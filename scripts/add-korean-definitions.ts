const admin = require('firebase-admin')
const path = require('path')
const dotenv = require('dotenv')
const OpenAI = require('openai')

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// Initialize Firebase Admin
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

// Initialize OpenAI
const openai = new OpenAI.OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function generateKoreanDefinitions(wordsWithDefs: { word: string, definition: string }[], retries = 3): Promise<Record<string, string>> {
  const wordList = wordsWithDefs.map(w => `${w.word}: ${w.definition}`).join('\n')
  const prompt = `다음 영어 단어들과 그 영어 정의를 한국어로 번역해주세요. 학생들이 이해하기 쉽도록 간결하고 명확하게 번역해주세요.

${wordList}

각 단어에 대한 한국어 정의만 JSON 형태로 반환해주세요. 키는 영어 단어, 값은 한국어 정의입니다.
예: {"abandon": "완전히 버리다, 포기하다"}

JSON 객체만 반환하고 다른 텍스트는 포함하지 마세요.`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('No content in response')
    }

    // Try to parse JSON from response
    try {
      // Remove markdown code blocks if present
      let cleanContent = content
      if (content.includes('```json')) {
        cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      }
      return JSON.parse(cleanContent)
    } catch (e) {
      console.error('Failed to parse JSON, attempting to extract JSON object...')
      // Try to find JSON object in the content
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
        } catch (e2) {
          console.error('Failed to extract JSON from content')
          return {}
        }
      }
      return {}
    }
    } catch (error: any) {
      if (attempt < retries) {
        console.error(`Attempt ${attempt} failed, retrying in 3 seconds...`)
        await new Promise(resolve => setTimeout(resolve, 3000))
        continue
      } else {
        console.error('Error generating Korean definitions after all retries:', error.message)
        return {}
      }
    }
  }

  return {}
}

async function addKoreanDefinitions() {
  console.log('🔍 한국어 정의 추가 스크립트 시작...\n')

  // Get all words with English definition but without Korean definition
  console.log('📚 영어 정의만 있는 단어들 조회 중...')
  const wordsSnapshot = await db.collection('words_v3').get()

  const wordsNeedingKoreanDef: any[] = []

  wordsSnapshot.forEach((doc: any) => {
    const data = doc.data()
    if (data.definition && !data.koreanDefinition) {
      wordsNeedingKoreanDef.push({
        id: doc.id,
        word: data.word,
        definition: data.definition
      })
    }
  })

  console.log(`📊 한국어 정의가 필요한 단어: ${wordsNeedingKoreanDef.length}개\n`)

  if (wordsNeedingKoreanDef.length === 0) {
    console.log('✅ 모든 단어에 한국어 정의가 있습니다!')
    return
  }

  // Process in batches
  const batchSize = 10  // Process 10 words at a time for better quality
  const totalBatches = Math.ceil(wordsNeedingKoreanDef.length / batchSize)
  let successCount = 0
  let errorCount = 0
  let batchNumber = 0

  console.log(`📊 총 ${totalBatches}개 배치 처리 (배치당 ${batchSize}개 단어)...\n`)

  for (let i = 0; i < wordsNeedingKoreanDef.length; i += batchSize) {
    batchNumber++
    const batch = wordsNeedingKoreanDef.slice(i, i + batchSize)
    const wordsWithDefs = batch.map(item => ({ word: item.word, definition: item.definition }))

    process.stdout.write(`🔄 배치 ${batchNumber}/${totalBatches} (${wordsWithDefs.length}개 단어)... `)

    // Generate Korean definitions
    const koreanDefinitions = await generateKoreanDefinitions(wordsWithDefs)

    // Update Firestore
    const firestoreBatch = db.batch()
    let updateCount = 0

    for (const wordData of batch) {
      const koreanDef = koreanDefinitions[wordData.word]
      if (koreanDef) {
        const wordRef = db.collection('words_v3').doc(wordData.id)
        firestoreBatch.update(wordRef, {
          koreanDefinition: koreanDef,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        updateCount++
        successCount++
      } else {
        errorCount++
      }
    }

    if (updateCount > 0) {
      await firestoreBatch.commit()
      console.log(`✅ ${updateCount}개 단어 업데이트 완료`)
    } else {
      console.log(`⚠️ 한국어 정의 생성 실패`)
    }

    // Progress update every 10 batches
    if (batchNumber % 10 === 0) {
      const percentage = Math.round((batchNumber / totalBatches) * 100)
      console.log(`📊 진행률: ${percentage}% 완료 (${successCount}/${wordsNeedingKoreanDef.length}개 정의 추가)`)
    }

    // Delay to avoid rate limiting
    if (i + batchSize < wordsNeedingKoreanDef.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // Final statistics
  console.log('\n' + '='.repeat(50))
  console.log('📊 최종 통계:')
  console.log('='.repeat(50))
  console.log(`✅ 성공: ${successCount}개 한국어 정의 추가`)
  console.log(`❌ 실패: ${errorCount}개`)
  console.log(`📚 총 처리: ${wordsNeedingKoreanDef.length}개 단어`)
  console.log(`📈 성공률: ${Math.round((successCount / wordsNeedingKoreanDef.length) * 100)}%`)

  // Verify remaining
  const verifySnapshot = await db.collection('words_v3').get()
  let remainingWithoutKorean = 0

  verifySnapshot.forEach((doc: any) => {
    const data = doc.data()
    if (data.definition && !data.koreanDefinition) {
      remainingWithoutKorean++
    }
  })

  console.log(`\n📝 한국어 정의가 없는 남은 단어: ${remainingWithoutKorean}개`)
}

addKoreanDefinitions()
  .then(() => {
    console.log('\n✅ 한국어 정의 추가 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })