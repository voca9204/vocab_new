import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testHybridProcessor() {
  try {
    console.log('Testing HybridPDFProcessor in ESM environment...')
    console.log('OpenAI API Key available:', !!process.env.OPENAI_API_KEY)
    
    // Import the processor
    const { HybridPDFProcessor } = await import('./src/lib/extraction/hybrid-pdf-processor.js')
    console.log('HybridPDFProcessor imported successfully')
    
    // Create instance
    const processor = new HybridPDFProcessor(process.env.OPENAI_API_KEY)
    console.log('Processor instance created')
    
    // Read PDF file
    const pdfPath = '/Users/sinclair/Downloads/-toefl_voca_1.pdf'
    const buffer = fs.readFileSync(pdfPath)
    console.log(`PDF loaded: ${buffer.length} bytes`)
    
    // Extract words
    console.log('Starting extraction...')
    const words = await processor.extractFromPDF(buffer, '-toefl_voca_1.pdf')
    
    console.log(`\n✅ Extraction complete!`)
    console.log(`Total words extracted: ${words.length}`)
    
    if (words.length > 0) {
      console.log('\nFirst 5 words:')
      words.slice(0, 5).forEach((word, idx) => {
        console.log(`${idx + 1}. ${word.word}`)
        if (word.definition) {
          console.log(`   Definition: ${word.definition.substring(0, 100)}...`)
        }
        if (word.synonyms && word.synonyms.length > 0) {
          console.log(`   Synonyms: ${word.synonyms.slice(0, 3).join(', ')}`)
        }
      })
    }
    
    return words
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

testHybridProcessor()