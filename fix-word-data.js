#!/usr/bin/env node

/**
 * Fix specific word data issues in words_v3
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

async function fixWords() {
  console.log('🔧 Fixing Word Data Issues\n');
  console.log('='.repeat(60));
  
  const fixes = [
    {
      id: 'DV2zk4Ky7IruDX2tx6aW',
      word: 'afterwards',
      issue: 'englishDefinition contains etymology',
      fix: {
        englishDefinition: 'At a later time; subsequently',
        // Keep the existing etymology field as is
      }
    }
  ];
  
  for (const fix of fixes) {
    console.log(`\n📝 Fixing: ${fix.word}`);
    console.log(`Issue: ${fix.issue}`);
    
    try {
      // Update in words_v3
      await db.collection('words_v3').doc(fix.id).update(fix.fix);
      console.log(`✅ Fixed in words_v3`);
      
      // Also update in original words collection for consistency
      await db.collection('words').doc(fix.id).update(fix.fix);
      console.log(`✅ Fixed in words collection`);
      
      // Verify the fix
      const doc = await db.collection('words_v3').doc(fix.id).get();
      if (doc.exists) {
        const data = doc.data();
        console.log(`\nVerification:`);
        console.log(`  englishDefinition: "${data.englishDefinition}"`);
        console.log(`  etymology: "${data.etymology?.substring(0, 50)}..."`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Fixes Complete\n');
  
  process.exit(0);
}

// Run the fix
fixWords();