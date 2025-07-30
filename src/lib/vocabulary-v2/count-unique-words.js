/**
 * 현재 words 컬렉션의 유니크한 단어 수 확인
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

async function countUniqueWords() {
  console.log('📊 Words 컬렉션 분석\n');
  
  try {
    // words 컬렉션의 모든 문서 가져오기
    const wordsSnapshot = await getDocs(collection(db, 'words'));
    
    console.log(`총 문서 수: ${wordsSnapshot.size}개`);
    
    // 단어별로 그룹화
    const wordMap = new Map();
    const duplicates = [];
    
    wordsSnapshot.forEach(doc => {
      const data = doc.data();
      const word = data.word.toLowerCase();
      
      if (wordMap.has(word)) {
        // 중복 발견
        const existing = wordMap.get(word);
        duplicates.push({
          word: word,
          ids: [existing.id, doc.id],
          docs: [existing, { id: doc.id, ...data }]
        });
      } else {
        wordMap.set(word, { id: doc.id, ...data });
      }
    });
    
    console.log(`유니크한 단어 수: ${wordMap.size}개`);
    console.log(`중복된 단어 수: ${duplicates.length}개`);
    
    if (duplicates.length > 0) {
      console.log('\n🔍 중복된 단어 샘플 (최대 10개):');
      duplicates.slice(0, 10).forEach(dup => {
        console.log(`  - "${dup.word}" (문서 ID: ${dup.ids.join(', ')})`);
      });
    }
    
    // 단어 분포 분석
    console.log('\n📈 단어 분포 분석:');
    const partOfSpeechCount = {};
    const difficultyDistribution = {};
    let satCount = 0;
    
    wordMap.forEach((data, word) => {
      // 품사별 분포
      if (data.partOfSpeech && Array.isArray(data.partOfSpeech)) {
        data.partOfSpeech.forEach(pos => {
          partOfSpeechCount[pos] = (partOfSpeechCount[pos] || 0) + 1;
        });
      }
      
      // 난이도별 분포
      const difficulty = data.difficulty || 5;
      difficultyDistribution[difficulty] = (difficultyDistribution[difficulty] || 0) + 1;
      
      // SAT 단어 수
      if (data.isSAT) satCount++;
    });
    
    console.log(`\nSAT 단어: ${satCount}개 (${((satCount / wordMap.size) * 100).toFixed(1)}%)`);
    
    console.log('\n품사별 분포:');
    Object.entries(partOfSpeechCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([pos, count]) => {
        console.log(`  - ${pos}: ${count}개`);
      });
    
    console.log('\n난이도별 분포:');
    Object.entries(difficultyDistribution)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .forEach(([level, count]) => {
        console.log(`  - 난이도 ${level}: ${count}개`);
      });
    
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

countUniqueWords()
  .then(() => {
    console.log('\n✅ 분석 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });