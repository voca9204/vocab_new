import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { WordAdapterServer } from '@/lib/adapters/word-adapter-server'

interface FetchPronunciationRequest {
  word: string
  wordId: string
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    const { word, wordId, userId } = await request.json() as FetchPronunciationRequest
    
    if (!word || !wordId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Word, wordId and userId are required' },
        { status: 400 }
      )
    }

    console.log(`[fetch-save-pronunciation] Fetching pronunciation for: ${word} (${wordId})`)

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

        console.log(`[fetch-save-pronunciation] Found pronunciation for ${word}: ${pronunciation}`)

        // Save pronunciation to database if found
        if (pronunciation) {
          const db = getAdminFirestore()
          const wordAdapter = new WordAdapterServer()
          
          // Find which collection the word belongs to
          const unifiedWord = await wordAdapter.getWordById(wordId)
          
          if (unifiedWord && unifiedWord.source) {
            const collection = unifiedWord.source.collection
            console.log(`[fetch-save-pronunciation] Updating ${word} in collection: ${collection}`)
            
            // Update the pronunciation in the appropriate collection
            await db.collection(collection).doc(wordId).update({
              pronunciation: pronunciation,
              updatedAt: new Date()
            })
            
            console.log(`[fetch-save-pronunciation] Successfully saved pronunciation for ${word}`)
          }
        }

        return NextResponse.json({
          success: true,
          pronunciation,
          message: pronunciation ? 'Pronunciation found and saved' : 'No pronunciation available'
        })
      } else if (response.status === 404) {
        console.log(`[fetch-save-pronunciation] Word not found in dictionary: ${word}`)
        return NextResponse.json({
          success: true,
          pronunciation: null,
          message: 'Word not found in dictionary'
        })
      } else {
        console.error(`[fetch-save-pronunciation] Dictionary API error: ${response.status}`)
        return NextResponse.json({
          success: false,
          message: 'Dictionary API error'
        }, { status: response.status })
      }
    } catch (apiError) {
      console.error('[fetch-save-pronunciation] Dictionary API error:', apiError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch from dictionary API'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[fetch-save-pronunciation] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch pronunciation'
      },
      { status: 500 }
    )
  }
}