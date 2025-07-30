import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // OpenAI API는 직접적인 잔액 조회 엔드포인트를 제공하지 않습니다
    // 대신 예상 사용 요금을 계산하여 보여줄 수 있습니다
    
    // 예상 비용 계산 (GPT-3.5-turbo 기준)
    // 입력: $0.0005 / 1K tokens
    // 출력: $0.0015 / 1K tokens
    const estimatedCosts = {
      perExample: 0.002, // 예문 생성당 약 $0.002
      perEtymology: 0.0015, // 어원 생성당 약 $0.0015
      model: 'gpt-3.5-turbo',
      pricing: {
        input: '$0.0005 / 1K tokens',
        output: '$0.0015 / 1K tokens'
      }
    }

    return NextResponse.json({
      success: true,
      costs: estimatedCosts,
      message: 'OpenAI 사용량은 OpenAI 대시보드에서 확인하실 수 있습니다.',
      dashboardUrl: 'https://platform.openai.com/usage'
    })
    
  } catch (error) {
    console.error('Error checking OpenAI usage:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to check OpenAI usage',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}