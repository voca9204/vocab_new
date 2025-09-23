// 브라우저 콘솔에서 실행할 디버깅 코드
// 이 코드를 브라우저 개발자 도구 콘솔에 복사해서 실행하세요

// 1. localStorage 확인
console.log('=== localStorage 확인 ===')
const collections = localStorage.getItem('collections_cache')
if (collections) {
  const parsed = JSON.parse(collections)
  console.log('캐시된 컬렉션:', parsed)
  const academyCollections = parsed.filter(c => c.category === '학원')
  console.log('학원 카테고리 컬렉션:', academyCollections)
} else {
  console.log('캐시된 컬렉션 없음')
}

// 2. 캐시 강제 초기화
console.log('\n=== 캐시 초기화 ===')
console.log('캐시를 초기화하려면 다음 명령어를 실행하세요:')
console.log('localStorage.removeItem("collections_cache")')
console.log('localStorage.removeItem("collection_cache_timestamp")')
console.log('그 다음 페이지를 새로고침하세요')

// 3. API 직접 호출 테스트
console.log('\n=== API 직접 호출 ===')
fetch('/api/collections/official?category=학원')
  .then(res => res.json())
  .then(data => {
    console.log('학원 카테고리 API 응답:', data)
  })
  .catch(err => {
    console.error('API 에러:', err)
  })