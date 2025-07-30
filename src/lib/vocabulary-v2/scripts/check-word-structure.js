const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, limit } = require('firebase/firestore');
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

async function checkWordStructure() {
  console.log('📊 Checking word structure in production DB...\n');
  
  try {
    // Get first 5 words to check structure
    const wordsRef = collection(db, 'words');
    const q = query(wordsRef, limit(5));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} words\n`);
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n📝 Word ${index + 1}: "${data.word}"`);
      console.log('ID:', doc.id);
      console.log('Etymology (영어설명):', data.etymology ? data.etymology.substring(0, 100) + '...' : 'None');
      console.log('Real Etymology (실제 어원):', data.realEtymology ? data.realEtymology.substring(0, 100) + '...' : 'None');
      console.log('Has AI Generated Etymology:', data.aiGenerated?.etymology || false);
      console.log('Definitions:', data.definitions?.length || 0);
      
      if (data.definitions && data.definitions.length > 0) {
        const def = data.definitions[0];
        console.log('First definition:', def.definition);
        console.log('Has examples:', (def.examples?.length || 0) > 0);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkWordStructure();