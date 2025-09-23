const admin = require('firebase-admin')
const path = require('path')
const dotenv = require('dotenv')
const fs = require('fs')
const OpenAI = require('openai')

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

// Rate limiting
const BATCH_SIZE = 10 // Process 10 words at a time
const DELAY_BETWEEN_BATCHES = 2000 // 2 seconds between batches
const MAX_RETRIES = 3

async function generateDefinitionForWord(word: string, category: string, difficulty: string) {
  const prompt = `Generate a comprehensive vocabulary entry for the ${category} word "${word}" (difficulty: ${difficulty}).

Return a JSON object with these exact fields:
{
  "definition": "Clear, concise Korean definition (한글)",
  "englishDefinition": "Clear English definition",
  "partOfSpeech": ["noun", "verb", "adjective", etc.],
  "examples": ["English example sentence 1", "English example sentence 2", "English example sentence 3"],
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "antonyms": ["antonym1", "antonym2"] (if applicable),
  "etymology": "Brief etymology or origin of the word",
  "pronunciation": "IPA pronunciation like /prəˌnʌnsiˈeɪʃən/"
}

Make the definitions appropriate for ${category} exam preparation. Use simple, clear language.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a vocabulary expert specializing in test preparation (SAT, TOEFL, TOEIC).' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('No content in response')

    return JSON.parse(content)
  } catch (error) {
    console.error(`Error generating definition for "${word}":`, error)
    return null
  }
}

async function processBatch(words: any[], batchNumber: number, totalBatches: number) {
  console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches}...`)
  const results: any[] = []

  for (const wordData of words) {
    console.log(`  🔤 Generating definition for "${wordData.word}"...`)

    let definition = null
    let retries = 0

    while (!definition && retries < MAX_RETRIES) {
      definition = await generateDefinitionForWord(
        wordData.word,
        wordData.category || 'Academic',
        wordData.difficulty || 'intermediate'
      )

      if (!definition) {
        retries++
        console.log(`    ⚠️ Retry ${retries}/${MAX_RETRIES} for "${wordData.word}"`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (definition) {
      results.push({
        id: wordData.id,
        word: wordData.word,
        ...definition
      })
      console.log(`    ✅ Success for "${wordData.word}"`)
    } else {
      console.log(`    ❌ Failed for "${wordData.word}" after ${MAX_RETRIES} retries`)
    }

    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return results
}

async function updateDatabase(definitions: any[]) {
  console.log('\n📤 Updating database...')
  const batch = db.batch()
  let updateCount = 0

  for (const def of definitions) {
    const wordRef = db.collection('words_v3').doc(def.id)

    // Prepare update data
    const updateData: any = {
      definition: def.definition,
      englishDefinition: def.englishDefinition,
      partOfSpeech: def.partOfSpeech,
      examples: def.examples,
      synonyms: def.synonyms,
      pronunciation: def.pronunciation,
      etymology: def.etymology,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    // Only add antonyms if they exist
    if (def.antonyms && def.antonyms.length > 0) {
      updateData.antonyms = def.antonyms
    }

    batch.update(wordRef, updateData)
    updateCount++

    // Firestore batch limit is 500
    if (updateCount === 500) {
      await batch.commit()
      console.log(`  ✅ Committed batch of 500 updates`)
      // Start new batch
      updateCount = 0
    }
  }

  // Commit remaining updates
  if (updateCount > 0) {
    await batch.commit()
    console.log(`  ✅ Committed final batch of ${updateCount} updates`)
  }
}

async function main() {
  console.log('🌊 Wave 2: Generating definitions for missing words...\n')

  // Load the missing words list
  if (!fs.existsSync('missing-definitions.json')) {
    console.error('❌ missing-definitions.json not found. Run analyze-missing-definitions.ts first!')
    process.exit(1)
  }

  const missingWords = JSON.parse(fs.readFileSync('missing-definitions.json', 'utf8'))
  console.log(`📊 Loaded ${missingWords.length} words that need definitions\n`)

  // Process a limited number for testing (remove this limit for full processing)
  const LIMIT = 50 // Process only first 50 words for testing
  const wordsToProcess = missingWords.slice(0, LIMIT)

  console.log(`⚠️ Processing first ${LIMIT} words for testing (remove limit in script for full processing)\n`)

  // Process in batches
  const totalBatches = Math.ceil(wordsToProcess.length / BATCH_SIZE)
  const allDefinitions: any[] = []

  for (let i = 0; i < wordsToProcess.length; i += BATCH_SIZE) {
    const batch = wordsToProcess.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1

    const definitions = await processBatch(batch, batchNumber, totalBatches)
    allDefinitions.push(...definitions)

    // Save progress
    fs.writeFileSync(
      'generated-definitions.json',
      JSON.stringify(allDefinitions, null, 2)
    )

    if (batchNumber < totalBatches) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`)
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
    }
  }

  console.log(`\n📊 Generated definitions for ${allDefinitions.length}/${wordsToProcess.length} words`)

  // Update database
  if (allDefinitions.length > 0) {
    await updateDatabase(allDefinitions)
    console.log('\n✅ Database updated successfully!')
  }

  // Save final results
  fs.writeFileSync(
    'definition-generation-results.json',
    JSON.stringify({
      processed: wordsToProcess.length,
      successful: allDefinitions.length,
      failed: wordsToProcess.length - allDefinitions.length,
      timestamp: new Date().toISOString(),
      definitions: allDefinitions
    }, null, 2)
  )

  console.log('\n📋 Results saved to definition-generation-results.json')
}

main()
  .then(() => {
    console.log('\n✅ Wave 2 Complete: Definition generation finished!')
    console.log('\n⚠️ Note: This was a TEST RUN with only 50 words.')
    console.log('To process all words, remove the LIMIT variable in the script.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })