/**
 * 배치 처리를 사용한 빠른 마이그레이션 스크립트
 */

require('dotenv').config({ path: '.env.local' });

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc,
  writeBatch,
  Timestamp
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

// 마이그레이션 통계
const stats = {
  totalWords: 0,
  duplicateWords: 0,
  totalVocabularies: 0,
  totalMappings: 0,
  errors: []
};

// ID 생성 함수
function generateId() {
  return doc(collection(db, 'temp')).id;
}

// 배치당 최대 문서 수 (Firestore 제한: 500)
const BATCH_SIZE = 500;

async function migrateWordsInBatches(dryRun = true) {
  console.log('\n📚 단어 마이그레이션 시작 (배치 처리)...');
  
  try {
    // extracted_vocabulary 컬렉션 읽기
    const veteransSnapshot = await getDocs(collection(db, 'extracted_vocabulary'));
    const uniqueWords = new Map();
    const wordIdMap = new Map(); // oldId -> newId 매핑
    
    console.log(`  - extracted_vocabulary 문서 수: ${veteransSnapshot.size}`);
    
    // 중복 제거하며 고유 단어 추출
    veteransSnapshot.forEach(doc => {
      const data = doc.data();
      const wordText = data.word.toLowerCase();
      
      if (!uniqueWords.has(wordText)) {
        uniqueWords.set(wordText, {
          oldId: doc.id,
          data: data
        });
      } else {
        stats.duplicateWords++;
      }
    });
    
    console.log(`  - 고유 단어 수: ${uniqueWords.size}`);
    console.log(`  - 중복 단어 수: ${stats.duplicateWords}`);
    
    if (dryRun) {
      stats.totalWords = uniqueWords.size;
      console.log('  ✅ Dry run 완료 (실제 데이터는 변경되지 않음)');
      return wordIdMap;
    }
    
    // 배치 처리
    const wordsArray = Array.from(uniqueWords.entries());
    const totalBatches = Math.ceil(wordsArray.length / BATCH_SIZE);
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = writeBatch(db);
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, wordsArray.length);
      
      console.log(`  - 배치 ${i + 1}/${totalBatches} 처리 중 (${start + 1}-${end})...`);
      
      for (let j = start; j < end; j++) {
        const [wordText, wordInfo] = wordsArray[j];
        const { oldId, data } = wordInfo;
        
        const newWordId = generateId();
        wordIdMap.set(oldId, newWordId);
        
        const newWord = {
          id: newWordId,
          word: wordText,
          pronunciation: data.pronunciation || null,
          partOfSpeech: data.partOfSpeech || [],
          definitions: [{
            id: generateId(),
            definition: data.definition || '',
            language: 'ko',
            source: 'pdf',
            examples: data.examples || [],
            createdAt: data.createdAt || Timestamp.now()
          }],
          etymology: data.etymology || null,
          realEtymology: data.etymology || null,
          synonyms: data.synonyms || [],
          antonyms: data.antonyms || [],
          difficulty: data.difficulty || 5,
          frequency: data.frequency || 5,
          isSAT: data.isSAT !== undefined ? data.isSAT : true,
          createdBy: data.userId || 'system',
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now(),
          aiGenerated: {
            examples: false,
            etymology: false
          }
        };
        
        batch.set(doc(db, 'words', newWordId), newWord);
      }
      
      await batch.commit();
      console.log(`  - 배치 ${i + 1}/${totalBatches} 완료`);
    }
    
    stats.totalWords = uniqueWords.size;
    console.log(`  ✅ 단어 마이그레이션 완료: ${stats.totalWords}개`);
    
    return wordIdMap;
    
  } catch (error) {
    console.error('  ❌ 단어 마이그레이션 실패:', error);
    stats.errors.push(error.message);
    return new Map();
  }
}

async function migrateVocabulariesAndMappings(wordIdMap, dryRun = true) {
  console.log('\n📂 단어장 및 매핑 마이그레이션 시작...');
  
  try {
    // Veterans 시스템 단어장 생성
    const veteransVocabId = generateId();
    const veteransVocab = {
      id: veteransVocabId,
      name: 'V.ZIP 3K 단어장',
      description: 'V.ZIP 3K PDF에서 추출한 SAT 단어 모음',
      type: 'system',
      ownerType: 'system',
      ownerId: 'system',
      visibility: 'public',
      category: 'SAT',
      level: 'advanced',
      tags: ['SAT', 'V.ZIP', '3K', 'vocabulary'],
      wordCount: stats.totalWords || 0,
      source: {
        type: 'pdf',
        filename: 'V.ZIP 3K.pdf'
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      stats: {
        totalSubscribers: 0,
        averageMastery: 0,
        completionRate: 0
      }
    };
    
    if (!dryRun) {
      // 단어장 생성
      const vocabBatch = writeBatch(db);
      vocabBatch.set(doc(db, 'vocabularies', veteransVocabId), veteransVocab);
      await vocabBatch.commit();
      
      console.log('  - 단어장 생성 완료');
      
      // 단어-단어장 매핑 생성 (배치 처리)
      console.log('\n🔗 단어-단어장 매핑 시작...');
      
      const mappingArray = Array.from(wordIdMap.entries());
      const totalBatches = Math.ceil(mappingArray.length / BATCH_SIZE);
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = writeBatch(db);
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, mappingArray.length);
        
        console.log(`  - 매핑 배치 ${i + 1}/${totalBatches} 처리 중...`);
        
        for (let j = start; j < end; j++) {
          const [oldId, newWordId] = mappingArray[j];
          const mappingId = generateId();
          
          const mapping = {
            id: mappingId,
            vocabularyId: veteransVocabId,
            wordId: newWordId,
            order: j + 1,
            addedAt: Timestamp.now(),
            addedBy: 'system',
            tags: ['SAT', 'V.ZIP']
          };
          
          batch.set(doc(db, 'vocabulary_words', mappingId), mapping);
        }
        
        await batch.commit();
        stats.totalMappings += (end - start);
      }
      
      console.log(`  ✅ 단어-단어장 매핑 완료: ${stats.totalMappings}개`);
    }
    
    stats.totalVocabularies = 1;
    console.log(`  ✅ 단어장 마이그레이션 완료: ${stats.totalVocabularies}개`);
    
  } catch (error) {
    console.error('  ❌ 단어장/매핑 마이그레이션 실패:', error);
    stats.errors.push(error.message);
  }
}

async function printReport() {
  console.log('\n📊 마이그레이션 결과 보고서');
  console.log('========================');
  console.log(`총 단어 수: ${stats.totalWords}`);
  console.log(`중복 제거된 단어: ${stats.duplicateWords}`);
  console.log(`총 단어장 수: ${stats.totalVocabularies}`);
  console.log(`단어-단어장 매핑: ${stats.totalMappings}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ 오류 목록:');
    stats.errors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log('\n✅ 오류 없이 완료!');
  }
}

async function runMigration(dryRun = true) {
  console.log(`🚀 마이그레이션 시작 (DRY RUN: ${dryRun})`);
  const startTime = Date.now();
  
  const wordIdMap = await migrateWordsInBatches(dryRun);
  await migrateVocabulariesAndMappings(wordIdMap, dryRun);
  await printReport();
  
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n⏱️  실행 시간: ${elapsedTime}초`);
}

// 실행
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

runMigration(dryRun)
  .then(() => {
    console.log('\n✅ 마이그레이션 프로세스 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 마이그레이션 실패:', error);
    process.exit(1);
  });