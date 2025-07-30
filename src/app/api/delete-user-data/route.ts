import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log(`[delete-user-data] Deleting all user data for userId: ${userId}`)

    // user_words 컬렉션에서 해당 사용자의 모든 데이터 조회
    const userWordsQuery = query(
      collection(db, 'user_words'),
      where('userId', '==', userId)
    )
    
    const userWordsSnapshot = await getDocs(userWordsQuery)
    console.log(`[delete-user-data] Found ${userWordsSnapshot.docs.length} user_words documents`)
    
    // 배치 삭제 (한 번에 500개씩 처리)
    const batchSize = 500
    let deletedCount = 0
    
    for (let i = 0; i < userWordsSnapshot.docs.length; i += batchSize) {
      const batch = userWordsSnapshot.docs.slice(i, i + batchSize)
      
      const deletePromises = batch.map(docSnapshot => 
        deleteDoc(doc(db, 'user_words', docSnapshot.id))
      )
      
      await Promise.all(deletePromises)
      deletedCount += batch.length
      
      console.log(`[delete-user-data] Deleted batch: ${batch.length} documents (total: ${deletedCount})`)
    }

    // user_vocabularies 컬렉션에서 해당 사용자의 구독 데이터도 삭제
    const userVocabQuery = query(
      collection(db, 'user_vocabularies'),
      where('userId', '==', userId)
    )
    
    const userVocabSnapshot = await getDocs(userVocabQuery)
    console.log(`[delete-user-data] Found ${userVocabSnapshot.docs.length} user_vocabularies documents`)
    
    for (const docSnapshot of userVocabSnapshot.docs) {
      await deleteDoc(doc(db, 'user_vocabularies', docSnapshot.id))
    }

    console.log(`[delete-user-data] Successfully deleted all data for user ${userId}`)
    console.log(`[delete-user-data] Total deleted: ${deletedCount} user_words, ${userVocabSnapshot.docs.length} user_vocabularies`)

    return NextResponse.json({
      success: true,
      message: `총 ${deletedCount}개의 학습 기록이 삭제되었습니다.`,
      deleted: {
        userWords: deletedCount,
        userVocabularies: userVocabSnapshot.docs.length
      }
    })

  } catch (error) {
    console.error('[delete-user-data] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '데이터 삭제 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}