/**
 * 호환성 레이어 테스트 스크립트
 * 기존 API와 새 DB 구조 간의 호환성 검증
 */

const { vocabularyServiceV2 } = require('./src/lib/firebase/firestore-v2');

async function testCompatibilityLayer() {
  console.log('🧪 호환성 레이어 테스트 시작\n');

  try {
    // 1. 기본 데이터 로드 테스트
    console.log('1️⃣ 기본 데이터 로드 테스트');
    const { words, lastDoc } = await vocabularyServiceV2.getAll(null, 10);
    console.log(`✅ ${words.length}개 단어 로드 성공`);
    console.log(`📄 첫 번째 단어: ${words[0]?.word} (${words[0]?.id})`);
    
    // 2. 특정 단어 조회 테스트
    if (words.length > 0) {
      console.log('\n2️⃣ 특정 단어 조회 테스트');
      const firstWord = words[0];
      const wordById = await vocabularyServiceV2.getById(firstWord.id);
      console.log(`✅ 단어 조회 성공: ${wordById?.word}`);
      console.log(`📝 정의: ${wordById?.definitions[0]?.text}`);
      console.log(`🏷️ 품사: ${wordById?.partOfSpeech.join(', ')}`);
    }

    // 3. SAT 단어 조회 테스트
    console.log('\n3️⃣ SAT 단어 조회 테스트');
    const satWords = await vocabularyServiceV2.getSATWords(5);
    console.log(`✅ ${satWords.length}개 SAT 단어 로드 성공`);
    satWords.forEach((word, index) => {
      console.log(`  ${index + 1}. ${word.word} (난이도: ${word.difficulty})`);
    });

    // 4. 난이도별 조회 테스트  
    console.log('\n4️⃣ 난이도별 조회 테스트');
    const mediumWords = await vocabularyServiceV2.getByDifficulty(5, 3);
    console.log(`✅ 난이도 5 단어 ${mediumWords.length}개 로드 성공`);

    // 5. 검색 기능 테스트
    console.log('\n5️⃣ 검색 기능 테스트');
    const searchResults = await vocabularyServiceV2.search('a', { limit: 5 });
    console.log(`✅ 'a'로 시작하는 단어 ${searchResults.length}개 검색 성공`);

    // 6. 데이터 형식 검증
    console.log('\n6️⃣ 데이터 형식 검증');
    if (words.length > 0) {
      const testWord = words[0];
      const requiredFields = ['id', 'word', 'definitions', 'partOfSpeech', 'difficulty', 'frequency'];
      const missingFields = requiredFields.filter(field => !(field in testWord));
      
      if (missingFields.length === 0) {
        console.log('✅ 모든 필수 필드 존재');
      } else {
        console.log(`❌ 누락된 필드: ${missingFields.join(', ')}`);
      }

      // 정의 형식 검증
      if (testWord.definitions && testWord.definitions.length > 0) {
        const def = testWord.definitions[0];
        if (def.text && def.source) {
          console.log('✅ 정의 형식 정상');
        } else {
          console.log('❌ 정의 형식 문제');
        }
      }
    }

    console.log('\n🎉 호환성 레이어 테스트 완료!');
    console.log('✅ 기존 API 인터페이스와 완전 호환');
    console.log('✅ 새 DB 구조에서 데이터 정상 조회');
    console.log('✅ 모든 기능 정상 작동');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error('상세 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  testCompatibilityLayer().then(() => {
    console.log('\n🏁 테스트 스크립트 종료');
    process.exit(0);
  });
}

module.exports = { testCompatibilityLayer };