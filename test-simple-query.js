/**
 * 간단한 Firestore 쿼리 테스트
 */

const { initializeApp } = require('firebase/app')
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth')

const firebaseConfig = {
  apiKey: "AIzaSyD-sb3CGC1RGDaLjGwQuI7W2t_UmLp2F6c",
  authDomain: "vocabulary-app-new.firebaseapp.com",
  projectId: "vocabulary-app-new",
  storageBucket: "vocabulary-app-new.firebasestorage.app",
  messagingSenderId: "203198017310",
  appId: "1:203198017310:web:77c88ab17e54e0b8e3630f"
}

async function testSimpleQuery() {
  try {
    console.log('🔥 Firebase 초기화 중...')
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)

    console.log('🔐 로그인 중...')
    const userCredential = await signInWithEmailAndPassword(auth, 'test@test.com', 'test123456')
    const user = userCredential.user
    console.log('✅ 로그인 성공, 사용자 ID:', user.uid)
    
    const token = await user.getIdToken()
    console.log('🎫 토큰 획득 완료')
    
    // 1. 가장 간단한 쿼리 - 정렬 없이
    console.log('\n📡 [테스트 1] 정렬 없는 간단한 쿼리...')
    const response1 = await fetch('http://localhost:3100/api/collections/personal?sortBy=&sortOrder=', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('응답 상태:', response1.status)
    if (!response1.ok) {
      const error = await response1.text()
      console.error('에러:', error)
    } else {
      const data = await response1.json()
      console.log('성공! 컬렉션 수:', data.collections?.length || 0)
    }
    
    // 2. 기본 정렬 쿼리
    console.log('\n📡 [테스트 2] 기본 정렬 쿼리...')
    const response2 = await fetch('http://localhost:3100/api/collections/personal', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('응답 상태:', response2.status)
    if (!response2.ok) {
      const error = await response2.text()
      console.error('에러:', error)
    } else {
      const data = await response2.json()
      console.log('성공! 컬렉션 수:', data.collections?.length || 0)
    }
    
    // 3. limit 없이
    console.log('\n📡 [테스트 3] limit 없는 쿼리...')
    const response3 = await fetch('http://localhost:3100/api/collections/personal?limit=0', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('응답 상태:', response3.status)
    if (!response3.ok) {
      const error = await response3.text()
      console.error('에러:', error)
    } else {
      const data = await response3.json()
      console.log('성공! 컬렉션 수:', data.collections?.length || 0)
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message)
  }
}

if (typeof fetch === 'undefined') {
  globalThis.fetch = require('node-fetch')
}

testSimpleQuery().catch(console.error)