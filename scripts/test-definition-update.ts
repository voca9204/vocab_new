const admin = require('firebase-admin')
const path = require('path')
const dotenv = require('dotenv')
const OpenAI = require('openai')

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

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function testDefinitionUpdate() {
  console.log('🔍 Testing definition update with 5 words...\n')

  // Get 5 words without definitions for testing
  const wordsSnapshot = await db.collection('words_v3')
    .limit(100)
    .get()

  const testWords: any[] = []

  wordsSnapshot.forEach((doc: any) => {
    const data = doc.data()
    if ((!data.definition || data.definition === '' || data.definition === 'No definition available') && testWords.length < 5) {
      testWords.push({
        id: doc.id,
        word: data.word,
        category: data.category
      })
    }
  })

  console.log('Test words:')
  testWords.forEach(w => console.log(`  - ${w.word} (${w.category})`))
  console.log()

  const words = testWords.map(w => w.word)

  console.log('📤 Calling OpenAI API...')
  const startTime = Date.now()

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `Define these words concisely for SAT/TOEFL students. Return a JSON object with each word as a key, and for each word provide a "definition" field with a 1-2 sentence definition. Words: ${words.join(', ')}`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const responseTime = Date.now() - startTime
    console.log(`✅ API response received in ${responseTime}ms\n`)

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('No content in response')
    }

    const definitions = JSON.parse(content)
    console.log('📝 Definitions received:')
    Object.entries(definitions).forEach(([word, def]: [string, any]) => {
      console.log(`\n${word}:`)
      console.log(`  Definition: ${def.definition || 'N/A'}`)
    })

    // Update in Firestore
    console.log('\n💾 Updating Firestore...')
    const batch = db.batch()

    for (const wordData of testWords) {
      const def = definitions[wordData.word]
      if (def && def.definition) {
        const wordRef = db.collection('words_v3').doc(wordData.id)
        batch.update(wordRef, {
          definition: def.definition,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        console.log(`  ✅ ${wordData.word}`)
      }
    }

    await batch.commit()
    console.log('\n✅ Test completed successfully!')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.response) {
      console.error('API Response:', error.response.data)
    }
  }
}

testDefinitionUpdate()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })