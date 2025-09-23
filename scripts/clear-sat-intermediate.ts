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

async function clearSATIntermediate() {
  console.log('🔍 Finding SAT intermediate collection...\n')

  try {
    // Find SAT intermediate collection
    const snapshot = await db.collection('vocabulary_collections')
      .where('category', '==', 'SAT')
      .where('difficulty', '==', 'intermediate')
      .get()

    if (snapshot.empty) {
      console.log('❌ No SAT intermediate collection found')
      return
    }

    // Process each matching document (should be only one)
    for (const doc of snapshot.docs) {
      const data = doc.data()
      console.log(`📚 Found: ${data.name} (${doc.id})`)
      console.log(`   - Current word count: ${data.wordCount || 0}`)
      console.log(`   - Current wordIds length: ${(data.wordIds || []).length}`)

      // Clear the word IDs
      await doc.ref.update({
        wordIds: [],
        wordCount: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      console.log(`✅ Cleared word IDs from ${data.name}`)
    }

    // Verify the update
    console.log('\n🔍 Verifying update...')
    const verifySnapshot = await db.collection('vocabulary_collections')
      .where('category', '==', 'SAT')
      .where('difficulty', '==', 'intermediate')
      .get()

    for (const doc of verifySnapshot.docs) {
      const data = doc.data()
      console.log(`📚 ${data.name} (${doc.id})`)
      console.log(`   - Word count: ${data.wordCount || 0}`)
      console.log(`   - WordIds length: ${(data.wordIds || []).length}`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

clearSATIntermediate()
  .then(() => {
    console.log('\n✅ Successfully cleared SAT intermediate word IDs!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })