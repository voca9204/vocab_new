import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkWord() {
  try {
    // Check master collection first
    const masterSnapshot = await db.collection('vocabulary')
      .where('word', '==', 'fiduciary')
      .limit(1)
      .get();

    if (!masterSnapshot.empty) {
      const data = masterSnapshot.docs[0].data();
      console.log('✅ Found "fiduciary" in master vocabulary collection');
      console.log('');
      console.log('📝 Master Data:');
      console.log('  Word:', data.word);
      console.log('  Definition:', data.definition || 'N/A');
      console.log('  Korean:', data.korean || 'N/A');
      console.log('  Example:', data.example || 'N/A');
      console.log('  Part of Speech:', data.partOfSpeech || 'N/A');
      console.log('');
    } else {
      console.log('❌ Not found in master vocabulary collection');
    }

    // Also check words_v3
    const wordsV3Doc = await db.collection('words_v3').doc('fiduciary').get();
    if (wordsV3Doc.exists) {
      const data = wordsV3Doc.data()!;
      console.log('✅ Found in words_v3:');
      console.log('  Definition:', data.definition || 'N/A');
      console.log('  Korean:', data.koreanDefinition || 'N/A');
    } else {
      console.log('❌ Not found in words_v3');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkWord();