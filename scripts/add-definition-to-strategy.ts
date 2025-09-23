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

async function updateStrategy() {
  console.log('Updating "strategy" word definition...\n')

  const wordRef = db.collection('words_v3').doc('LMRwOcHOcrelMEl8GB4N')

  await wordRef.update({
    definition: 'A plan of action designed to achieve a long-term or overall aim',
    definitions: [
      'A plan of action designed to achieve a long-term or overall aim',
      'The art of planning and directing overall military operations and movements in a war or battle',
      'A plan for achieving success in a particular area or field'
    ],
    partOfSpeech: ['noun'],
    examples: [
      'The company needs to develop a new marketing strategy.',
      'Their strategy was to wait until the enemy was weak.',
      'We need a clear strategy for economic recovery.'
    ],
    synonyms: ['plan', 'tactic', 'approach', 'method', 'scheme', 'policy'],
    antonyms: ['improvisation', 'spontaneity'],
    etymology: 'From Greek strategia "office or command of a general," from strategos "general, commander of an army," from stratos "army" + agein "to lead"',
    pronunciation: '/ˈstrætədʒi/',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  console.log('✅ Updated "strategy" with full definition!')
}

updateStrategy()
  .then(() => {
    console.log('\n✅ Update complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })