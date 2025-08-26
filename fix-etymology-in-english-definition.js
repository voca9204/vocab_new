#!/usr/bin/env node

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

// 수정할 단어 목록과 올바른 영어 정의
const wordsToFix = {
  'advantage': {
    englishDefinition: 'A condition or circumstance that puts one in a favorable or superior position',
    moveCurrentToEtymology: true
  },
  'accommodation': {
    englishDefinition: 'A room, group of rooms, or building in which someone may live or stay; the process of adapting or adjusting',
    moveCurrentToEtymology: true
  },
  'accomplish': {
    englishDefinition: 'To achieve or complete successfully',
    moveCurrentToEtymology: true
  },
  'combination': {
    englishDefinition: 'A joining or merging of different parts or qualities in which the component elements are individually distinct',
    moveCurrentToEtymology: true
  },
  'acquire': {
    englishDefinition: 'To buy or obtain for oneself; to come to have',
    moveCurrentToEtymology: true
  },
  'additional': {
    englishDefinition: 'Added, extra, or supplementary to what is already present or available',
    moveCurrentToEtymology: true
  },
  'command': {
    englishDefinition: 'An authoritative order; the ability to use or control something',
    moveCurrentToEtymology: true
  },
  'absolutely': {
    englishDefinition: 'With no qualification, restriction, or limitation; totally',
    moveCurrentToEtymology: true
  }
};

async function fixWords() {
  console.log('🔧 Fixing Etymology in English Definition Field\n');
  console.log('='.repeat(60));
  
  const collections = ['words', 'words_v3'];
  let totalFixed = 0;
  
  for (const [word, fixData] of Object.entries(wordsToFix)) {
    console.log(`\n📝 Processing: ${word}`);
    console.log('-'.repeat(40));
    
    for (const collectionName of collections) {
      try {
        // Search for the word
        const snapshot = await db.collection(collectionName)
          .where('word', '==', word)
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          
          console.log(`\n✅ Found in ${collectionName}:`);
          console.log(`  ID: ${doc.id}`);
          console.log(`  Current englishDefinition: "${data.englishDefinition?.substring(0, 100)}..."`);
          console.log(`  Current etymology: "${data.etymology?.substring(0, 100) || 'NULL'}..."`);
          
          // Prepare update data
          const updateData = {
            englishDefinition: fixData.englishDefinition,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // If we need to move current englishDefinition to etymology
          if (fixData.moveCurrentToEtymology && data.englishDefinition && 
              (data.englishDefinition.includes('Latin') || 
               data.englishDefinition.includes('Greek') || 
               data.englishDefinition.includes('Old English') ||
               data.englishDefinition.includes('French') ||
               data.englishDefinition.includes('derived from'))) {
            // Only update etymology if it's currently empty or needs updating
            if (!data.etymology || data.etymology.length < data.englishDefinition.length) {
              updateData.etymology = data.englishDefinition;
              console.log(`  ➡️ Moving current englishDefinition to etymology`);
            }
          }
          
          // Update the document
          await db.collection(collectionName).doc(doc.id).update(updateData);
          console.log(`  ✅ Updated successfully`);
          totalFixed++;
          
          // Verify the update
          const verifyDoc = await db.collection(collectionName).doc(doc.id).get();
          const verifyData = verifyDoc.data();
          console.log(`\n  Verification:`);
          console.log(`    New englishDefinition: "${verifyData.englishDefinition?.substring(0, 100)}..."`);
          console.log(`    New etymology: "${verifyData.etymology?.substring(0, 100) || 'NULL'}..."`);
          
        } else {
          console.log(`❌ Not found in ${collectionName}`);
        }
      } catch (error) {
        console.log(`❌ Error in ${collectionName}: ${error.message}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Fix Complete! Total documents updated: ${totalFixed}`);
  console.log('='.repeat(60) + '\n');
  
  process.exit(0);
}

// Run the fix
fixWords();