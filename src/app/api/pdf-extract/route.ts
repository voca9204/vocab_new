import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedExtractor } from '@/lib/services/unified-file-extractor'

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

    // 통합 추출기 사용
    const extractor = getUnifiedExtractor()
    const result = await extractor.extractFromFile(file, {
      removeCommonWords: true,
      minWordLength: 2,
      useAI: false, // PDF-parse만 사용 (빠른 처리)
      useVision: false,
    })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to extract from PDF' },
        { status: 500 }
      )
    }

    // 디버깅 정보 추가
    console.log(`[PDF Extract] Extraction complete:`)
    console.log(`- Method: ${result.method}`)
    console.log(`- Total words: ${result.totalCount}`)
    console.log(`- Confidence: ${result.confidence}`)
    console.log(`- Pages: ${result.metadata?.pages}`)
    console.log(`- Processing time: ${result.metadata?.processingTime}ms`)
    
    return NextResponse.json({
      success: true,
      words: result.words.map(w => w.word), // 단어만 반환 (기존 호환성)
      wordCount: result.totalCount,
      pages: result.metadata?.pages || 0,
      processedPages: result.metadata?.pages || 0,
      method: result.method,
      confidence: result.confidence
    })

  } catch (error) {
    console.error('PDF extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    )
  }
}