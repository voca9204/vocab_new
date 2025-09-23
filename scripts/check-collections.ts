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

async function checkCollections() {
  console.log('Checking TOEFL and TOEIC collections...\n')

  // Query all collections with TOEFL or TOEIC in the name
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

  // Sort by category and order
  collections.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category)
    }
    return (a.order || 0) - (b.order || 0)
  })

  // Display results
  collections.forEach((col: any) => {
    const wordCount = col.wordCount || 0
    const actualWords = (col.words || col.wordIds || []).length
    console.log(`${col.category} ${col.name}:`)
    console.log(`  ID: ${col.id}`)
    console.log(`  Word Count: ${wordCount} (Actual: ${actualWords})`)
    console.log(`  Difficulty: ${col.difficulty}`)
    console.log(`  Order: ${col.order}`)
    console.log(`  Has Words: ${actualWords > 0 ? 'Yes' : 'No'}`)
    console.log('')
  })

  // Also check if there are any duplicate collections
  const nameMap = new Map()
  collections.forEach((col: any) => {
    const key = `${col.category}_${col.difficulty}`
    if (!nameMap.has(key)) {
      nameMap.set(key, [])
    }
    nameMap.get(key).push(col)
  })

  console.log('\n--- Duplicate Check ---')
  nameMap.forEach((cols: any[], key: string) => {
    if (cols.length > 1) {
      console.log(`⚠️ Duplicate collections for ${key}:`)
      cols.forEach((col: any) => {
        console.log(`  - ${col.id}: ${col.name} (${col.wordCount} words)`)
      })
    }
  })
}

checkCollections()
  .then(() => {
    console.log('\n✅ Check complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })