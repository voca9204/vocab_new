import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, writeBatch, doc, Timestamp } from 'firebase/firestore'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import { createVocabularyQuery } from '@/lib/vocabulary/vocabulary-query-utils'

export async function POST(request: NextRequest) {
  try {
    const { userId, limit = 50 } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    // 사용자의 단어와 관리자가 업로드한 단어 모두 가져오기
    const q = createVocabularyQuery('extracted_vocabulary', userId)
    
    const snapshot = await getDocs(q)
    const words = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as ExtractedVocabulary[]
    
    // 발음이 없는 단어들만 필터링
    const wordsNeedPronunciation = words
      .filter(w => !w.pronunciation && w.id)
      .slice(0, limit) // 한 번에 처리할 개수 제한
    
    if (wordsNeedPronunciation.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No words need pronunciation update',
        updated: 0
      })
    }
    
    const batch = writeBatch(db)
    let updatedCount = 0
    const failedWords: string[] = []
    
    // 각 단어에 대해 발음 정보 가져오기
    for (const word of wordsNeedPronunciation) {
      try {
        // Free Dictionary API 호출
        const response = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.word)}`
        )
        
        if (response.ok) {
          const data = await response.json()
          
          // 발음 정보 추출
          const phonetic = data[0]?.phonetic || 
                          data[0]?.phonetics?.[0]?.text ||
                          data[0]?.phonetics?.find((p: any) => p.text)?.text
          
          if (phonetic && word.id) {
            const wordRef = doc(db, 'extracted_vocabulary', word.id)
            batch.update(wordRef, {
              pronunciation: phonetic,
              updatedAt: Timestamp.now()
            })
            updatedCount++
          }
        }
      } catch (error) {
        console.error(`Error fetching pronunciation for ${word.word}:`, error)
        failedWords.push(word.word)
      }
      
      // API 요청 간 지연 (rate limiting 방지)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // 배치 업데이트 실행
    if (updatedCount > 0) {
      await batch.commit()
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated pronunciation for ${updatedCount} words`,
      updated: updatedCount,
      total: wordsNeedPronunciation.length,
      failed: failedWords
    })
    
  } catch (error) {
    console.error('Error in update-pronunciations:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update pronunciations',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET 메서드: 발음이 없는 단어 개수 확인
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    // 사용자의 단어와 관리자가 업로드한 단어 모두 가져오기
    const q = createVocabularyQuery('extracted_vocabulary', userId)
    
    const snapshot = await getDocs(q)
    const words = snapshot.docs.map(doc => doc.data()) as ExtractedVocabulary[]
    
    const wordsWithoutPronunciation = words.filter(w => !w.pronunciation)
    const wordsWithPronunciation = words.filter(w => w.pronunciation)
    
    return NextResponse.json({
      success: true,
      total: words.length,
      withPronunciation: wordsWithPronunciation.length,
      withoutPronunciation: wordsWithoutPronunciation.length,
      percentage: words.length > 0 
        ? Math.round((wordsWithPronunciation.length / words.length) * 100)
        : 0
    })
    
  } catch (error) {
    console.error('Error checking pronunciations:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to check pronunciations',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}