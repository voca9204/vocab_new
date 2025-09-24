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

async function checkAllTOEICWords() {
  try {
    console.log('=== TOEIC 고급 Collection 전체 단어 분석 ===\n');

    // Get TOEIC 고급 collection
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
    const wordIds = collectionData.wordIds || collectionData.words || [];

    console.log(`📚 TOEIC 고급 collection 단어 수: ${wordIds.length}개\n`);

    let noKoreanCount = 0;
    let hasKoreanCount = 0;
    let notFoundCount = 0;
    const noKoreanWords: { word: string; hasEnglish: boolean }[] = [];

    // Check each word in the collection
    for (const wordId of wordIds) {
      const docRef = await db.collection('words_v3').doc(wordId).get();

      if (!docRef.exists) {
        notFoundCount++;
        continue;
      }

      const data = docRef.data()!;
      const hasKorean = !!(data.koreanDefinition || data.korean);
      const hasEnglish = !!(data.definition || data.englishDefinition);

      if (!hasKorean) {
        noKoreanCount++;
        noKoreanWords.push({
          word: data.word,
          hasEnglish
        });
      } else {
        hasKoreanCount++;
      }
    }

    console.log('📊 분석 결과:');
    console.log(`  ✅ 한국어 정의 있음: ${hasKoreanCount}개 (${(hasKoreanCount/wordIds.length*100).toFixed(1)}%)`);
    console.log(`  ❌ 한국어 정의 없음: ${noKoreanCount}개 (${(noKoreanCount/wordIds.length*100).toFixed(1)}%)`);
    console.log(`  ⚠️ 찾을 수 없음: ${notFoundCount}개\n`);

    if (noKoreanWords.length > 0) {
      console.log('❌ 한국어 정의가 없는 단어들:');
      console.log('─'.repeat(50));

      // Show first 30 words without Korean
      const displayCount = Math.min(30, noKoreanWords.length);
      for (let i = 0; i < displayCount; i++) {
        const { word, hasEnglish } = noKoreanWords[i];
        console.log(`  ${i + 1}. ${word} ${hasEnglish ? '(영어만)' : '(정의 없음)'}`);
      }

      if (noKoreanWords.length > displayCount) {
        console.log(`  ... 그 외 ${noKoreanWords.length - displayCount}개 더`);
      }
    }

    // Also check if these are really categorized as TOEIC
    console.log('\n📌 카테고리 확인 (샘플 10개):');
    const sampleSize = Math.min(10, noKoreanWords.length);
    for (let i = 0; i < sampleSize; i++) {
      const wordQuery = await db.collection('words_v3')
        .where('word', '==', noKoreanWords[i].word)
        .limit(1)
        .get();

      if (!wordQuery.empty) {
        const doc = wordQuery.docs[0];
        const data = doc.data();
        console.log(`  - "${noKoreanWords[i].word}": category = ${data.category || 'Unknown'}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllTOEICWords();