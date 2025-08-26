#!/usr/bin/env node

/**
 * Test script to verify word loading from collections
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

async function testWordLoading() {
  console.log('🔍 Testing Word Loading from Collections\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Check vocabulary_collections (official collections)
    console.log('\n📚 OFFICIAL COLLECTIONS (vocabulary_collections):');
    console.log('-'.repeat(40));
    
    const officialSnapshot = await db.collection('vocabulary_collections').limit(3).get();
    
    for (const doc of officialSnapshot.docs) {
      const data = doc.data();
      console.log(`\nCollection: ${data.name}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Word Count: ${data.wordCount || 0}`);
      console.log(`  Words Array Length: ${data.words?.length || 0}`);
      
      if (data.words && data.words.length > 0) {
        // Check if first word exists in words collection
        const firstWordId = data.words[0];
        try {
          const wordDoc = await db.collection('words').doc(firstWordId).get();
          
          if (wordDoc.exists) {
            console.log(`  ✅ First word exists in 'words' collection: ${wordDoc.data().word}`);
          } else {
            // Try words_v3
            const wordV3Doc = await db.collection('words_v3').doc(firstWordId).get();
            if (wordV3Doc.exists) {
              console.log(`  ✅ First word exists in 'words_v3' collection: ${wordV3Doc.data().word}`);
            } else {
              console.log(`  ❌ First word ID not found: ${firstWordId}`);
            }
          }
        } catch (err) {
          console.log(`  ❌ Error checking word: ${err.message}`);
        }
      } else {
        console.log(`  ⚠️ No words array or empty`);
      }
    }
    
    // 2. Check personal_collections
    console.log('\n\n📝 PERSONAL COLLECTIONS (personal_collections):');
    console.log('-'.repeat(40));
    
    const personalSnapshot = await db.collection('personal_collections').limit(3).get();
    
    for (const doc of personalSnapshot.docs) {
      const data = doc.data();
      console.log(`\nCollection: ${data.name}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Word Count: ${data.wordCount || 0}`);
      console.log(`  Words Array Length: ${data.words?.length || 0}`);
      
      if (data.words && data.words.length > 0) {
        console.log(`  Sample word IDs: ${data.words.slice(0, 3).join(', ')}...`);
      }
    }
    
    // 3. Check words_v3 collection stats
    console.log('\n\n📊 WORDS_V3 COLLECTION STATS:');
    console.log('-'.repeat(40));
    
    const wordsV3Count = await db.collection('words_v3').count().get();
    console.log(`Total words in words_v3: ${wordsV3Count.data().count}`);
    
    // Sample a few words
    const sampleWords = await db.collection('words_v3').limit(5).get();
    console.log('\nSample words:');
    sampleWords.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.word}: ${data.definition?.substring(0, 50)}...`);
    });
    
    // 4. Test the bridge adapter logic
    console.log('\n\n🔄 TESTING BRIDGE ADAPTER LOGIC:');
    console.log('-'.repeat(40));
    
    // Get a collection with words
    const testCollection = await db.collection('vocabulary_collections')
      .where('wordCount', '>', 0)
      .limit(1)
      .get();
    
    if (!testCollection.empty) {
      const collectionData = testCollection.docs[0].data();
      const collectionId = testCollection.docs[0].id;
      console.log(`\nTest collection: ${collectionData.name}`);
      console.log(`Collection ID: ${collectionId}`);
      console.log(`Expected word count: ${collectionData.wordCount}`);
      
      if (collectionData.words && collectionData.words.length > 0) {
        const wordIds = collectionData.words.slice(0, 10);
        console.log(`\nChecking first ${wordIds.length} words...`);
        
        let foundInOld = 0;
        let foundInNew = 0;
        let notFound = 0;
        
        for (const wordId of wordIds) {
          const oldWord = await db.collection('words').doc(wordId).get();
          const newWord = await db.collection('words_v3').doc(wordId).get();
          
          if (oldWord.exists) foundInOld++;
          if (newWord.exists) foundInNew++;
          if (!oldWord.exists && !newWord.exists) notFound++;
        }
        
        console.log(`  Found in 'words': ${foundInOld}/${wordIds.length}`);
        console.log(`  Found in 'words_v3': ${foundInNew}/${wordIds.length}`);
        console.log(`  Not found: ${notFound}/${wordIds.length}`);
        
        if (foundInNew === wordIds.length) {
          console.log('  ✅ All words migrated to words_v3!');
        } else if (foundInOld === wordIds.length) {
          console.log('  ⚠️ Words still in old collection, bridge adapter will handle');
        } else {
          console.log('  ❌ Some words missing!');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testWordLoading();