import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { WordAdapterServer } from '@/lib/adapters/word-adapter-server'
import OpenAI from 'openai'

interface GenerateExamplesRequest {
  userId: string
  wordId: string
  word: string
  definition: string
  partOfSpeech?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { userId, wordId, word, definition, partOfSpeech = [] } = await request.json() as GenerateExamplesRequest
    
    if (!userId || !wordId || !word) {
      return NextResponse.json(
        { success: false, message: 'User ID, word ID, and word are required' },
        { status: 400 }
      )
    }

    // First check if examples already exist
    const db = getAdminFirestore()
    const wordAdapter = new WordAdapterServer()
    const existingWord = await wordAdapter.getWordById(wordId)
    
    if (existingWord && existingWord.examples && existingWord.examples.length >= 3) {
      console.log(`[generate-examples-unified] Word ${word} already has examples, returning existing`)
      return NextResponse.json({
        success: true,
        examples: existingWord.examples,
        message: 'Using existing examples'
      })
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

    // Generate examples
    const prompt = `Generate 3 clear and educational example sentences for the SAT vocabulary word "${word}" (${partOfSpeech.join(', ')}). 
Definition: ${definition}

Requirements:
1. Each sentence should clearly demonstrate the meaning of the word
2. Use context that would be appropriate for high school students preparing for the SAT
3. Make sentences varied in structure and context
4. Keep sentences concise but meaningful

Format the response as a JSON array of strings like: ["sentence1", "sentence2", "sentence3"]`

    console.log(`[generate-examples-unified] Generating examples for ${word}`)
    
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
    
    if (!content) {
      return NextResponse.json(
        { success: false, message: 'Failed to generate examples' },
        { status: 500 }
      )
    }

    try {
      // Clean and parse response
      let cleanContent = content
      if (content.includes('```json')) {
        cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      } else if (content.includes('```')) {
        cleanContent = content.replace(/```\n?/g, '').trim()
      }
      
      const examples = JSON.parse(cleanContent)
      
      if (!Array.isArray(examples) || examples.length === 0) {
        throw new Error('Invalid examples format')
      }

      // Update the word in the appropriate collection
      // (db and wordAdapter already declared above)
      
      // First, try to find which collection the word belongs to
      const unifiedWord = existingWord || await wordAdapter.getWordById(wordId)
      
      if (unifiedWord && unifiedWord.source) {
        const collection = unifiedWord.source.collection
        console.log(`[generate-examples-unified] Updating ${word} in collection: ${collection}`)
        
        // Update based on collection type
        if (collection === 'photo_vocabulary_words') {
          // Update photo vocabulary word
          await db.collection('photo_vocabulary_words').doc(wordId).update({
            examples: examples.slice(0, 3),
            updatedAt: new Date()
          })
        } else if (collection === 'personal_collection_words') {
          // Update personal collection word
          await db.collection('personal_collection_words').doc(wordId).update({
            examples: examples.slice(0, 3),
            updatedAt: new Date()
          })
        } else if (collection === 'words') {
          // Update regular word - need to update definitions array
          const wordDoc = await db.collection('words').doc(wordId).get()
          if (wordDoc.exists) {
            const wordData = wordDoc.data()
            const definitions = wordData.definitions || []
            if (definitions.length > 0) {
              definitions[0].examples = examples.slice(0, 3)
              await db.collection('words').doc(wordId).update({
                definitions,
                updatedAt: new Date()
              })
            }
          }
        } else if (collection === 'ai_generated_words') {
          // Update AI generated word
          const wordDoc = await db.collection('ai_generated_words').doc(wordId).get()
          if (wordDoc.exists) {
            const wordData = wordDoc.data()
            const definitions = wordData.definitions || []
            if (definitions.length > 0) {
              definitions[0].examples = examples.slice(0, 3)
              await db.collection('ai_generated_words').doc(wordId).update({
                definitions,
                updatedAt: new Date()
              })
            }
          }
        }
        
        console.log(`[generate-examples-unified] Successfully updated examples for ${word}`)
        
        return NextResponse.json({
          success: true,
          examples,
          message: 'Examples generated successfully',
          updated: 1
        })
      } else {
        console.error(`[generate-examples-unified] Could not find word ${wordId} in any collection`)
        return NextResponse.json(
          { success: false, message: 'Word not found in database' },
          { status: 404 }
        )
      }
    } catch (parseError) {
      console.error('[generate-examples-unified] Parse error:', parseError)
      return NextResponse.json(
        { success: false, message: 'Failed to parse AI response' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[generate-examples-unified] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to generate examples'
      },
      { status: 500 }
    )
  }
}