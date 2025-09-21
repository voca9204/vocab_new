#!/usr/bin/env tsx
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

async function deleteExistingCollection() {
  console.log('🗑️ Deleting existing SAT Vocabulary II collection...\n')
  
  // Find the collection
  const collectionsSnapshot = await db.collection('vocabulary_collections')
    .where('name', '==', 'SAT Vocabulary II')
    .get()
  
  if (collectionsSnapshot.empty) {
    console.log('ℹ️ No existing collection found')
    return
  }
  
  const batch = db.batch()
  let deletedWords = 0
  
  for (const doc of collectionsSnapshot.docs) {
    const data = doc.data()
    console.log(`📁 Found collection: ${doc.id}`)
    console.log(`📚 Words to delete: ${data.wordIds?.length || 0}`)
    
    // Delete all words from words_v3
    if (data.wordIds && Array.isArray(data.wordIds)) {
      for (const wordId of data.wordIds) {
        batch.delete(db.collection('words_v3').doc(wordId))
        deletedWords++
      }
    }
    
    // Delete the collection document
    batch.delete(db.collection('vocabulary_collections').doc(doc.id))
  }
  
  console.log(`🗑️ Deleting ${deletedWords} words and ${collectionsSnapshot.size} collection(s)...`)
  await batch.commit()
  
  console.log('✅ Deletion completed!')
}

deleteExistingCollection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deletion failed:', error)
    process.exit(1)
  })
