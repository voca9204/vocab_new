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

async function generateDefinitions(words: string[]): Promise<Record<string, any>> {
  const prompt = `Generate concise, clear definitions for these vocabulary words. Return a JSON object with each word as a key.

Words: ${words.join(', ')}

For each word, provide:
- definition: A clear, concise definition (1-2 sentences)
- partOfSpeech: The part of speech (noun, verb, adjective, adverb, etc.)
- examples: An array of 2 example sentences
- synonyms: An array of 2-3 synonyms (if applicable)
- etymology: Brief origin of the word (optional, 1 sentence)

Format the response as a valid JSON object.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a vocabulary expert. Provide accurate, educational definitions suitable for SAT/GRE/TOEFL students.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('No content in response')
    }

    return JSON.parse(content)
  } catch (error) {
    console.error('Error generating definitions:', error)
    return {}
  }
}

async function addAllMissingDefinitions() {
  console.log('🔍 Starting comprehensive definition update...\n')

  // Step 1: Get all words without definitions
  console.log('📚 Step 1: Fetching words without definitions...')
  const wordsSnapshot = await db.collection('words_v3').get()

  const wordsNeedingDefinitions: any[] = []

  wordsSnapshot.forEach((doc: any) => {
    const data = doc.data()
    // Check if definition is missing or invalid
    if (!data.definition || data.definition === '' || data.definition === 'No definition available') {
      wordsNeedingDefinitions.push({
        id: doc.id,
        word: data.word,
        category: data.category,
        difficulty: data.difficulty
      })
    }
  })

  console.log(`   Found ${wordsNeedingDefinitions.length} words needing definitions\n`)

  if (wordsNeedingDefinitions.length === 0) {
    console.log('✅ All words already have definitions!')
    return
  }

  // Step 2: Process in batches
  const batchSize = 20 // Process 20 words at a time for OpenAI
  const totalBatches = Math.ceil(wordsNeedingDefinitions.length / batchSize)
  let successCount = 0
  let errorCount = 0

  console.log(`📊 Processing ${totalBatches} batches (${batchSize} words per batch)...\n`)

  for (let i = 0; i < wordsNeedingDefinitions.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1
    const batch = wordsNeedingDefinitions.slice(i, i + batchSize)
    const words = batch.map(item => item.word)

    console.log(`🔄 Batch ${batchNumber}/${totalBatches} (${words.length} words)...`)

    // Generate definitions for this batch
    const definitions = await generateDefinitions(words)

    // Update Firestore
    const firestoreBatch = db.batch()
    let updateCount = 0

    for (const wordData of batch) {
      const def = definitions[wordData.word]
      if (def && def.definition) {
        const wordRef = db.collection('words_v3').doc(wordData.id)

        const updateData: any = {
          definition: def.definition,
          partOfSpeech: def.partOfSpeech || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }

        // Add optional fields if they exist
        if (def.examples && Array.isArray(def.examples)) {
          updateData.examples = def.examples
        }
        if (def.synonyms && Array.isArray(def.synonyms)) {
          updateData.synonyms = def.synonyms
        }
        if (def.etymology) {
          updateData.etymology = def.etymology
        }

        firestoreBatch.update(wordRef, updateData)
        updateCount++
        successCount++
      } else {
        console.log(`   ⚠️ No definition generated for: ${wordData.word}`)
        errorCount++
      }
    }

    if (updateCount > 0) {
      await firestoreBatch.commit()
      console.log(`   ✅ Updated ${updateCount} words in batch ${batchNumber}`)
    }

    // Rate limiting - wait 1 second between batches to avoid API limits
    if (i + batchSize < wordsNeedingDefinitions.length) {
      console.log('   ⏳ Waiting 1 second before next batch...')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Progress update every 10 batches
    if (batchNumber % 10 === 0 || batchNumber === totalBatches) {
      const percentage = Math.round((batchNumber / totalBatches) * 100)
      console.log(`\n📊 Progress: ${percentage}% complete (${successCount} definitions added)\n`)
    }
  }

  // Step 3: Final verification
  console.log('\n📊 Final Statistics:')
  console.log('===================')
  console.log(`✅ Successfully added definitions: ${successCount}`)
  console.log(`❌ Failed to generate definitions: ${errorCount}`)
  console.log(`📚 Total processed: ${wordsNeedingDefinitions.length}`)
  console.log(`📈 Success rate: ${Math.round((successCount / wordsNeedingDefinitions.length) * 100)}%`)

  // Check remaining words without definitions
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

addAllMissingDefinitions()
  .then(() => {
    console.log('\n✅ Definition update process completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })