import { NextRequest, NextResponse } from 'next/server'
import { WordAdapterServer } from '@/lib/adapters/word-adapter-server'

interface SearchRequest {
  word: string
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    const { word, userId } = await request.json() as SearchRequest
    
    if (!word || !userId) {
      return NextResponse.json(
        { success: false, message: 'Word and user ID are required' },
        { status: 400 }
      )
    }

    const wordAdapter = new WordAdapterServer()
    
    // Search across all collections using flexible search
    const foundWord = await wordAdapter.searchWordFlexible(word)
    
    if (foundWord) {
      console.log(`[search-unified] Found word: ${foundWord.word} in collection: ${foundWord.source?.collection}`)
      
      return NextResponse.json({
        success: true,
        exists: true,
        word: foundWord
      })
    } else {
      console.log(`[search-unified] Word not found: ${word}`)
      
      return NextResponse.json({
        success: true,
        exists: false,
        word: null
      })
    }
  } catch (error) {
    console.error('[search-unified] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Search failed'
      },
      { status: 500 }
    )
  }
}