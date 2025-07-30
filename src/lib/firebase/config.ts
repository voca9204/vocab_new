import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

// 환경 변수 로깅 (디버깅용)
console.log('🔍 Environment Variables Check:')
console.log('API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'MISSING')
console.log('AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'MISSING')
console.log('PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'MISSING')

// Firebase 설정 객체
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'demo-app-id',
}

console.log('🔥 Firebase Config:', firebaseConfig)

// Firebase 앱 초기화 (중복 초기화 방지)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Firebase 서비스 초기화
const auth = getAuth(app)
const db = getFirestore(app)
const functions = getFunctions(app)
const storage = getStorage(app)

// 개발 환경에서 Emulator 연결 (Firebase SDK v11 호환)
const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'

if (useEmulator) {
  try {
    // Auth Emulator 연결
    connectAuthEmulator(auth, 'http://localhost:9199', { disableWarnings: true })
    console.log('🔐 Auth Emulator connected on port 9199')
  } catch (error: any) {
    // 이미 연결된 경우 에러 무시
    if (!error.message?.includes('already connected')) {
      console.warn('Auth emulator connection warning:', error.message)
    }
  }

  try {
    // Firestore Emulator 연결
    connectFirestoreEmulator(db, 'localhost', 8181)
    console.log('🗃️ Firestore Emulator connected on port 8181')
  } catch (error: any) {
    // 이미 연결된 경우 에러 무시
    if (!error.message?.includes('already connected')) {
      console.warn('Firestore emulator connection warning:', error.message)
    }
  }

  try {
    // Functions Emulator 연결
    connectFunctionsEmulator(functions, 'localhost', 5501)
    console.log('⚡ Functions Emulator connected on port 5501')
  } catch (error: any) {
    // 이미 연결된 경우 에러 무시
    if (!error.message?.includes('already connected')) {
      console.warn('Functions emulator connection warning:', error.message)
    }
  }

  try {
    // Storage Emulator 연결
    connectStorageEmulator(storage, 'localhost', 9299)
    console.log('💾 Storage Emulator connected on port 9299')
  } catch (error: any) {
    // 이미 연결된 경우 에러 무시
    if (!error.message?.includes('already connected')) {
      console.warn('Storage emulator connection warning:', error.message)
    }
  }
}

export { app, auth, db, functions, storage }
export default app