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

async function investigateUnknownCategory() {
  console.log('🔍 Investigating Unknown Category Discrepancy...\n')

  // Step 1: Get A학원 collection details
  console.log('📚 Step 1: Checking A학원 collection...')
  const academyCollections = await db.collection('vocabulary_collections')
    .where('category', '==', '학원')
    .get()

  let academyWordIds: string[] = []

  academyCollections.forEach((doc: any) => {
    const data = doc.data()
    console.log(`   Found: ${data.name} (${data.displayName || data.name})`)
    console.log(`   Word Count: ${data.wordCount}`)
    console.log(`   Word IDs Length: ${(data.wordIds || []).length}`)
    academyWordIds = data.wordIds || []
  })

  console.log(`\n📊 Total A학원 word IDs: ${academyWordIds.length}\n`)

  // Step 2: Get all Unknown category words
  console.log('🔍 Step 2: Fetching all Unknown category words...')
  const unknownWords = await db.collection('words_v3')
    .where('category', '==', 'Unknown')
    .get()

  console.log(`   Found ${unknownWords.size} words with category='Unknown'\n`)

  // Step 3: Analyze Unknown words
  console.log('📊 Step 3: Analyzing Unknown words...')
  const unknownWordData: any[] = []
  const unknownWordIds = new Set<string>()
  const sourceBreakdown: Record<string, number> = {}
  const hasDefinitionCount = { withDef: 0, withoutDef: 0 }

  unknownWords.forEach((doc: any) => {
    const data = doc.data()
    unknownWordIds.add(doc.id)

    // Track source
    const source = data.source || 'no_source'
    sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1

    // Track definition status
    if (data.definition && data.definition !== '' && data.definition !== 'No definition available') {
      hasDefinitionCount.withDef++
    } else {
      hasDefinitionCount.withoutDef++
    }

    // Store sample data
    if (unknownWordData.length < 10) {
      unknownWordData.push({
        id: doc.id,
        word: data.word,
        source: data.source,
        hasDefinition: !!(data.definition && data.definition !== '' && data.definition !== 'No definition available'),
        createdAt: data.createdAt
      })
    }
  })

  console.log('   Source Breakdown:')
  Object.entries(sourceBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`     - ${source}: ${count} words`)
    })

  console.log(`\n   Definition Status:`)
  console.log(`     - With definitions: ${hasDefinitionCount.withDef}`)
  console.log(`     - Without definitions: ${hasDefinitionCount.withoutDef}`)

  // Step 4: Compare with A학원 collection
  console.log('\n🔄 Step 4: Comparing Unknown words with A학원 collection...')
  const academyIdSet = new Set(academyWordIds)
  let inBoth = 0
  let onlyInUnknown = 0
  let onlyInAcademy = 0

  unknownWordIds.forEach(id => {
    if (academyIdSet.has(id)) {
      inBoth++
    } else {
      onlyInUnknown++
    }
  })

  academyIdSet.forEach(id => {
    if (!unknownWordIds.has(id)) {
      onlyInAcademy++
    }
  })

  console.log(`   - Words in both Unknown and A학원: ${inBoth}`)
  console.log(`   - Words only in Unknown: ${onlyInUnknown}`)
  console.log(`   - Words only in A학원: ${onlyInAcademy}`)

  // Step 5: Check actual category of A학원 word IDs
  if (onlyInAcademy > 0) {
    console.log('\n🔍 Step 5: Checking actual categories of A학원 word IDs...')
    const academyIdArray = Array.from(academyIdSet)
    const batchSize = 30
    const categoryBreakdown: Record<string, number> = {}

    for (let i = 0; i < academyIdArray.length; i += batchSize) {
      const batch = academyIdArray.slice(i, i + batchSize)
      const batchDocs = await db.collection('words_v3')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
        .get()

      batchDocs.forEach((doc: any) => {
        const data = doc.data()
        const category = data.category || 'no_category'
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1
      })
    }

    console.log('   A학원 words actual category breakdown:')
    Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`     - ${category}: ${count} words`)
      })
  }

  // Step 6: Sample of Unknown words
  console.log('\n📝 Step 6: Sample of Unknown category words:')
  unknownWordData.forEach(word => {
    console.log(`   - ${word.word} (ID: ${word.id})`)
    console.log(`     Source: ${word.source}, Has Definition: ${word.hasDefinition}`)
  })

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`A학원 Collection: ${academyWordIds.length} word IDs`)
  console.log(`Unknown Category: ${unknownWords.size} words`)
  console.log(`Overlap: ${inBoth} words appear in both`)
  console.log(`Discrepancy: ${onlyInUnknown} words are Unknown but not in A학원`)

  if (onlyInUnknown > 0) {
    console.log('\n💡 INSIGHT: The Unknown category contains words from multiple sources,')
    console.log('   not just A학원. This explains why there are 3,141 Unknown words')
    console.log('   while A학원 collection only has 1,821 word references.')
  }
}

investigateUnknownCategory()
  .then(() => {
    console.log('\n✅ Investigation complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })