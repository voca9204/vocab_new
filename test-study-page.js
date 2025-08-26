/**
 * 개인 컬렉션 학습 페이지 테스트
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

async function testStudyPage() {
  try {
    console.log('🔥 Firebase 초기화 중...')
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)

    console.log('🔐 로그인 중...')
    const userCredential = await signInWithEmailAndPassword(auth, 'test@test.com', 'test123456')
    const user = userCredential.user
    console.log('✅ 로그인 성공, 사용자 ID:', user.uid)
    
    const token = await user.getIdToken()
    
    // 1. 먼저 컬렉션 목록 조회
    console.log('\n📡 [1] 컬렉션 목록 조회...')
    const listResponse = await fetch('http://localhost:3100/api/collections/personal', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
    
    if (!listResponse.ok) {
      console.error('컬렉션 목록 조회 실패')
      return
    }
    
    const listData = await listResponse.json()
    const collections = listData.collections || []
    
    if (collections.length === 0) {
      console.log('테스트할 컬렉션이 없습니다')
      return
    }
    
    const testCollection = collections[0]
    console.log('📚 테스트할 컬렉션:', {
      id: testCollection.id,
      name: testCollection.name,
      wordCount: testCollection.wordCount
    })
    
    // 2. 특정 컬렉션 상세 조회
    console.log('\n📡 [2] 컬렉션 상세 조회...')
    const detailResponse = await fetch(`http://localhost:3100/api/collections/personal?id=${testCollection.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
    
    console.log('응답 상태:', detailResponse.status)
    
    if (detailResponse.ok) {
      const detailData = await detailResponse.json()
      console.log('✅ 컬렉션 상세:', {
        success: detailData.success,
        hasCollection: !!detailData.collection,
        wordIds: detailData.collection?.words?.slice(0, 3)
      })
      
      // 3. 단어 조회
      if (detailData.collection?.words && detailData.collection.words.length > 0) {
        console.log('\n📡 [3] 단어 조회...')
        const wordIds = detailData.collection.words.slice(0, 5) // 처음 5개만
        
        const wordsResponse = await fetch(`http://localhost:3100/api/collections/words?ids=${wordIds.join(',')}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        })
        
        console.log('응답 상태:', wordsResponse.status)
        
        if (wordsResponse.ok) {
          const wordsData = await wordsResponse.json()
          console.log('✅ 단어 조회 성공:', {
            success: wordsData.success,
            wordCount: wordsData.words?.length || 0
          })
          
          if (wordsData.words && wordsData.words.length > 0) {
            console.log('📝 첫 번째 단어:', {
              word: wordsData.words[0].word,
              definition: wordsData.words[0].definition || wordsData.words[0].korean
            })
          }
        } else {
          const error = await wordsResponse.text()
          console.error('단어 조회 실패:', error)
        }
      }
      
      // 4. 학습 페이지 URL 생성
      console.log('\n📚 학습 페이지 URL:')
      console.log(`http://localhost:3100/study/${testCollection.id}`)
      console.log('\n이 URL로 브라우저에서 접속하면 학습 페이지를 볼 수 있습니다.')
      
    } else {
      const error = await detailResponse.text()
      console.error('컬렉션 상세 조회 실패:', error)
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message)
  }
}

if (typeof fetch === 'undefined') {
  globalThis.fetch = require('node-fetch')
}

testStudyPage().catch(console.error)