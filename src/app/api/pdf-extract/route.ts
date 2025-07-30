import { NextRequest, NextResponse } from 'next/server'

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

    // PDF.js를 사용한 텍스트 추출
    const pdfjsLib = await import('pdfjs-dist')
    
    // Worker 설정
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    const words: string[] = []
    
    // 각 페이지에서 텍스트 추출
    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      
      fullText += pageText + '\n'
      
      // 단어 추출
      const pageWords = pageText.split(/\s+/)
        .filter(word => word.length > 3 && /^[a-zA-Z]+$/.test(word))
      
      words.push(...pageWords)
    }

    // 중복 제거
    const uniqueWords = [...new Set(words)]

    return NextResponse.json({
      success: true,
      text: fullText,
      words: uniqueWords,
      wordCount: uniqueWords.length,
      pages: pdf.numPages
    })

  } catch (error) {
    console.error('PDF extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    )
  }
}