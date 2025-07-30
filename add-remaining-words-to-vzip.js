/**
 * 연결되지 않은 492개 단어를 V.ZIP 단어장에 추가하는 스크립트
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, writeBatch, doc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  projectId: 'vocabulary-app-new',
  authDomain: 'vocabulary-app-new.firebaseapp.com',
  storageBucket: 'vocabulary-app-new.appspot.com',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const VZIP_VOCABULARY_ID = 'LKAwNiQuJW5vZKrM3W29';
const BATCH_SIZE = 500;

async function addRemainingWordsToVZIP() {
  try {
    console.log('🚀 V.ZIP 단어장에 남은 단어들 추가 시작');
    console.log('📋 대상 단어장:', VZIP_VOCABULARY_ID);
    
    // 1. 현재 연결된 단어들의 ID 수집
    console.log('\n1️⃣ 현재 연결된 단어 목록 수집...');
    const vocabWordsRef = collection(db, 'vocabulary_words');
    const vocabWordsQuery = query(
      vocabWordsRef,
      where('vocabularyId', '==', VZIP_VOCABULARY_ID)
    );
    const vocabWordsSnapshot = await getDocs(vocabWordsQuery);
    
    const connectedWordIds = new Set();
    let maxOrder = 0;
    
    vocabWordsSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      connectedWordIds.add(data.wordId);
      if (data.order && data.order > maxOrder) {
        maxOrder = data.order;
      }
    });
    
    console.log(`✅ 현재 연결된 단어: ${connectedWordIds.size}개`);
    console.log(`📊 현재 최대 순서 번호: ${maxOrder}`);
    
    // 2. 전체 단어 중 연결되지 않은 단어 찾기
    console.log('\n2️⃣ 연결되지 않은 단어 찾기...');
    const wordsRef = collection(db, 'words');
    const wordsSnapshot = await getDocs(wordsRef);
    
    const unconnectedWords = [];
    wordsSnapshot.forEach(docSnap => {
      if (!connectedWordIds.has(docSnap.id)) {
        unconnectedWords.push({
          id: docSnap.id,
          word: docSnap.data().word
        });
      }
    });
    
    console.log(`❓ 연결되지 않은 단어: ${unconnectedWords.length}개`);
    
    if (unconnectedWords.length === 0) {
      console.log('✅ 모든 단어가 이미 연결되어 있습니다!');
      return;
    }
    
    // 3. 단어들을 알파벳 순으로 정렬
    console.log('\n3️⃣ 단어 정렬 중...');
    unconnectedWords.sort((a, b) => a.word.localeCompare(b.word));
    console.log(`📝 첫 10개 단어: ${unconnectedWords.slice(0, 10).map(w => w.word).join(', ')}`);
    
    // 4. 배치 처리로 vocabulary_words에 추가
    console.log('\n4️⃣ 단어장 연결 추가 중...');
    
    const totalBatches = Math.ceil(unconnectedWords.length / BATCH_SIZE);
    let processedCount = 0;
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batch = writeBatch(db);
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, unconnectedWords.length);
      const batchWords = unconnectedWords.slice(startIndex, endIndex);
      
      console.log(`📦 배치 ${batchIndex + 1}/${totalBatches}: ${batchWords.length}개 단어 처리 중...`);
      
      batchWords.forEach((word, index) => {
        const vocabularyWordRef = doc(collection(db, 'vocabulary_words'));
        const order = maxOrder + startIndex + index + 1;
        
        batch.set(vocabularyWordRef, {
          vocabularyId: VZIP_VOCABULARY_ID,
          wordId: word.id,
          order: order,
          addedAt: serverTimestamp(),
          addedBy: 'system'
        });
      });
      
      await batch.commit();
      processedCount += batchWords.length;
      
      console.log(`✅ 배치 ${batchIndex + 1} 완료 (${processedCount}/${unconnectedWords.length})`);
      
      // 잠시 대기 (Firestore 부하 방지)
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 5. 결과 검증
    console.log('\n5️⃣ 결과 검증 중...');
    const finalVocabWordsSnapshot = await getDocs(vocabWordsQuery);
    console.log(`✅ 최종 V.ZIP 단어장 연결 수: ${finalVocabWordsSnapshot.size}개`);
    
    // 6. 단어장 메타데이터 업데이트 (실제 단어 수로)
    console.log('\n6️⃣ 단어장 메타데이터 업데이트...');
    const vocabularyRef = doc(db, 'vocabularies', VZIP_VOCABULARY_ID);
    const updateBatch = writeBatch(db);
    updateBatch.update(vocabularyRef, {
      actualWordCount: finalVocabWordsSnapshot.size,
      updatedAt: serverTimestamp(),
      lastSyncAt: serverTimestamp()
    });
    await updateBatch.commit();
    
    console.log('\n🎉 작업 완료!');
    console.log(`📊 추가된 단어: ${unconnectedWords.length}개`);
    console.log(`📚 V.ZIP 단어장 총 단어 수: ${finalVocabWordsSnapshot.size}개`);
    console.log('✅ 이제 모든 단어가 V.ZIP 단어장에 연결되었습니다!');
    
  } catch (error) {
    console.error('❌ 작업 실패:', error.message);
    console.error('상세 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  addRemainingWordsToVZIP().then(() => {
    console.log('\n🏁 스크립트 완료');
    process.exit(0);
  });
}

module.exports = { addRemainingWordsToVZIP };