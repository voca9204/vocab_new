/**
 * Check pronunciation data in the new DB structure
 */

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore')

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBq6n-PNsMT_UlSvGNDQjflxlOugHsg3iI",
  authDomain: "vocabulary-app-new.firebaseapp.com",
  projectId: "vocabulary-app-new",
  storageBucket: "vocabulary-app-new.firebasestorage.app",
  messagingSenderId: "1047659326965",
  appId: "1:1047659326965:web:df604e5b18e07e7b35ad73"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function checkPronunciations() {
  try {
    console.log('🔍 Checking pronunciation data in words collection...\n')
    
    // Get sample words from words collection
    const wordsQuery = query(collection(db, 'words'), limit(20))
    const wordsSnapshot = await getDocs(wordsQuery)
    
    console.log(`📚 Found ${wordsSnapshot.size} words in the words collection`)
    
    let wordsWithPronunciation = 0
    let wordsWithoutPronunciation = 0
    
    console.log('\n📝 Sample words:')
    wordsSnapshot.forEach(doc => {
      const data = doc.data()
      const hasPronunciation = !!data.pronunciation
      
      if (hasPronunciation) {
        wordsWithPronunciation++
      } else {
        wordsWithoutPronunciation++
      }
      
      console.log(`\n- Word: ${data.word}`)
      console.log(`  ID: ${doc.id}`)
      console.log(`  Pronunciation: ${data.pronunciation || 'NONE'}`)
      console.log(`  Part of Speech: ${data.partOfSpeech?.join(', ') || 'N/A'}`)
      console.log(`  Difficulty: ${data.difficulty || 'N/A'}`)
    })
    
    console.log('\n📊 Summary:')
    console.log(`- Words with pronunciation: ${wordsWithPronunciation}`)
    console.log(`- Words without pronunciation: ${wordsWithoutPronunciation}`)
    console.log(`- Total checked: ${wordsSnapshot.size}`)
    
    // Check old collections too
    console.log('\n\n🔍 Checking old extracted_vocabulary collection...')
    const extractedQuery = query(collection(db, 'extracted_vocabulary'), limit(10))
    const extractedSnapshot = await getDocs(extractedQuery)
    
    if (extractedSnapshot.size > 0) {
      console.log(`\n📚 Found ${extractedSnapshot.size} words in extracted_vocabulary`)
      let extractedWithPronunciation = 0
      
      extractedSnapshot.forEach(doc => {
        const data = doc.data()
        if (data.pronunciation) {
          extractedWithPronunciation++
        }
      })
      
      console.log(`- Words with pronunciation: ${extractedWithPronunciation}`)
    } else {
      console.log('✅ extracted_vocabulary collection is empty or deleted')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
  
  process.exit(0)
}

checkPronunciations()