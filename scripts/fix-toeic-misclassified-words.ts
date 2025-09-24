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

// Common TOEIC words that are miscategorized as TOEFL or other
const commonToeicWords = [
  'accompany', 'accumulate', 'appreciate', 'acquire', 'adjacent',
  'allocate', 'annually', 'applicable', 'approximately', 'assemble',
  'assess', 'assist', 'assume', 'assure', 'authorize',
  'capacity', 'collaborate', 'compensate', 'compile', 'comply',
  'comprehensive', 'conclude', 'concurrent', 'conduct', 'consecutive',
  'considerable', 'consistently', 'consolidate', 'constitute', 'consult',
  'contingency', 'coordinate', 'correspondence', 'criteria', 'crucial'
];

async function fixMisclassifiedWords() {
  try {
    console.log('=== TOEIC 단어 분류 수정 ===\n');
    console.log(`🔍 검사할 단어: ${commonToeicWords.length}개\n`);

    let fixedCount = 0;
    let alreadyToeicCount = 0;
    let notFoundCount = 0;
    let addedToCollectionCount = 0;

    // First, get the TOEIC 고급 collection
    const collQuery = await db.collection('vocabulary_collections')
      .where('name', '==', 'TOEIC 고급')
      .limit(1)
      .get();

    if (collQuery.empty) {
      console.log('❌ TOEIC 고급 collection을 찾을 수 없음');
      process.exit(1);
    }

    const collectionDoc = collQuery.docs[0];
    const collectionData = collectionDoc.data();
    const currentWordIds = new Set(collectionData.wordIds || collectionData.words || []);

    console.log(`📚 현재 TOEIC 고급 collection 단어 수: ${currentWordIds.size}개\n`);

    const wordsToAddToCollection: string[] = [];

    for (const word of commonToeicWords) {
      const wordQuery = await db.collection('words_v3')
        .where('word', '==', word)
        .limit(1)
        .get();

      if (wordQuery.empty) {
        console.log(`❌ "${word}" - words_v3에 없음`);
        notFoundCount++;
        continue;
      }

      const doc = wordQuery.docs[0];
      const data = doc.data();
      const currentCategory = data.category;

      // Check if already in collection
      const inCollection = currentWordIds.has(doc.id);

      if (currentCategory === 'TOEIC' && inCollection) {
        alreadyToeicCount++;
        console.log(`✅ "${word}" - 이미 TOEIC로 분류되어 있고 collection에 포함됨`);
      } else if (currentCategory !== 'TOEIC' || !inCollection) {
        // Update category to TOEIC if needed
        if (currentCategory !== 'TOEIC') {
          await doc.ref.update({
            category: 'TOEIC',
            updatedAt: new Date()
          });
          console.log(`🔄 "${word}" - category를 ${currentCategory} → TOEIC로 변경`);
          fixedCount++;
        }

        // Add to collection if not already there
        if (!inCollection) {
          wordsToAddToCollection.push(doc.id);
          console.log(`➕ "${word}" - TOEIC 고급 collection에 추가 예정`);
        }
      }
    }

    // Update the collection with new word IDs
    if (wordsToAddToCollection.length > 0) {
      const updatedWordIds = [...currentWordIds, ...wordsToAddToCollection];

      await collectionDoc.ref.update({
        wordIds: updatedWordIds,
        updatedAt: new Date()
      });

      addedToCollectionCount = wordsToAddToCollection.length;
      console.log(`\n✅ ${addedToCollectionCount}개 단어를 TOEIC 고급 collection에 추가함`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 결과 요약:');
    console.log(`  - 이미 올바름: ${alreadyToeicCount}개`);
    console.log(`  - Category 수정: ${fixedCount}개`);
    console.log(`  - Collection 추가: ${addedToCollectionCount}개`);
    console.log(`  - 찾을 수 없음: ${notFoundCount}개`);
    console.log(`  - 최종 Collection 크기: ${currentWordIds.size + addedToCollectionCount}개`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixMisclassifiedWords();