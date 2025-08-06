import { NextRequest, NextResponse } from 'next/server'

interface FetchPronunciationRequest {
  word: string
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    const { word, userId } = await request.json() as FetchPronunciationRequest
    
    if (!word || !userId) {
      return NextResponse.json(
        { success: false, message: 'Word and userId are required' },
        { status: 400 }
      )
    }

    console.log(`[fetch-pronunciation] Fetching pronunciation for: ${word}`)

    // Try to fetch pronunciation from Free Dictionary API
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
      
      if (response.ok) {
        const data = await response.json()
        
        // Extract pronunciation from various possible locations in the response
        const pronunciation = 
          data[0]?.phonetic || 
          data[0]?.phonetics?.[0]?.text ||
          data[0]?.phonetics?.find((p: any) => p.text)?.text ||
          null

        console.log(`[fetch-pronunciation] Found pronunciation for ${word}: ${pronunciation}`)

        return NextResponse.json({
          success: true,
          pronunciation,
          message: pronunciation ? 'Pronunciation found' : 'No pronunciation available'
        })
      } else if (response.status === 404) {
        console.log(`[fetch-pronunciation] Word not found in dictionary: ${word}`)
        return NextResponse.json({
          success: true,
          pronunciation: null,
          message: 'Word not found in dictionary'
        })
      } else {
        console.error(`[fetch-pronunciation] Dictionary API error: ${response.status}`)
        return NextResponse.json({
          success: false,
          message: 'Dictionary API error'
        }, { status: response.status })
      }
    } catch (apiError) {
      console.error('[fetch-pronunciation] Dictionary API error:', apiError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch from dictionary API'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[fetch-pronunciation] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch pronunciation'
      },
      { status: 500 }
    )
  }
}