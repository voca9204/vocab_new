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

async function checkAllFiduciary() {
  try {
    console.log('=== Comprehensive Fiduciary Search ===\n');

    // 1. Check the newly created document by ID
    console.log('1️⃣ Checking by Document ID (AbFg3nv2Y5coUB9Qyu9s):');
    const wordDoc = await db.collection('words_v3').doc('AbFg3nv2Y5coUB9Qyu9s').get();

    if (wordDoc.exists) {
      const data = wordDoc.data()!;
      console.log('✅ Found by ID!');
      console.log('  Word:', data.word);
      console.log('  Definition:', data.definition || 'N/A');
      console.log('  Korean:', data.koreanDefinition || data.korean || 'N/A');
      console.log('  Category:', data.category || 'N/A');
      console.log('  Source:', JSON.stringify(data.source) || 'N/A');
    } else {
      console.log('❌ Not found by ID');
    }

    console.log('\n2️⃣ Searching all words_v3 for "fiduciary":');
    const query = await db.collection('words_v3')
      .where('word', '==', 'fiduciary')
      .get();

    if (!query.empty) {
      console.log(`✅ Found ${query.size} matching documents:`);
      query.docs.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`\n  Document ${idx + 1} (ID: ${doc.id}):`);
        console.log('    Word:', data.word);
        console.log('    Definition:', data.definition || 'N/A');
        console.log('    Korean:', data.koreanDefinition || data.korean || 'N/A');
      });
    } else {
      console.log('❌ No documents found with word="fiduciary"');
    }

    // 3. Check user_words collection (where you might have learned it)
    console.log('\n3️⃣ Checking user_words collection:');
    const userWordsQuery = await db.collection('user_words')
      .where('word', '==', 'fiduciary')
      .limit(5)
      .get();

    if (!userWordsQuery.empty) {
      console.log(`✅ Found ${userWordsQuery.size} user learning records`);
    } else {
      console.log('❌ No user learning records found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllFiduciary();