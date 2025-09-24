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

async function checkSpecificWords() {
  try {
    console.log('=== 특정 TOEIC 단어 확인 ===\n');

    const wordsToCheck = ['accompany', 'accumulate', 'appreciate'];

    for (const word of wordsToCheck) {
      console.log(`\n🔍 "${word}" 검색 중...`);

      // 정확한 단어 매칭
      const query = await db.collection('words_v3')
        .where('word', '==', word)
        .limit(1)
        .get();

      if (!query.empty) {
        const doc = query.docs[0];
        const data = doc.data();

        console.log(`✅ 발견! (ID: ${doc.id})`);
        console.log(`  📚 카테고리: ${data.category || 'N/A'}`);
        console.log(`  🇰🇷 koreanDefinition: ${data.koreanDefinition ? '✅ ' + data.koreanDefinition.substring(0, 50) + '...' : '❌ 없음'}`);
        console.log(`  🇰🇷 korean: ${data.korean ? '✅ ' + data.korean.substring(0, 50) + '...' : '❌ 없음'}`);
        console.log(`  🇬🇧 definition: ${data.definition ? '✅ ' + data.definition.substring(0, 50) + '...' : '❌ 없음'}`);
        console.log(`  🇬🇧 englishDefinition: ${data.englishDefinition ? '✅ ' + data.englishDefinition.substring(0, 50) + '...' : '❌ 없음'}`);

        // 필드 구조 분석
        const hasKorean = !!(data.koreanDefinition || data.korean);
        const hasEnglish = !!(data.definition || data.englishDefinition);

        if (!hasKorean && hasEnglish) {
          console.log(`  ⚠️ 문제: 한국어 정의 없음, 영어 정의만 있음!`);
        } else if (hasKorean && hasEnglish) {
          console.log(`  ✅ 정상: 한국어와 영어 정의 모두 있음`);
        } else if (hasKorean && !hasEnglish) {
          console.log(`  🤔 특이: 한국어 정의만 있음`);
        } else {
          console.log(`  ❌ 문제: 정의 없음`);
        }

        // 원본 데이터 전체 키 출력
        console.log(`  📋 전체 필드:`, Object.keys(data).join(', '));

      } else {
        console.log(`❌ "${word}" 찾을 수 없음`);
      }
    }

    // 전체 TOEIC 단어 중 한국어 정의 없는 것 찾기
    console.log('\n\n=== TOEIC 카테고리 한국어 정의 없는 단어 검색 ===');
    const toeicQuery = await db.collection('words_v3')
      .where('category', '==', 'TOEIC')
      .limit(100)
      .get();

    let noKoreanCount = 0;
    const noKoreanWords: string[] = [];

    toeicQuery.docs.forEach(doc => {
      const data = doc.data();
      if (!data.koreanDefinition && !data.korean) {
        noKoreanCount++;
        noKoreanWords.push(data.word);
      }
    });

    console.log(`\n📊 검사한 TOEIC 단어: ${toeicQuery.size}개`);
    console.log(`❌ 한국어 정의 없는 단어: ${noKoreanCount}개 (${(noKoreanCount/toeicQuery.size*100).toFixed(1)}%)`);

    if (noKoreanWords.length > 0) {
      console.log(`\n한국어 정의 없는 단어 목록 (처음 20개):`)
      noKoreanWords.slice(0, 20).forEach(word => {
        console.log(`  - ${word}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSpecificWords();