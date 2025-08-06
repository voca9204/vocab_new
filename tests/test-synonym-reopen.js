// Test script to verify synonym loading on modal reopen
// Run this in browser console after opening/closing/reopening a word modal

console.log('=== Testing Synonym Reopen Fix ===');

// Monitor console logs
const originalLog = console.log;
const logs = [];
console.log = function(...args) {
  logs.push(args.join(' '));
  originalLog.apply(console, args);
};

let modalOpenCount = 0;

// Monitor for modal opens/closes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      const modal = document.querySelector('[data-testid="word-detail-modal"]');
      if (modal && !window.modalWasOpen) {
        modalOpenCount++;
        window.modalWasOpen = true;
        console.log(`Modal opened (${modalOpenCount}th time)`);
        
        // Check synonym loading after modal opens
        setTimeout(() => {
          const synonyms = document.querySelectorAll('.bg-green-50.text-green-700');
          const loadingMsg = document.querySelector('text*="유사어를 불러오는 중"');
          const generatingMsg = document.querySelector('text*="AI가 유사어를 생성하고 있습니다"');
          
          console.log(`Modal ${modalOpenCount} - Synonyms found:`, synonyms.length);
          console.log(`Modal ${modalOpenCount} - Loading message:`, !!loadingMsg);
          console.log(`Modal ${modalOpenCount} - Generating message:`, !!generatingMsg);
          
          if (modalOpenCount === 1) {
            console.log('First open - should generate or load synonyms');
          } else if (modalOpenCount === 2) {
            console.log('Second open - should load from DB or cache');
            if (synonyms.length > 0) {
              console.log('✅ FIX SUCCESSFUL: Synonyms loaded on second open');
            } else {
              console.log('❌ ISSUE REMAINS: No synonyms on second open');
            }
          }
        }, 3000);
      } else if (!modal && window.modalWasOpen) {
        window.modalWasOpen = false;
        console.log('Modal closed');
      }
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });

console.log('Monitoring started. Open a word modal, close it, then open it again...');
console.log('Results will be shown automatically.');

// Auto-stop monitoring after 60 seconds
setTimeout(() => {
  observer.disconnect();
  console.log = originalLog;
  
  console.log('\n=== Final Analysis ===');
  const synonymLogs = logs.filter(log => 
    log.includes('Using DB synonyms') || 
    log.includes('Using cached synonyms') ||
    log.includes('Cached synonyms for')
  );
  
  synonymLogs.forEach(log => console.log(log));
  
  if (modalOpenCount >= 2) {
    console.log(`Tested with ${modalOpenCount} modal opens`);
  } else {
    console.log('Please open and close the modal at least twice to test');
  }
}, 60000);