/**
 * 중복 단어 제거 스크립트
 */

require('dotenv').config({ path: '.env.local' });

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs,
  doc,
  deleteDoc,
  writeBatch
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

async function removeDuplicates(dryRun = true) {
  console.log(`🧹 중복 단어 제거 (DRY RUN: ${dryRun})\n`);
  
  try {
    // words 컬렉션의 모든 문서 가져오기
    const wordsSnapshot = await getDocs(collection(db, 'words'));
    console.log(`총 문서 수: ${wordsSnapshot.size}개`);
    
    // 단어별로 그룹화
    const wordMap = new Map();
    const duplicatesToDelete = [];
    
    wordsSnapshot.forEach(doc => {
      const data = doc.data();
      const word = data.word.toLowerCase();
      
      if (wordMap.has(word)) {
        // 중복 발견 - 더 오래된 것을 삭제 대상으로
        const existing = wordMap.get(word);
        const existingDate = existing.data.createdAt?.toDate() || new Date(0);
        const currentDate = data.createdAt?.toDate() || new Date(0);
        
        if (existingDate < currentDate) {
          // 기존 것이 더 오래됨 - 기존 것을 삭제
          duplicatesToDelete.push({
            id: existing.id,
            word: word,
            reason: 'older duplicate'
          });
          wordMap.set(word, { id: doc.id, data: data });
        } else {
          // 현재 것이 더 오래됨 - 현재 것을 삭제
          duplicatesToDelete.push({
            id: doc.id,
            word: word,
            reason: 'newer duplicate'
          });
        }
      } else {
        wordMap.set(word, { id: doc.id, data: data });
      }
    });
    
    console.log(`유니크한 단어 수: ${wordMap.size}개`);
    console.log(`삭제할 중복 문서: ${duplicatesToDelete.length}개`);
    
    if (duplicatesToDelete.length === 0) {
      console.log('\n✅ 중복 단어가 없습니다!');
      return;
    }
    
    // 삭제할 문서 샘플 표시
    console.log('\n🗑️  삭제할 문서 샘플 (최대 10개):');
    duplicatesToDelete.slice(0, 10).forEach(item => {
      console.log(`  - "${item.word}" (ID: ${item.id}, 이유: ${item.reason})`);
    });
    
    if (dryRun) {
      console.log('\n✅ Dry run 완료 (실제 삭제되지 않음)');
      return;
    }
    
    // 실제 삭제 수행 (배치 처리)
    console.log('\n🔥 실제 삭제 시작...');
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(duplicatesToDelete.length / BATCH_SIZE);
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = writeBatch(db);
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, duplicatesToDelete.length);
      
      console.log(`  - 배치 ${i + 1}/${totalBatches} 처리 중...`);
      
      for (let j = start; j < end; j++) {
        const docRef = doc(db, 'words', duplicatesToDelete[j].id);
        batch.delete(docRef);
      }
      
      await batch.commit();
    }
    
    console.log(`\n✅ ${duplicatesToDelete.length}개의 중복 문서 삭제 완료!`);
    
    // vocabulary_words에서 삭제된 단어 참조도 정리해야 함
    console.log('\n🔗 단어장 매핑 정리 중...');
    const deletedWordIds = new Set(duplicatesToDelete.map(d => d.id));
    const mappingsSnapshot = await getDocs(collection(db, 'vocabulary_words'));
    const mappingsToDelete = [];
    
    mappingsSnapshot.forEach(doc => {
      const data = doc.data();
      if (deletedWordIds.has(data.wordId)) {
        mappingsToDelete.push(doc.id);
      }
    });
    
    if (mappingsToDelete.length > 0) {
      console.log(`  - 삭제할 매핑: ${mappingsToDelete.length}개`);
      
      const mappingBatches = Math.ceil(mappingsToDelete.length / BATCH_SIZE);
      for (let i = 0; i < mappingBatches; i++) {
        const batch = writeBatch(db);
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, mappingsToDelete.length);
        
        for (let j = start; j < end; j++) {
          const docRef = doc(db, 'vocabulary_words', mappingsToDelete[j]);
          batch.delete(docRef);
        }
        
        await batch.commit();
      }
      
      console.log(`  ✅ ${mappingsToDelete.length}개의 매핑 삭제 완료!`);
    }
    
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

// 실행
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

removeDuplicates(dryRun)
  .then(() => {
    console.log('\n✅ 중복 제거 프로세스 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });