import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore'

export async function POST() {
  try {
    console.log('Starting cleanup of duplicate vocabulary')
    
    // Veterans SAT 3000 단어장 찾기
    const vocabQuery = query(
      collection(db, 'vocabularies'),
      where('name', '==', 'Veterans SAT 3000')
    )
    const vocabSnapshot = await getDocs(vocabQuery)
    
    if (vocabSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'Veterans SAT 3000 vocabulary not found',
        deleted: false
      })
    }
    
    const veteransVocab = vocabSnapshot.docs[0]
    const veteransId = veteransVocab.id
    
    console.log(`Found Veterans SAT 3000 with id: ${veteransId}`)
    
    // 연결된 vocabulary_words가 있는지 확인
    const mappingsQuery = query(
      collection(db, 'vocabulary_words'),
      where('vocabularyId', '==', veteransId)
    )
    const mappingsSnapshot = await getDocs(mappingsQuery)
    
    console.log(`Found ${mappingsSnapshot.size} mappings for Veterans SAT 3000`)
    
    if (mappingsSnapshot.size > 0) {
      // 매핑이 있으면 먼저 삭제
      const deletePromises = mappingsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      )
      await Promise.all(deletePromises)
      console.log(`Deleted ${mappingsSnapshot.size} mappings`)
    }
    
    // Veterans SAT 3000 단어장 삭제
    await deleteDoc(doc(db, 'vocabularies', veteransId))
    console.log('Deleted Veterans SAT 3000 vocabulary')
    
    return NextResponse.json({
      success: true,
      message: 'Successfully cleaned up duplicate vocabulary',
      deleted: true,
      details: {
        vocabularyId: veteransId,
        mappingsDeleted: mappingsSnapshot.size
      }
    })
  } catch (error) {
    console.error('Error cleaning up duplicate vocabulary:', error)
    return NextResponse.json(
      { 
        error: 'Failed to cleanup duplicate vocabulary',
        details: error.message 
      },
      { status: 500 }
    )
  }
}