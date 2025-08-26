/**
 * Simplified Hybrid PDF Processor for debugging
 */

import type { ExtractedWord } from './hybrid-pdf-processor'

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
  'page', 'chapter', 'section', 'part', 'unit', 'day', 'week', 'basic',
  'word', 'words', 'vocabulary', 'voca', 'test', 'exam'
])

export class SimplifiedHybridProcessor {
  async extractFromPDF(buffer: Buffer, fileName?: string): Promise<ExtractedWord[]> {
    console.log('🔧 SimplifiedHybridProcessor.extractFromPDF called')
    console.log(`Buffer size: ${buffer.length}, fileName: ${fileName}`)
    
    try {
      // Load pdf-parse
      let pdfParse: any
      try {
        pdfParse = require('pdf-parse')
        console.log('Loaded pdf-parse with require')
      } catch (e) {
        const module = await import('pdf-parse')
        pdfParse = module.default || module
        console.log('Loaded pdf-parse with dynamic import')
      }
      
      // Parse PDF
      console.log('Parsing PDF...')
      const data = await pdfParse(buffer)
      console.log(`PDF parsed: ${data.numpages} pages, ${data.text.length} characters`)
      
      if (!data.text) {
        console.log('No text in PDF')
        return []
      }
      
      // Extract words from each line
      const lines = data.text.split('\n').filter(line => line.trim())
      console.log(`Processing ${lines.length} lines`)
      
      const words: ExtractedWord[] = []
      const wordSet = new Set<string>()
      
      for (const line of lines) {
        // TOEFL format: first word is vocabulary, followed by synonyms, then Korean
        const parts = line.trim().split(/\s+/)
        
        if (parts.length >= 2) {
          const firstWord = parts[0].toLowerCase()
          
          // Check if valid vocabulary word
          if (this.isValidWord(firstWord) && !wordSet.has(firstWord)) {
            wordSet.add(firstWord)
            
            // Find Korean definition
            const koreanMatch = line.match(/[\u3131-\uD79D].+/)
            
            // Extract synonyms (words between first word and Korean)
            let synonyms: string[] = []
            if (koreanMatch) {
              const beforeKorean = line.substring(0, line.indexOf(koreanMatch[0]))
              synonyms = beforeKorean
                .split(/\s+/)
                .slice(1) // Skip first word
                .filter(w => this.isValidWord(w.toLowerCase()))
                .slice(0, 5)
            } else {
              // No Korean, use next few words as synonyms
              synonyms = parts
                .slice(1, Math.min(6, parts.length))
                .filter(w => this.isValidWord(w.toLowerCase()))
            }
            
            words.push({
              word: firstWord,
              definition: koreanMatch ? koreanMatch[0] : synonyms.join(', '),
              synonyms: synonyms.length > 0 ? synonyms : undefined,
              confidence: 0.8
            })
          }
        }
      }
      
      console.log(`✅ Extracted ${words.length} unique words`)
      
      // Return top 500 words
      return words.slice(0, 500)
      
    } catch (error) {
      console.error('SimplifiedHybridProcessor error:', error)
      throw error
    }
  }
  
  private isValidWord(word: string): boolean {
    return (
      /^[a-zA-Z]{3,25}$/.test(word) &&
      !COMMON_WORDS.has(word) &&
      word.length >= 3
    )
  }
}

export default SimplifiedHybridProcessor