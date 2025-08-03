import { NextRequest, NextResponse } from 'next/server'
import type { Word } from '@/types/vocabulary-v2'
import OpenAI from 'openai'

// Development-only endpoint for testing AI generation
// This bypasses Firebase authentication issues in development

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, message: 'This endpoint is only available in development' },
        { status: 403 }
      )
    }

    const { userId, wordIds, limit = 10, singleWord = false } = await request.json()
    
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

    // For development testing, create a mock word
    const testWords: Word[] = [{
      id: 'test-word-1',
      word: 'ubiquitous',
      normalizedWord: 'ubiquitous',
      partOfSpeech: ['adjective'],
      definitions: [{
        id: 'test-def-1',
        definition: 'present, appearing, or found everywhere',
        examples: ['His ubiquitous influence was felt by all the family.'],
        source: 'dictionary' as const,
        language: 'en' as const,
        partOfSpeech: 'adjective',
        createdAt: new Date()
      }],
      etymology: 'existing or being everywhere at the same time',
      pronunciation: '/juːˈbɪkwɪtəs/',
      difficulty: 7,
      frequency: 5000,
      isSAT: true,
      source: 'test',
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }]

    // Generate etymology for test word
    const word = testWords[0]
    
    try {
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
Definition: ${word.definitions[0]?.definition || 'No definition available'}`

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
      
      return NextResponse.json({
        success: true,
        message: 'Generated etymology for test word',
        testMode: true,
        word: word.word,
        etymology: content?.trim() || 'Failed to generate',
        updated: 1,
        total: 1
      })
      
    } catch (error) {
      console.error('Error generating etymology:', error)
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to generate etymology',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Error in dev-generate-etymology:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process request',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}