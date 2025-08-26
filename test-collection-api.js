/**
 * 개인 컬렉션 API 테스트 스크립트
 * Firebase Admin SDK와 개인 컬렉션 생성/조회 테스트
 */

const { initializeApp } = require('firebase/app')
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth')

const firebaseConfig = {
  apiKey: "AIzaSyD-sb3CGC1RGDaLjGwQuI7W2t_UmLp2F6c",
  authDomain: "vocabulary-app-new.firebaseapp.com",
  projectId: "vocabulary-app-new",
  storageBucket: "vocabulary-app-new.firebasestorage.app",
  messagingSenderId: "203198017310",
  appId: "1:203198017310:web:77c88ab17e54e0b8e3630f"
}

// 테스트 계정 정보 (필요시 변경)
const TEST_EMAIL = 'test@test.com'
const TEST_PASSWORD = 'test123456'

async function testCollectionAPI() {
  try {
    console.log('🔥 Firebase 초기화 중...')
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)

    console.log('🔐 테스트 계정으로 로그인 시도 중...')
    let user
    
    try {
      // 먼저 기존 계정으로 로그인 시도
      const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
      user = userCredential.user
      console.log('✅ 기존 계정으로 로그인 성공')
    } catch (loginError) {
      // 로그인 실패시 새 계정 생성
      if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
        console.log('📝 새 테스트 계정 생성 중...')
        const userCredential = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
        user = userCredential.user
        console.log('✅ 새 계정 생성 및 로그인 성공')
      } else {
        throw loginError
      }
    }
    
    console.log('✅ 로그인 성공, 사용자 ID:', user.uid)
    
    // 토큰 획득
    const token = await user.getIdToken()
    console.log('🎫 토큰 획득 완료, 길이:', token.length)
    
    // 1. GET: 개인 컬렉션 목록 조회
    console.log('\n📡 [1] 개인 컬렉션 목록 조회 중...')
    
    const getResponse = await fetch('http://localhost:3100/api/collections/personal', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📡 GET 응답 상태:', getResponse.status, getResponse.statusText)
    
    if (getResponse.ok) {
      const data = await getResponse.json()
      const collections = data.collections || data  // API 응답 구조 대응
      console.log('📄 현재 컬렉션 수:', collections?.length || 0)
      if (collections && collections.length > 0) {
        console.log('📄 첫 번째 컬렉션:', JSON.stringify(collections[0], null, 2))
      }
    } else {
      const error = await getResponse.text()
      console.error('❌ GET 실패:', error)
    }
    
    // 2. POST: 새 개인 컬렉션 생성
    console.log('\n📡 [2] 새 개인 컬렉션 생성 중...')
    
    const testCollection = {
      name: `테스트 컬렉션 ${new Date().toISOString()}`,
      description: 'API 테스트용 컬렉션',
      words: [
        {
          word: 'test',
          definition: '테스트 단어',
          example: 'This is a test word.',
          korean: '시험'
        },
        {
          word: 'example',
          definition: '예시 단어',
          example: 'This is an example.',
          korean: '예시'
        }
      ],
      tags: ['test', 'api'],
      isPrivate: false,
      sourceType: 'api_test'
    }
    
    const postResponse = await fetch('http://localhost:3100/api/collections/personal', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCollection)
    })
    
    console.log('📡 POST 응답 상태:', postResponse.status, postResponse.statusText)
    
    if (postResponse.ok) {
      const newCollection = await postResponse.json()
      console.log('✅ 컬렉션 생성 성공!')
      console.log('📄 생성된 컬렉션:', JSON.stringify(newCollection, null, 2))
      
      // 3. GET by ID: 생성된 컬렉션 상세 조회
      if (newCollection.id) {
        console.log('\n📡 [3] 생성된 컬렉션 상세 조회 중...')
        
        const detailResponse = await fetch(`http://localhost:3100/api/collections/personal?id=${newCollection.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        console.log('📡 Detail GET 응답 상태:', detailResponse.status, detailResponse.statusText)
        
        if (detailResponse.ok) {
          const detail = await detailResponse.json()
          console.log('📄 컬렉션 상세:', JSON.stringify(detail, null, 2))
        } else {
          const error = await detailResponse.text()
          console.error('❌ Detail GET 실패:', error)
        }
      }
    } else {
      const error = await postResponse.text()
      console.error('❌ POST 실패:', error)
    }
    
    // 4. 다시 목록 조회하여 확인
    console.log('\n📡 [4] 업데이트된 컬렉션 목록 확인 중...')
    
    const finalResponse = await fetch('http://localhost:3100/api/collections/personal', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (finalResponse.ok) {
      const finalData = await finalResponse.json()
      const finalCollections = finalData.collections || finalData  // API 응답 구조 대응
      console.log('📄 최종 컬렉션 수:', finalCollections?.length || 0)
      if (finalCollections && Array.isArray(finalCollections)) {
        console.log('📄 컬렉션 이름 목록:', finalCollections.map(c => c.name))
      }
    }
    
    console.log('\n✅ 모든 테스트 완료!')
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message)
    console.error('❌ 스택:', error.stack)
  }
}

// node-fetch 폴리필
if (typeof fetch === 'undefined') {
  globalThis.fetch = require('node-fetch')
}

testCollectionAPI().catch(console.error)