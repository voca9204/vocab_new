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

interface GenerateExamplesRequest {
  userId: string
  wordIds?: string[]
  limit?: number
  singleWord?: boolean // 단일 단어 처리 여부
}

export async function POST(request: NextRequest) {
  try {
    const { userId, wordIds, limit = 10, singleWord = false } = await request.json() as GenerateExamplesRequest
    
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
    
    // 예문이 없는 단어들만 필터링
    words = words.filter(w => !w.examples || w.examples.length === 0)
      .slice(0, limit)
    
    if (words.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No words need example generation',
        updated: 0
      })
    }

    const batch = writeBatch(db)
    let updatedCount = 0
    const failedWords: string[] = []
    
    // 각 단어에 대해 예문 생성
    for (const word of words) {
      try {
        // OpenAI API 호출
        const prompt = `Generate 3 clear and educational example sentences for the SAT vocabulary word "${word.word}" (${word.partOfSpeech.join(', ')}). 
Definition: ${word.definition}
${word.etymology ? `Etymology: ${word.etymology}` : ''}

Requirements:
1. Each sentence should clearly demonstrate the meaning of the word
2. Use context that would be appropriate for high school students preparing for the SAT
3. Make sentences varied in structure and context
4. Keep sentences concise but meaningful

Format the response as a JSON array of strings like: ["sentence1", "sentence2", "sentence3"]`

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert English teacher helping students prepare for the SAT. Generate clear, educational example sentences that demonstrate word usage effectively.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 300
        })

        const content = completion.choices[0]?.message?.content
        
        if (content) {
          try {
            // JSON 파싱 시도
            const examples = JSON.parse(content)
            
            if (Array.isArray(examples) && examples.length > 0 && word.id) {
              const wordRef = doc(db, 'extracted_vocabulary', word.id)
              batch.update(wordRef, {
                examples: examples.slice(0, 3), // 최대 3개만 저장
                updatedAt: Timestamp.now()
              })
              updatedCount++
            }
          } catch (parseError) {
            console.error(`Failed to parse examples for ${word.word}:`, parseError)
            failedWords.push(word.word)
          }
        }
      } catch (error) {
        console.error(`Error generating examples for ${word.word}:`, error)
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
      message: `Generated examples for ${updatedCount} words`,
      updated: updatedCount,
      total: words.length,
      failed: failedWords
    })
    
  } catch (error) {
    console.error('Error in generate-examples:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to generate examples',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET 메서드: 예문이 없는 단어 개수 확인
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
    
    const wordsWithoutExamples = words.filter(w => !w.examples || w.examples.length === 0)
    const wordsWithExamples = words.filter(w => w.examples && w.examples.length > 0)
    
    return NextResponse.json({
      success: true,
      total: words.length,
      withExamples: wordsWithExamples.length,
      withoutExamples: wordsWithoutExamples.length,
      percentage: words.length > 0 
        ? Math.round((wordsWithExamples.length / words.length) * 100)
        : 0
    })
    
  } catch (error) {
    console.error('Error checking examples:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to check examples',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}