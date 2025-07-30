const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
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

async function checkAbaseFull() {
  console.log('📊 Checking abase word full structure...\n');
  
  try {
    const wordRef = doc(db, 'words', 'MCXaUmMAJGD5DfmtearR');
    const wordDoc = await getDoc(wordRef);
    
    if (wordDoc.exists()) {
      const data = wordDoc.data();
      console.log('🔍 Full "abase" word data:');
      console.log('Word:', data.word);
      console.log('Etymology:', data.etymology);
      console.log('Real Etymology:', data.realEtymology);
      console.log('AI Generated:', JSON.stringify(data.aiGenerated, null, 2));
      console.log('\nFull data structure:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Word not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkAbaseFull();