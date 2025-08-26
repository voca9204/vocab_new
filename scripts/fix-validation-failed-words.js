#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function findAndFixFailedWords() {
  console.log('🔍 Finding words with validation failures...\n');
  console.log('=' .repeat(60));
  
  let failedWords = [];
  let fixedCount = 0;
  
  try {
    // Query words_v3 collection for words without definitions
    const snapshot = await db.collection('words_v3')
      .where('quality.score', '<', 30) // Low quality score indicates missing data
      .limit(50)
      .get();
    
    console.log(`Found ${snapshot.size} low-quality words to check\n`);
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const word = data.word;
      
      // Check if both definitions are missing
      if (!data.definition && !data.englishDefinition) {
        console.log(`\n❌ Failed validation: "${word}" (ID: ${doc.id})`);
        console.log(`   Quality score: ${data.quality?.score || 0}`);
        console.log(`   Source: ${data.source?.type || 'unknown'}`);
        
        failedWords.push({
          id: doc.id,
          word: word,
          data: data
        });
        
        // Try to fix by generating definitions
        console.log(`   🔧 Attempting to fix...`);
        
        const updateData = {
          definition: `${word}의 의미`, // Placeholder Korean definition
          englishDefinition: `Definition of ${word}`, // Placeholder English definition
          quality: {
            score: 40, // Improved but still needs review
            validated: false,
            needsReview: true,
            lastReviewed: admin.firestore.FieldValue.serverTimestamp()
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // If we have partial data, preserve it
        if (data.pronunciation) updateData.pronunciation = data.pronunciation;
        if (data.examples && data.examples.length > 0) updateData.examples = data.examples;
        if (data.synonyms && data.synonyms.length > 0) updateData.synonyms = data.synonyms;
        
        await db.collection('words_v3').doc(doc.id).update(updateData);
        console.log(`   ✅ Added placeholder definitions - needs manual review`);
        fixedCount++;
      }
    }
    
    if (failedWords.length === 0) {
      console.log('\n✅ No words with missing definitions found!');
    } else {
      console.log('\n' + '='.repeat(60));
      console.log(`📊 Summary:`);
      console.log(`   Total failed words found: ${failedWords.length}`);
      console.log(`   Fixed with placeholders: ${fixedCount}`);
      console.log(`   These words need manual review or AI regeneration`);
      
      // Save list for manual review
      const reviewList = failedWords.map(w => ({
        id: w.id,
        word: w.word,
        source: w.data.source?.type || 'unknown'
      }));
      
      const fs = require('fs');
      fs.writeFileSync(
        path.join(__dirname, 'words-needing-review.json'),
        JSON.stringify(reviewList, null, 2)
      );
      console.log(`\n📝 Review list saved to: words-needing-review.json`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  process.exit(0);
}

// Also check for words that might need quality improvement
async function analyzeWordQuality() {
  console.log('\n📊 Analyzing overall word quality...\n');
  
  const qualityBuckets = {
    excellent: 0,  // 80-100
    good: 0,       // 60-79
    fair: 0,       // 40-59
    poor: 0,       // 20-39
    critical: 0    // 0-19
  };
  
  const snapshot = await db.collection('words_v3').get();
  
  snapshot.forEach(doc => {
    const score = doc.data().quality?.score || 0;
    if (score >= 80) qualityBuckets.excellent++;
    else if (score >= 60) qualityBuckets.good++;
    else if (score >= 40) qualityBuckets.fair++;
    else if (score >= 20) qualityBuckets.poor++;
    else qualityBuckets.critical++;
  });
  
  console.log('Quality Distribution:');
  console.log(`   🌟 Excellent (80-100): ${qualityBuckets.excellent}`);
  console.log(`   ✅ Good (60-79): ${qualityBuckets.good}`);
  console.log(`   🔄 Fair (40-59): ${qualityBuckets.fair}`);
  console.log(`   ⚠️  Poor (20-39): ${qualityBuckets.poor}`);
  console.log(`   ❌ Critical (0-19): ${qualityBuckets.critical}`);
  
  const total = Object.values(qualityBuckets).reduce((a, b) => a + b, 0);
  const avgQuality = (
    (qualityBuckets.excellent * 90 +
     qualityBuckets.good * 70 +
     qualityBuckets.fair * 50 +
     qualityBuckets.poor * 30 +
     qualityBuckets.critical * 10) / total
  ).toFixed(1);
  
  console.log(`\n   Average Quality Score: ${avgQuality}/100`);
}

// Run the fix
async function main() {
  await findAndFixFailedWords();
  await analyzeWordQuality();
}

main();