/**
 * 인증된 API 테스트 스크립트
 * Firebase Admin과 개인 컬렉션 API 테스트
 */

// Firebase Client SDK로 토큰 생성
const { initializeApp } = require('firebase/app')
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth')

const firebaseConfig = {
  apiKey: "AIzaSyD-sb3CGC1RGDaLjGwQuI7W2t_UmLp2F6c",
  authDomain: "vocabulary-app-new.firebaseapp.com",
  projectId: "vocabulary-app-new",
  storageBucket: "vocabulary-app-new.firebasestorage.app",
  messagingSenderId: "203198017310",
  appId: "1:203198017310:web:d6dc8bb2c54f8a08deb7db"
}

async function testAuthenticatedAPI() {
  try {
    console.log('🔥 Firebase 초기화 중...')
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)

    // 테스트 사용자로 로그인 (실제 사용자 계정 필요)
    console.log('🔐 테스트 사용자로 로그인 중...')
    
    // 임시로 익명 로그인 시도
    const { signInAnonymously } = require('firebase/auth')
    const userCredential = await signInAnonymously(auth)
    const user = userCredential.user
    
    console.log('✅ 로그인 성공, 사용자 ID:', user.uid)
    
    // 토큰 획득
    const token = await user.getIdToken()
    console.log('🎫 토큰 획득 완료, 길이:', token.length)
    
    // API 테스트
    console.log('📡 개인 컬렉션 API 테스트 중...')
    
    const response = await fetch('http://localhost:3100/api/collections/personal', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📡 API 응답 상태:', response.status, response.statusText)
    
    const data = await response.json()
    console.log('📄 API 응답 데이터:', JSON.stringify(data, null, 2))
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message)
    console.error('❌ 스택:', error.stack)
  }
}

// node-fetch 폴리필
if (typeof fetch === 'undefined') {
  globalThis.fetch = require('node-fetch')
}

testAuthenticatedAPI().catch(console.error)