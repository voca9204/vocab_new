#!/usr/bin/env tsx
/**
 * Debug script to check SAT Vocabulary II collection
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Initialize Firebase Admin
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

async function checkCollection() {
  console.log('🔍 Checking SAT Vocabulary II collection...\n')
  
  // Find SAT Vocabulary II collection
  const collectionsSnapshot = await db.collection('vocabulary_collections')
    .where('name', '==', 'SAT Vocabulary II')
    .get()
  
  if (collectionsSnapshot.empty) {
    console.log('❌ SAT Vocabulary II collection not found')
    return
  }
  
  for (const doc of collectionsSnapshot.docs) {
    const collection = doc.data()
    console.log('📚 Found collection:')
    console.log(`  - ID: ${doc.id}`)
    console.log(`  - Name: ${collection.name}`)
    console.log(`  - Word Count: ${collection.wordCount}`)
    console.log(`  - Word IDs: ${collection.wordIds?.length || 0}`)
    
    if (collection.wordIds && collection.wordIds.length > 0) {
      console.log('\n📝 Sample word IDs:')
      collection.wordIds.slice(0, 5).forEach((id: string) => {
        console.log(`  - ${id}`)
      })
      
      // Check if words exist in words_v3
      console.log('\n🔍 Checking if words exist in words_v3...')
      const sampleId = collection.wordIds[0]
      const wordDoc = await db.collection('words_v3').doc(sampleId).get()
      
      if (wordDoc.exists) {
        console.log('✅ Word found in words_v3:')
        const wordData = wordDoc.data()
        console.log(`  - Word: ${wordData?.word}`)
        console.log(`  - Korean: ${wordData?.korean}`)
        console.log(`  - Collection IDs: ${wordData?.collectionIds}`)
      } else {
        console.log('❌ Word NOT found in words_v3')
        
        // Check if it exists in words collection instead
        const oldWordDoc = await db.collection('words').doc(sampleId).get()
        if (oldWordDoc.exists) {
          console.log('⚠️ Word found in OLD words collection - wrong location!')
        }
      }
      
      // Check by querying words_v3 with collectionIds
      console.log('\n🔍 Checking words_v3 by collectionIds...')
      const wordsWithCollection = await db.collection('words_v3')
        .where('collectionIds', 'array-contains', doc.id)
        .limit(5)
        .get()
      
      console.log(`  - Found ${wordsWithCollection.size} words with this collection ID`)
      
      if (wordsWithCollection.size > 0) {
        console.log('  - Sample words:')
        wordsWithCollection.forEach(wordDoc => {
          const word = wordDoc.data()
          console.log(`    • ${word.word} (${word.korean})`)
        })
      }
    }
  }
}

checkCollection()
  .then(() => {
    console.log('\n✅ Check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })