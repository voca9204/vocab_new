// Direct test of PDF extraction
const fs = require('fs');

async function testExtraction() {
  try {
    const pdfPath = '/Users/sinclair/Downloads/-toefl_voca_1.pdf';
    const fileContent = fs.readFileSync(pdfPath);
    const file = new File([fileContent], '-toefl_voca_1.pdf', { type: 'application/pdf' });
    
    console.log('File created:', file.name, file.size, 'bytes');
    
    // Make API call
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('http://localhost:3100/api/collections/extract-words', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('API Response:', JSON.stringify(result, null, 2));
    
    if (result.words && result.words.length > 0) {
      console.log('\nFirst 10 words:');
      result.words.slice(0, 10).forEach((word, i) => {
        console.log(`${i + 1}. ${word.word}: ${word.definition?.substring(0, 50)}...`);
      });
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run test
testExtraction();