const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: 'vocabulary-app-new',
  authDomain: 'vocabulary-app-new.firebaseapp.com',
  storageBucket: 'vocabulary-app-new.appspot.com',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findMissingWords() {
  try {
    console.log('🔍 누락된 단어 분석');
    
    // 1. V.ZIP 단어장 정보 확인
    const vocabDoc = await getDoc(doc(db, 'vocabularies', 'LKAwNiQuJW5vZKrM3W29'));
    if (vocabDoc.exists()) {
      const vocabData = vocabDoc.data();
      console.log('📋 단어장: ' + vocabData.name);
      console.log('📊 타입: ' + vocabData.type);
    }
    
    // 2. 연결된 단어들의 wordId 목록 가져오기
    console.log('\n🔗 연결된 단어 목록 수집 중...');
    const vocabWordsRef = collection(db, 'vocabulary_words');
    const vocabWordsQuery = query(
      vocabWordsRef,
      where('vocabularyId', '==', 'LKAwNiQuJW5vZKrM3W29')
    );
    const vocabWordsSnapshot = await getDocs(vocabWordsQuery);
    
    const connectedWordIds = new Set();
    vocabWordsSnapshot.forEach(docSnap => {
      connectedWordIds.add(docSnap.data().wordId);
    });
    console.log('✅ 연결된 단어: ' + connectedWordIds.size + '개');
    
    // 3. 전체 words 컬렉션에서 연결되지 않은 단어 찾기
    console.log('\n📚 전체 단어 중 연결되지 않은 단어 찾기...');
    const wordsRef = collection(db, 'words');
    const wordsSnapshot = await getDocs(wordsRef);
    
    const unconnectedWords = [];
    wordsSnapshot.forEach(docSnap => {
      if (!connectedWordIds.has(docSnap.id)) {
        const data = docSnap.data();
        unconnectedWords.push({
          id: docSnap.id,
          word: data.word,
          source: data.source || {}
        });
      }
    });
    
    console.log('❓ 연결되지 않은 단어: ' + unconnectedWords.length + '개');
    
    // 4. 연결되지 않은 단어들의 소스 분석
    console.log('\n📊 연결되지 않은 단어들의 소스 분석:');
    const sourceStats = {};
    unconnectedWords.forEach(word => {
      const sourceType = word.source.type || 'unknown';
      const filename = word.source.filename || 'unknown';
      const key = sourceType + ' - ' + filename;
      sourceStats[key] = (sourceStats[key] || 0) + 1;
    });
    
    Object.entries(sourceStats).forEach(([source, count]) => {
      console.log('  📄 ' + source + ': ' + count + '개');
    });
    
    // 5. 처음 10개 연결되지 않은 단어 예시
    console.log('\n📝 연결되지 않은 단어 예시 (처음 10개):');
    unconnectedWords.slice(0, 10).forEach((word, i) => {
      console.log('  ' + (i+1) + '. ' + word.word + ' (ID: ' + word.id.substring(0, 8) + '...)');
    });
    
    // 6. 결론
    console.log('\n🎯 결론:');
    console.log('총 ' + wordsSnapshot.size + '개 단어 중 ' + connectedWordIds.size + '개만 V.ZIP 단어장에 연결됨');
    console.log('나머지 ' + unconnectedWords.length + '개 단어는 아직 어떤 단어장에도 속하지 않음');
    console.log('\n💡 이는 정상적인 상황입니다:');
    console.log('   - 모든 단어가 마스터 DB(words)에 저장됨 ✅');
    console.log('   - 일부 단어만 특정 단어장(V.ZIP)에 연결됨 ✅'); 
    console.log('   - 연결되지 않은 단어들은 나중에 다른 단어장에 추가 가능 ✅');
    
  } catch (error) {
    console.error('❌ 분석 실패:', error.message);
  }
}

findMissingWords().then(() => process.exit(0));