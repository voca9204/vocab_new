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

async function checkAllCollections() {
  try {
    console.log('=== Checking ALL collections for fiduciary ===\n');

    // 1. vocabulary collection (master)
    console.log('1️⃣ Checking vocabulary collection (legacy master):');
    const vocabQuery = await db.collection('vocabulary')
      .where('word', '==', 'fiduciary')
      .limit(1)
      .get();

    if (!vocabQuery.empty) {
      const data = vocabQuery.docs[0].data();
      console.log('✅ Found in vocabulary collection!');
      console.log('  Document ID:', vocabQuery.docs[0].id);
      console.log('  Word:', data.word);
      console.log('  Definition:', data.definition || 'N/A');
      console.log('  Korean:', data.korean || 'N/A');
    } else {
      console.log('❌ Not found in vocabulary collection');
    }

    // 2. words_v3 collection (current master)
    console.log('\n2️⃣ Checking words_v3 collection (current master):');
    const wordsV3Query = await db.collection('words_v3')
      .where('word', '==', 'fiduciary')
      .limit(1)
      .get();

    if (!wordsV3Query.empty) {
      const data = wordsV3Query.docs[0].data();
      console.log('✅ Found in words_v3 collection!');
      console.log('  Document ID:', wordsV3Query.docs[0].id);
      console.log('  Word:', data.word);
      console.log('  Definition:', data.definition || 'N/A');
      console.log('  Korean:', data.koreanDefinition || data.korean || 'N/A');
      console.log('  Category:', data.category || 'N/A');
      console.log('  Source:', JSON.stringify(data.source) || 'N/A');
    } else {
      console.log('❌ Not found in words_v3 collection');
    }

    // 3. words collection (legacy)
    console.log('\n3️⃣ Checking words collection (legacy):');
    const wordsQuery = await db.collection('words')
      .where('word', '==', 'fiduciary')
      .limit(1)
      .get();

    if (!wordsQuery.empty) {
      const data = wordsQuery.docs[0].data();
      console.log('✅ Found in words collection!');
      console.log('  Document ID:', wordsQuery.docs[0].id);
      console.log('  Word:', data.word);
    } else {
      console.log('❌ Not found in words collection');
    }

    // 4. Check document counts
    console.log('\n📊 Collection Sizes:');
    const vocabCount = await db.collection('vocabulary').count().get();
    const wordsV3Count = await db.collection('words_v3').count().get();
    console.log('  vocabulary:', vocabCount.data().count);
    console.log('  words_v3:', wordsV3Count.data().count);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllCollections();