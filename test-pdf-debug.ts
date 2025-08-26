#!/usr/bin/env npx tsx

/**
 * Debug PDF extraction to understand the line structure
 */

import fs from 'fs';
import pdfParse from 'pdf-parse';

async function debugPDF() {
  try {
    const pdfPath = '/Users/sinclair/Downloads/-toefl_voca_1.pdf';
    const fileBuffer = fs.readFileSync(pdfPath);
    
    console.log('📄 Parsing PDF...\n');
    
    const data = await pdfParse(fileBuffer);
    
    console.log(`Pages: ${data.numpages}`);
    console.log(`Text length: ${data.text.length}\n`);
    
    const lines = data.text.split('\n').filter(line => line.trim());
    
    console.log(`Total lines: ${lines.length}\n`);
    
    // Show first 50 lines to understand the structure
    console.log('First 50 lines:');
    console.log('─'.repeat(80));
    
    lines.slice(0, 50).forEach((line, i) => {
      console.log(`${(i + 1).toString().padStart(3)}: ${line}`);
    });
    
    console.log('─'.repeat(80));
    
    // Look for patterns
    console.log('\n🔍 Pattern Analysis:\n');
    
    const wordPatterns = {
      'word space definition': 0,
      'word tab definition': 0,
      'numbered list': 0,
      'word only': 0,
      'korean included': 0,
      'with synonyms': 0
    };
    
    lines.forEach(line => {
      // Check for Korean
      if (/[\u3131-\uD79D]/.test(line)) {
        wordPatterns['korean included']++;
      }
      
      // Check for numbered list
      if (/^\d+[.)\s]/.test(line)) {
        wordPatterns['numbered list']++;
      }
      
      // Check for tabs
      if (/\t/.test(line)) {
        wordPatterns['word tab definition']++;
      }
      
      // Check for word with multiple spaces
      if (/^[a-zA-Z]+\s{2,}/.test(line)) {
        wordPatterns['word space definition']++;
      }
      
      // Check for single word lines
      if (/^[a-zA-Z]+$/.test(line)) {
        wordPatterns['word only']++;
      }
      
      // Check for synonyms pattern
      if (/[a-zA-Z]+\s+[a-zA-Z]+,\s*[a-zA-Z]+/.test(line)) {
        wordPatterns['with synonyms']++;
      }
    });
    
    console.log('Pattern counts:');
    Object.entries(wordPatterns).forEach(([pattern, count]) => {
      console.log(`  ${pattern}: ${count}`);
    });
    
    // Sample extraction with simple pattern
    console.log('\n📚 Sample extraction (simple pattern):');
    console.log('─'.repeat(80));
    
    const extractedWords = new Set<string>();
    
    lines.forEach(line => {
      // Simple pattern: first word of each line that starts with a letter
      const match = line.match(/^([a-zA-Z]{3,20})\s/);
      if (match) {
        const word = match[1].toLowerCase();
        if (!['day', 'basic', 'word', 'vocabulary', 'page'].includes(word)) {
          extractedWords.add(word);
        }
      }
    });
    
    const wordArray = Array.from(extractedWords);
    console.log(`\nExtracted ${wordArray.length} unique words`);
    console.log('\nFirst 30 words:');
    wordArray.slice(0, 30).forEach((word, i) => {
      if (i % 5 === 0) process.stdout.write('\n  ');
      process.stdout.write(word.padEnd(15));
    });
    console.log('\n');
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

debugPDF();