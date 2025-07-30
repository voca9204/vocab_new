import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, writeBatch, doc, Timestamp } from 'firebase/firestore'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import OpenAI from 'openai'
import { createVocabularyQuery } from '@/lib/vocabulary/vocabulary-query-utils'

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface GenerateEtymologyRequest {
  userId: string
  wordIds?: string[]
  limit?: number
  singleWord?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { userId, wordIds, limit = 10, singleWord = false } = await request.json() as GenerateEtymologyRequest
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // 사용자의 단어 가져오기
    let q
    if (wordIds && wordIds.length > 0) {
      // 특정 단어들만 처리
      q = query(
        collection(db, 'extracted_vocabulary'),
        where('userId', '==', userId),
        where('__name__', 'in', wordIds)
      )
    } else {
      // 사용자의 단어와 관리자가 업로드한 단어 모두 가져오기
      q = createVocabularyQuery('extracted_vocabulary', userId)
    }
    
    const snapshot = await getDocs(q)
    let words = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as ExtractedVocabulary[]
    
    // 실제 어원이 없는 단어들만 필터링 (realEtymology 필드가 없거나 비어있는 경우)
    words = words.filter(w => !w.realEtymology)
      .slice(0, limit)
    
    if (words.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No words need etymology generation',
        updated: 0
      })
    }

    const batch = writeBatch(db)
    let updatedCount = 0
    const failedWords: string[] = []
    
    // 각 단어에 대해 어원 생성
    for (const word of words) {
      try {
        // OpenAI API 호출
        const prompt = `Provide the etymology (word origin and history) for the word "${word.word}".

Requirements:
1. Explain the origin of the word (which language it came from - Latin, Greek, French, etc.)
2. Show how the word evolved over time
3. Break down the word parts if applicable (prefixes, roots, suffixes)
4. Explain how the original meaning relates to the current meaning
5. Keep it concise but informative (2-3 sentences)
6. Write in English

Example format:
"From Latin 'confidere' (con- 'with' + fidere 'to trust'), meaning 'to trust fully'. The word entered English through Old French in the 14th century, originally meaning 'to have full trust'."

Word: ${word.word}
Definition: ${word.definition}
${word.etymology ? `English definition: ${word.etymology}` : ''}`

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert etymologist who explains word origins clearly and concisely.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 200
        })

        const content = completion.choices[0]?.message?.content
        
        if (content && word.id) {
          const wordRef = doc(db, 'extracted_vocabulary', word.id)
          batch.update(wordRef, {
            realEtymology: content.trim(),
            updatedAt: Timestamp.now()
          })
          updatedCount++
        }
      } catch (error) {
        console.error(`Error generating etymology for ${word.word}:`, error)
        failedWords.push(word.word)
      }
      
      // API 요청 간 지연 (rate limiting 방지) - 단일 단어 처리시에는 지연 없음
      if (!singleWord) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // 배치 업데이트 실행
    if (updatedCount > 0) {
      await batch.commit()
    }
    
    return NextResponse.json({
      success: true,
      message: `Generated etymology for ${updatedCount} words`,
      updated: updatedCount,
      total: words.length,
      failed: failedWords
    })
    
  } catch (error) {
    console.error('Error in generate-etymology:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to generate etymology',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET 메서드: 어원이 없는 단어 개수 확인
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
    
    const wordsWithoutEtymology = words.filter(w => !w.realEtymology)
    const wordsWithEtymology = words.filter(w => w.realEtymology)
    
    return NextResponse.json({
      success: true,
      total: words.length,
      withEtymology: wordsWithEtymology.length,
      withoutEtymology: wordsWithoutEtymology.length,
      percentage: words.length > 0 
        ? Math.round((wordsWithEtymology.length / words.length) * 100)
        : 0
    })
    
  } catch (error) {
    console.error('Error checking etymology:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to check etymology',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}