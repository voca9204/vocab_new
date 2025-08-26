const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'vocabulary-app-new',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 'voca-879@vocabulary-app-new.iam.gserviceaccount.com',
  privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDRHF3jahwVBS7Y
jul5yIVhJDj1bnlCEgzHbh13tkerGnAbt77S30Axoyv91rUjyDSRIiW0mzmAQp25
pkBQSpt00acGFYu/QGlOkMoN0IYwz4HHu47B2GfCu0GNq1npn168jRN/5kBWglSM
AfLz+CAOXj5dWpzU7ujtlby8gqiIgdmmVYCI5YUqJhSnE40dxpA257RceSXZy0TA
CNlBuLZ0AyYCZL3PETJ4H6BGnP2JxSazwo0Sftne4CRzi5Fc/A8e+WAQBh+oMffA
UDyNJo95BxyOOmaiM9E3+tuR45KPcJ1UPuU4D5L+DX2vIbVFTFcueNosxpY1raB/
xd1s2pzBAgMBAAECggEAF7CHgGp2ePkn1/fEwnuxhJJGc6OK0C3cTcGPTA8V6m/p
0HIOB7SsAJOUOcMXrVCSh/ie3emR55JkbPJFKfNxzhesPNe3B7kj1Pc5NLxxX1k6
wiZg41wBUUHGiOanHnzkDidLVLuAgWxtaJkV7YaoFwidNxU7XDIeqD/E7HQ+5Ivg
zRpBXaygHn+OP2IaE2tDwmIz9yBfI6CBP3SgGu2hf1cRmG+z7VcFe+tKS9Y8IboH
vaMWDUalXFoQcHvoXYq5i3mROFjstWiTRmCGJzzv97WvWOkAHchiM3TMROOPTEeG
v2RAyRoIxw77DrtcpI6aPPv3QMAgaTkSGHQXzN254wKBgQD4yzVa7B6MQ19BjwZS
FZxfGvhprx8lfGEug4f2o4JToKeabPVmNPuRAXR55eehtr2LnDm9csIqx3B4nzd2
F0B5CHjNwLP/dVM9FqIzbu95H42Pkw0tQ9Lx/BsVdBs0ivRP+t4l5mgaeZKGTAEa
/FOxuWsK666Amu9ZTjRR1QYjlwKBgQDXKulOj3Nqgp9Ixx0ySlaYs1KIF7q1u2cx
36+99qWJSh+Ixf2G6FbxVut7pLy9E+YpMoEL4h9Pfp8bMxYHmmEODkHuW7qQqZOO
M7HYO6Qf5UDUE5gT+2toBfbIJO0Qs2Ba1XSrwZ5NmnhOrzGoVq+fsi5DxgDJi7pI
3XbZQv1tZwKBgQDeIQh9Kk3H66sTrG/3P8ZCf6EFMs67OEbIMbVl9uy4X7rkvJ2J
aIqnF8Z3w1XA45huGsjOpbRIX5LCj10EOZRdu7un8IKE9aqg4yFkjIqQ+SP56VAd
du3TEcTYrbZQfjPNaO2IpyORZ7Pz5c4i2uCa0DKLKIu/1RUYBiPeYDS/9wKBgEOg
Uw/D+myBfXqsSjriLnFz+v6XJrGzou2D9oJoIQMTbvHX+KUMJTdZME3+Kuvqcy6D
lxebDGg5zdwIpGXjWZnHVWWLIwoQojXRfZYOuLjlnwiI2AV/wfRB25xwLqpPFnu2
FyNciVqusB1a5uqXxD8XC391ng26guQf5xjF+00FAoGAWDYkJJfjxF3Rk88rrUwb
U42HG/oamg9wL+GlH1Aymj6b3YRsxv11lai1410wx53WW8S56pPZ9B+SW67c4Uao
qmUf91Jr4Tjv5bSboUlKi2bmpOysU++46XoQJMG5gvKtY+cIHVQsGOdSTSpX5ZWf
rVpMVghZm6BEpdav/5wqsj8=
-----END PRIVATE KEY-----`).replace(/\\n/g, '\n')
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkPromiseWord() {
  try {
    console.log('🔍 Searching for "promise" in words collection...\n');
    
    // Search for promise word
    const wordsRef = db.collection('words');
    const querySnapshot = await wordsRef
      .where('word', '==', 'promise')
      .limit(5)
      .get();
    
    if (querySnapshot.empty) {
      console.log('❌ No "promise" word found in words collection');
      
      // Try case-insensitive search
      console.log('\n🔍 Trying case-insensitive search...');
      const allWords = await wordsRef.limit(1000).get();
      const promiseWords = [];
      
      allWords.forEach(doc => {
        const data = doc.data();
        if (data.word && data.word.toLowerCase().includes('promise')) {
          promiseWords.push({ id: doc.id, ...data });
        }
      });
      
      if (promiseWords.length > 0) {
        console.log(`\n✅ Found ${promiseWords.length} words containing "promise":`);
        promiseWords.forEach(word => {
          console.log(`\n📝 Word: ${word.word}`);
          console.log(`   ID: ${word.id}`);
        });
      }
    } else {
      console.log(`✅ Found ${querySnapshot.size} "promise" word(s)\n`);
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        console.log('=====================================');
        console.log('📝 Document ID:', doc.id);
        console.log('=====================================\n');
        
        // Basic fields
        console.log('📖 Word:', data.word);
        console.log('🔤 Part of Speech:', data.partOfSpeech);
        console.log('📚 Definition (Korean):', data.definition || 'N/A');
        console.log('📚 English Definition:', data.englishDefinition || 'N/A');
        
        // Etymology
        if (data.etymology) {
          console.log('\n📜 Etymology:', data.etymology);
        }
        if (data.realEtymology) {
          console.log('📜 Real Etymology:', data.realEtymology);
        }
        
        // Examples
        if (data.examples && data.examples.length > 0) {
          console.log('\n💬 Examples:');
          data.examples.forEach((ex, i) => {
            console.log(`   ${i + 1}. ${ex}`);
          });
        }
        
        // Synonyms and Antonyms
        if (data.synonyms && data.synonyms.length > 0) {
          console.log('\n🔄 Synonyms:', data.synonyms.join(', '));
        }
        if (data.antonyms && data.antonyms.length > 0) {
          console.log('↔️ Antonyms:', data.antonyms.join(', '));
        }
        
        // Metadata
        console.log('\n📊 Metadata:');
        console.log('   Difficulty:', data.difficulty || 'N/A');
        console.log('   Frequency:', data.frequency || 'N/A');
        console.log('   Is SAT:', data.isSAT || false);
        console.log('   Pronunciation:', data.pronunciation || 'N/A');
        
        // Source information
        if (data.source) {
          console.log('\n📍 Source:');
          console.log('   Type:', data.source.type);
          console.log('   Origin:', data.source.origin);
          console.log('   Added At:', data.source.addedAt?.toDate?.() || data.source.addedAt);
          if (data.source.uploadedBy) {
            console.log('   Uploaded By:', data.source.uploadedBy);
          }
        }
        
        // Timestamps
        console.log('\n⏰ Timestamps:');
        console.log('   Created:', data.createdAt?.toDate?.() || data.createdAt || 'N/A');
        console.log('   Updated:', data.updatedAt?.toDate?.() || data.updatedAt || 'N/A');
        
        console.log('\n=====================================\n');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Clean up
    await admin.app().delete();
    process.exit(0);
  }
}

checkPromiseWord();