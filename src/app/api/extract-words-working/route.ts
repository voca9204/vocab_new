import { NextRequest, NextResponse } from 'next/server'

// Simple word type for extraction
interface SimpleWord {
  word: string
  definition?: string
  synonyms?: string[]
}

// Common words to filter
const COMMON_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'down', 'out', 'over', 'under',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'must', 'can', 'shall', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her',
  'its', 'our', 'their', 'this', 'that', 'these', 'those', 'what', 'which',
  'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'some',
  'any', 'many', 'much', 'more', 'most', 'less', 'least', 'very', 'too',
  'quite', 'just', 'only', 'not', 'no', 'yes', 'so', 'if', 'then', 'because',
  'as', 'until', 'while', 'although', 'though', 'since', 'before', 'after',
  'above', 'below', 'between', 'through', 'during', 'about', 'against',
  'word', 'vocabulary', 'basic', 'day', 'week', 'page', 'section', 'unit'
])

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    console.log(`Processing ${file.name} (${file.size} bytes)`)
    
    // Get buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Use child process to call the working external script
    const { spawn } = require('child_process')
    const fs = require('fs')
    const path = require('path')
    
    // Write buffer to temp file
    const tempFile = `/tmp/temp-pdf-${Date.now()}.pdf`
    fs.writeFileSync(tempFile, buffer)
    
    try {
      // Use external node script that we know works
      const result = await new Promise<SimpleWord[]>((resolve, reject) => {
        const child = spawn('node', [
          path.join(process.cwd(), 'extract-pdf-external.js'),
          tempFile
        ])
        
        let output = ''
        let errorOutput = ''
        
        child.stdout.on('data', (data: any) => {
          output += data.toString()
        })
        
        child.stderr.on('data', (data: any) => {
          errorOutput += data.toString()
        })
        
        child.on('close', (code: number) => {
          if (code === 0) {
            try {
              const words = JSON.parse(output)
              resolve(words)
            } catch (parseError) {
              reject(new Error('Failed to parse extraction result'))
            }
          } else {
            reject(new Error(`Extraction failed: ${errorOutput}`))
          }
        })
        
        // Timeout after 30 seconds
        setTimeout(() => {
          child.kill()
          reject(new Error('Extraction timeout'))
        }, 30000)
      })
      
      // Clean up temp file
      fs.unlinkSync(tempFile)
      
      console.log(`Extracted ${result.length} words successfully`)
      
      return NextResponse.json({
        success: true,
        words: result,
        totalCount: result.length,
        method: 'external-process',
        message: `Successfully extracted ${result.length} words from ${file.name}`
      })
      
    } catch (extractionError) {
      // Clean up temp file on error
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
      throw extractionError
    }
    
  } catch (error) {
    console.error('Extraction error:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}