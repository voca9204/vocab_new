import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Initialize Firebase Admin
const initAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // Check if running in production (Vercel)
  if (process.env.FIREBASE_ADMIN_PROJECT_ID) {
    // Production: Use environment variables
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin credentials in environment variables')
    }

    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  } else {
    // Development: Use the client SDK configuration
    // This allows local development without service account
    console.warn('Firebase Admin SDK not configured. Using client SDK configuration.')
    
    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vocabulary-app-new',
    })
  }
}

// Initialize admin app
let adminApp: any
try {
  adminApp = initAdmin()
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error)
}

// Export admin services
export const adminDb = adminApp ? getFirestore(adminApp) : null
export const adminAuth = adminApp ? getAuth(adminApp) : null

// Helper function to get admin Firestore instance
export const getAdminFirestore = () => {
  if (!adminDb) {
    throw new Error('Firebase Admin Firestore not initialized')
  }
  return adminDb
}

// Helper function to verify if admin is properly initialized
export const isAdminInitialized = () => {
  return adminApp !== null && adminDb !== null
}