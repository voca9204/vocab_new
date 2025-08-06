// 통합 시스템 테스트 - 브라우저 콘솔에서 실행
// UnifiedWord 시스템이 정상 작동하는지 확인

console.log('=== 통합 시스템 테스트 시작 ===');

async function testUnifiedSystem() {
  try {
    // 1. VocabularyContext 상태 확인
    console.log('\n1. VocabularyContext 상태 확인');
    
    // React DevTools 또는 window 객체를 통해 접근
    const contextState = window.__VOCABULARY_CONTEXT_STATE__ || 'Context state not available';
    console.log('Context state:', contextState);
    
    // 2. WordAdapter 통계 확인
    console.log('\n2. WordAdapter 통계');
    
    // DOM에서 어댑터 통계를 가져올 수 있는 버튼이나 방법이 있다면
    // 또는 개발자 도구에서 직접 확인
    
    // 3. 단어 모달 테스트
    console.log('\n3. 단어 모달 테스트');
    
    const modal = document.querySelector('[data-testid="word-detail-modal"]');
    if (modal) {
      const wordTitle = modal.querySelector('h2')?.textContent;
      const definition = modal.querySelector('.text-lg')?.textContent;
      const examples = modal.querySelectorAll('.bg-green-50 .text-green-700');
      const etymology = modal.querySelector('.bg-blue-50');
      const synonyms = modal.querySelectorAll('.bg-green-50.text-green-700');
      
      console.log('모달 상태:');
      console.log('- 단어:', wordTitle);
      console.log('- 정의:', definition);
      console.log('- 예문 개수:', examples.length);
      console.log('- 영어 정의 있음:', !!etymology);
      console.log('- 유사어 개수:', synonyms.length);
      
      // 정의가 "No definition available"인지 확인
      if (definition === 'No definition available') {
        console.error('❌ 정의가 로드되지 않았습니다!');
        return false;
      } else {
        console.log('✅ 정의가 정상적으로 로드되었습니다');
      }
      
    } else {
      console.log('모달이 열려있지 않습니다. 단어를 클릭하여 모달을 열어주세요.');
      return false;
    }
    
    // 4. 콘솔 로그 확인
    console.log('\n4. 시스템 로그 확인');
    console.log('다음 로그들을 확인해주세요:');
    console.log('- [VocabularyContext] Loading words with adapter...');
    console.log('- [WordDetailModal] Unified word data:');
    console.log('- [WordAdapter] 관련 로그들');
    
    return true;
    
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
    return false;
  }
}

// 5. 데이터 구조 검증 함수
function validateWordStructure(word) {
  console.log('\n=== 단어 구조 검증 ===');
  
  const requiredFields = ['id', 'word', 'definition', 'examples', 'partOfSpeech'];
  const missingFields = requiredFields.filter(field => !(field in word));
  
  if (missingFields.length > 0) {
    console.error('❌ 필수 필드 누락:', missingFields);
    return false;
  }
  
  console.log('✅ 모든 필수 필드가 있습니다');
  console.log('단어 구조:', {
    id: word.id,
    word: word.word,
    definition: typeof word.definition,
    examples: Array.isArray(word.examples) ? `array(${word.examples.length})` : typeof word.examples,
    partOfSpeech: Array.isArray(word.partOfSpeech) ? `array(${word.partOfSpeech.length})` : typeof word.partOfSpeech,
    source: word.source
  });
  
  return true;
}

// 6. 실시간 모니터링 설정
function setupMonitoring() {
  console.log('\n=== 실시간 모니터링 시작 ===');
  
  // 네트워크 요청 모니터링
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && (
      url.includes('veterans_vocabulary') || 
      url.includes('vocabulary') || 
      url.includes('words')
    )) {
      console.log('🔍 데이터베이스 요청:', url);
    }
    return originalFetch.apply(this, args);
  };
  
  // 에러 모니터링
  window.addEventListener('error', (event) => {
    if (event.error?.message?.includes('definition') || 
        event.error?.message?.includes('word') ||
        event.error?.message?.includes('adapter')) {
      console.error('🚨 시스템 관련 에러:', event.error);
    }
  });
  
  console.log('✅ 모니터링이 활성화되었습니다');
}

// 테스트 실행
console.log('테스트 시작...');
setupMonitoring();

// 모달이 이미 열려있으면 바로 테스트
if (document.querySelector('[data-testid="word-detail-modal"]')) {
  testUnifiedSystem();
} else {
  console.log('단어를 클릭하여 모달을 열고 다시 테스트해주세요.');
  console.log('모달이 열리면 testUnifiedSystem()을 실행하세요.');
}

// 전역 함수로 노출
window.testUnifiedSystem = testUnifiedSystem;
window.validateWordStructure = validateWordStructure;

console.log('\n사용 가능한 테스트 함수:');
console.log('- testUnifiedSystem(): 전체 시스템 테스트');
console.log('- validateWordStructure(word): 단어 구조 검증');