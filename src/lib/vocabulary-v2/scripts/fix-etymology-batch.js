const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixEtymologyFieldsBatch() {
  console.log('🔧 Fixing etymology fields in production DB (batch mode)...\n');
  
  try {
    const wordsRef = collection(db, 'words');
    const snapshot = await getDocs(wordsRef);
    
    console.log(`📊 Total words: ${snapshot.size}\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    let batch = writeBatch(db);
    let batchCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // etymology와 realEtymology가 같은 경우만 처리
      if (data.etymology && data.realEtymology && data.etymology === data.realEtymology) {
        // realEtymology를 null로 설정하여 AI가 다시 생성할 수 있게 함
        batch.update(docSnap.ref, {
          realEtymology: null,
          'aiGenerated.etymology': false
        });
        
        fixedCount++;
        batchCount++;
        
        // Firestore batch는 최대 500개 작업
        if (batchCount === 500) {
          await batch.commit();
          console.log(`✅ Committed batch: ${fixedCount} words fixed so far...`);
          batch = writeBatch(db);
          batchCount = 0;
        }
      } else if (data.aiGenerated?.etymology && data.realEtymology !== data.etymology) {
        // 이미 AI가 생성한 어원이 있는 경우
        skippedCount++;
      }
    }
    
    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch`);
    }
    
    console.log(`\n✅ Fixed ${fixedCount} words`);
    console.log(`⏭️  Skipped ${skippedCount} words (already have AI etymology)`);
    console.log(`📝 Remaining: ${snapshot.size - fixedCount - skippedCount} words`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

// 실행
console.log('⚠️  This will reset realEtymology field for words where etymology === realEtymology');
console.log('Starting in 3 seconds...\n');

setTimeout(() => {
  fixEtymologyFieldsBatch();
}, 3000);