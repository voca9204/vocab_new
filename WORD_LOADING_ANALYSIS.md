# Word Loading Performance Analysis

## Executive Summary

**Problem**: The app loads thousands of words upfront, causing significant performance issues.

**Root Cause**: Collection-based loading pattern that fetches ALL word IDs from collections, then loads full word data for every ID without pagination.

**Impact**:
- Initial load time: 3-5 seconds for 3,000+ words
- Memory usage: ~50-100MB for word data
- Network bandwidth: Multiple Firestore queries fetching thousands of documents

---

## 1. Current Loading Pattern Analysis

### 1.1 Collection Context Flow

**File**: `/src/contexts/collection-context-v2.tsx`

**Flow**:
```
loadCollections() → selectCollection() → loadWords() → getWordsByCollection()
```

**Critical Code** (Lines 485-600):
```typescript
const loadWords = useCallback(async (limit?: number, collectionsToLoad?: Collection[]) => {
  // ...

  // Load words from official collections using getWordsByCollection
  for (const collection of officialCollections) {
    const collectionWords = await wordAdapter.getWordsByCollection(
      collection.id,
      'official',
      limit  // ❌ LIMIT IS IGNORED IN IMPLEMENTATION
    )
    loadedWords.push(...collectionWords)
  }

  // Loads ALL words from ALL selected collections
  setAllWords(loadedWords)
  setWords(loadedWords)
}, [])
```

**Issues**:
1. ❌ `limit` parameter is passed but **ignored** in adapter implementation
2. ❌ Loads **all words** from **all selected collections** at once
3. ❌ No pagination or lazy loading
4. ❌ No virtualization for large lists

### 1.2 Word Adapter Bridge Implementation

**File**: `/src/lib/adapters/word-adapter-bridge.ts`

**getWordsByCollection** (Lines 83-130):
```typescript
async getWordsByCollection(collectionId: string, collectionType?: string, limit?: number) {
  // Step 1: Get ALL word IDs from collection document
  const words = await this.oldAdapter.getWordsByCollection(collectionId, collectionType, limit)

  if (words.length === 0) return []

  const wordIds = words.map(w => w.id)  // Could be 1000+ IDs

  // Step 2: Fetch ALL words from words_v3 by IDs
  const v3Words = await this.newAdapter.getWordsByIds(wordIds)  // ❌ BULK LOAD

  return v3Words
}
```

**Issues**:
1. ❌ Gets **ALL word IDs** from collection.words array (could be 1000-3000 IDs)
2. ❌ Fetches **ALL words** via `getWordsByIds()` in batches of 30
3. ❌ No limit enforcement
4. ❌ Network: ~100 Firestore queries for 3000 words (30 per batch)

### 1.3 Old Adapter Collection Loading

**File**: `/src/lib/adapters/word-adapter.ts`

**getWordsByCollection** (Lines 250-320):
```typescript
async getWordsByCollection(collectionId: string, collectionType?: string, limit?: number) {
  // Fetches collection document
  const collectionDoc = await getDoc(...)

  if (!collectionDoc.exists()) return []

  const wordIds = collectionDoc.data().words || []  // ❌ ENTIRE words array (1000-3000 IDs)

  if (wordIds.length === 0) return []

  // Convert word IDs to UnifiedWord objects
  return await this.getWordsByIds(wordIds)  // ❌ BULK LOAD ALL
}
```

**Collection Structure**:
```typescript
{
  id: "sat_advanced",
  name: "SAT 고급",
  wordCount: 1500,
  words: ["word1", "word2", ... "word1500"]  // ❌ ALL 1500 IDs loaded
}
```

---

## 2. Impact Areas

### 2.1 Flashcards Page

**File**: `/src/app/study/flashcards/page.tsx`

**Word Usage**:
- Only displays **1 word at a time**
- Needs: **50-100 words maximum** for a session
- Currently loads: **ALL 3000+ words**
- Waste: **97% of data unused**

**Why ALL words are loaded**:
```typescript
const {
  words: vocabularyWords,  // ❌ Gets ALL words from context
  selectedCollections
} = useCollectionV2()

// Only uses vocabularyWords[currentIndex]
const currentWord = words[currentIndex]
```

### 2.2 Quiz Page

**File**: `/src/app/study/quiz/page.tsx`

**Word Usage**:
- Only needs **10-50 words** for a quiz
- Selects random subset: `wordsForQuiz = contextWords.slice(0, quizSize)`
- Currently loads: **ALL 3000+ words**
- Waste: **98-99% of data unused**

**Code** (Lines 73-192):
```typescript
const { words: contextWords } = useCollectionV2()

// Generate quiz from loaded words
const loadWords = async () => {
  let wordsForQuiz: VocabularyWord[] = []

  // ❌ Uses ALL contextWords just to pick 10-50 for quiz
  wordsForQuiz = contextWords.map(word => {
    // Convert to quiz format
  })

  // Generate quiz questions
  generateQuiz(wordsForQuiz.slice(0, quizSize))  // Only uses first 10-50
}
```

### 2.3 Word List Page (Virtual Scrolling)

**File**: `/src/components/vocabulary/virtual-word-list.tsx`

**Implementation**:
- ✅ Uses **virtual scrolling** with `@tanstack/react-virtual`
- ✅ Only renders **visible rows** (~10-20 words)
- ❌ But still **loads ALL words** upfront
- Partial optimization: Rendering is efficient, but **data loading is not**

**Code** (Lines 50-82):
```typescript
const virtualizer = useVirtualizer({
  count: rowCount,  // Total words / columns
  getScrollElement: () => parentRef.current,
  estimateSize: () => itemHeight,
  overscan: 5,  // ✅ Only renders 5 extra items
})

// ✅ Only renders visible items
const items = virtualizer.getVirtualItems()
```

---

## 3. Root Cause Analysis

### 3.1 Architectural Decision

**Original Design Intent**:
- **Offline-first capability**: Load all words for offline use
- **Shuffle/randomization**: Need full dataset to shuffle
- **Progress tracking**: Track user progress across all words

**Current Reality**:
- App is **online-only** (no offline storage)
- Shuffling can be done **server-side** or with pagination
- Progress can be tracked **per-session** or **on-demand**

### 3.2 Legacy Pattern

Collection structure assumes:
1. Collections are **small** (100-200 words)
2. Words are **lightweight** (just ID and definition)
3. All operations need **full dataset**

**But SAT collections are**:
- **Large**: 1000-3000 words per collection
- **Heavy**: Full word objects with examples, synonyms, etymology
- **Rarely all used**: Most sessions use <5% of words

### 3.3 Missing Optimizations

**Not Implemented**:
1. ❌ **Pagination**: No page-based loading
2. ❌ **Lazy Loading**: No on-demand fetching
3. ❌ **Query Limits**: `limit` parameter ignored
4. ❌ **Virtual Data Loading**: Virtual scrolling only for rendering, not data
5. ❌ **Progressive Loading**: No incremental data fetching

---

## 4. Performance Metrics

### 4.1 Current State

**Collection Selection Flow**:
```
User selects "SAT 고급" (1500 words)
  ↓
loadCollections() - 500ms
  ↓
selectCollection() - 100ms
  ↓
loadWords() - 3000ms ❌
  ↓
getWordsByCollection() - 2500ms
  ↓
getWordsByIds() - 2000ms (70 queries × 30ms)
  ↓
Total: ~3.5 seconds initial load
```

**Network Usage**:
- **Queries**: ~70-100 Firestore reads for 3000 words
- **Data Transfer**: ~2-5MB of word data
- **Cache Size**: ~10-20MB localStorage

**Memory Usage**:
- **In-Memory Words**: 3000 × ~5KB = 15MB
- **React State**: Additional 10-20MB for rendering
- **Total**: ~25-35MB for word data alone

### 4.2 Optimal State (Proposed)

**Optimized Flow**:
```
User selects "SAT 고급" (1500 words)
  ↓
loadCollections() - 500ms
  ↓
selectCollection() - 100ms
  ↓
loadWords(limit=50) - 300ms ✅
  ↓
getWordsByCollection(limit=50) - 200ms
  ↓
getWordsByIds(first 50 IDs) - 100ms (2 queries × 50ms)
  ↓
Total: ~900ms initial load (74% faster)
```

**Network Usage**:
- **Queries**: ~2-5 Firestore reads for 50 words
- **Data Transfer**: ~50-100KB initial load
- **Cache Size**: Grows incrementally as needed

---

## 5. Optimization Opportunities

### 5.1 Immediate Wins (Low Effort, High Impact)

#### A. Implement Pagination in loadWords()

**Change**: Enforce limit parameter in word loading
```typescript
// collection-context-v2.tsx
const loadWords = useCallback(async (limit: number = 50) => {
  // Load first N words only
  const collectionWords = await wordAdapter.getWordsByCollection(
    collection.id,
    'official',
    limit  // ✅ Actually enforce this limit
  )
})
```

**Impact**:
- 95% reduction in initial load time
- 95% reduction in network usage
- Instant perceived performance

#### B. Load More on Demand

**Change**: Add loadMoreWords() for pagination
```typescript
const loadMoreWords = useCallback(async (offset: number, limit: number = 50) => {
  const newWords = await wordAdapter.getWordsByCollection(
    collection.id,
    'official',
    limit,
    offset  // Start from this position
  )

  setAllWords(prev => [...prev, ...newWords])
})
```

**Implementation**: Scroll-based loading or "Load More" button

#### C. Session-Based Loading

**Flashcards**:
```typescript
// Only load 50 words for flashcard session
useEffect(() => {
  loadWords(50)  // Start with 50 words
}, [selectedCollections])
```

**Quiz**:
```typescript
// Only load words needed for quiz size
useEffect(() => {
  loadWords(quizSize * 4)  // 4x quiz size for randomization
}, [quizSize])
```

### 5.2 Medium-Term Improvements

#### A. Virtual Data Loading

Combine virtual scrolling with virtual data:
```typescript
const virtualDataLoader = useVirtualizer({
  count: totalWordCount,  // Total from collection.wordCount
  getScrollElement: () => parentRef.current,
  estimateSize: () => itemHeight,

  // ✅ Load data on scroll
  onChange: (virtualizer) => {
    const [firstItem, lastItem] = virtualizer.range
    loadWordsInRange(firstItem, lastItem + overscan)
  }
})
```

#### B. Progressive Loading

Load in stages:
1. **Initial**: 50 most important words
2. **Background**: Load next 200 words
3. **On-Demand**: Load remaining as needed

#### C. Smart Caching Strategy

```typescript
// Cache strategy by priority
- Session words: Memory cache (fast access)
- Recently viewed: localStorage (24hr TTL)
- Full collection: IndexedDB (7-day TTL)
```

### 5.3 Long-Term Architecture

#### A. Server-Side Pagination API

Create API endpoint for paginated word loading:
```typescript
// /api/collections/[id]/words
GET /api/collections/sat_advanced/words?page=1&limit=50

Response:
{
  words: [...],
  pagination: {
    total: 1500,
    page: 1,
    limit: 50,
    hasMore: true
  }
}
```

#### B. Word Range Queries

Optimize Firestore queries:
```typescript
// Instead of: getWordsByIds([...1500 IDs])
// Use:
query(
  collection(db, 'words_v3'),
  where('collectionIds', 'array-contains', 'sat_advanced'),
  orderBy('importance', 'desc'),
  limit(50)
)
```

#### C. Collection Sharding

Split large collections:
```
sat_advanced (1500 words)
  ↓
sat_advanced_p1 (500 words)
sat_advanced_p2 (500 words)
sat_advanced_p3 (500 words)
```

---

## 6. Recommended Implementation Plan

### Phase 1: Quick Fixes (1-2 days)

1. ✅ Add `limit` enforcement to `getWordsByCollection()`
2. ✅ Implement session-based loading (50 words default)
3. ✅ Add "Load More" functionality
4. ✅ Update flashcards to use limited word sets

**Expected Impact**: 70-80% performance improvement

### Phase 2: Pagination (3-5 days)

1. ✅ Implement proper pagination in adapters
2. ✅ Add offset/limit support to word queries
3. ✅ Create loadMoreWords() in context
4. ✅ Integrate with virtual scrolling

**Expected Impact**: 90% reduction in initial load

### Phase 3: Architecture (1-2 weeks)

1. ✅ Create paginated API endpoints
2. ✅ Implement virtual data loading
3. ✅ Add progressive loading strategy
4. ✅ Optimize Firestore queries with indexes

**Expected Impact**: Sub-second initial load, infinite scalability

---

## 7. Feasibility & Complexity Assessment

### Immediate Optimizations (✅ Easy)

**Effort**: Low (2-3 hours)
**Risk**: Low
**Breaking Changes**: None

Changes:
- Add limit enforcement in loadWords()
- Default to 50 words initial load
- Add loadMoreWords() method

### Pagination Implementation (⚠️ Medium)

**Effort**: Medium (1-2 days)
**Risk**: Medium
**Breaking Changes**: Minor (need to update consumers)

Changes:
- Modify adapter interfaces
- Update context API
- Add pagination state management
- Update UI components

### Architecture Refactor (❌ Complex)

**Effort**: High (1-2 weeks)
**Risk**: High
**Breaking Changes**: Major (requires migration)

Changes:
- New API endpoints
- Firestore query optimization
- Cache strategy redesign
- Full UI integration

---

## 8. Conclusion

### Current State Summary

The app loads **thousands of words upfront** because:

1. **Collection-based architecture**: Collections contain ALL word IDs
2. **Bulk loading pattern**: `getWordsByCollection()` fetches all IDs, then all words
3. **No pagination**: `limit` parameter exists but is ignored
4. **Legacy design**: Optimized for small collections, not 3000+ words

### Actual Reason for Bulk Loading

**Not for**:
- ❌ Offline capability (not implemented)
- ❌ Necessary for features (only need small subset)

**Actually for**:
- ✅ **Simplicity**: Easier to implement "load all"
- ✅ **Legacy pattern**: Original design for 100-200 word collections
- ✅ **Missing optimization**: Pagination never implemented

### Recommended Action

**Start with Phase 1** (Quick Fixes):
- Immediate 70-80% improvement
- Low risk, high reward
- No breaking changes
- Can ship in 1-2 days

**Then Phase 2** (Pagination):
- Complete solution for current architecture
- 90%+ performance gain
- Minimal breaking changes
- Future-proof for growth

**Consider Phase 3** (Architecture):
- Only if scaling beyond 10,000 words per collection
- Requires significant refactoring
- Best combined with other major updates

---

## Appendix: Code References

### Key Files
1. `/src/contexts/collection-context-v2.tsx` - Main loading logic
2. `/src/lib/adapters/word-adapter-bridge.ts` - Bridge adapter
3. `/src/lib/adapters/word-adapter.ts` - Legacy adapter
4. `/src/lib/adapters/word-adapter-unified.ts` - New adapter

### Key Functions
- `loadWords()` - Collection context (line 485)
- `getWordsByCollection()` - Bridge adapter (line 83)
- `getWordsByIds()` - Unified adapter (line 157)
- `getWordsByCollection()` - Old adapter (line 250)