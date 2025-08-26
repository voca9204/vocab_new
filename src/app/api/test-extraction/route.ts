import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    console.log('=== TEST EXTRACTION ENDPOINT ===')
    
    // Read the PDF file directly
    const pdfPath = '/Users/sinclair/Downloads/-toefl_voca_1.pdf'
    
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ error: 'PDF file not found' }, { status: 404 })
    }
    
    const buffer = fs.readFileSync(pdfPath)
    console.log(`PDF loaded: ${buffer.length} bytes`)
    
    // Use our safe PDF parser
    const { parsePDF } = await import('@/lib/pdf/pdf-parser')
    const data = await parsePDF(buffer)
    console.log(`PDF parsed: ${data.numpages} pages, ${data.text.length} characters`)
    
    // Extract first 10 lines
    const lines = data.text.split('\n').filter(line => line.trim()).slice(0, 10)
    
    // Extract words
    const words: any[] = []
    const COMMON_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'])
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 2) {
        const firstWord = parts[0].toLowerCase()
        
        if (/^[a-zA-Z]{3,25}$/.test(firstWord) && !COMMON_WORDS.has(firstWord)) {
          const koreanMatch = line.match(/[\u3131-\uD79D].+/)
          
          words.push({
            word: firstWord,
            definition: koreanMatch ? koreanMatch[0] : parts.slice(1, 4).join(' '),
            line: line.substring(0, 100)
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      pdfInfo: {
        pages: data.numpages,
        textLength: data.text.length,
        firstLines: lines
      },
      extractedWords: words,
      totalWords: words.length
    })
    
  } catch (error) {
    console.error('Test extraction error:', error)
    return NextResponse.json({
      error: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 })
  }
}