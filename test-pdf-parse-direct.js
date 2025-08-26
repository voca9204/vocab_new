const fs = require('fs')
const pdfParse = require('pdf-parse')

async function testDirect() {
  try {
    console.log('Testing pdf-parse directly...')
    
    const pdfPath = '/Users/sinclair/Downloads/-toefl_voca_1.pdf'
    const buffer = fs.readFileSync(pdfPath)
    console.log(`Buffer loaded: ${buffer.length} bytes`)
    
    const data = await pdfParse(buffer)
    console.log(`Parsed: ${data.numpages} pages, ${data.text.length} chars`)
    
    const lines = data.text.split('\n').filter(l => l.trim()).slice(0, 10)
    console.log('\nFirst 10 lines:')
    lines.forEach((line, i) => {
      console.log(`${i+1}: ${line.substring(0, 80)}`)
    })
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testDirect()