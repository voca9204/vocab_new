import { NextRequest, NextResponse } from 'next/server'
import { WordServiceAdmin } from '@/lib/vocabulary-v2/word-service-admin'
import type { Word } from '@/types/vocabulary-v2'
import OpenAI from 'openai'

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

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // OpenAI 클라이언트를 런타임에 초기화
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    // WordServiceAdmin 인스턴스 생성
    const wordService = new WordServiceAdmin()
    
    // 단어 가져오기
    let words: Word[]
    if (wordIds && wordIds.length > 0) {
      // 특정 단어들만 처리
      words = await wordService.getWordsByIds(wordIds)
    } else {
      // 모든 단어 가져오기 (예문이 없는 것만)
      const allWords = await wordService.searchWords('', { limit: 1000 })
      words = allWords.filter(w => {
        // 정의에 예문이 없는 단어만 필터링
        return !w.definitions.some(def => def.examples && def.examples.length > 0)
      }).slice(0, limit)
    }
    
    if (words.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No words need example generation',
        updated: 0
      })
    }

    let updatedCount = 0
    const failedWords: string[] = []
    
    // 각 단어에 대해 예문 생성
    for (const word of words) {
      try {
        // 첫 번째 정의 가져오기
        const firstDef = word.definitions[0]
        const defText = firstDef?.definition || 'No definition available'
        
        // OpenAI API 호출
        const prompt = `Generate 3 clear and educational example sentences for the SAT vocabulary word "${word.word}" (${word.partOfSpeech.join(', ')}). 
Definition: ${defText}
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
              // 첫 번째 정의에 예문 추가
              const updatedDefinitions = [...word.definitions]
              if (updatedDefinitions[0]) {
                updatedDefinitions[0].examples = examples.slice(0, 3)
              }
              
              await wordService.updateWord(word.id, {
                definitions: updatedDefinitions
              })
              
              // AI 생성 표시
              await wordService.markAsAIGenerated(word.id, 'examples')
              
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

    // WordService로 모든 단어 가져오기
    const wordService = new WordService()
    const words = await wordService.searchWords('', { limit: 2000 })
    
    const wordsWithoutExamples = words.filter(w => 
      !w.definitions.some(def => def.examples && def.examples.length > 0)
    )
    const wordsWithExamples = words.filter(w => 
      w.definitions.some(def => def.examples && def.examples.length > 0)
    )
    
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