const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkWords() {
  console.log('🔍 Checking words collection in production DB...\n');
  
  try {
    // words 컬렉션 확인
    const wordsRef = collection(db, 'words');
    const wordsQuery = query(wordsRef, limit(5));
    const wordsSnapshot = await getDocs(wordsQuery);
    
    console.log(`📚 Words collection: ${wordsSnapshot.size} documents (showing first 5)`);
    wordsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.word} (ID: ${doc.id})`);
    });
    
    // vocabularies 컬렉션 확인
    console.log('\n📖 Checking vocabularies collection...');
    const vocabRef = collection(db, 'vocabularies');
    const vocabQuery = query(vocabRef, limit(5));
    const vocabSnapshot = await getDocs(vocabQuery);
    
    console.log(`📚 Vocabularies collection: ${vocabSnapshot.size} documents`);
    vocabSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name} (ID: ${doc.id}, Type: ${data.type})`);
    });
    
    // vocabulary_words 컬렉션 확인
    console.log('\n🔗 Checking vocabulary_words collection...');
    const vwRef = collection(db, 'vocabulary_words');
    const vwQuery = query(vwRef, limit(5));
    const vwSnapshot = await getDocs(vwQuery);
    
    console.log(`🔗 Vocabulary_words collection: ${vwSnapshot.size} documents (showing first 5)`);
    vwSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - Word: ${data.wordId}, Vocab: ${data.vocabularyId}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkWords();