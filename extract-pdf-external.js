#!/usr/bin/env node

const fs = require('fs')
const pdfParse = require('pdf-parse')

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

async function extractFromPDF(filePath) {
  try {
    const buffer = fs.readFileSync(filePath)
    const data = await pdfParse(buffer)
    
    const lines = data.text.split('\n').filter(line => line.trim())
    const words = []
    const wordSet = new Set()
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      
      if (parts.length >= 2) {
        const firstWord = parts[0].toLowerCase()
        
        // Check if valid vocabulary word
        if (/^[a-zA-Z]{3,25}$/.test(firstWord) && 
            !COMMON_WORDS.has(firstWord) &&
            !wordSet.has(firstWord)) {
          
          wordSet.add(firstWord)
          
          // Find Korean definition
          const koreanMatch = line.match(/[\u3131-\uD79D].+/)
          
          // Extract synonyms (words between first word and Korean)
          let synonyms = []
          if (koreanMatch) {
            const beforeKorean = line.substring(0, line.indexOf(koreanMatch[0]))
            synonyms = beforeKorean
              .split(/\s+/)
              .slice(1) // Skip first word
              .filter(w => /^[a-zA-Z]+$/.test(w) && w.length > 2 && !COMMON_WORDS.has(w.toLowerCase()))
              .slice(0, 5)
          } else {
            // No Korean, use next few words as synonyms
            synonyms = parts
              .slice(1, Math.min(6, parts.length))
              .filter(w => /^[a-zA-Z]+$/.test(w) && w.length > 2 && !COMMON_WORDS.has(w.toLowerCase()))
          }
          
          words.push({
            word: firstWord,
            definition: koreanMatch ? koreanMatch[0] : synonyms.join(', '),
            synonyms: synonyms.length > 0 ? synonyms : undefined
          })
        }
      }
    }
    
    return words.slice(0, 500) // Return max 500 words
    
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`)
  }
}

async function main() {
  try {
    const filePath = process.argv[2]
    if (!filePath) {
      throw new Error('No file path provided')
    }
    
    const words = await extractFromPDF(filePath)
    console.log(JSON.stringify(words))
    process.exit(0)
    
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

main()