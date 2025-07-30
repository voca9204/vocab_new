/**
 * Test script to verify quiz completion tracking
 * 
 * This script simulates quiz completion and checks if it's reflected in daily goals
 */

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, query, where, getDocs, updateDoc, doc, increment, Timestamp } = require('firebase/firestore')
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth')

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
const auth = getAuth(app)

async function testQuizTracking() {
  try {
    // 1. Sign in (you'll need to provide test credentials)
    console.log('🔐 Signing in...')
    const userCred = await signInWithEmailAndPassword(auth, 'test@example.com', 'password123')
    const userId = userCred.user.uid
    console.log('✅ Signed in as:', userId)

    // 2. Get user's words from user_words collection
    console.log('\n📚 Fetching user words...')
    const userWordsQuery = query(
      collection(db, 'user_words'),
      where('userId', '==', userId)
    )
    const userWordsSnapshot = await getDocs(userWordsQuery)
    console.log(`Found ${userWordsSnapshot.size} user words`)

    // 3. Simulate quiz completion for first 10 words
    console.log('\n🎯 Simulating quiz completion...')
    const wordsToUpdate = userWordsSnapshot.docs.slice(0, 10)
    
    for (let i = 0; i < wordsToUpdate.length; i++) {
      const userWordDoc = wordsToUpdate[i]
      const userWordData = userWordDoc.data()
      
      // Simulate correct answer
      const isCorrect = Math.random() > 0.3 // 70% correct rate
      
      const updates = {
        'studyStatus.studied': true,
        'studyStatus.lastStudied': Timestamp.fromDate(new Date()),
        'studyStatus.lastResult': isCorrect ? 'correct' : 'incorrect',
        'studyStatus.totalReviews': increment(1),
        updatedAt: Timestamp.fromDate(new Date())
      }
      
      if (isCorrect) {
        updates['studyStatus.correctCount'] = increment(1)
      } else {
        updates['studyStatus.incorrectCount'] = increment(1)
      }
      
      await updateDoc(doc(db, 'user_words', userWordDoc.id), updates)
      console.log(`✅ Updated word ${i + 1}/10: ${userWordData.wordId} - ${isCorrect ? 'correct' : 'incorrect'}`)
    }

    // 4. Check today's study records
    console.log('\n📊 Checking today\'s study records...')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayWordsQuery = query(
      collection(db, 'user_words'),
      where('userId', '==', userId),
      where('studyStatus.studied', '==', true)
    )
    
    const todayWordsSnapshot = await getDocs(todayWordsQuery)
    let quizCount = 0
    
    todayWordsSnapshot.forEach(doc => {
      const data = doc.data()
      const lastStudied = data.studyStatus?.lastStudied
      
      if (lastStudied) {
        const studiedDate = lastStudied.toDate()
        if (studiedDate >= today) {
          const totalQuizAttempts = (data.studyStatus.correctCount || 0) + (data.studyStatus.incorrectCount || 0)
          if (totalQuizAttempts > 0) {
            quizCount++
          }
        }
      }
    })
    
    console.log(`\n✅ Summary:`)
    console.log(`- Total studied words today: ${todayWordsSnapshot.size}`)
    console.log(`- Words with quiz attempts: ${quizCount}`)
    console.log(`\n🎉 Quiz tracking test completed! Check /study/daily page to verify.`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
  
  process.exit(0)
}

// Run the test
testQuizTracking()