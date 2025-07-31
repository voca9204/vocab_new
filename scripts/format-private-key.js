// Firebase Admin Private Key 포맷팅 스크립트
// 사용법: node scripts/format-private-key.js

const fs = require('fs');
const path = require('path');

// service-account.json 파일 읽기
const serviceAccountPath = path.join(__dirname, '../service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Private Key를 Vercel 환경 변수용으로 포맷팅
const formattedKey = serviceAccount.private_key.replace(/\n/g, '\\n');

console.log('Vercel 환경 변수에 복사할 FIREBASE_ADMIN_PRIVATE_KEY 값:');
console.log('=====================================');
console.log(formattedKey);
console.log('=====================================');
console.log('\n위의 값을 복사해서 Vercel 환경 변수에 붙여넣으세요.');
console.log('주의: 앞뒤에 따옴표를 넣지 마세요!');