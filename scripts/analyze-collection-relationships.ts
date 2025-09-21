#!/usr/bin/env tsx
/**
 * Analyze Collection Relationships
 * Understand how words_v3 relates to collections through collectionIds
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'vocabulary-app-new',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  })
}

const db = admin.firestore()

async function analyzeCollectionRelationships() {
  console.log('🔗 Analyzing Collection Relationships\n')
  console.log('=' .repeat(60))
  
  // 1. Sample words_v3 documents to understand structure
  console.log('📊 Step 1: Analyzing words_v3 structure...')
  const wordsV3Sample = await db.collection('words_v3').limit(5).get()
  
  console.log(`   Sample words_v3 documents (${wordsV3Sample.size} of ${(await db.collection('words_v3').get()).size}):`)
  
  wordsV3Sample.forEach((doc, index) => {
    const data = doc.data()
    console.log(`\n   📝 Sample ${index + 1}: "${data.word}"`)
    console.log(`      ID: ${doc.id}`)
    console.log(`      collectionIds: ${data.collectionIds ? `[${data.collectionIds.join(', ')}]` : 'undefined'}`)
    console.log(`      source: ${data.source ? JSON.stringify(data.source, null, 8).replace(/\n/g, '\n      ') : 'undefined'}`)
    
    // Show other key fields
    const otherFields = ['korean', 'difficulty', 'frequency', 'partOfSpeech', 'examples']
    otherFields.forEach(field => {
      if (data[field] !== undefined) {
        const value = Array.isArray(data[field]) 
          ? `[${data[field].slice(0, 2).join(', ')}${data[field].length > 2 ? '...' : ''}]`
          : typeof data[field] === 'string' 
            ? `"${data[field].substring(0, 50)}${data[field].length > 50 ? '...' : ''}"`
            : data[field]
        console.log(`      ${field}: ${value}`)
      }
    })
  })
  
  // 2. Analyze vocabulary_collections
  console.log(`\n\n📚 Step 2: Analyzing vocabulary_collections...`)
  const vocabCollections = await db.collection('vocabulary_collections').get()
  
  console.log(`   Found ${vocabCollections.size} official collections:`)
  
  const collectionAnalysis: {
    id: string
    name: string
    wordIds: string[]
    wordCount: number
    hasCollectionIds: boolean
  }[] = []
  
  vocabCollections.forEach(doc => {
    const data = doc.data()
    collectionAnalysis.push({
      id: doc.id,
      name: data.name,
      wordIds: data.wordIds || data.words || [],
      wordCount: data.wordCount || 0,
      hasCollectionIds: !!(data.wordIds || data.words)
    })
    
    console.log(`\n   📚 "${data.name}" (${doc.id})`)
    console.log(`      Type: ${data.type || 'official'}`)
    console.log(`      Category: ${data.category || 'N/A'}`)
    console.log(`      Word Count: ${data.wordCount || 0}`)
    console.log(`      Word IDs: ${data.wordIds ? data.wordIds.length : data.words ? data.words.length : 0} references`)
    console.log(`      Created: ${data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : 'N/A'}`)
  })
  
  // 3. Analyze personal_collections
  console.log(`\n\n👤 Step 3: Analyzing personal_collections...`)
  const personalCollections = await db.collection('personal_collections').limit(5).get()
  
  console.log(`   Sample personal collections (${personalCollections.size} of ${(await db.collection('personal_collections').get()).size}):`)
  
  personalCollections.forEach(doc => {
    const data = doc.data()
    console.log(`\n   👤 "${data.name}" (${doc.id})`)
    console.log(`      User ID: ${data.userId || data.createdBy || 'N/A'}`)
    console.log(`      Type: ${data.type || 'personal'}`)
    console.log(`      Public: ${data.isPublic || false}`)
    console.log(`      Word Count: ${data.wordCount || 0}`)
    console.log(`      Word IDs: ${data.wordIds ? data.wordIds.length : data.words ? data.words.length : 0} references`)
  })
  
  // 4. Check relationship consistency
  console.log(`\n\n🔍 Step 4: Checking relationship consistency...`)
  
  // Track overall statistics
  let totalFoundInWords = 0
  let totalHasCollectionReference = 0
  
  // Pick a collection and check if its words exist in words_v3
  if (collectionAnalysis.length > 0) {
    const testCollection = collectionAnalysis[0]
    console.log(`\n   Testing collection: "${testCollection.name}"`)
    
    if (testCollection.wordIds.length > 0) {
      const sampleWordIds = testCollection.wordIds.slice(0, 5)
      console.log(`   Checking ${sampleWordIds.length} sample word references...`)
      
      let foundInWords = 0
      let hasCollectionReference = 0
      
      for (const wordId of sampleWordIds) {
        try {
          const wordDoc = await db.collection('words_v3').doc(wordId).get()
          if (wordDoc.exists) {
            foundInWords++
            const wordData = wordDoc.data()!
            if (wordData.collectionIds && wordData.collectionIds.includes(testCollection.id)) {
              hasCollectionReference++
            }
          }
        } catch (error) {
          console.log(`     ❌ Error checking word ${wordId}: ${error}`)
        }
      }
      
      totalFoundInWords = foundInWords
      totalHasCollectionReference = hasCollectionReference
      
      console.log(`     ✅ Found in words_v3: ${foundInWords}/${sampleWordIds.length}`)
      console.log(`     🔗 Has collection reference: ${hasCollectionReference}/${foundInWords}`)
      
      if (foundInWords < sampleWordIds.length) {
        console.log(`     ⚠️  Some word references are broken`)
      }
      
      if (hasCollectionReference < foundInWords) {
        console.log(`     ⚠️  Some words lack bidirectional collection reference`)
      }
    }
  }
  
  // 5. Check reverse relationships (words_v3 -> collections)
  console.log(`\n\n🔄 Step 5: Checking reverse relationships...`)
  
  const wordsWithCollections = await db.collection('words_v3')
    .where('collectionIds', '!=', null)
    .limit(10)
    .get()
  
  console.log(`   Found ${wordsWithCollections.size} words with collection references:`)
  
  const collectionReferenceCount: Record<string, number> = {}
  
  wordsWithCollections.forEach(doc => {
    const data = doc.data()
    const collectionIds = data.collectionIds || []
    
    console.log(`     📝 "${data.word}": collections [${collectionIds.join(', ')}]`)
    
    collectionIds.forEach((collectionId: string) => {
      collectionReferenceCount[collectionId] = (collectionReferenceCount[collectionId] || 0) + 1
    })
  })
  
  console.log(`\n   Collection reference counts:`)
  Object.entries(collectionReferenceCount).forEach(([collectionId, count]) => {
    console.log(`     ${collectionId}: ${count} words`)
  })
  
  // 6. Summary and recommendations
  console.log('\n' + '=' .repeat(60))
  console.log('📊 RELATIONSHIP ANALYSIS SUMMARY')
  console.log('=' .repeat(60))
  
  console.log(`\n✅ Collection Statistics:`)
  console.log(`   Official collections: ${vocabCollections.size}`)
  console.log(`   Personal collections: ${(await db.collection('personal_collections').get()).size}`)
  console.log(`   Words with collection refs: ${wordsWithCollections.size}+ (sample)`)
  
  console.log(`\n🏗️ Relationship Model:`)
  console.log(`   Collection → Words: wordIds array (references to words_v3)`)
  console.log(`   Words → Collections: collectionIds array (reverse references)`)
  console.log(`   Bidirectional: ${totalHasCollectionReference > 0 ? '✅ Present' : '❌ Missing'}`)
  
  console.log(`\n📋 Data Flow:`)
  console.log(`   1. Collections store metadata and word references`)
  console.log(`   2. words_v3 stores actual word data with collection tags`)
  console.log(`   3. User access controlled through collection ownership`)
  console.log(`   4. Search optimized through collection-specific queries`)
  
  console.log('\n✨ Analysis Complete!')
}

analyzeCollectionRelationships()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })