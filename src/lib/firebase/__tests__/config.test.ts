/**
 * Firebase 설정 및 연결 테스트
 * Emulator 환경에서 실행되어야 함
 */

import { auth, db } from '../config'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { FIREBASE_COLLECTIONS } from '@/lib/constants'

// Mock 환경 변수 설정
const mockEnvVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'test-app-id',
}

describe('Firebase Configuration', () => {
  beforeEach(() => {
    // 환경 변수 mock 설정
    Object.entries(mockEnvVars).forEach(([key, value]) => {
      process.env[key] = value
    })
  })

  afterEach(() => {
    // 환경 변수 정리
    Object.keys(mockEnvVars).forEach(key => {
      delete process.env[key]
    })
  })

  describe('Firebase Services Initialization', () => {
    it('should initialize Firebase Auth', () => {
      expect(auth).toBeDefined()
      expect(auth.app).toBeDefined()
    })

    it('should initialize Firestore', () => {
      expect(db).toBeDefined()
      expect(db.app).toBeDefined()
    })

    it('should have correct project configuration', () => {
      // 현재 설정된 값을 확인 (환경에 따라 demo 또는 실제 값)
      expect(auth.app.options.projectId).toBeDefined()
      expect(auth.app.options.apiKey).toBeDefined()
      
      // 기본 demo 설정이거나 실제 환경 설정이어야 함
      const projectId = auth.app.options.projectId
      const validProjectIds = ['demo-project', 'test-project', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID]
      expect(validProjectIds.includes(projectId)).toBe(true)
    })
  })

  describe('Firestore Collections', () => {
    it('should be able to reference collections', () => {
      const vocabularyRef = collection(db, FIREBASE_COLLECTIONS.VOCABULARY)
      const usersRef = collection(db, FIREBASE_COLLECTIONS.USERS)
      const progressRef = collection(db, FIREBASE_COLLECTIONS.PROGRESS)
      const newsRef = collection(db, FIREBASE_COLLECTIONS.NEWS)

      expect(vocabularyRef).toBeDefined()
      expect(usersRef).toBeDefined()
      expect(progressRef).toBeDefined()
      expect(newsRef).toBeDefined()
    })
  })

  // 실제 Emulator 연결 테스트 (Emulator가 실행 중일 때만)
  describe('Emulator Connection Tests', () => {
    // 이 테스트들은 실제 Emulator가 실행 중일 때만 통과합니다
    it.skip('should connect to Firestore emulator', async () => {
      const testCollection = collection(db, 'test')
      
      // 테스트 문서 추가
      const docRef = await addDoc(testCollection, {
        test: true,
        timestamp: new Date(),
      })

      expect(docRef.id).toBeDefined()

      // 문서 읽기 테스트
      const snapshot = await getDocs(testCollection)
      expect(snapshot.docs.length).toBeGreaterThan(0)
    })

    it.skip('should handle Auth emulator', () => {
      // Auth Emulator 연결 테스트
      expect(auth.config.emulator).toBeDefined()
    })
  })
})

// Constants 테스트
describe('Firebase Constants', () => {
  it('should have all required collection names', () => {
    expect(FIREBASE_COLLECTIONS.USERS).toBe('users')
    expect(FIREBASE_COLLECTIONS.VOCABULARY).toBe('vocabulary')
    expect(FIREBASE_COLLECTIONS.PROGRESS).toBe('progress')
    expect(FIREBASE_COLLECTIONS.NEWS).toBe('news')
    expect(FIREBASE_COLLECTIONS.ANALYTICS).toBe('analytics')
  })
})
