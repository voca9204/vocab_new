import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

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

async function findAccountability() {
  try {
    console.log('=== Searching for "accountability" ===\n');

    const query = await db.collection('words_v3')
      .where('word', '==', 'accountability')
      .limit(1)
      .get();

    if (!query.empty) {
      const doc = query.docs[0];
      const data = doc.data();
      console.log('✅ Found "accountability" in words_v3!');
      console.log('');
      console.log('📋 Details:');
      console.log('  Document ID:', doc.id);
      console.log('  Word:', data.word);
      console.log('  Definition:', data.definition || 'N/A');
      console.log('  Korean:', data.koreanDefinition || data.korean || 'N/A');
      console.log('  Part of Speech:', data.partOfSpeech || 'N/A');
      console.log('  Category:', data.category || 'N/A');
      console.log('  Example:', data.example || 'N/A');
      console.log('  Synonyms:', data.synonyms?.join(', ') || 'N/A');
      console.log('  Source:', JSON.stringify(data.source) || 'N/A');
    } else {
      console.log('❌ "accountability" not found in words_v3');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findAccountability();