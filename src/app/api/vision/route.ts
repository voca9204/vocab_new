import { NextRequest, NextResponse } from 'next/server'

// 동적 import로 서버사이드에서만 로드
async function getVisionClient() {
  const { ImageAnnotatorClient } = await import('@google-cloud/vision')
  return new ImageAnnotatorClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // 파일을 Buffer로 변환
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Cloud Vision API 호출
    const vision = await getVisionClient()
    const [result] = await vision.textDetection({
      image: { content: buffer.toString('base64') }
    })

    const detections = result.textAnnotations || []
    const fullText = detections[0]?.description || ''

    // SAT 단어 필터링 (간단한 예시)
    const words = fullText.split(/\s+/).filter(word => 
      word.length > 5 && /^[a-zA-Z]+$/.test(word)
    )

    return NextResponse.json({
      success: true,
      text: fullText,
      words: words,
      wordCount: words.length
    })

  } catch (error) {
    console.error('Vision API error:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
}