# 📸 Photo-based Vocabulary Extraction System Design

## 🎯 Overview
A system that allows users to extract vocabulary words from photos and create instant vocabulary tests. This creates a more dynamic, user-driven vocabulary experience compared to traditional static vocabulary lists.

## 🔑 Key Requirements
- Extract 20-30 words from uploaded photos
- Create temporary/session-based vocabulary sets
- Support frequent uploads throughout the day
- Enable quick testing immediately after extraction
- Different usage pattern from existing vocabulary collections

## 🏗️ System Architecture

### 1. Data Model

#### Photo Sessions Collection
```typescript
// Firestore: /photo_sessions/{sessionId}
interface PhotoSession {
  id: string
  userId: string
  title: string  // Auto-generated or user-defined
  photoUrl: string  // Firebase Storage URL
  thumbnailUrl?: string
  
  // Extraction metadata
  extractedAt: Date
  extractionMethod: 'ocr' | 'ai_vision' | 'manual'
  sourceLanguage?: string
  
  // Session metadata
  isTemporary: boolean  // If true, auto-delete after 7 days
  expiresAt?: Date
  tags: string[]  // e.g., ["lecture", "textbook", "article"]
  
  // Statistics
  wordCount: number
  testedCount: number
  masteredCount: number
  
  createdAt: Date
  updatedAt: Date
}
```

#### Photo Words Collection
```typescript
// Firestore: /photo_words/{wordId}
interface PhotoWord {
  id: string
  sessionId: string  // Reference to photo session
  userId: string
  
  // Word data
  word: string
  context?: string  // Original sentence/phrase from photo
  position?: {      // Location in the image
    x: number
    y: number
    width: number
    height: number
  }
  
  // Enhanced data (AI-generated after extraction)
  definition?: string
  partOfSpeech?: string[]
  difficulty?: number
  
  // Learning status
  studied: boolean
  masteryLevel: number
  testResults: {
    correct: number
    incorrect: number
    lastTested?: Date
  }
  
  createdAt: Date
  updatedAt: Date
}
```

### 2. Technical Components

#### A. Photo Upload & Processing
```typescript
interface PhotoProcessor {
  // Upload photo to Firebase Storage
  uploadPhoto(file: File, userId: string): Promise<{
    url: string
    thumbnailUrl: string
  }>
  
  // Extract text using Google Vision API
  extractText(imageUrl: string): Promise<{
    fullText: string
    textBlocks: TextBlock[]
  }>
  
  // Extract vocabulary words from text
  extractVocabulary(text: string): Promise<{
    words: ExtractedWord[]
    language: string
  }>
}
```

#### B. Word Enhancement Service
```typescript
interface WordEnhancer {
  // Batch enhance extracted words
  enhanceWords(words: string[]): Promise<EnhancedWord[]>
  
  // Check if word exists in master DB
  checkExistingWords(words: string[]): Promise<{
    existing: UnifiedWord[]
    new: string[]
  }>
  
  // Generate definitions for new words
  generateDefinitions(words: string[]): Promise<WordDefinition[]>
}
```

### 3. UI Components

#### A. Photo Upload Component
```tsx
// /src/components/photo-vocabulary/photo-upload.tsx
interface PhotoUploadProps {
  onUploadComplete: (session: PhotoSession) => void
  maxWords?: number  // Default: 30
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onUploadComplete,
  maxWords = 30
}) => {
  // Features:
  // - Drag & drop or click to upload
  // - Image preview with extracted text overlay
  // - Word selection/deselection interface
  // - Quick edit for misrecognized words
  // - Session naming option
}
```

#### B. Photo Session List
```tsx
// /src/components/photo-vocabulary/session-list.tsx
interface SessionListProps {
  userId: string
  onSessionSelect: (session: PhotoSession) => void
}

const PhotoSessionList: React.FC<SessionListProps> = ({
  userId,
  onSessionSelect
}) => {
  // Features:
  // - Grid/list view toggle
  // - Thumbnail previews
  // - Session stats (words, progress)
  // - Quick actions (test, review, delete)
  // - Filter by tags/date
}
```

#### C. Photo Vocabulary Test
```tsx
// /src/components/photo-vocabulary/photo-test.tsx
interface PhotoTestProps {
  session: PhotoSession
  words: PhotoWord[]
  onComplete: (results: TestResults) => void
}

const PhotoVocabularyTest: React.FC<PhotoTestProps> = ({
  session,
  words,
  onComplete
}) => {
  // Test modes:
  // 1. Quick Match: Show photo context, match with definition
  // 2. Context Fill: Show sentence with blank, choose word
  // 3. Visual Memory: Show word position in photo briefly
  // 4. Speed Round: Rapid-fire recognition test
}
```

### 4. Integration with Existing System

#### A. WordAdapter Extension
```typescript
// Add photo words to WordAdapter search
class WordAdapter {
  async searchWord(word: string): Promise<UnifiedWord | null> {
    // Search priority:
    // 1. Master DB (words)
    // 2. AI generated words
    // 3. Photo words (if in active session)
    // 4. Personal vocabulary
  }
  
  async getPhotoSessionWords(
    sessionId: string
  ): Promise<UnifiedWord[]> {
    // Convert PhotoWord to UnifiedWord format
  }
}
```

#### B. Navigation Integration
```tsx
// Add to study menu
const studyModes = [
  // ... existing modes
  {
    title: '사진 단어 학습',
    description: '사진에서 추출한 단어 즉시 학습',
    icon: Camera,
    href: '/study/photo-vocabulary',
    color: 'bg-teal-500',
    stats: `${activePhotoSessions}개 세션`,
    badge: hasNewSession ? 'NEW' : undefined
  }
]
```

### 5. User Flow

#### A. Upload Flow
```
1. User takes/uploads photo
   ↓
2. System extracts text using OCR
   ↓
3. AI identifies vocabulary words (20-30)
   ↓
4. User reviews and adjusts selection
   ↓
5. System enhances words with definitions
   ↓
6. Create photo session
   ↓
7. Immediate test available
```

#### B. Learning Flow
```
1. User selects photo session
   ↓
2. Views words with photo context
   ↓
3. Takes quick test (5-10 min)
   ↓
4. Reviews results
   ↓
5. Difficult words → Personal vocabulary
   ↓
6. Session expires after 7 days (configurable)
```

### 6. API Endpoints

#### Photo Processing
```typescript
// POST /api/photo-vocabulary/upload
interface UploadRequest {
  image: string  // base64 or file
  userId: string
  sessionTitle?: string
  tags?: string[]
  isTemporary?: boolean
}

// POST /api/photo-vocabulary/extract
interface ExtractRequest {
  imageUrl: string
  language?: string
  maxWords?: number
}

// POST /api/photo-vocabulary/enhance
interface EnhanceRequest {
  sessionId: string
  words: string[]
}
```

#### Session Management
```typescript
// GET /api/photo-vocabulary/sessions
// GET /api/photo-vocabulary/sessions/:id
// DELETE /api/photo-vocabulary/sessions/:id
// POST /api/photo-vocabulary/sessions/:id/convert
```

### 7. Special Features

#### A. Smart Word Selection
```typescript
interface SmartWordSelector {
  // Prioritize SAT-level vocabulary
  filterBySATRelevance(words: string[]): string[]
  
  // Remove common words
  filterCommonWords(words: string[]): string[]
  
  // Group by difficulty
  categorizeByDifficulty(words: string[]): {
    easy: string[]
    medium: string[]
    hard: string[]
  }
  
  // Limit to maxWords with balanced difficulty
  selectBalancedWords(
    words: string[], 
    maxWords: number
  ): string[]
}
```

#### B. Context Preservation
```typescript
interface ContextPreserver {
  // Save surrounding text for each word
  extractContext(
    word: string, 
    fullText: string,
    contextLength: number = 50
  ): string
  
  // Highlight word in context
  highlightWordInContext(
    word: string,
    context: string
  ): React.ReactNode
}
```

#### C. Session Management
```typescript
interface SessionManager {
  // Auto-delete old sessions
  cleanupExpiredSessions(): Promise<number>
  
  // Convert temporary to permanent
  convertToPermanent(sessionId: string): Promise<void>
  
  // Merge sessions
  mergeSessions(
    sessionIds: string[]
  ): Promise<PhotoSession>
  
  // Export to personal vocabulary
  exportToPersonalVocabulary(
    sessionId: string,
    wordIds: string[]
  ): Promise<void>
}
```

### 8. Mobile Optimization

#### A. Camera Integration
```tsx
// Direct camera capture on mobile
const CameraCapture: React.FC = () => {
  // Features:
  // - In-app camera
  // - Auto-focus on text
  // - Multiple photo batch upload
  // - Real-time text detection preview
}
```

#### B. Offline Support
```typescript
interface OfflineSupport {
  // Cache extracted words locally
  cacheExtractedWords(
    sessionId: string, 
    words: PhotoWord[]
  ): Promise<void>
  
  // Sync when online
  syncOfflineData(): Promise<void>
}
```

### 9. Privacy & Security

#### Data Handling
- Photos stored in user's private Firebase Storage bucket
- Auto-deletion of temporary sessions
- No photo sharing between users
- OCR processing done server-side
- Original photos can be deleted after extraction

#### Permissions
```javascript
// Firestore Rules
match /photo_sessions/{sessionId} {
  allow read, write: if request.auth.uid == resource.data.userId;
}

match /photo_words/{wordId} {
  allow read, write: if request.auth.uid == resource.data.userId;
}
```

### 10. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1)
- [ ] Photo upload to Firebase Storage
- [ ] Google Vision API integration
- [ ] Basic word extraction algorithm
- [ ] Photo session data model

#### Phase 2: Word Processing (Week 2)
- [ ] Smart word selection
- [ ] Word enhancement with AI
- [ ] Context preservation
- [ ] Integration with WordAdapter

#### Phase 3: UI Development (Week 3)
- [ ] Photo upload component
- [ ] Session management UI
- [ ] Photo vocabulary test modes
- [ ] Mobile optimization

#### Phase 4: Advanced Features (Week 4)
- [ ] Batch photo processing
- [ ] Session merging
- [ ] Export to personal vocabulary
- [ ] Analytics and insights

## 🎯 Success Metrics

1. **Extraction Accuracy**: 90%+ word recognition rate
2. **Processing Speed**: <5 seconds per photo
3. **User Engagement**: 3+ sessions per week
4. **Learning Efficiency**: 80%+ retention rate
5. **Mobile Usage**: 60%+ uploads from mobile

## 🚀 Future Enhancements

1. **Handwriting Recognition**: Support handwritten notes
2. **Multi-language Support**: Extract words from multiple languages
3. **Collaborative Sessions**: Share photo sessions with study groups
4. **AR Word Overlay**: Real-time word translation with camera
5. **Smart Scheduling**: Suggest review times based on forgetting curve