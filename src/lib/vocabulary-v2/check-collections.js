/**
 * 현재 Firebase 컬렉션 상태 확인 스크립트
 */

require('dotenv').config({ path: '.env.local' });

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs
} = require('firebase/firestore');

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
  console.log('📊 Firebase 컬렉션 상태 확인\n');
  
  const collectionsToCheck = [
    'veterans_vocabulary',
    'vocabulary_collections', 
    'user_vocabulary_progress',
    'users',
    'news',
    'progress',
    // extracted 컬렉션들
    'extracted_vocabulary',
    'extracted_vocabularies',
    'extractedVocabulary',
    'extracted',
    // 새로운 컬렉션들
    'words',
    'vocabularies',
    'vocabulary_words',
    'user_vocabularies',
    'user_words'
  ];
  
  for (const collectionName of collectionsToCheck) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      console.log(`✅ ${collectionName}: ${snapshot.size}개 문서`);
      
      // 샘플 데이터 표시 (최대 3개)
      if (snapshot.size > 0) {
        console.log('   샘플 데이터:');
        let count = 0;
        snapshot.forEach(doc => {
          if (count < 3) {
            const data = doc.data();
            console.log(`   - ${doc.id}: ${JSON.stringify(Object.keys(data))}`);
            count++;
          }
        });
      }
    } catch (error) {
      console.log(`❌ ${collectionName}: 컬렉션 없음 또는 오류`);
    }
    console.log('');
  }
}

checkCollections()
  .then(() => {
    console.log('✅ 확인 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });