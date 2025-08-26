// TOEFL 공식 단어장 생성 스크립트
const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'vocabulary-app-new'
  });
}

const db = admin.firestore();

async function createTOEFLCollection() {
  try {
    console.log('🔍 기존 TOEFL 단어장 확인 중...');
    
    // 기존 TOEFL 단어장 확인
    const existingSnapshot = await db
      .collection('vocabulary_collections')
      .where('name', '==', 'TOEFL 공식 단어장')
      .get();
    
    if (!existingSnapshot.empty) {
      console.log('⚠️ TOEFL 공식 단어장이 이미 존재합니다.');
      const doc = existingSnapshot.docs[0];
      console.log('단어장 ID:', doc.id);
      console.log('단어 수:', doc.data().words?.length || 0);
      return doc.id;
    }
    
    // 새 TOEFL 단어장 생성
    console.log('✨ 새 TOEFL 공식 단어장 생성 중...');
    
    const newCollection = await db.collection('vocabulary_collections').add({
      name: 'TOEFL 공식 단어장',
      description: '관리자가 추가한 공식 TOEFL 단어들',
      type: 'official',
      vocabularyType: 'TOEFL',
      userId: 'admin',
      words: [],
      isPrivate: false,
      isOfficial: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ TOEFL 공식 단어장 생성 완료!');
    console.log('단어장 ID:', newCollection.id);
    
    return newCollection.id;
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
createTOEFLCollection()
  .then(collectionId => {
    console.log('📚 작업 완료! 단어장 ID:', collectionId);
    process.exit(0);
  })
  .catch(error => {
    console.error('실행 실패:', error);
    process.exit(1);
  });