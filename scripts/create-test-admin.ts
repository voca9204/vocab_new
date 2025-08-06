import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

const auth = getAuth(app)
const firestore = getFirestore(app)

async function createTestAdmin() {
  const testEmail = 'admin@test.com'
  const testPassword = 'test123456'
  
  try {
    // Try to delete existing user first
    try {
      const existingUser = await auth.getUserByEmail(testEmail)
      await auth.deleteUser(existingUser.uid)
      console.log('Deleted existing test user')
    } catch (error) {
      // User doesn't exist, which is fine
    }

    // Create new user
    const userRecord = await auth.createUser({
      email: testEmail,
      password: testPassword,
      displayName: 'Test Admin',
      emailVerified: true,
    })

    console.log('Successfully created test admin user:', userRecord.uid)

    // Set custom claims for admin
    await auth.setCustomUserClaims(userRecord.uid, { admin: true })
    console.log('Set admin claims for user')

    // Create user profile in Firestore
    await firestore.collection('users').doc(userRecord.uid).set({
      email: testEmail,
      displayName: 'Test Admin',
      role: 'admin',
      isTestAccount: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        theme: 'light',
        fontSize: 'medium',
        selectedVocabularies: ['vocabulary', 'veterans_vocabulary'],
      }
    })

    console.log('Created Firestore user profile')

    // Add some test progress data
    await firestore.collection('users').doc(userRecord.uid).collection('progress').doc('sample').set({
      wordId: 'sample-word-id',
      studied: true,
      masteryLevel: 75,
      reviewCount: 3,
      lastStudied: new Date(),
    })

    console.log('Added sample progress data')

    console.log('\n✅ Test admin account created successfully!')
    console.log('Email:', testEmail)
    console.log('Password:', testPassword)
    console.log('UID:', userRecord.uid)
    
  } catch (error) {
    console.error('Error creating test admin:', error)
  }

  process.exit(0)
}

// Run the script
createTestAdmin()