const admin = require('firebase-admin');
const path = require('path');

// Load service account key
const serviceAccountPath = path.join(__dirname, 'voca-879-firebase.json');
const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'vocabulary-app-new'
  });
}

const db = admin.firestore();

async function checkWordStructures() {
  console.log('🔍 Checking Word Structures in Firestore\n');
  console.log('=' . repeat(60));
  
  try {
    // Sample words with different structures
    const sampleWords = ['abandon', 'promise', 'abate', 'aberrant', 'abhor'];
    
    for (const wordText of sampleWords) {
      console.log(`\n📝 Word: "${wordText}"`);
      console.log('-'.repeat(40));
      
      // Search in words collection
      const snapshot = await db.collection('words')
        .where('word', '==', wordText)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        // Check structure type
        const hasNestedDefinitions = data.definitions && Array.isArray(data.definitions);
        const hasFlatDefinition = data.definition && typeof data.definition === 'string';
        
        console.log(`ID: ${doc.id}`);
        console.log(`Structure Type: ${hasNestedDefinitions ? 'NESTED' : hasFlatDefinition ? 'FLAT' : 'UNKNOWN'}`);
        
        if (hasNestedDefinitions) {
          console.log('\n🔸 NESTED STRUCTURE (Original):');
          console.log('  definitions: [');
          data.definitions.forEach((def, i) => {
            console.log(`    {`);
            console.log(`      definition: "${def.definition ? def.definition.substring(0, 50) + '...' : 'N/A'}"`);
            console.log(`      examples: [${def.examples ? def.examples.length + ' items' : '0 items'}]`);
            console.log(`      language: "${def.language || 'N/A'}"`);
            console.log(`    }${i < data.definitions.length - 1 ? ',' : ''}`);
          });
          console.log('  ]');
        }
        
        if (hasFlatDefinition) {
          console.log('\n🔹 FLAT STRUCTURE (Improved):');
          console.log(`  definition: "${data.definition.substring(0, 80)}..."`);
          console.log(`  englishDefinition: "${data.englishDefinition ? data.englishDefinition.substring(0, 60) + '...' : 'N/A'}"`);
          console.log(`  etymology: "${data.etymology ? data.etymology.substring(0, 60) + '...' : 'N/A'}"`);
          console.log(`  examples: [${data.examples ? data.examples.length + ' items' : '0 items'}]`);
          if (data.examples && data.examples.length > 0) {
            console.log(`    - "${data.examples[0].substring(0, 60)}..."`);
          }
        }
        
        // Check quality improvement flag
        console.log(`\n📊 Metadata:`);
        console.log(`  qualityImproved: ${data.qualityImproved || false}`);
        console.log(`  synonyms: [${data.synonyms ? data.synonyms.slice(0, 3).join(', ') : 'N/A'}]`);
        console.log(`  antonyms: [${data.antonyms ? data.antonyms.slice(0, 3).join(', ') : 'N/A'}]`);
        console.log(`  difficulty: ${data.difficulty || 'N/A'}`);
        console.log(`  isSAT: ${data.isSAT !== undefined ? data.isSAT : 'N/A'}`);
        
      } else {
        console.log('❌ Word not found in database');
      }
    }
    
    // Get overall statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 OVERALL STATISTICS:\n');
    
    const allWords = await db.collection('words').limit(500).get();
    let stats = {
      total: 0,
      nested: 0,
      flat: 0,
      both: 0,
      neither: 0,
      improved: 0
    };
    
    allWords.forEach(doc => {
      const data = doc.data();
      stats.total++;
      
      const hasNested = data.definitions && Array.isArray(data.definitions);
      const hasFlat = data.definition && typeof data.definition === 'string';
      
      if (hasNested && hasFlat) stats.both++;
      else if (hasNested) stats.nested++;
      else if (hasFlat) stats.flat++;
      else stats.neither++;
      
      if (data.qualityImproved) stats.improved++;
    });
    
    console.log(`Total words analyzed: ${stats.total}`);
    console.log(`Nested structure only: ${stats.nested} (${(stats.nested/stats.total*100).toFixed(1)}%)`);
    console.log(`Flat structure only: ${stats.flat} (${(stats.flat/stats.total*100).toFixed(1)}%)`);
    console.log(`Both structures: ${stats.both} (${(stats.both/stats.total*100).toFixed(1)}%)`);
    console.log(`Neither structure: ${stats.neither} (${(stats.neither/stats.total*100).toFixed(1)}%)`);
    console.log(`Quality improved: ${stats.improved} (${(stats.improved/stats.total*100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkWordStructures();