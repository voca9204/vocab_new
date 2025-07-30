const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
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

// Import the services
const { WordService } = require('../../../dist/lib/vocabulary-v2/word-service.js');

async function testGetById() {
  console.log('🧪 Testing getById functionality...\n');
  
  try {
    const wordService = new WordService();
    
    // Test with the abase word ID
    const wordId = 'MCXaUmMAJGD5DfmtearR';
    console.log('Fetching word with ID:', wordId);
    
    const word = await wordService.getWordById(wordId);
    
    if (word) {
      console.log('\n✅ Word found:');
      console.log('Word:', word.word);
      console.log('Definitions:', JSON.stringify(word.definitions, null, 2));
      
      // Check examples
      const hasExamples = word.definitions?.some(def => def.examples && def.examples.length > 0);
      console.log('\nHas examples:', hasExamples);
      
      if (hasExamples) {
        word.definitions.forEach((def, index) => {
          if (def.examples && def.examples.length > 0) {
            console.log(`\nDefinition ${index + 1} examples:`, def.examples);
          }
        });
      }
    } else {
      console.log('❌ Word not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testGetById();