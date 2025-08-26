// Test script to verify personal collections are loading properly
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, connectFirestoreEmulator } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword, connectAuthEmulator } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyBPmD00K8J0SN5vZ_I_fN3TQYw-Ik6XnHQ",
  authDomain: "vocabulary-app-new.firebaseapp.com",
  projectId: "vocabulary-app-new",
  storageBucket: "vocabulary-app-new.firebasestorage.app",
  messagingSenderId: "203198017310",
  appId: "1:203198017310:web:c2c02e8bd63a6f45b1577b",
  measurementId: "G-5P2FPG67H2"
};

async function testPersonalCollections() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  // Connect to emulators
  try {
    connectFirestoreEmulator(db, 'localhost', 8181);
    connectAuthEmulator(auth, 'http://localhost:9199');
  } catch (error) {
    // Already connected
  }
  
  // Sign in with test user
  try {
    await signInWithEmailAndPassword(auth, 'test@example.com', 'test123456');
    console.log('Signed in as test@example.com');
  } catch (error) {
    console.log('Could not sign in, creating test user...');
    // User might not exist in emulator, but that's ok for this test
  }
  
  console.log('Testing Personal Collections...\n');
  
  try {
    // 1. Get all personal collections
    const personalCollectionsSnapshot = await getDocs(collection(db, 'personal_collections'));
    console.log(`Found ${personalCollectionsSnapshot.size} personal collections`);
    
    for (const docSnap of personalCollectionsSnapshot.docs) {
      const data = docSnap.data();
      console.log(`\nCollection: ${data.name} (ID: ${docSnap.id})`);
      console.log(`  - User: ${data.userId}`);
      console.log(`  - Word IDs: ${data.words?.length || 0} words`);
      
      if (data.words && data.words.length > 0) {
        console.log(`  - First 3 word IDs: ${data.words.slice(0, 3).join(', ')}`);
        
        // Try to fetch the first word
        const firstWordId = data.words[0];
        
        // Try words collection first
        try {
          const wordDoc = await getDoc(doc(db, 'words', firstWordId));
          if (wordDoc.exists()) {
            console.log(`  - First word from 'words': ${wordDoc.data().word}`);
          } else {
            // Try veterans_vocabulary
            const veteransDoc = await getDoc(doc(db, 'veterans_vocabulary', firstWordId));
            if (veteransDoc.exists()) {
              console.log(`  - First word from 'veterans_vocabulary': ${veteransDoc.data().word}`);
            } else {
              console.log(`  - Word ${firstWordId} not found in any collection`);
            }
          }
        } catch (error) {
          console.log(`  - Error fetching word: ${error.message}`);
        }
      } else {
        console.log(`  - No word IDs in this collection`);
        
        // Check if it's a legacy collection
        if (data.name?.includes('V.ZIP') || data.name?.includes('veterans')) {
          console.log(`  - This appears to be a legacy V.ZIP collection`);
          
          // Try to load some veterans_vocabulary words
          const veteransSnapshot = await getDocs(collection(db, 'veterans_vocabulary'));
          console.log(`  - Found ${veteransSnapshot.size} words in veterans_vocabulary`);
          
          if (veteransSnapshot.size > 0) {
            const firstWord = veteransSnapshot.docs[0].data();
            console.log(`  - Sample word: ${firstWord.word}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testPersonalCollections();