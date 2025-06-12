/**
 * Firebase Emulator Suite 전용 설정 및 유틸리티
 * 개발 환경에서만 사용되는 함수들
 */

import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

// Emulator 포트 설정 (최종 업데이트된 포트)
export const EMULATOR_PORTS = {
  AUTH: 9199,
  FIRESTORE: 8181,
  FUNCTIONS: 5501,
  HOSTING: 5500,
  STORAGE: 9299,
  UI: 4401, // Hub 포트
} as const

// Emulator 연결 상태 추적
let emulatorsConnected = false

/**
 * Firebase Emulator Suite에 연결
 * 개발 환경에서만 호출되어야 함
 */
export const connectToEmulators = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Emulators should only be used in development mode')
    return
  }

  if (emulatorsConnected) {
    console.log('Emulators already connected')
    return
  }

  try {
    const auth = getAuth()
    const db = getFirestore()
    const functions = getFunctions()
    const storage = getStorage()

    // Auth Emulator 연결
    if (!auth.config.emulator) {
      connectAuthEmulator(auth, `http://localhost:${EMULATOR_PORTS.AUTH}`, {
        disableWarnings: true,
      })
      console.log(`✅ Auth Emulator connected on port ${EMULATOR_PORTS.AUTH}`)
    }

    // Firestore Emulator 연결
    if (!db._delegate._settings?.host?.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', EMULATOR_PORTS.FIRESTORE)
      console.log(`✅ Firestore Emulator connected on port ${EMULATOR_PORTS.FIRESTORE}`)
    }

    // Functions Emulator 연결
    if (!functions.customDomain) {
      connectFunctionsEmulator(functions, 'localhost', EMULATOR_PORTS.FUNCTIONS)
      console.log(`✅ Functions Emulator connected on port ${EMULATOR_PORTS.FUNCTIONS}`)
    }

    // Storage Emulator 연결
    if (!storage._delegate._host?.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', EMULATOR_PORTS.STORAGE)
      console.log(`✅ Storage Emulator connected on port ${EMULATOR_PORTS.STORAGE}`)
    }

    emulatorsConnected = true
    console.log('🎉 All Firebase Emulators connected successfully!')

  } catch (error) {
    console.error('❌ Error connecting to Firebase Emulators:', error)
  }
}

/**
 * 개발 환경에서 Emulator UI URL 생성
 */
export const getEmulatorUIUrl = (): string => {
  return `http://localhost:${EMULATOR_PORTS.UI}`
}

/**
 * 특정 Emulator URL 가져오기
 */
export const getEmulatorUrl = (service: keyof typeof EMULATOR_PORTS): string => {
  const port = EMULATOR_PORTS[service]
  return `http://localhost:${port}`
}

/**
 * Emulator 연결 상태 확인
 */
export const isConnectedToEmulators = (): boolean => {
  return emulatorsConnected && process.env.NODE_ENV === 'development'
}

/**
 * 개발용 테스트 데이터 생성 함수
 */
export const seedEmulatorData = async (): Promise<void> => {
  if (!isConnectedToEmulators()) {
    console.warn('Cannot seed data: Emulators not connected')
    return
  }

  try {
    // 여기에 테스트 데이터 생성 로직 추가
    console.log('🌱 Seeding emulator with test data...')
    
    // 예시: 테스트 사용자 생성
    // 예시: 샘플 SAT 단어 생성
    // 예시: 테스트 뉴스 기사 생성
    
    console.log('✅ Emulator data seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding emulator data:', error)
  }
}

/**
 * Emulator 상태 확인 및 디버깅 정보 출력
 */
export const debugEmulatorStatus = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  console.group('🔧 Firebase Emulator Status')
  console.log(`Connected: ${emulatorsConnected}`)
  console.log(`Auth Port: ${EMULATOR_PORTS.AUTH}`)
  console.log(`Firestore Port: ${EMULATOR_PORTS.FIRESTORE}`)
  console.log(`Functions Port: ${EMULATOR_PORTS.FUNCTIONS}`)
  console.log(`Storage Port: ${EMULATOR_PORTS.STORAGE}`)
  console.log(`UI Port: ${EMULATOR_PORTS.UI}`)
  console.log(`UI URL: ${getEmulatorUIUrl()}`)
  console.groupEnd()
}

// 환경 변수 기반 자동 연결 (개발 환경에서만)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 브라우저 환경에서만 실행
  connectToEmulators()
}
