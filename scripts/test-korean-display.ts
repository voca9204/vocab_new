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

// Mock the conversion logic from DirectWordAdapter
function convertToUnifiedWord(data: any) {
  const koreanDef = data.koreanDefinition || data.korean || '';
  const englishDef = data.definition || data.englishDefinition || '';

  return {
    word: data.word,
    definition: koreanDef || englishDef,
    koreanDefinition: data.koreanDefinition,
    korean: data.korean,
    englishDefinition: englishDef
  };
}

async function testKoreanDisplay() {
  try {
    console.log('=== 한국어 정의 표시 테스트 ===\n');

    // TOEIC 단어 샘플 가져오기
    const query = await db.collection('words_v3')
      .where('category', '==', 'TOEIC')
      .limit(5)
      .get();

    console.log(`📚 ${query.size}개 TOEIC 단어로 테스트:\n`);

    query.docs.forEach((doc, idx) => {
      const data = doc.data();
      const converted = convertToUnifiedWord(data);

      console.log(`${idx + 1}. ${converted.word}:`);
      console.log(`   📝 메인 정의 (definition): ${converted.definition ? converted.definition.substring(0, 50) + '...' : '❌ 없음'}`);
      console.log(`   🇰🇷 한국어 (koreanDefinition): ${converted.koreanDefinition ? '✅' : '❌'}`);
      console.log(`   🇬🇧 영어 (englishDefinition): ${converted.englishDefinition ? converted.englishDefinition.substring(0, 50) + '...' : '❌ 없음'}`);

      // UI에서 보일 내용
      const displayDef = converted.koreanDefinition || converted.korean || converted.definition || converted.englishDefinition || 'No definition';
      console.log(`   🖥️ UI 표시: ${displayDef.substring(0, 50)}...`);
      console.log('');
    });

    console.log('✅ 테스트 완료');
    console.log('💡 이제 UI에서 한국어 정의가 우선 표시되어야 합니다.');
    console.log('💡 브라우저 캐시를 지워야 할 수 있습니다: localStorage.clear()');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testKoreanDisplay();