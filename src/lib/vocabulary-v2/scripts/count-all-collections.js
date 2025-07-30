const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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

async function countAll() {
  console.log('📊 Counting all documents in production DB...\n');
  
  try {
    // words 컬렉션 카운트
    const wordsRef = collection(db, 'words');
    const wordsSnapshot = await getDocs(wordsRef);
    console.log(`📚 Words collection: ${wordsSnapshot.size} documents`);
    
    // vocabularies 컬렉션 카운트
    const vocabRef = collection(db, 'vocabularies');
    const vocabSnapshot = await getDocs(vocabRef);
    console.log(`📖 Vocabularies collection: ${vocabSnapshot.size} documents`);
    
    // vocabulary_words 컬렉션 카운트
    const vwRef = collection(db, 'vocabulary_words');
    const vwSnapshot = await getDocs(vwRef);
    console.log(`🔗 Vocabulary_words collection: ${vwSnapshot.size} documents`);
    
    // extracted_vocabulary 컬렉션 카운트 (이전 컬렉션)
    const extractedRef = collection(db, 'extracted_vocabulary');
    const extractedSnapshot = await getDocs(extractedRef);
    console.log(`📜 Extracted_vocabulary collection (old): ${extractedSnapshot.size} documents`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

countAll();