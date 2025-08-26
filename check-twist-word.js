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

async function checkTwist() {
  console.log('=== Checking "twist" in All Collections ===\n');
  
  const collections = ['words', 'words_v3', 'ai_generated_words', 'personal_collection_words'];
  
  for (const collection of collections) {
    console.log(`\n📝 Checking ${collection}:`);
    console.log('-'.repeat(50));
    
    try {
      // Search by word field
      const snapshot = await db.collection(collection)
        .where('word', '==', 'twist')
        .get();
      
      if (!snapshot.empty) {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`\n✅ Found in ${collection}:`);
          console.log(`  ID: ${doc.id}`);
          console.log(`  word: "${data.word}"`);
          console.log(`  definition: ${JSON.stringify(data.definition)}`);
          console.log(`  englishDefinition: ${JSON.stringify(data.englishDefinition)}`);
          console.log(`  definitions: ${JSON.stringify(data.definitions)}`);
          console.log(`  etymology: "${data.etymology ? data.etymology.substring(0, 100) + '...' : 'NULL'}"`);
          console.log(`  source: ${JSON.stringify(data.source)}`);
          console.log(`  quality: ${JSON.stringify(data.quality)}`);
          console.log('\n  Full data:');
          console.log(JSON.stringify(data, null, 2));
        });
      } else {
        console.log(`❌ Not found in ${collection}`);
      }
    } catch (error) {
      console.log(`❌ Error checking ${collection}: ${error.message}`);
    }
  }
  
  // Also check by ID if we know it
  console.log('\n\n=== Checking specific IDs ===');
  const knownIds = ['DQz3RMeJPap8Hu1e3i10', 'DV2zk4Ky7IruDX2tx6aW']; // fundamental, afterwards
  
  for (const id of knownIds) {
    for (const collection of ['words', 'words_v3']) {
      try {
        const doc = await db.collection(collection).doc(id).get();
        if (doc.exists) {
          const data = doc.data();
          console.log(`\n📄 ${collection}/${id}: ${data.word}`);
          console.log(`  definition: ${JSON.stringify(data.definition)}`);
        }
      } catch (error) {
        console.log(`Error checking ${collection}/${id}: ${error.message}`);
      }
    }
  }
  
  process.exit(0);
}

checkTwist();