import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

interface ExtractVocabularyRequest {
  text: string
  format?: string
  chunkIndex?: number
  totalChunks?: number
}

export async function POST(request: NextRequest) {
  try {
    const { text, format = 'AUTO', chunkIndex = 1, totalChunks = 1 } = await request.json() as ExtractVocabularyRequest
    
    if (!text) {
      return NextResponse.json(
        { success: false, message: 'Text is required' },
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

    // OpenAI 클라이언트 초기화
    const openai = new OpenAI({ apiKey })

    console.log(`[extract-vocabulary] Processing chunk ${chunkIndex}/${totalChunks}, format: ${format}`)

    // 형식별 프롬프트 설정
    let systemPrompt = `다음 형식(${format})의 단어장에서 단어 정보를 추출해주세요.

각 단어에 대해 다음 정보를 추출하세요:
- number: 번호 (있는 경우)
- word: 영어 단어
- partOfSpeech: 품사 (n., v., adj., adv. 등)
- definition: 한글 뜻
- englishDefinition: 영어 정의 (있는 경우)
- example: 예문 (있는 경우)

JSON 배열로 응답해주세요. 추출 규칙:
1. 단어는 반드시 영어여야 함
2. 품사가 명확하지 않으면 문맥으로 추론
3. 한글 뜻이 없으면 영어 정의를 definition에 넣기
4. 중복 단어는 제외
5. 단어 형태 변화(복수형, 시제변화 등)는 기본형으로 통일

예시 응답:
[
  {
    "number": "1",
    "word": "abandon",
    "partOfSpeech": "v.",
    "definition": "버리다, 포기하다",
    "englishDefinition": "to leave forever",
    "example": "They decided to abandon the project."
  }
]`

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
        max_tokens: 4000
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenAI')
      }

      const result = JSON.parse(content)
      const entries = result.entries || result.words || result || []

      return NextResponse.json({
        success: true,
        entries: Array.isArray(entries) ? entries : [],
        chunkIndex,
        totalChunks
      })
      
    } catch (error) {
      console.error('OpenAI API error:', error)
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to extract vocabulary',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Error in extract-vocabulary:', error)
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

// 형식 감지 API
export async function PUT(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text) {
      return NextResponse.json(
        { success: false, message: 'Text is required' },
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

    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `당신은 단어장 형식을 분석하는 전문가입니다. 주어진 텍스트를 분석하여 단어장의 형식을 파악해주세요.

다음 형식들 중 하나로 분류하거나, 새로운 형식을 설명해주세요:
1. SLASH_FORMAT: 번호/단어/품사/예문/뜻
2. VZIP_FORMAT: 번호 단어품사\\n영어정의\\n한글뜻
3. PARENTHESIS_FORMAT: 단어 (품사) 뜻
4. COLON_FORMAT: 단어: 뜻
5. DASH_FORMAT: 단어 - 뜻
6. TABLE_FORMAT: 표 형식
7. CUSTOM_FORMAT: 기타 (설명 필요)

응답 형식:
{
  "format": "형식명",
  "pattern": "정규식 패턴 또는 설명",
  "confidence": 0.0-1.0,
  "example": "실제 예시"
}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
    
    return NextResponse.json({
      success: true,
      format: result.format || 'UNKNOWN',
      confidence: result.confidence || 0,
      pattern: result.pattern,
      example: result.example
    })
    
  } catch (error) {
    console.error('Error detecting format:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to detect format',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}