import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { sample } = await request.json()
    
    if (!sample) {
      return NextResponse.json(
        { error: 'PDF 샘플 텍스트가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('PDF 형식 감지 요청:', sample.substring(0, 200) + '...')

    const systemPrompt = `
당신은 PDF 단어장의 형식을 분석하는 전문가입니다. 

다음 PDF 텍스트 샘플을 분석하여 단어장의 형식을 파악하고, 단어 추출을 위한 패턴을 생성해주세요.

일반적인 단어장 형식들:
1. V.ZIP 형식: "번호 word품사" (예: "1 abandonv.")
2. 수능 기출 형식: 
   - 번호
   - (연도) 영어 표현
   - 한글 번역
   - 단어
   - [발음]
   - (품사) 정의
3. TOEFL 형식:
   - word
   - pos. definition
4. 사전 형식:
   - word (품사) 정의
5. 표 형식: 단어 | 품사 | 정의

응답은 반드시 다음 JSON 형식으로 해주세요:
{
  "pattern": {
    "name": "형식 이름",
    "description": "형식 설명",
    "sampleEntry": {
      "word": "예시 단어",
      "definition": "예시 정의",
      "partOfSpeech": "품사",
      "example": "예문",
      "pronunciation": "발음"
    },
    "extractionRules": {
      "wordPattern": "단어 추출 정규식",
      "definitionPattern": "정의 추출 정규식",
      "partOfSpeechPattern": "품사 추출 정규식",
      "sequencePattern": "전체 항목 시퀀스 패턴"
    },
    "confidence": 0.95
  }
}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `분석할 PDF 샘플:\n\n${sample}` }
      ],
      temperature: 0.1,
      max_tokens: 1000
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('AI 분석 결과가 없습니다.')
    }

    console.log('AI 분석 결과:', response)

    // JSON 파싱 시도
    try {
      const result = JSON.parse(response)
      return NextResponse.json(result)
    } catch (parseError) {
      // JSON 파싱 실패 시 기본 패턴 반환
      console.error('JSON 파싱 실패, 기본 패턴 반환:', parseError)
      
      // 간단한 휴리스틱으로 형식 추정
      let detectedFormat = "UNKNOWN"
      let confidence = 0.3
      
      if (sample.includes("수능") || sample.includes("기출")) {
        detectedFormat = "SUNEUNG"
        confidence = 0.8
      } else if (/^\d+\s+[a-zA-Z]+[a-z]+\.$/m.test(sample)) {
        detectedFormat = "VZIP"
        confidence = 0.7
      } else if (/^[a-zA-Z]+$/m.test(sample) && /^[a-z]+\.\s/.test(sample)) {
        detectedFormat = "TOEFL"
        confidence = 0.6
      }
      
      return NextResponse.json({
        pattern: {
          name: detectedFormat,
          description: `자동 감지된 ${detectedFormat} 형식`,
          confidence: confidence,
          extractionRules: {
            wordPattern: "[a-zA-Z]+",
            definitionPattern: ".*",
            sequencePattern: "automatic"
          }
        }
      })
    }

  } catch (error) {
    console.error('PDF 형식 감지 오류:', error)
    return NextResponse.json(
      { error: '형식 감지 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}