/**
 * Create test photo vocabulary collection data
 * This will be called from the browser console or a React component
 */

import { doc, setDoc, collection, writeBatch, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export async function createTestPhotoCollection() {
  console.log('Creating test photo vocabulary collection...')
  
  const testUserId = 'test-user-123'
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD
  
  // Test collection data
  const collectionId = 'Y0QXkvMribs5JshqzHFy' // Use the ID from the error log
  const collectionData = {
    id: collectionId,
    userId: testUserId,
    title: '테스트 사진 단어장',
    description: '5개 단어 추출',
    date: dateStr,
    photoUrl: 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Test+Photo',
    thumbnailUrl: null,
    category: '테스트',
    source: null,
    tags: ['테스트', '예제'],
    totalWords: 5,
    studiedWords: 2,
    masteredWords: 1,
    accuracyRate: 80,
    firstStudiedAt: null,
    lastStudiedAt: Timestamp.fromDate(today),
    studyCount: 3,
    averageScore: 85,
    createdAt: Timestamp.fromDate(today),
    updatedAt: Timestamp.fromDate(today),
    isArchived: false
  }
  
  // Test words data
  const testWords = [
    {
      word: 'vocabulary',
      definition: '어휘, 단어집',
      context: 'Building vocabulary is essential for language learning.',
      studied: true,
      masteryLevel: 85
    },
    {
      word: 'collection',
      definition: '수집, 모음',
      context: 'This is a collection of important words.',
      studied: true,
      masteryLevel: 70
    },
    {
      word: 'definition',
      definition: '정의, 의미',
      context: 'Each word needs a clear definition.',
      studied: false,
      masteryLevel: 0
    },
    {
      word: 'context',
      definition: '맥락, 문맥',
      context: 'Understanding context helps with comprehension.',
      studied: false,
      masteryLevel: 0
    },
    {
      word: 'mastery',
      definition: '숙달, 정통',
      context: 'Achieving mastery requires consistent practice.',
      studied: false,
      masteryLevel: 0
    }
  ]
  
  try {
    // Create collection document
    await setDoc(doc(db, 'photo_vocabulary_collections', collectionId), collectionData)
    console.log('✅ Created collection:', collectionId)
    
    // Create word documents
    const batch = writeBatch(db)
    
    testWords.forEach((wordData, index) => {
      const wordId = `test-word-${index + 1}`
      const wordDoc = {
        id: wordId,
        userId: testUserId,
        collectionId: collectionId,
        word: wordData.word,
        normalizedWord: wordData.word.toLowerCase(),
        definition: wordData.definition,
        context: wordData.context,
        position: null,
        pronunciation: null,
        difficulty: null,
        frequency: null,
        relatedWords: [],
        studyStatus: {
          studied: wordData.studied,
          masteryLevel: wordData.masteryLevel,
          reviewCount: wordData.studied ? 2 : 0,
          correctCount: wordData.studied ? 1 : 0,
          incorrectCount: wordData.studied ? 1 : 0,
          firstStudiedAt: wordData.studied ? Timestamp.fromDate(today) : null,
          lastStudiedAt: wordData.studied ? Timestamp.fromDate(today) : null,
          nextReviewAt: null
        },
        createdAt: Timestamp.fromDate(today),
        updatedAt: Timestamp.fromDate(today),
        isActive: true
      }
      
      const wordRef = doc(db, 'photo_vocabulary_words', wordId)
      batch.set(wordRef, wordDoc)
    })
    
    await batch.commit()
    console.log('✅ Created', testWords.length, 'test words')
    
    console.log('\n🎉 Test data created successfully!')
    console.log(`\nYou can now test the collection detail page at:`)
    console.log(`http://localhost:3100/study/photo-vocab/collections/${collectionId}`)
    
    return { collectionId, success: true }
    
  } catch (error) {
    console.error('❌ Error creating test data:', error)
    throw error
  }
}