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

function isKorean(text: string): boolean {
  const koreanPattern = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
  return koreanPattern.test(text);
}

async function checkFieldContents() {
  try {
    console.log('=== 실제 필드 내용 분석 ===\n');

    const collections = ['TOEIC 고급', 'GRE 고급'];

    for (const collectionName of collections) {
      const collQuery = await db.collection('vocabulary_collections')
        .where('name', '==', collectionName)
        .limit(1)
        .get();

      if (collQuery.empty) continue;

      const collectionDoc = collQuery.docs[0];
      const collectionData = collectionDoc.data();
      const wordIds = (collectionData.wordIds || collectionData.words || []).slice(0, 10);

      console.log(`📚 ${collectionName} 샘플 단어 필드 내용 분석:\n`);

      for (const wordId of wordIds) {
        const docRef = await db.collection('words_v3').doc(wordId).get();
        if (!docRef.exists) continue;

        const data = docRef.data()!;

        console.log(`단어: ${data.word}`);

        // Check definition field
        if (data.definition) {
          const defPreview = data.definition.substring(0, 60);
          const isKor = isKorean(data.definition);
          console.log(`  definition (${isKor ? '한국어' : '영어'}): ${defPreview}...`);
        }

        // Check koreanDefinition field
        if (data.koreanDefinition) {
          const korDefPreview = data.koreanDefinition.substring(0, 60);
          const isKor = isKorean(data.koreanDefinition);
          console.log(`  koreanDefinition (${isKor ? '한국어' : '영어'}): ${korDefPreview}...`);
        }

        // Check englishDefinition field
        if (data.englishDefinition) {
          const engDefPreview = data.englishDefinition.substring(0, 60);
          const isKor = isKorean(data.englishDefinition);
          console.log(`  englishDefinition (${isKor ? '한국어' : '영어'}): ${engDefPreview}...`);
        }

        // Check korean field
        if (data.korean) {
          const korPreview = data.korean.substring(0, 60);
          const isKor = isKorean(data.korean);
          console.log(`  korean (${isKor ? '한국어' : '영어'}): ${korPreview}...`);
        }

        console.log('');
      }

      console.log('─'.repeat(60));
      console.log('');
    }

    // Critical finding: Check if definition field contains English in DB
    console.log('🔍 Critical Analysis: definition 필드가 영어인 단어들\n');

    for (const collectionName of collections) {
      const collQuery = await db.collection('vocabulary_collections')
        .where('name', '==', collectionName)
        .limit(1)
        .get();

      if (collQuery.empty) continue;

      const collectionDoc = collQuery.docs[0];
      const collectionData = collectionDoc.data();
      const wordIds = (collectionData.wordIds || collectionData.words || []).slice(0, 30);

      let englishDefCount = 0;
      const englishDefWords: string[] = [];

      for (const wordId of wordIds) {
        const docRef = await db.collection('words_v3').doc(wordId).get();
        if (!docRef.exists) continue;

        const data = docRef.data()!;

        if (data.definition && !isKorean(data.definition)) {
          englishDefCount++;
          englishDefWords.push(data.word);
        }
      }

      console.log(`${collectionName}:`);
      console.log(`  샘플 30개 중 definition이 영어인 단어: ${englishDefCount}개`);
      if (englishDefWords.length > 0) {
        console.log(`  영어 definition 단어들: ${englishDefWords.join(', ')}`);
      }
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFieldContents();