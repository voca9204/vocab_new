/**
 * 컬렉션 삭제 테스트
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

async function testDeleteCollection() {
  try {
    console.log('🔥 Firebase 초기화 중...')
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)

    console.log('🔐 로그인 중...')
    const userCredential = await signInWithEmailAndPassword(auth, 'test@test.com', 'test123456')
    const user = userCredential.user
    console.log('✅ 로그인 성공')
    
    const token = await user.getIdToken()
    
    // 1. 현재 컬렉션 목록 조회
    console.log('\n📡 [1] 현재 컬렉션 목록...')
    const listResponse = await fetch('http://localhost:3100/api/collections/personal', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
    
    const listData = await listResponse.json()
    const collections = listData.collections || []
    console.log('현재 컬렉션 수:', collections.length)
    
    if (collections.length === 0) {
      console.log('삭제할 컬렉션이 없습니다')
      return
    }
    
    // 마지막 컬렉션 삭제 테스트
    const targetCollection = collections[collections.length - 1]
    console.log('\n🗑️ 삭제할 컬렉션:', {
      id: targetCollection.id,
      name: targetCollection.name,
      wordCount: targetCollection.wordCount
    })
    
    // 2. DELETE 요청
    console.log('\n📡 [2] DELETE 요청 전송...')
    const deleteResponse = await fetch(`http://localhost:3100/api/collections/personal/${targetCollection.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
    
    console.log('DELETE 응답 상태:', deleteResponse.status)
    
    if (deleteResponse.ok) {
      const deleteData = await deleteResponse.json()
      console.log('✅ 삭제 성공:', deleteData)
    } else {
      const error = await deleteResponse.text()
      console.error('❌ 삭제 실패:', error)
    }
    
    // 3. 삭제 후 목록 재확인
    console.log('\n📡 [3] 삭제 후 컬렉션 목록...')
    const finalResponse = await fetch('http://localhost:3100/api/collections/personal', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
    
    const finalData = await finalResponse.json()
    const finalCollections = finalData.collections || []
    console.log('남은 컬렉션 수:', finalCollections.length)
    console.log('남은 컬렉션들:', finalCollections.map(c => c.name))
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message)
  }
}

if (typeof fetch === 'undefined') {
  globalThis.fetch = require('node-fetch')
}

testDeleteCollection().catch(console.error)