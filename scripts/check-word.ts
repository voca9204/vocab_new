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
    const wordDoc = await db.collection('words_v3').doc('fiduciary').get();

    if (!wordDoc.exists) {
      console.log('❌ Word "fiduciary" not found in words_v3 collection');
      return;
    }

    const data = wordDoc.data()!;

    console.log('✅ Found word "fiduciary"');
    console.log('');
    console.log('📝 Definitions:');

    if (data.definition) {
      console.log('  English:', data.definition);
    }

    if (data.koreanDefinition) {
      console.log('  Korean:', data.koreanDefinition);
    } else {
      console.log('  Korean: ❌ NOT FOUND');
    }

    console.log('');
    console.log('📊 Other fields:');
    console.log('  Part of Speech:', data.partOfSpeech || 'N/A');
    console.log('  Example:', data.example ? '✓' : '✗');
    console.log('  Synonyms:', data.synonyms?.length > 0 ? data.synonyms.join(', ') : 'None');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkWord();