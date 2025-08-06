// Test script to check definition display in word modal
// Run this in browser console after opening a word modal

console.log('=== Testing Definition Display Fix ===');

// Function to get definition from different word types
function getDefinitionFromWord(word) {
  console.log('Word structure:', {
    hasDefinition: 'definition' in word,
    definitionType: typeof word.definition,
    hasDefinitions: 'definitions' in word,
    definitionsLength: word.definitions?.length,
    firstDefStructure: word.definitions?.[0] ? Object.keys(word.definitions[0]) : null
  });

  if ('definition' in word && typeof word.definition === 'string') {
    console.log('Using ExtractedVocabulary.definition:', word.definition);
    return word.definition;
  } else if (word.definitions && word.definitions.length > 0) {
    const firstDef = word.definitions[0];
    const result = firstDef.definition || firstDef.text || 'No definition available';
    console.log('Using definitions array:', result);
    return result;
  } else {
    console.log('No definition found');
    return 'No definition available';
  }
}

// Check current modal if exists
const modal = document.querySelector('[data-testid="word-detail-modal"]');
if (modal) {
  console.log('Modal found! Checking definition display...');
  
  const wordTitle = modal.querySelector('h2').textContent;
  console.log('Word:', wordTitle);
  
  const definitionElement = modal.querySelector('.text-lg');
  const displayedDefinition = definitionElement?.textContent;
  console.log('Displayed definition:', displayedDefinition);
  
  if (displayedDefinition === 'No definition available') {
    console.log('❌ ISSUE: Definition shows "No definition available"');
    console.log('Check browser console for word structure logs when modal opens');
  } else {
    console.log('✅ SUCCESS: Definition is displayed correctly');
  }
} else {
  console.log('No modal found. Open a word modal to test.');
}

// Monitor for new modal opens
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      const newModal = document.querySelector('[data-testid="word-detail-modal"]');
      if (newModal && !window.modalObserved) {
        window.modalObserved = true;
        
        setTimeout(() => {
          const wordTitle = newModal.querySelector('h2')?.textContent;
          const definitionElement = newModal.querySelector('.text-lg');
          const displayedDefinition = definitionElement?.textContent;
          
          console.log('\n=== New Modal Detected ===');
          console.log('Word:', wordTitle);
          console.log('Definition:', displayedDefinition);
          
          if (displayedDefinition === 'No definition available') {
            console.log('❌ ISSUE DETECTED: No definition shown');
          } else {
            console.log('✅ SUCCESS: Definition displayed');
          }
        }, 500);
      } else if (!newModal && window.modalObserved) {
        window.modalObserved = false;
      }
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });

console.log('Monitoring for modal opens. Open a word modal to test...');