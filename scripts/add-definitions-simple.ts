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

async function generateDefinitions(words: string[]): Promise<Record<string, string>> {
  const prompt = `Define these vocabulary words concisely for students. Return a JSON object where each key is a word and the value is a 1-2 sentence definition.

Words: ${words.join(', ')}

Return ONLY the JSON object, no additional text.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
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
      return JSON.parse(content)
    } catch (e) {
      console.error('Failed to parse JSON, raw content:', content)
      return {}
    }
  } catch (error) {
    console.error('Error generating definitions:', error)
    return {}
  }
}

async function addDefinitionsSimple() {
  console.log('🔍 Starting simplified definition update...\n')

  // Get all words without definitions
  console.log('📚 Fetching words without definitions...')
  const wordsSnapshot = await db.collection('words_v3').get()

  const wordsNeedingDefinitions: any[] = []

  wordsSnapshot.forEach((doc: any) => {
    const data = doc.data()
    if (!data.definition || data.definition === '' || data.definition === 'No definition available') {
      wordsNeedingDefinitions.push({
        id: doc.id,
        word: data.word,
        category: data.category || 'unknown'
      })
    }
  })

  console.log(`   Found ${wordsNeedingDefinitions.length} words needing definitions\n`)

  if (wordsNeedingDefinitions.length === 0) {
    console.log('✅ All words already have definitions!')
    return
  }

  // Process in smaller batches for better performance
  const batchSize = 10  // Smaller batch size for faster processing
  const totalBatches = Math.ceil(wordsNeedingDefinitions.length / batchSize)
  let successCount = 0
  let errorCount = 0
  let batchNumber = 0

  console.log(`📊 Processing ${totalBatches} batches (${batchSize} words per batch)...\n`)

  for (let i = 0; i < wordsNeedingDefinitions.length; i += batchSize) {
    batchNumber++
    const batch = wordsNeedingDefinitions.slice(i, i + batchSize)
    const words = batch.map(item => item.word)

    process.stdout.write(`🔄 Batch ${batchNumber}/${totalBatches} (${words.length} words)... `)

    // Generate definitions
    const definitions = await generateDefinitions(words)

    // Update Firestore
    const firestoreBatch = db.batch()
    let updateCount = 0

    for (const wordData of batch) {
      const definition = definitions[wordData.word]
      if (definition) {
        const wordRef = db.collection('words_v3').doc(wordData.id)
        firestoreBatch.update(wordRef, {
          definition: definition,
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
      console.log(`✅ Updated ${updateCount} words`)
    } else {
      console.log(`⚠️ No definitions generated`)
    }

    // Progress update every 10 batches
    if (batchNumber % 10 === 0) {
      const percentage = Math.round((batchNumber / totalBatches) * 100)
      console.log(`📊 Progress: ${percentage}% complete (${successCount}/${wordsNeedingDefinitions.length} definitions added)`)
    }

    // Small delay to avoid rate limiting
    if (i + batchSize < wordsNeedingDefinitions.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  // Final statistics
  console.log('\n' + '='.repeat(50))
  console.log('📊 Final Statistics:')
  console.log('='.repeat(50))
  console.log(`✅ Successfully added: ${successCount} definitions`)
  console.log(`❌ Failed: ${errorCount} definitions`)
  console.log(`📚 Total processed: ${wordsNeedingDefinitions.length} words`)
  console.log(`📈 Success rate: ${Math.round((successCount / wordsNeedingDefinitions.length) * 100)}%`)

  // Verify remaining
  const verifySnapshot = await db.collection('words_v3').get()
  let remainingWithoutDef = 0

  verifySnapshot.forEach((doc: any) => {
    const data = doc.data()
    if (!data.definition || data.definition === '' || data.definition === 'No definition available') {
      remainingWithoutDef++
    }
  })

  console.log(`\n📝 Remaining words without definitions: ${remainingWithoutDef}`)
}

addDefinitionsSimple()
  .then(() => {
    console.log('\n✅ Definition update completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })