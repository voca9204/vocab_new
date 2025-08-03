import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { word, definition } = await request.json()

    if (!word) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 })
    }

    const prompt = `Generate 3-5 synonyms for the word "${word}"${definition ? ` which means "${definition}"` : ''}. 
    Return only the synonyms as a JSON array of strings, no explanations.
    Example: ["synonym1", "synonym2", "synonym3"]`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a vocabulary expert that provides accurate synonyms for words. Return only a JSON array of synonym strings.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    })

    const response = completion.choices[0]?.message?.content || '[]'
    
    try {
      const synonyms = JSON.parse(response)
      if (Array.isArray(synonyms)) {
        return NextResponse.json({ synonyms: synonyms.slice(0, 5) })
      }
    } catch (parseError) {
      console.error('Error parsing synonyms:', parseError)
    }

    return NextResponse.json({ synonyms: [] })
  } catch (error) {
    console.error('Error generating synonyms:', error)
    return NextResponse.json({ 
      error: 'Failed to generate synonyms',
      synonyms: [] 
    }, { status: 500 })
  }
}