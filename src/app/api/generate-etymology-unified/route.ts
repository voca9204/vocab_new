import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { WordAdapterServer } from '@/lib/adapters/word-adapter-server'
import OpenAI from 'openai'

interface GenerateEtymologyRequest {
  userId: string
  wordId: string
  word: string
  definition: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId, wordId, word, definition } = await request.json() as GenerateEtymologyRequest
    
    if (!userId || !wordId || !word) {
      return NextResponse.json(
        { success: false, message: 'User ID, word ID, and word are required' },
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

    // OpenAI client
    const openai = new OpenAI({ apiKey })

    // Generate etymology
    const prompt = `Provide the etymology (word origin and history) for the word "${word}".

Requirements:
1. Explain the origin of the word (which language it came from - Latin, Greek, French, etc.)
2. Show how the word evolved over time
3. Break down the word parts if applicable (prefixes, roots, suffixes)
4. Explain how the original meaning relates to the current meaning
5. Keep it concise but informative (2-3 sentences)
6. Write in English

Example format:
"From Latin 'confidere' (con- 'with' + fidere 'to trust'), meaning 'to trust fully'. The word entered English through Old French in the 14th century, originally meaning 'to have full trust'."

Word: ${word}
Definition: ${definition}`

    console.log(`[generate-etymology-unified] Generating etymology for ${word}`)
    
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

    const etymology = completion.choices[0]?.message?.content?.trim()
    
    if (!etymology) {
      return NextResponse.json(
        { success: false, message: 'Failed to generate etymology' },
        { status: 500 }
      )
    }

    // Update the word in the appropriate collection
    const db = getAdminFirestore()
    const wordAdapter = new WordAdapterServer()
    
    // First, try to find which collection the word belongs to
    const unifiedWord = await wordAdapter.getWordById(wordId)
    
    if (unifiedWord && unifiedWord.source) {
      const collection = unifiedWord.source.collection
      console.log(`[generate-etymology-unified] Updating ${word} in collection: ${collection}`)
      
      // Update based on collection type
      await db.collection(collection).doc(wordId).update({
        realEtymology: etymology,
        updatedAt: new Date()
      })
      
      console.log(`[generate-etymology-unified] Successfully updated etymology for ${word}`)
      
      return NextResponse.json({
        success: true,
        etymology,
        message: 'Etymology generated successfully',
        updated: 1
      })
    } else {
      console.error(`[generate-etymology-unified] Could not find word ${wordId} in any collection`)
      return NextResponse.json(
        { success: false, message: 'Word not found in database' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('[generate-etymology-unified] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to generate etymology'
      },
      { status: 500 }
    )
  }
}