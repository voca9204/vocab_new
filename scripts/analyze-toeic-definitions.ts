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

async function analyzeToeicWords() {
  try {
    console.log('=== TOEIC 단어 정의 분석 ===\n');

    // TOEIC 카테고리 단어들 조회
    const query = await db.collection('words_v3')
      .where('category', '==', 'TOEIC')
      .limit(20)  // 샘플 20개
      .get();

    console.log(`✅ TOEIC 단어 ${query.size}개 발견\n`);

    let stats = {
      total: 0,
      hasKoreanDefinition: 0,
      hasKorean: 0,
      hasDefinition: 0,
      hasEnglishDefinition: 0,
      onlyEnglish: 0,
      bothLanguages: 0,
      noDefinition: 0
    };

    console.log('📊 샘플 단어 분석:\n');
    query.docs.forEach((doc, idx) => {
      const data = doc.data();
      stats.total++;

      const hasKorDef = !!data.koreanDefinition;
      const hasKor = !!data.korean;
      const hasDef = !!data.definition;
      const hasEngDef = !!data.englishDefinition;

      if (hasKorDef) stats.hasKoreanDefinition++;
      if (hasKor) stats.hasKorean++;
      if (hasDef) stats.hasDefinition++;
      if (hasEngDef) stats.hasEnglishDefinition++;

      const hasAnyKorean = hasKorDef || hasKor;
      const hasAnyEnglish = hasDef || hasEngDef;

      if (hasAnyKorean && hasAnyEnglish) {
        stats.bothLanguages++;
      } else if (hasAnyEnglish && !hasAnyKorean) {
        stats.onlyEnglish++;
      } else if (!hasAnyKorean && !hasAnyEnglish) {
        stats.noDefinition++;
      }

      if (idx < 5) {  // 처음 5개 상세 출력
        console.log(`${idx + 1}. ${data.word}:`);
        console.log(`   - koreanDefinition: ${data.koreanDefinition ? '✅' : '❌'} ${data.koreanDefinition ? data.koreanDefinition.substring(0, 30) + '...' : 'N/A'}`);
        console.log(`   - korean: ${data.korean ? '✅' : '❌'} ${data.korean ? data.korean.substring(0, 30) + '...' : 'N/A'}`);
        console.log(`   - definition: ${data.definition ? '✅' : '❌'} ${data.definition ? data.definition.substring(0, 30) + '...' : 'N/A'}`);
        console.log(`   - englishDefinition: ${data.englishDefinition ? '✅' : '❌'} ${data.englishDefinition ? data.englishDefinition.substring(0, 30) + '...' : 'N/A'}`);
        console.log('');
      }
    });

    console.log('\n📈 통계 요약:');
    console.log('------------------------');
    console.log(`총 TOEIC 단어 수: ${stats.total}`);
    console.log(`koreanDefinition 있음: ${stats.hasKoreanDefinition} (${(stats.hasKoreanDefinition/stats.total*100).toFixed(1)}%)`);
    console.log(`korean 있음: ${stats.hasKorean} (${(stats.hasKorean/stats.total*100).toFixed(1)}%)`);
    console.log(`definition 있음: ${stats.hasDefinition} (${(stats.hasDefinition/stats.total*100).toFixed(1)}%)`);
    console.log(`englishDefinition 있음: ${stats.hasEnglishDefinition} (${(stats.hasEnglishDefinition/stats.total*100).toFixed(1)}%)`);
    console.log('------------------------');
    console.log(`한국어+영어 둘 다: ${stats.bothLanguages} (${(stats.bothLanguages/stats.total*100).toFixed(1)}%)`);
    console.log(`영어만: ${stats.onlyEnglish} (${(stats.onlyEnglish/stats.total*100).toFixed(1)}%)`);
    console.log(`정의 없음: ${stats.noDefinition} (${(stats.noDefinition/stats.total*100).toFixed(1)}%)`);

    // 영어만 있는 단어 리스트
    if (stats.onlyEnglish > 0) {
      console.log('\n⚠️ 영어 정의만 있는 단어들:');
      query.docs.forEach(doc => {
        const data = doc.data();
        const hasAnyKorean = data.koreanDefinition || data.korean;
        const hasAnyEnglish = data.definition || data.englishDefinition;

        if (hasAnyEnglish && !hasAnyKorean) {
          console.log(`  - ${data.word} (ID: ${doc.id})`);
        }
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeToeicWords();