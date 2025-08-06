// Test script to check word modal data issues

// 1. Check if examples are being generated
console.log('=== Testing Word Modal Data Issues ===\n');

// Simulated word data from flashcards
const testWord = {
  id: '0IRUEs7GMu7C7C6hl9zC',
  word: 'inadvertent',
  realEtymology: 'without intention (especially resulting from heedless action)',
  etymology: { origin: 'not intentional', meaning: '' },
  definitions: [{
    text: 'happening by chance or unexpectedly or unintentionally',
    examples: [] // This is the problem - empty array
  }],
  pronunciation: null,
  partOfSpeech: ['adj.'],
  difficulty: 7,
  synonyms: [] // Also empty
};

console.log('Test word structure:');
console.log('- Word:', testWord.word);
console.log('- Has examples:', testWord.definitions[0].examples.length > 0);
console.log('- Examples:', testWord.definitions[0].examples);
console.log('- Has synonyms:', testWord.synonyms.length > 0);
console.log('- Synonyms:', testWord.synonyms);

// Check what WordDetailModal would see
const needsExamples = testWord.definitions[0].examples.length === 0;
const needsSynonyms = testWord.synonyms.length === 0;

console.log('\nWordDetailModal logic:');
console.log('- needsExamples:', needsExamples);
console.log('- needsSynonyms:', needsSynonyms);

// Check etymology display
console.log('\nEtymology display:');
console.log('- English definition (blue box):', testWord.etymology.origin);
console.log('- Real etymology (purple box):', testWord.realEtymology);

// Summary
console.log('\n=== Summary ===');
console.log('1. Examples are empty in the data structure');
console.log('2. This triggers AI generation, but the timeout might be clearing');
console.log('3. Etymology/English definition might be swapped');
console.log('4. Synonyms need to be generated and saved to DB');