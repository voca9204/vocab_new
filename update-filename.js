// 파일명 업데이트 스크립트
async function updateFilename() {
  try {
    const response = await fetch('http://localhost:3000/api/update-source', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'YOUR_USER_ID', // 실제 사용자 ID로 변경 필요
        oldFilename: '[SAT] 24FW V.ZIP 3K.pdf',
        newFilename: 'veterans_24FW.pdf'
      })
    });

    const result = await response.json();
    console.log(result);
  } catch (error) {
    console.error('Error:', error);
  }
}

console.log('브라우저 콘솔에서 다음을 실행하세요:');
console.log('1. 로그인한 상태에서 개발자 도구를 열고');
console.log('2. 콘솔에서 다음 코드를 실행:');
console.log(`
fetch('/api/update-source', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_USER_ID', // Firebase Auth에서 확인
    oldFilename: '[SAT] 24FW V.ZIP 3K.pdf',
    newFilename: 'veterans_24FW.pdf'
  })
}).then(r => r.json()).then(console.log)
`);