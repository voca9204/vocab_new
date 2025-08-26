#!/usr/bin/env node

/**
 * Direct test of hybrid PDF processor
 */

const fs = require('fs');

async function testHybridProcessor() {
  try {
    console.log('🧪 Testing Hybrid PDF Processor directly...\n');
    
    // Test file path
    const pdfPath = '/Users/sinclair/Downloads/-toefl_voca_1.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF file not found:', pdfPath);
      return;
    }
    
    // Read file
    const fileBuffer = fs.readFileSync(pdfPath);
    console.log(`📄 File loaded: ${(fileBuffer.length / 1024).toFixed(2)} KB\n`);
    
    // Import hybrid processor
    console.log('Loading hybrid processor...');
    const { HybridPDFProcessor } = await import('./src/lib/extraction/hybrid-pdf-processor.ts');
    
    // Create processor instance
    const processor = new HybridPDFProcessor(process.env.OPENAI_API_KEY);
    
    console.log('🚀 Starting extraction...\n');
    
    // Extract words
    const words = await processor.extractFromPDF(fileBuffer, '-toefl_voca_1.pdf');
    
    console.log('✅ Extraction complete!\n');
    console.log(`📊 Total words extracted: ${words.length}\n`);
    
    if (words.length > 0) {
      console.log('📚 Sample Words (first 10):');
      console.log('─'.repeat(60));
      
      words.slice(0, 10).forEach((word, i) => {
        console.log(`\n${i + 1}. ${word.word.toUpperCase()}`);
        
        if (word.definition) {
          console.log(`   📖 ${word.definition.substring(0, 80)}${word.definition.length > 80 ? '...' : ''}`);
        }
        
        if (word.confidence) {
          console.log(`   🎯 Confidence: ${(word.confidence * 100).toFixed(0)}%`);
        }
      });
      
      console.log('\n' + '─'.repeat(60));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testHybridProcessor();