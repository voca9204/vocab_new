console.log('=== 캐시 클리어 가이드 ===\n');

console.log('1. 브라우저에서 실행 (개발자 콘솔):');
console.log('   localStorage.clear()');
console.log('   sessionStorage.clear()');
console.log('   location.reload(true)\n');

console.log('2. Next.js 캐시 클리어 (터미널):');
console.log('   rm -rf .next');
console.log('   npm run dev\n');

console.log('3. Service Worker 캐시 (개발자 콘솔):');
console.log(`   caches.keys().then(names => {
     names.forEach(name => caches.delete(name))
   })`);

console.log('\n4. 강제 새로고침:');
console.log('   Chrome/Edge: Ctrl+Shift+R (Windows) 또는 Cmd+Shift+R (Mac)');
console.log('   Firefox: Ctrl+F5 (Windows) 또는 Cmd+Shift+R (Mac)');
console.log('   Safari: Cmd+Option+R (Mac)');

console.log('\n💡 캐시 버전 증가도 고려:');
console.log('   src/lib/cache/cache.ts의 CACHE_VERSION을 증가시키세요');
