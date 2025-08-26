# Firebase Collection Error Fix

## Problem
Error: `FirebaseError: Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore`

This error occurred when trying to fetch words by IDs in the UnifiedWordAdapter.

## Root Causes

1. **Incorrect Import Path**: The `db` was being imported from `@/lib/firebase/firestore-v2` which doesn't export it. It should be imported from `@/lib/firebase/config`.

2. **Server-Side Rendering**: The Firebase client SDK was being initialized on the server side during SSR, where it's not available.

## Solutions Implemented

### 1. Fixed Import Path
Changed:
```typescript
import { db } from '@/lib/firebase/firestore-v2'
```
To:
```typescript
import { db } from '@/lib/firebase/config'
```

### 2. Added DB Initialization Checks
Added safety checks before using `db`:
```typescript
if (!db) {
  logger.error('Firestore database not initialized')
  return [] // or null for single item methods
}
```

### 3. Lazy Initialization for Client-Side Only
Created a factory function to ensure the adapter is only created on the client:
```typescript
export const getUnifiedWordAdapter = (): UnifiedWordAdapter => {
  if (typeof window === 'undefined') {
    // Return dummy adapter on server side
    return dummyAdapter
  }
  
  if (!_instance) {
    _instance = new UnifiedWordAdapter()
  }
  return _instance
}
```

### 4. Updated WordAdapterBridge
Modified to use the factory function:
```typescript
constructor() {
  this.newAdapter = getUnifiedWordAdapter()
  this.oldAdapter = new WordAdapter()
}
```

## Files Modified

1. `/src/lib/adapters/word-adapter-unified.ts`
   - Fixed import path
   - Added db initialization checks
   - Implemented lazy initialization pattern
   - Created dummy adapter for SSR

2. `/src/lib/adapters/word-adapter-bridge.ts`
   - Updated to use getUnifiedWordAdapter()

## Testing

After applying these fixes:
- ✅ No more FirebaseError in console
- ✅ Server-side rendering works correctly
- ✅ Client-side Firebase operations work as expected
- ✅ Only shows expected warning about SSR access

## Prevention

To prevent similar issues in the future:
1. Always check if Firebase is initialized before using it
2. Use lazy initialization for client-only services
3. Ensure imports are from the correct modules
4. Add proper SSR checks (`typeof window !== 'undefined'`)