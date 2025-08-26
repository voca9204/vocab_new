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

async function checkWords() {
  console.log('=== Checking Problem Words in All Collections ===\n');
  
  const problemWords = ['fundamental', 'afterwards'];
  const collections = ['words', 'words_v3', 'ai_generated_words'];
  
  for (const word of problemWords) {
    console.log(`\n📝 Checking: ${word}`);
    console.log('-'.repeat(50));
    
    for (const collection of collections) {
      try {
        // Search by word field
        const snapshot = await db.collection(collection)
          .where('word', '==', word)
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          console.log(`\n✅ Found in ${collection}:`);
          console.log(`  ID: ${doc.id}`);
          console.log(`  definition: "${data.definition || 'NULL/UNDEFINED'}"`);
          console.log(`  englishDefinition: "${data.englishDefinition ? data.englishDefinition.substring(0, 100) + '...' : 'NULL/UNDEFINED'}"`);
          console.log(`  etymology: "${data.etymology ? data.etymology.substring(0, 100) + '...' : 'NULL/UNDEFINED'}"`);
          console.log(`  quality: ${JSON.stringify(data.quality)}`);
          console.log(`  source: ${JSON.stringify(data.source)}`);
        } else {
          console.log(`❌ Not found in ${collection}`);
        }
      } catch (error) {
        console.log(`❌ Error checking ${collection}: ${error.message}`);
      }
    }
  }
  
  process.exit(0);
}

checkWords();