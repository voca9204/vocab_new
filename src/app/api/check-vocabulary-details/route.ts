import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { collection, getDocs, query, where } from 'firebase/firestore'

export async function GET() {
  try {
    // 1. 모든 단어장 가져오기
    const vocabSnapshot = await getDocs(collection(db, 'vocabularies'))
    const vocabularies = vocabSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      wordCount: doc.data().wordCount || 0,
      actualWordCount: doc.data().actualWordCount || 0,
      description: doc.data().description,
      createdAt: doc.data().createdAt
    }))
    
    // 2. 각 단어장의 실제 연결된 단어 수 확인
    const vocabularyDetails = []
    
    for (const vocab of vocabularies) {
      const wordsQuery = query(
        collection(db, 'vocabulary_words'),
        where('vocabularyId', '==', vocab.id)
      )
      const wordsSnapshot = await getDocs(wordsQuery)
      
      vocabularyDetails.push({
        ...vocab,
        actualMappingCount: wordsSnapshot.size,
        mappings: wordsSnapshot.size > 0 ? 
          wordsSnapshot.docs.slice(0, 5).map(doc => ({
            wordId: doc.data().wordId,
            order: doc.data().order
          })) : []
      })
    }
    
    // 3. 전체 vocabulary_words 수 확인
    const allMappingsSnapshot = await getDocs(collection(db, 'vocabulary_words'))
    
    return NextResponse.json({
      success: true,
      vocabularies: vocabularyDetails,
      totalMappings: allMappingsSnapshot.size,
      summary: {
        totalVocabularies: vocabularies.length,
        vocabularyNames: vocabularies.map(v => v.name)
      }
    })
  } catch (error) {
    console.error('Error checking vocabulary details:', error)
    return NextResponse.json(
      { error: 'Failed to check vocabulary details' },
      { status: 500 }
    )
  }
}