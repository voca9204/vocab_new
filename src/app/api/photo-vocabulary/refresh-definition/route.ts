import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Parse and structure definition that may contain mixed Korean and English
 */
function parseDefinition(rawDef: string): { korean: string; english: string } {
  // Pattern 1: "한글정의 (English definition)"
  const pattern1 = rawDef.match(/^([\u3131-\uD79D][^(]+)\s*\(([^)]+)\)/)
  if (pattern1) {
    return {
      korean: pattern1[1].trim(),
      english: pattern1[2].trim()
    }
  }
  
  // Pattern 2: Korean followed by English without parentheses
  const koreanMatch = rawDef.match(/[\u3131-\uD79D][^a-zA-Z]+/)
  const englishMatch = rawDef.match(/[a-zA-Z].+/)
  
  if (koreanMatch && englishMatch) {
    return {
      korean: koreanMatch[0].trim(),
      english: englishMatch[0].trim()
    }
  }
  
  // Pattern 3: Only Korean or only English
  if (/[\u3131-\uD79D]/.test(rawDef)) {
    return { korean: rawDef.trim(), english: '' }
  } else {
    return { korean: '', english: rawDef.trim() }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { word } = await req.json()
    
    if (!word) {
      return NextResponse.json(
        { success: false, error: 'Word is required' },
        { status: 400 }
      )
    }

    // Generate definition using OpenAI
    const prompt = `Define the SAT/GRE vocabulary word "${word}".
Provide BOTH Korean and English definitions.
Format EXACTLY as: 한글정의 (English definition)
Example: 약간의, 미미한 (slight or minimal in degree)
Be accurate and concise.`
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert vocabulary teacher specializing in SAT/GRE words for Korean students. Always provide definitions in the exact format requested: Korean definition (English definition). Be accurate and concise.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    })

    const result = completion.choices[0]?.message?.content || ''
    
    // Parse the definition
    const parsed = parseDefinition(result)
    
    return NextResponse.json({
      success: true,
      word,
      context: result,
      koreanDefinition: parsed.korean,
      englishDefinition: parsed.english
    })
  } catch (error) {
    console.error('Error refreshing definition:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to refresh definition' },
      { status: 500 }
    )
  }
}