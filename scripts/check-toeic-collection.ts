import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkTOEICCollection() {
  try {
    console.log('=== TOEIC 고급 Collection 확인 ===\n');

    // Check TOEIC 고급 collection
    const collQuery = await db.collection('vocabulary_collections')
      .where('name', '==', 'TOEIC 고급')
      .limit(1)
      .get();

    if (!collQuery.empty) {
      const doc = collQuery.docs[0];
      const data = doc.data();
      const wordIds = data.wordIds || data.words || [];

      console.log('✅ TOEIC 고급 collection 발견!');
      console.log(`📊 Collection의 총 단어 수: ${wordIds.length}개\n`);

      // Check if these specific words are in the collection
      const testWords = ['accompany', 'accumulate', 'appreciate'];

      console.log('🔍 문제 단어들 확인중...');
      console.log('─'.repeat(50));

      for (const testWord of testWords) {
        // Search in all words_v3 for these words
        const wordQuery = await db.collection('words_v3')
          .where('word', '==', testWord)
          .limit(1)
          .get();

        if (!wordQuery.empty) {
          const wordDoc = wordQuery.docs[0];
          const wordData = wordDoc.data();
          const isInCollection = wordIds.includes(wordDoc.id);

          console.log(`\n📝 "${testWord}":`);
          console.log(`  - Document ID: ${wordDoc.id}`);
          console.log(`  - DB Category: ${wordData.category || 'Unknown'}`);
          console.log(`  - TOEIC 고급 collection 포함: ${isInCollection ? '✅ YES' : '❌ NO'}`);
          console.log(`  - 한국어 정의: ${wordData.koreanDefinition ? '✅ 있음' : '❌ 없음'}`);

          if (!isInCollection && wordData.category !== 'TOEIC') {
            console.log(`  ⚠️ 문제: TOEIC 고급 collection에 없고, category도 "${wordData.category}"임`);
          }
        } else {
          console.log(`\n❌ "${testWord}" - words_v3에서 찾을 수 없음`);
        }
      }

      // Show first few words actually in the collection
      console.log('\n' + '─'.repeat(50));
      console.log('\n📋 TOEIC 고급 collection의 실제 단어 샘플:');

      const sampleSize = Math.min(5, wordIds.length);
      for (let i = 0; i < sampleSize; i++) {
        const docRef = await db.collection('words_v3').doc(wordIds[i]).get();
        if (docRef.exists) {
          const data = docRef.data()!;
          console.log(`  ${i+1}. ${data.word} (${data.category || 'Unknown'})`);
        }
      }

    } else {
      console.log('❌ TOEIC 고급 collection을 찾을 수 없음');
    }

    console.log('\n' + '='.repeat(50));
    console.log('📌 결론: 문제의 단어들이 TOEFL로 분류되어 있어서');
    console.log('    TOEIC 고급 collection에 포함되지 않았을 가능성이 높음');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTOEICCollection();