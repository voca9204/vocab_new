const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testPdfParse() {
  try {
    const pdfPath = '/Users/sinclair/Downloads/-toefl_voca_1.pdf';
    const dataBuffer = fs.readFileSync(pdfPath);
    
    console.log('PDF file size:', dataBuffer.length, 'bytes');
    
    const data = await pdfParse(dataBuffer);
    
    console.log('Pages:', data.numpages);
    console.log('Text length:', data.text.length);
    
    const lines = data.text.split('\n').filter(line => line.trim());
    console.log('Total lines:', lines.length);
    
    console.log('\nFirst 20 lines:');
    lines.slice(0, 20).forEach((line, i) => {
      console.log(`${i + 1}: ${line}`);
    });
    
    // Try to extract words
    const words = [];
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const firstWord = parts[0].toLowerCase();
        
        if (/^[a-zA-Z]{2,20}$/.test(firstWord) && 
            !['word', 'synonyms', 'meaning', 'vocabulary', 'basic', 'day'].includes(firstWord)) {
          
          const koreanMatch = line.match(/[\u3131-\uD79D].+/);
          let definition = '';
          
          if (koreanMatch) {
            definition = koreanMatch[0];
          } else if (parts.length > 1) {
            const synonyms = parts.slice(1, Math.min(5, parts.length)).join(', ');
            definition = synonyms;
          }
          
          words.push({
            word: firstWord,
            definition: definition || 'No definition'
          });
        }
      }
    }
    
    console.log('\nExtracted words:', words.length);
    console.log('\nFirst 10 words:');
    words.slice(0, 10).forEach(w => {
      console.log(`- ${w.word}: ${w.definition.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPdfParse();