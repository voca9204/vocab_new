#!/usr/bin/env npx tsx

/**
 * Direct test of hybrid PDF processor
 */

import fs from 'fs';
import { HybridPDFProcessor } from './src/lib/extraction/hybrid-pdf-processor';

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
    
    // Create processor instance (no API key for testing without AI)
    const processor = new HybridPDFProcessor();
    
    console.log('🚀 Starting extraction (without AI enhancement)...\n');
    
    // Extract words
    const words = await processor.extractFromPDF(fileBuffer, '-toefl_voca_1.pdf');
    
    console.log('✅ Extraction complete!\n');
    console.log(`📊 Total words extracted: ${words.length}\n`);
    
    if (words.length > 0) {
      console.log('📚 Sample Words (first 20):');
      console.log('─'.repeat(80));
      
      words.slice(0, 20).forEach((word, i) => {
        console.log(`\n${i + 1}. ${word.word.toUpperCase()}`);
        
        if (word.definition) {
          console.log(`   📖 Definition: ${word.definition.substring(0, 100)}${word.definition.length > 100 ? '...' : ''}`);
        }
        
        if (word.synonyms && word.synonyms.length > 0) {
          console.log(`   🔄 Synonyms: ${word.synonyms.slice(0, 5).join(', ')}`);
        }
        
        if (word.context) {
          console.log(`   📝 Context: "${word.context.substring(0, 80)}${word.context.length > 80 ? '...' : ''}"`);
        }
        
        if (word.confidence) {
          console.log(`   🎯 Confidence: ${(word.confidence * 100).toFixed(0)}%`);
        }
      });
      
      console.log('\n' + '─'.repeat(80));
      
      // Quality Analysis
      console.log('\n📈 Quality Analysis:');
      const wordsWithDef = words.filter(w => w.definition).length;
      const wordsWithSynonyms = words.filter(w => w.synonyms && w.synonyms.length > 0).length;
      const avgConfidence = words.reduce((sum, w) => sum + (w.confidence || 0), 0) / words.length;
      
      console.log(`  Words with definitions: ${wordsWithDef}/${words.length} (${(wordsWithDef/words.length*100).toFixed(1)}%)`);
      console.log(`  Words with synonyms: ${wordsWithSynonyms}/${words.length} (${(wordsWithSynonyms/words.length*100).toFixed(1)}%)`);
      console.log(`  Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);
      
      // Section type distribution
      const sectionTypes = new Map<string, number>();
      words.forEach(w => {
        const type = w.context?.includes('-') ? 'definition' : 
                     w.context?.match(/^\d/) ? 'list' : 
                     'table';
        sectionTypes.set(type, (sectionTypes.get(type) || 0) + 1);
      });
      
      console.log('\n📊 Word Sources:');
      Array.from(sectionTypes.entries()).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} words (${(count/words.length*100).toFixed(1)}%)`);
      });
      
      // Save results
      const outputPath = './extraction-results-hybrid.json';
      fs.writeFileSync(outputPath, JSON.stringify(words, null, 2));
      console.log(`\n💾 Full results saved to: ${outputPath}`);
    } else {
      console.log('⚠️  No words extracted');
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testHybridProcessor();