# 📊 Database Architecture
*Last Updated: 2025-08-23*

## Overview

This document defines the data storage and retrieval architecture for the Vocabulary V2 platform, including the unified data model, collection structures, and data relationships.

## 🏗️ Database Structure

### Firestore Collections Hierarchy

```
vocabulary-app-new/
├── 🔥 Primary Data
│   └── words_v3/                     # ✨ NEW: Unified master word pool
│
├── 📚 Legacy Collections (Deprecated)
│   ├── words/                        # Legacy master words  
│   ├── ai_generated_words/           # AI-generated words (being merged)
│   ├── veterans_vocabulary/          # V.ZIP 3K PDF words (migrated)
│   └── vocabulary/                   # Old SAT words (migrated)
│
├── 🗂️ Collection System
│   ├── vocabulary_collections/       # Official collections (Admin only)
│   └── personal_collections/         # Personal collections (All users)
│
├── 📸 Content Sources
│   └── photo_vocabulary_words/       # OCR-extracted words (48hr sessions)
│
└── 👤 User Data
    ├── user_words/                  # Learning progress tracking
    ├── userSettings/                # User preferences & display settings
    └── users/                       # User profiles & authentication
```

## 📚 Primary Collections

### 1. `words_v3` - Unified Master Word Pool ⭐

**Purpose**: Central repository for all vocabulary words with unified structure  
**Status**: ✅ Active (3,141 words migrated)  
**Migration**: Completed August 2025 with 99.71% success rate  

**Data Structure**:
```typescript
interface UnifiedWordV3 {
  // Core Word Data
  word: string;                      // Primary word form
  normalizedWord: string;            // Lowercase, normalized form
  definitions: Definition[];         // Multiple definitions with languages
  partOfSpeech: string[];           // Array of parts of speech
  
  // Enhanced Features
  pronunciation?: {
    ipa?: string;                   // IPA pronunciation
    audio?: string;                 // Audio file URL
  };
  etymology?: {
    origin: string;                 // Etymology explanation
    root?: string;                  // Root word information
  };
  examples: Example[];              // Usage examples with translations
  
  // Related Words
  synonyms?: string[];              // Synonyms list
  antonyms?: string[];              // Antonyms list
  
  // Metadata & Quality
  difficulty: number;               // 1-10 difficulty scale
  frequency: number;                // Usage frequency score
  isSAT: boolean;                  // SAT vocabulary flag
  qualityScore: number;            // 0-100 auto-calculated quality
  
  // Source Information  
  source: {
    type: 'veterans_pdf' | 'ai_generated' | 'photo_vocabulary' | 'manual';
    origin: string;                // File name or 'discovery'
    addedAt: Date;
    uploadedBy?: string;           // User ID
    migrationId?: string;          // Track migration source
  };
  
  // System Fields
  createdAt: Date;
  updatedAt: Date;
  version: number;                 // Schema version
}

interface Definition {
  text: string;                    // Definition text
  language: 'en' | 'ko';          // Definition language
  context?: string;                // Usage context
}

interface Example {
  sentence: string;                // Example sentence
  translation?: string;           // Korean translation
  source?: string;                // Example source
  highlighted?: boolean;          // Highlight target word
}
```

### 2. Collection Management System

#### `vocabulary_collections` - Official Collections
**Access**: Admin users only  
**Purpose**: Curated subject-specific word collections  

**Categories**:
- `sat` - SAT vocabulary (1,500+ words)
- `toefl` - TOEFL vocabulary (800+ words)  
- `gre` - GRE vocabulary (1,200+ words)
- `toeic` - TOEIC vocabulary (600+ words)
- `수능` - Korean SAT vocabulary (400+ words)
- `ielts` - IELTS vocabulary (500+ words)
- `기본` - Basic vocabulary (300+ words)

**Data Structure**:
```typescript
interface VocabularyCollection {
  id: string;                      // Collection identifier
  name: string;                    // Display name
  description: string;             // Collection description
  category: CollectionCategory;    // Subject category
  wordIds: string[];              // References to words_v3
  
  // Metadata
  isOfficial: true;               // Always true for this collection
  createdBy: string;              // Admin user ID
  createdAt: Date;
  updatedAt: Date;
  
  // Statistics
  totalWords: number;
  difficulty: {
    easy: number;                 // Count of easy words
    medium: number;               // Count of medium words  
    hard: number;                 // Count of hard words
  };
}
```

#### `personal_collections` - Personal Collections  
**Access**: All authenticated users  
**Purpose**: User-created custom word lists  

**Data Structure**:
```typescript
interface PersonalCollection {
  id: string;                      // Collection identifier
  name: string;                    // User-defined name
  description?: string;            // Optional description
  wordIds: string[];              // References to words_v3
  
  // Ownership
  createdBy: string;              // User ID
  isPublic: boolean;              // Sharing setting
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  
  // Statistics  
  totalWords: number;
  studyProgress?: {
    studied: number;              // Words studied
    mastered: number;             // Words mastered
    lastStudied: Date;            // Last study session
  };
}
```

### 3. User Progress System

#### `user_words` - Learning Progress
**Purpose**: Track individual user learning progress for each word  

**Data Structure**:
```typescript
interface UserWord {
  id: string;                      // user_id + word_id composite
  userId: string;                  // User identifier
  wordId: string;                  // Reference to words_v3
  
  // Spaced Repetition System
  level: number;                   // SRS level (0-8)
  nextReview: Date;               // Next review date
  interval: number;               // Current interval in days
  easeFactor: number;             // Ease factor for SRS
  
  // Progress Tracking
  studyCount: number;             // Total study sessions
  correctCount: number;           // Correct answers
  incorrectCount: number;         // Incorrect answers
  accuracy: number;               // Success rate percentage
  
  // Session Data
  lastStudied: Date;              // Last study session
  firstStudied: Date;             // Initial learning date
  timeSpent: number;              // Total study time (seconds)
  
  // Learning Context
  collectionIds: string[];        // Collections containing this word
  studyMethods: ('flashcard' | 'quiz' | 'typing')[];  // Study methods used
  
  // Status
  isMastered: boolean;            // Mastery status
  isBookmarked: boolean;          // User bookmark
  difficulty: number;             // User-perceived difficulty (1-5)
  
  // System Fields
  createdAt: Date;
  updatedAt: Date;
}
```

#### `userSettings` - User Preferences
**Purpose**: Store user display preferences and learning settings  

**Data Structure**:
```typescript
interface UserSettings {
  userId: string;                  // User identifier (document ID)
  
  // Display Preferences
  displaySettings: {
    showSynonyms: boolean;         // Show synonyms by default
    showAntonyms: boolean;         // Show antonyms by default  
    showEtymology: boolean;        // Show etymology by default
    showExamples: boolean;         // Show examples by default
    showTranslation: boolean;      // Show Korean translations
    preferredLanguage: 'en' | 'ko' | 'both';  // Definition language preference
  };
  
  // Study Settings
  studySettings: {
    dailyGoal: number;            // Daily word goal
    sessionLength: number;        // Preferred session length (minutes)
    difficultyPreference: 'easy' | 'medium' | 'hard' | 'adaptive';
    studyMethod: 'flashcard' | 'quiz' | 'typing' | 'mixed';
  };
  
  // System Preferences
  systemSettings: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;        // Enable notifications
    soundEffects: boolean;        // Enable sound effects
    animations: boolean;          // Enable UI animations
  };
  
  // System Fields  
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Specialized Collections

#### `photo_vocabulary_words` - Photo-Extracted Words
**Purpose**: Words extracted from user-uploaded photos  
**Session**: 48-hour temporary storage before user decision  

**Data Structure**:
```typescript
interface PhotoVocabularyWord {
  id: string;                      // Unique identifier
  extractedText: string;           // Original OCR text
  words: string[];                 // Extracted individual words
  
  // AI Enhancement
  enhancedWords: {
    word: string;
    confidence: number;            // OCR confidence score
    definition?: string;           // AI-generated definition
    examples?: string[];           // AI-generated examples
  }[];
  
  // Session Management
  sessionId: string;               // Photo upload session
  userId: string;                  // User who uploaded
  expiresAt: Date;                // Auto-cleanup date (48 hours)
  status: 'pending' | 'reviewed' | 'saved' | 'discarded';
  
  // Image Data
  imageUrl?: string;              // Processed image URL
  ocrResults: {
    confidence: number;            // Overall OCR confidence
    language: string;              // Detected language
    textRegions: {                // Text regions in image
      text: string;
      bbox: [number, number, number, number];  // Bounding box
    }[];
  };
  
  // System Fields
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔄 Data Flow Architecture

### Word Access Pattern
```
User Request
    ↓
WordAdapterBridge (Compatibility Layer)
    ↓
UnifiedWordAdapter
    ↓
words_v3 Collection
    ↓
Multi-Layer Cache (React Query → Memory → LocalStorage)
```

### Collection Access Pattern
```
Collection Request
    ↓
CollectionService
    ↓
vocabulary_collections OR personal_collections
    ↓
Word IDs Resolution
    ↓
Batch Query to words_v3 (30 words max per query)
    ↓
Unified Word Data
```

### User Progress Flow
```
Study Session
    ↓
Progress Calculation (SRS Algorithm)
    ↓
user_words Update
    ↓
Statistics Aggregation
    ↓
Real-time UI Update
```

## 📈 Performance Optimizations

### Indexing Strategy
```javascript
// Compound indexes for efficient queries
words_v3: [
  ['isSAT', 'difficulty'],
  ['source.type', 'createdAt'], 
  ['normalizedWord'],
  ['qualityScore', 'updatedAt']
]

user_words: [
  ['userId', 'nextReview'],
  ['userId', 'lastStudied'],
  ['wordId', 'userId']
]

vocabulary_collections: [
  ['category', 'isOfficial'],
  ['createdBy', 'updatedAt']
]
```

### Caching Strategy
1. **React Query**: 5-minute cache for API responses
2. **Memory Cache**: Session-based caching for frequently accessed words
3. **LocalStorage**: 24-hour cache with automatic cleanup
4. **Firestore Cache**: Server-side caching for repeated queries

### Query Optimization
- **Batch Queries**: Maximum 30 words per Firestore 'in' query
- **Lazy Loading**: Load word details on-demand
- **Pagination**: Implement cursor-based pagination for large collections
- **Selective Fields**: Query only required fields to reduce bandwidth

## 🚧 Migration Status

### Completed Migrations ✅
- ✅ `veterans_vocabulary` → `words_v3` (1,847 words)
- ✅ `vocabulary` → `words_v3` (664 words)  
- ✅ `ai_generated_words` → `words_v3` (630 words)
- ✅ Total: 3,141 words with 99.71% success rate

### Legacy Collections (Deprecated)
These collections are maintained for backward compatibility but not actively used:
- `words/` - Legacy master word pool
- `ai_generated_words/` - Legacy AI words
- `veterans_vocabulary/` - V.ZIP 3K PDF words
- `vocabulary/` - Old SAT vocabulary

### Future Cleanup (Q4 2025)
- Archive legacy collections after full system validation
- Remove bridge adapter pattern 
- Implement direct unified access
- Complete test coverage for all new structures

## 🔗 Related Documentation

- **[Current Architecture Status](current-status.md)** - System performance and implementation status
- **[Migration Summary](../DEVELOPMENT/migrations/summary.md)** - Detailed migration results
- **[Project Structure](project-structure.md)** - Codebase organization and file structure