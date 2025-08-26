#!/usr/bin/env node

/**
 * Check specific words that are having display issues
 */

const admin = require('firebase-admin');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

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

async function checkWords() {
  console.log('🔍 Checking Specific Words with Issues\n');
  console.log('='.repeat(60));
  
  const wordsToCheck = ['fundamental', 'afterwards'];
  
  for (const wordText of wordsToCheck) {
    console.log(`\n📝 Word: "${wordText}"`);
    console.log('-'.repeat(40));
    
    // Check in all collections
    const collections = ['words', 'words_v3', 'ai_generated_words', 'personal_collection_words'];
    
    for (const collectionName of collections) {
      console.log(`\n  Checking in ${collectionName}:`);
      
      try {
        // Search by word text
        const snapshot = await db.collection(collectionName)
          .where('word', '==', wordText)
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          
          console.log(`    ✅ Found! ID: ${doc.id}`);
          console.log(`    Structure type: ${data.definitions ? 'NESTED' : 'FLAT'}`);
          
          // Check nested structure
          if (data.definitions && Array.isArray(data.definitions)) {
            console.log(`    definitions (array):`);
            data.definitions.forEach((def, i) => {
              console.log(`      [${i}]:`);
              console.log(`        definition: ${def.definition ? def.definition.substring(0, 50) + '...' : 'NULL'}`);
              console.log(`        examples: ${def.examples ? def.examples.length + ' items' : 'NULL'}`);
            });
          }
          
          // Check flat structure
          if (data.definition !== undefined) {
            console.log(`    definition (string): ${data.definition ? data.definition.substring(0, 50) + '...' : 'NULL or empty'}`);
          }
          
          // Check other fields
          console.log(`    englishDefinition: ${data.englishDefinition ? data.englishDefinition.substring(0, 80) + '...' : 'NULL'}`);
          console.log(`    etymology: ${data.etymology ? data.etymology.substring(0, 80) + '...' : 'NULL'}`);
          console.log(`    examples: ${data.examples ? data.examples.length + ' items' : 'NULL'}`);
          
          // Quality markers
          console.log(`    qualityImproved: ${data.qualityImproved || false}`);
          console.log(`    quality.score: ${data.quality?.score || 'N/A'}`);
          
          // Raw data for debugging
          console.log(`\n    RAW DATA (first 500 chars):`);
          console.log('    ', JSON.stringify(data).substring(0, 500));
          
        } else {
          console.log(`    ❌ Not found`);
        }
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Analysis Complete\n');
  
  process.exit(0);
}

checkWords();