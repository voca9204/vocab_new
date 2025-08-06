import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

interface UpdateSynonymsRequest {
  wordId: string
  synonyms: string[]
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { wordId, synonyms, userId } = await request.json() as UpdateSynonymsRequest
    
    if (!wordId || !synonyms) {
      return NextResponse.json(
        { success: false, message: 'Word ID and synonyms are required' },
        { status: 400 }
      )
    }
    
    const db = getAdminFirestore()
    const wordRef = db.collection('words').doc(wordId)
    
    // 단어가 존재하는지 확인
    const wordDoc = await wordRef.get()
    if (!wordDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Word not found' },
        { status: 404 }
      )
    }
    
    // 유사어 업데이트
    await wordRef.update({
      synonyms: synonyms,
      updatedAt: new Date(),
      // AI가 생성했다는 표시 추가
      'aiGenerated.synonyms': true,
      'aiGenerated.synonymsGeneratedAt': new Date()
    })
    
    console.log(`Updated synonyms for word ${wordId}:`, synonyms)
    
    return NextResponse.json({
      success: true,
      message: 'Synonyms updated successfully',
      wordId,
      synonyms
    })
    
  } catch (error) {
    console.error('Error updating synonyms:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update synonyms',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}