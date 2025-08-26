#!/usr/bin/env node

/**
 * Test script for hybrid PDF extraction
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

async function testHybridExtraction() {
  try {
    console.log('🧪 Testing Hybrid PDF Extraction...\n');
    
    // Test file path
    const pdfPath = '/Users/sinclair/Downloads/-toefl_voca_1.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF file not found:', pdfPath);
      return;
    }
    
    // Read file
    const fileBuffer = fs.readFileSync(pdfPath);
    
    console.log('📄 File Info:');
    console.log(`  Name: -toefl_voca_1.pdf`);
    console.log(`  Size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`  Type: application/pdf\n`);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: '-toefl_voca_1.pdf',
      contentType: 'application/pdf'
    });
    
    console.log('🚀 Sending request to extraction API...\n');
    
    // Make API request using Promise
    const result = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3100,
        path: '/api/collections/extract-words',
        method: 'POST',
        headers: formData.getHeaders()
      }, (res) => {
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode !== 200) {
              reject(new Error(`API returned ${res.statusCode}: ${data}`));
            } else {
              resolve(json);
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      formData.pipe(req);
    });
    
    console.log('✅ Extraction successful!\n');
    console.log('📊 Results:');
    console.log(`  Total words extracted: ${result.totalCount}`);
    console.log(`  Method: ${result.method}`);
    console.log(`  Success: ${result.success}\n`);
    
    if (result.words && result.words.length > 0) {
      console.log('📚 Sample Words (first 20):');
      console.log('─'.repeat(80));
      
      result.words.slice(0, 20).forEach((word, i) => {
        console.log(`\n${i + 1}. ${word.word.toUpperCase()}`);
        
        if (word.definition) {
          console.log(`   📖 Definition: ${word.definition.substring(0, 100)}${word.definition.length > 100 ? '...' : ''}`);
        }
        
        if (word.partOfSpeech && word.partOfSpeech.length > 0) {
          console.log(`   🏷️  Part of Speech: ${word.partOfSpeech.join(', ')}`);
        }
        
        if (word.etymology) {
          console.log(`   🌍 Etymology: ${word.etymology.substring(0, 80)}${word.etymology.length > 80 ? '...' : ''}`);
        }
        
        if (word.synonyms && word.synonyms.length > 0) {
          console.log(`   🔄 Synonyms: ${word.synonyms.slice(0, 5).join(', ')}`);
        }
        
        if (word.examples && word.examples.length > 0) {
          console.log(`   💡 Example: "${word.examples[0].substring(0, 100)}${word.examples[0].length > 100 ? '...' : ''}"`);
        }
      });
      
      console.log('\n' + '─'.repeat(80));
      
      // Quality Analysis
      console.log('\n📈 Quality Analysis:');
      const wordsWithDef = result.words.filter(w => w.definition).length;
      const wordsWithEtymology = result.words.filter(w => w.etymology).length;
      const wordsWithExamples = result.words.filter(w => w.examples && w.examples.length > 0).length;
      const wordsWithSynonyms = result.words.filter(w => w.synonyms && w.synonyms.length > 0).length;
      
      console.log(`  Words with definitions: ${wordsWithDef}/${result.totalCount} (${(wordsWithDef/result.totalCount*100).toFixed(1)}%)`);
      console.log(`  Words with etymology: ${wordsWithEtymology}/${result.totalCount} (${(wordsWithEtymology/result.totalCount*100).toFixed(1)}%)`);
      console.log(`  Words with examples: ${wordsWithExamples}/${result.totalCount} (${(wordsWithExamples/result.totalCount*100).toFixed(1)}%)`);
      console.log(`  Words with synonyms: ${wordsWithSynonyms}/${result.totalCount} (${(wordsWithSynonyms/result.totalCount*100).toFixed(1)}%)`);
      
      // Save results to file for inspection
      const outputPath = path.join(__dirname, 'extraction-results.json');
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`\n💾 Full results saved to: ${outputPath}`);
    } else {
      console.log('⚠️  No words extracted');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run test
console.log('🔬 Hybrid PDF Extraction Test');
console.log('=' .repeat(80) + '\n');

testHybridExtraction().then(() => {
  console.log('\n' + '=' .repeat(80));
  console.log('🏁 Test complete');
});