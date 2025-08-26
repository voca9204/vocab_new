import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getStorage, Storage } from 'firebase-admin/storage'

let app: App | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let storage: Storage | null = null

// Initialize Firebase Admin
const initAdmin = () => {
  // Return existing app if already initialized
  if (app) {
    return app
  }

  // Check if any apps exist
  if (getApps().length > 0) {
    app = getApps()[0]
    return app
  }

  try {
    // Check if running in production (Vercel)
    if (process.env.FIREBASE_ADMIN_PROJECT_ID && 
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
        process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      
      // Production: Use environment variables
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')

      console.log('Initializing Firebase Admin with service account')
      console.log('Admin Config Check:', {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
        privateKeyLength: privateKey?.length || 0,
        privateKeyStart: privateKey?.substring(0, 50) || 'NO_KEY'
      })
      
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'vocabulary-app-new.firebasestorage.app',
      })
      
      return app
    } else {
      // Development: Use default credentials or emulator
      console.log('🔧 [Firebase Admin] Development mode - using emulator')
      
      // For local development with emulator
      if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
        console.log('🎯 [Firebase Admin] Emulator 모드 활성화')
        process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8181'
        process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9199'
        
        // For debugging
        console.log('🔧 [Firebase Admin] Emulator 환경변수 설정:', {
          FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
          FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST
        })
      }
      
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vocabulary-app-new',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'vocabulary-app-new.firebasestorage.app',
      })
      
      console.log('✅ [Firebase Admin] 개발 모드 초기화 완료')
      return app
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error)
    return null
  }
}

// Helper function to get admin Firestore instance
export const getAdminFirestore = (): Firestore => {
  if (!db) {
    const adminApp = initAdmin()
    if (!adminApp) {
      throw new Error('Failed to initialize Firebase Admin')
    }
    db = getFirestore(adminApp)
  }
  return db
}

// Helper function to get admin Auth instance
export const getAdminAuth = (): Auth => {
  if (!auth) {
    const adminApp = initAdmin()
    if (!adminApp) {
      throw new Error('Failed to initialize Firebase Admin')
    }
    auth = getAuth(adminApp)
  }
  return auth
}

// Helper function to get admin Storage instance
export const getAdminStorage = (): Storage => {
  if (!storage) {
    const adminApp = initAdmin()
    if (!adminApp) {
      throw new Error('Failed to initialize Firebase Admin')
    }
    storage = getStorage(adminApp)
  }
  return storage
}

// Helper function to verify if admin is properly initialized
export const isAdminInitialized = (): boolean => {
  try {
    const adminApp = initAdmin()
    return adminApp !== null
  } catch (error) {
    console.error('Admin initialization check failed:', error)
    return false
  }
}

// Export for backward compatibility
export const adminDb = getAdminFirestore()
export const adminAuth = null // Will be initialized on first use