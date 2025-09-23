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

async function cleanupDuplicates() {
  console.log('Cleaning up duplicate and empty collections...\n')

  // Get all TOEFL and TOEIC collections
  const snapshot = await db.collection('vocabulary_collections')
    .where('category', 'in', ['TOEFL', 'TOEIC'])
    .get()

  const collections: any[] = []
  snapshot.forEach((doc: any) => {
    collections.push({
      id: doc.id,
      ...doc.data()
    })
  })

  // Group by category and difficulty
  const grouped = new Map()
  collections.forEach((col: any) => {
    const key = `${col.category}_${col.difficulty}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key).push(col)
  })

  // Process each group
  const toDelete: string[] = []
  grouped.forEach((cols: any[], key: string) => {
    if (cols.length > 1) {
      console.log(`Processing ${key}:`)

      // Find the one with words
      const withWords = cols.filter(c => (c.words || c.wordIds || []).length > 0)
      const withoutWords = cols.filter(c => (c.words || c.wordIds || []).length === 0)

      if (withWords.length === 1) {
        console.log(`  ✅ Keeping: ${withWords[0].id} (${withWords[0].wordCount} words)`)
        withoutWords.forEach((col: any) => {
          console.log(`  ❌ Will delete: ${col.id} (empty)`)
          toDelete.push(col.id)
        })
      } else if (withWords.length > 1) {
        console.log(`  ⚠️ Multiple collections with words - manual review needed`)
        withWords.forEach((col: any) => {
          console.log(`    - ${col.id}: ${col.wordCount} words`)
        })
      } else {
        console.log(`  ⚠️ All collections are empty - keeping the first one`)
        for (let i = 1; i < cols.length; i++) {
          console.log(`  ❌ Will delete: ${cols[i].id} (duplicate empty)`)
          toDelete.push(cols[i].id)
        }
      }
      console.log('')
    }
  })

  // Also delete empty "공식 단어장" collections
  collections.forEach((col: any) => {
    if (col.name.includes('공식 단어장') && (col.words || col.wordIds || []).length === 0) {
      if (!toDelete.includes(col.id)) {
        console.log(`❌ Will delete empty 공식 단어장: ${col.id}`)
        toDelete.push(col.id)
      }
    }
  })

  if (toDelete.length > 0) {
    console.log(`\n🗑️ Deleting ${toDelete.length} empty/duplicate collections...`)

    // Delete in batches
    const batch = db.batch()
    toDelete.forEach((id: string) => {
      batch.delete(db.collection('vocabulary_collections').doc(id))
    })

    await batch.commit()
    console.log('✅ Deletion complete!')
  } else {
    console.log('✅ No duplicates to clean up!')
  }
}

cleanupDuplicates()
  .then(() => {
    console.log('\n✅ Cleanup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })