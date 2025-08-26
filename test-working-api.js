const fs = require('fs');
const FormData = require('form-data');
const http = require('http');

async function testWorkingExtraction() {
  const pdfPath = '/Users/sinclair/Downloads/-toefl_voca_1.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error('File not found:', pdfPath);
    return;
  }
  
  const fileBuffer = fs.readFileSync(pdfPath);
  const formData = new FormData();
  
  formData.append('file', fileBuffer, {
    filename: '-toefl_voca_1.pdf',
    contentType: 'application/pdf'
  });
  
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3100,
      path: '/api/extract-words-working',
      method: 'POST',
      headers: formData.getHeaders()
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:');
        try {
          const json = JSON.parse(data);
          console.log(JSON.stringify(json, null, 2));
          if (json.words) {
            console.log('\nTotal words:', json.words.length);
            console.log('First 5 words:');
            json.words.slice(0, 5).forEach((w, i) => {
              console.log(`${i+1}. ${w.word}: ${w.definition || 'No definition'}`);
            });
          }
        } catch (e) {
          console.log(data);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('Request error:', err.message);
      reject(err);
    });
    
    formData.pipe(req);
  });
}

testWorkingExtraction().catch(console.error);