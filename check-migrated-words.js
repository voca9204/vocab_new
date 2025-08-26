#!/usr/bin/env node

/**
 * Check the exact migrated data in words_v3
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

async function checkMigratedWords() {
  console.log('🔍 Checking Exact Migrated Data in words_v3\n');
  console.log('='.repeat(60));
  
  const wordIds = ['DQz3RMeJPap8Hu1e3i10', 'DV2zk4Ky7IruDX2tx6aW']; // fundamental, afterwards
  
  for (const wordId of wordIds) {
    console.log(`\n📝 Document ID: ${wordId}`);
    console.log('-'.repeat(40));
    
    try {
      const doc = await db.collection('words_v3').doc(wordId).get();
      
      if (doc.exists) {
        const data = doc.data();
        console.log(`Word: "${data.word}"`);
        console.log('\nField Analysis:');
        console.log(`  definition type: ${typeof data.definition}`);
        console.log(`  definition value: "${data.definition}"`);
        console.log(`  definition === null: ${data.definition === null}`);
        console.log(`  definition === "": ${data.definition === ""}`);
        console.log(`  definition === undefined: ${data.definition === undefined}`);
        console.log(`  !definition: ${!data.definition}`);
        console.log(`  definition || 'No definition available': "${data.definition || 'No definition available'}"`);
        
        console.log(`\n  englishDefinition type: ${typeof data.englishDefinition}`);
        console.log(`  englishDefinition length: ${data.englishDefinition?.length}`);
        console.log(`  englishDefinition first 100 chars: "${data.englishDefinition?.substring(0, 100)}..."`);
        
        console.log(`\n  etymology type: ${typeof data.etymology}`);
        console.log(`  etymology first 100 chars: "${data.etymology?.substring(0, 100)}..."`);
        
        // Check if englishDefinition contains etymology keywords
        if (data.englishDefinition) {
          const hasEtymology = data.englishDefinition.toLowerCase().includes('old english') || 
                              data.englishDefinition.toLowerCase().includes('latin') ||
                              data.englishDefinition.toLowerCase().includes('derived from') ||
                              data.englishDefinition.toLowerCase().includes('etymology');
          console.log(`\n  ⚠️ englishDefinition contains etymology keywords: ${hasEtymology}`);
        }
        
        // Full raw data
        console.log('\nRaw data (prettified):');
        console.log(JSON.stringify({
          definition: data.definition,
          englishDefinition: data.englishDefinition?.substring(0, 200),
          etymology: data.etymology?.substring(0, 200)
        }, null, 2));
        
      } else {
        console.log('❌ Document not found in words_v3');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Analysis Complete\n');
  
  process.exit(0);
}

checkMigratedWords();