const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc } = require('firebase/firestore');
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

async function checkWordExamples() {
  console.log('📊 Checking word examples in production DB...\n');
  
  try {
    // Check "abase" word specifically
    const wordsRef = collection(db, 'words');
    const abaseQuery = await getDocs(query(wordsRef, where('word', '==', 'abase')));
    
    if (!abaseQuery.empty) {
      const abaseDoc = abaseQuery.docs[0];
      const abaseData = abaseDoc.data();
      
      console.log('🔍 Word "abase" found:');
      console.log('ID:', abaseDoc.id);
      console.log('Definitions:', JSON.stringify(abaseData.definitions, null, 2));
      console.log('AI Generated:', abaseData.aiGenerated);
      console.log('\n');
      
      // Check if any definitions have examples
      const hasExamples = abaseData.definitions?.some(def => def.examples && def.examples.length > 0);
      console.log('Has examples:', hasExamples);
      
      if (hasExamples) {
        abaseData.definitions.forEach((def, index) => {
          if (def.examples && def.examples.length > 0) {
            console.log(`\nDefinition ${index + 1} examples:`, def.examples);
          }
        });
      }
    } else {
      console.log('❌ Word "abase" not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

// Import necessary functions
const { query, where, getDocs } = require('firebase/firestore');

checkWordExamples();