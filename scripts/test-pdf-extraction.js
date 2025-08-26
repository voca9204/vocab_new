const fs = require('fs');
const path = require('path');

async function testPDFExtraction() {
  try {
    // Dynamic import for ES module
    const pdfjsLib = await import('pdfjs-dist');
    
    const pdfPath = '/Users/sinclair/Downloads/-toefl_voca_1.pdf';
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    console.log(`PDF loaded. Total pages: ${pdf.numPages}`);
    
    // Extract text from first 3 pages
    for (let pageNum = 1; pageNum <= Math.min(3, pdf.numPages); pageNum++) {
      console.log(`\n=== Page ${pageNum} ===`);
      
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Reconstruct text with proper spacing
      let currentY = null;
      let lines = [];
      let currentLine = '';
      
      for (const item of textContent.items) {
        // Check if we're on a new line (Y position changed significantly)
        if (currentY !== null && Math.abs(item.transform[5] - currentY) > 2) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = '';
        }
        
        currentY = item.transform[5];
        
        // Add space if needed
        if (currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ')) {
          currentLine += ' ';
        }
        currentLine += item.str;
      }
      
      // Add last line
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      
      // Show first 20 lines
      console.log('\nExtracted lines:');
      lines.slice(0, 20).forEach((line, i) => {
        console.log(`${i + 1}: ${line}`);
      });
      
      // Try to find vocabulary patterns
      console.log('\nVocabulary patterns found:');
      let vocabCount = 0;
      
      for (const line of lines) {
        // Check various vocabulary patterns
        const patterns = [
          /^(\d+)\s+([a-zA-Z]+)\s+(.+)$/,  // "001 word definition"
          /^([a-zA-Z]+)\s+\(([^)]+)\)\s+(.+)$/,  // "word (n.) definition"
          /^([a-zA-Z]+)\s+(.{10,})$/,  // "word definition" (definition at least 10 chars)
        ];
        
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match) {
            let word, definition;
            
            if (pattern === patterns[0]) {
              word = match[2];
              definition = match[3];
            } else if (pattern === patterns[1]) {
              word = match[1];
              definition = match[3];
            } else {
              word = match[1];
              definition = match[2];
            }
            
            // Filter out common words and ensure it's a valid vocabulary word
            if (word && word.length > 2 && word.length < 20 && /^[a-zA-Z]+$/.test(word)) {
              console.log(`  - ${word}: ${definition.substring(0, 50)}...`);
              vocabCount++;
              if (vocabCount >= 10) break;
            }
          }
        }
        if (vocabCount >= 10) break;
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testPDFExtraction();