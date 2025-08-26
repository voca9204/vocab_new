import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore()
    
    console.log('🔍 기존 TOEFL 단어장 확인 중...')
    
    // 기존 TOEFL 단어장 확인
    const existingSnapshot = await db
      .collection('vocabulary_collections')
      .where('name', '==', 'TOEFL 공식 단어장')
      .get()
    
    if (!existingSnapshot.empty) {
      const doc = existingSnapshot.docs[0]
      console.log('⚠️ TOEFL 공식 단어장이 이미 존재합니다.')
      console.log('단어장 ID:', doc.id)
      console.log('단어 수:', doc.data().words?.length || 0)
      
      return NextResponse.json({
        success: true,
        exists: true,
        collectionId: doc.id,
        wordCount: doc.data().words?.length || 0,
        message: 'TOEFL 공식 단어장이 이미 존재합니다.'
      })
    }
    
    // 새 TOEFL 단어장 생성
    console.log('✨ 새 TOEFL 공식 단어장 생성 중...')
    
    const newCollection = await db.collection('vocabulary_collections').add({
      name: 'TOEFL 공식 단어장',
      description: '관리자가 추가한 공식 TOEFL 단어들',
      type: 'official',
      vocabularyType: 'TOEFL',
      userId: 'admin',
      words: [],
      isPrivate: false,
      isOfficial: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    console.log('✅ TOEFL 공식 단어장 생성 완료!')
    console.log('단어장 ID:', newCollection.id)
    
    return NextResponse.json({
      success: true,
      exists: false,
      collectionId: newCollection.id,
      message: 'TOEFL 공식 단어장이 성공적으로 생성되었습니다.'
    })
    
  } catch (error) {
    console.error('❌ TOEFL 단어장 생성 오류:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}