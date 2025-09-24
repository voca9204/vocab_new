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

async function analyzeAllCollections() {
  try {
    console.log('=== 모든 고급 컬렉션 한국어 정의 분석 ===\n');

    const collections = ['TOEIC 고급', 'GRE 고급', 'SAT 고급'];

    for (const collectionName of collections) {
      const collQuery = await db.collection('vocabulary_collections')
        .where('name', '==', collectionName)
        .limit(1)
        .get();

      if (collQuery.empty) {
        console.log(`❌ ${collectionName} 컬렉션 찾을 수 없음\n`);
        continue;
      }

      const collectionDoc = collQuery.docs[0];
      const collectionData = collectionDoc.data();
      const wordIds = collectionData.wordIds || collectionData.words || [];

      console.log(`📚 ${collectionName} 분석`);
      console.log(`총 단어 수: ${wordIds.length}개`);

      let noKoreanCount = 0;
      let hasKoreanCount = 0;
      let notFoundCount = 0;
      const noKoreanWords: string[] = [];

      // Check each word
      for (const wordId of wordIds) {
        const docRef = await db.collection('words_v3').doc(wordId).get();

        if (!docRef.exists) {
          notFoundCount++;
          continue;
        }

        const data = docRef.data()!;
        const hasKorean = !!(data.koreanDefinition || data.korean);

        if (!hasKorean) {
          noKoreanCount++;
          noKoreanWords.push(data.word);
        } else {
          hasKoreanCount++;
        }
      }

      console.log(`  ✅ 한국어 정의 있음: ${hasKoreanCount}개 (${(hasKoreanCount/wordIds.length*100).toFixed(1)}%)`);
      console.log(`  ❌ 한국어 정의 없음: ${noKoreanCount}개 (${(noKoreanCount/wordIds.length*100).toFixed(1)}%)`);

      if (noKoreanWords.length > 0) {
        console.log(`  한국어 없는 단어 샘플 (최대 10개):`);
        const sampleSize = Math.min(10, noKoreanWords.length);
        for (let i = 0; i < sampleSize; i++) {
          console.log(`    - ${noKoreanWords[i]}`);
        }
      }

      console.log('');
    }

    console.log('=== 데이터 필드 분석 ===\n');

    // 샘플로 각 컬렉션의 첫 5개 단어 필드 분석
    for (const collectionName of collections) {
      const collQuery = await db.collection('vocabulary_collections')
        .where('name', '==', collectionName)
        .limit(1)
        .get();

      if (collQuery.empty) continue;

      const collectionDoc = collQuery.docs[0];
      const collectionData = collectionDoc.data();
      const wordIds = (collectionData.wordIds || collectionData.words || []).slice(0, 5);

      console.log(`${collectionName} 샘플 단어 필드 분석:`);

      for (const wordId of wordIds) {
        const docRef = await db.collection('words_v3').doc(wordId).get();
        if (!docRef.exists) continue;

        const data = docRef.data()!;
        console.log(`  ${data.word}:`);
        console.log(`    - definition: ${data.definition ? '있음' : '없음'}`);
        console.log(`    - englishDefinition: ${data.englishDefinition ? '있음' : '없음'}`);
        console.log(`    - koreanDefinition: ${data.koreanDefinition ? '있음' : '없음'}`);
        console.log(`    - korean: ${data.korean ? '있음' : '없음'}`);
      }
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeAllCollections();