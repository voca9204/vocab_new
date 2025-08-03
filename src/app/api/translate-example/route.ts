import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { example } = await request.json()

    if (!example) {
      return NextResponse.json({ error: 'Example is required' }, { status: 400 })
    }

    const prompt = `Translate the following English sentence to Korean naturally and accurately:
    "${example}"
    
    Return only the Korean translation, no explanations or additional text.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional English to Korean translator. Provide natural and accurate translations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    })

    const translation = completion.choices[0]?.message?.content?.trim() || ''
    
    return NextResponse.json({ translation })
  } catch (error) {
    console.error('Error translating example:', error)
    return NextResponse.json({ 
      error: 'Failed to translate example',
      translation: '' 
    }, { status: 500 })
  }
}