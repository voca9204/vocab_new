/**
 * Verification script to check quiz tracking in daily goals
 */

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, query, where, getDocs, Timestamp } = require('firebase/firestore')
const { getAuth } = require('firebase/auth')

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

async function verifyQuizTracking(userId) {
  try {
    console.log('🔍 Verifying quiz tracking for user:', userId)
    
    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 1. Get all user words
    const userWordsQuery = query(
      collection(db, 'user_words'),
      where('userId', '==', userId)
    )
    
    const userWordsSnapshot = await getDocs(userWordsQuery)
    console.log(`\n📚 Total user words: ${userWordsSnapshot.size}`)
    
    // 2. Filter today's studied words
    let todayStudiedCount = 0
    let todayQuizCount = 0
    let todayNewWords = 0
    let todayReviewedWords = 0
    
    userWordsSnapshot.forEach(doc => {
      const data = doc.data()
      const lastStudied = data.studyStatus?.lastStudied
      
      if (lastStudied) {
        // Handle Firestore Timestamp
        let studiedDate
        if (lastStudied.toDate && typeof lastStudied.toDate === 'function') {
          studiedDate = lastStudied.toDate()
        } else if (lastStudied.seconds) {
          studiedDate = new Date(lastStudied.seconds * 1000)
        } else {
          studiedDate = new Date(lastStudied)
        }
        
        // Check if studied today
        if (studiedDate >= today) {
          todayStudiedCount++
          
          // Count quiz attempts
          const quizAttempts = (data.studyStatus.correctCount || 0) + (data.studyStatus.incorrectCount || 0)
          if (quizAttempts > 0) {
            todayQuizCount++
          }
          
          // Count new vs reviewed
          if (data.studyStatus.totalReviews === 1) {
            todayNewWords++
          } else if (data.studyStatus.totalReviews > 1) {
            todayReviewedWords++
          }
        }
      }
    })
    
    // 3. Display results
    console.log('\n📊 Today\'s Study Summary:')
    console.log(`- Studied words: ${todayStudiedCount}`)
    console.log(`- New words: ${todayNewWords}`)
    console.log(`- Reviewed words: ${todayReviewedWords}`)
    console.log(`- Quiz attempts: ${todayQuizCount}`)
    
    // 4. Show sample data
    console.log('\n📝 Sample word data (first 3 today\'s words):')
    let sampleCount = 0
    userWordsSnapshot.forEach(doc => {
      if (sampleCount >= 3) return
      
      const data = doc.data()
      const lastStudied = data.studyStatus?.lastStudied
      
      if (lastStudied) {
        let studiedDate
        if (lastStudied.toDate && typeof lastStudied.toDate === 'function') {
          studiedDate = lastStudied.toDate()
        } else if (lastStudied.seconds) {
          studiedDate = new Date(lastStudied.seconds * 1000)
        } else {
          studiedDate = new Date(lastStudied)
        }
        
        if (studiedDate >= today) {
          console.log(`\nWord ID: ${data.wordId}`)
          console.log(`- Correct: ${data.studyStatus.correctCount || 0}`)
          console.log(`- Incorrect: ${data.studyStatus.incorrectCount || 0}`)
          console.log(`- Total Reviews: ${data.studyStatus.totalReviews || 0}`)
          console.log(`- Mastery Level: ${data.studyStatus.masteryLevel || 0}`)
          console.log(`- Last Studied: ${studiedDate.toLocaleString()}`)
          sampleCount++
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Get user ID from command line or use default
const userId = process.argv[2]

if (!userId) {
  console.log('Usage: node verify-quiz-tracking.js <userId>')
  console.log('Example: node verify-quiz-tracking.js abc123')
  process.exit(1)
}

verifyQuizTracking(userId).then(() => process.exit(0))