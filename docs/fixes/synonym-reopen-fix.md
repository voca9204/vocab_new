# Synonym Reopen Fix

## Problem
When reopening the word modal in flashcards, synonyms were not loading even though they were available in the database or cache.

## Root Cause
The `processedSynonyms.current.has(word.id)` check was preventing synonym loading on the second modal open, even when synonyms were available in DB or cache.

The original logic was:
1. Check if word was already processed → Skip if yes
2. Check DB synonyms
3. Check cache
4. Generate with AI

This meant that on the second open, the function would exit early and never check DB or cache.

## Solution
Restructured the synonym loading logic to:

1. **Always check DB and cache first** when modal opens
2. **Only prevent AI generation** if already processed
3. **Load order**: DB → Cache → AI generation (once only)

```typescript
// Before: Early exit if already processed
if (word && open && !processedSynonyms.current.has(word.id)) {
  // Check DB, cache, generate...
}

// After: Always check DB/cache, only limit AI generation
if (word && open) {
  // Always check DB
  if (DB has synonyms) return
  
  // Always check cache  
  if (cache has synonyms) return
  
  // Only generate once
  if (!processedSynonyms.current.has(word.id)) {
    // Generate with AI
  }
}
```

## Files Modified
- `/src/components/vocabulary/word-detail-modal.tsx`
  - Moved `processedSynonyms` check inside the AI generation block
  - Always check DB and cache on modal open

## Testing
Created test scripts to verify the fix:
- `/tests/test-synonym-reopen.js` - Browser console monitoring script
- `/tests/e2e/synonym-reopen.spec.ts` - Playwright automated test

## Expected Behavior
1. First modal open: Generate synonyms with AI, save to DB/cache
2. Modal close: UI state resets
3. Second modal open: Load synonyms from DB or cache (no AI generation)
4. Synonyms display properly on second and subsequent opens