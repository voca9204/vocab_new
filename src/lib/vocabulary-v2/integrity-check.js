/**
 * 데이터베이스 무결성 검사 스크립트
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

// 단어 정규화 함수 (WordService와 동일)
function normalizeWord(word) {
  return word
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // 중복 공백 제거
    .replace(/[^\w\s\-']/g, ''); // 특수문자 제거 (하이픈, 아포스트로피 제외)
}

async function checkDatabaseIntegrity() {
  console.log('🔍 데이터베이스 무결성 검사 시작\n');
  
  try {
    const snapshot = await getDocs(collection(db, 'words'));
    const wordMap = new Map();
    const malformedWords = [];
    const emptyWords = [];
    const longWords = [];
    
    console.log(`총 단어 수: ${snapshot.size}개`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const word = data.word;
      
      // 1. 단어 형식 검사
      if (!word || typeof word !== 'string') {
        malformedWords.push({ id: doc.id, word, reason: 'not a string' });
        return;
      }
      
      if (word.trim() === '') {
        emptyWords.push({ id: doc.id, word, reason: 'empty word' });
        return;
      }
      
      if (word.length > 50) {
        longWords.push({ id: doc.id, word, reason: 'too long' });
      }
      
      // 2. 중복 검사
      const normalized = normalizeWord(word);
      if (!wordMap.has(normalized)) {
        wordMap.set(normalized, []);
      }
      wordMap.get(normalized).push({
        id: doc.id,
        originalWord: word,
        createdAt: data.createdAt?.toDate() || new Date(0)
      });
    });
    
    // 3. 결과 분석
    const uniqueWords = wordMap.size;
    const duplicates = Array.from(wordMap.entries())
      .filter(([, instances]) => instances.length > 1)
      .map(([normalizedWord, instances]) => ({
        word: normalizedWord,
        count: instances.length,
        instances: instances.sort((a, b) => a.createdAt - b.createdAt)
      }));
    
    // 4. 보고서 출력
    console.log('📊 검사 결과');
    console.log('============');
    console.log(`유니크한 단어: ${uniqueWords}개`);
    console.log(`중복 단어: ${duplicates.length}개`);
    console.log(`잘못된 형식: ${malformedWords.length}개`);
    console.log(`빈 단어: ${emptyWords.length}개`);
    console.log(`너무 긴 단어: ${longWords.length}개`);
    
    // 5. 중복 단어 상세 정보
    if (duplicates.length > 0) {
      console.log('\n🔍 중복 단어 상세 (최대 10개):');
      duplicates.slice(0, 10).forEach(dup => {
        console.log(`\n  "${dup.word}" (${dup.count}개 중복):`);
        dup.instances.forEach((instance, index) => {
          const marker = index === 0 ? '✅ 보존' : '❌ 삭제 대상';
          console.log(`    - ${marker}: ${instance.id} (원본: "${instance.originalWord}")`);
        });
      });
      
      if (duplicates.length > 10) {
        console.log(`    ... 그리고 ${duplicates.length - 10}개 더`);
      }
    }
    
    // 6. 문제 있는 단어들
    if (malformedWords.length > 0) {
      console.log('\n⚠️  잘못된 형식의 단어:');
      malformedWords.slice(0, 5).forEach(item => {
        console.log(`  - ${item.id}: "${item.word}" (${item.reason})`);
      });
    }
    
    if (emptyWords.length > 0) {
      console.log('\n⚠️  빈 단어:');
      emptyWords.slice(0, 5).forEach(item => {
        console.log(`  - ${item.id}: "${item.word}" (${item.reason})`);
      });
    }
    
    if (longWords.length > 0) {
      console.log('\n⚠️  너무 긴 단어:');
      longWords.slice(0, 5).forEach(item => {
        console.log(`  - ${item.id}: "${item.word}" (${item.word.length}자)`);
      });
    }
    
    // 7. 권장 사항
    console.log('\n💡 권장 사항:');
    if (duplicates.length > 0) {
      console.log(`  - ${duplicates.reduce((sum, dup) => sum + dup.count - 1, 0)}개의 중복 단어를 제거하세요`);
    }
    if (malformedWords.length > 0 || emptyWords.length > 0) {
      console.log(`  - ${malformedWords.length + emptyWords.length}개의 잘못된 단어를 수정하거나 제거하세요`);
    }
    if (duplicates.length === 0 && malformedWords.length === 0 && emptyWords.length === 0) {
      console.log('  ✅ 데이터베이스가 깨끗합니다!');
    }
    
  } catch (error) {
    console.error('❌ 검사 중 오류:', error);
  }
}

checkDatabaseIntegrity()
  .then(() => {
    console.log('\n✅ 무결성 검사 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });