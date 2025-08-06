# 📸 Photo Vocabulary Implementation Guide

## 🎯 Quick Start Implementation Plan

Given your requirements for extracting 20-30 words from photos for immediate testing, here's a streamlined implementation approach that integrates smoothly with your existing system.

## 🔧 Minimal MVP Implementation

### 1. Quick Database Schema

```typescript
// Single collection approach for simplicity
// Firestore: /photo_vocabulary/{id}
interface PhotoVocabularyEntry {
  // Identification
  id: string
  userId: string
  sessionId: string  // Groups words from same photo
  
  // Photo data
  photoUrl?: string  // Optional: can delete after extraction
  uploadedAt: Date
  
  // Word data
  word: string
  context?: string  // Sentence where word appeared
  definition?: string
  
  // Quick metadata
  isActive: boolean  // false after 24-48 hours
  expiresAt: Date    // Auto-cleanup timestamp
  
  // Learning status
  tested: boolean
  correct: boolean
  
  createdAt: Date
}
```

### 2. Simple UI Flow

#### A. Photo Upload Page (`/study/photo-vocab`)
```tsx
const PhotoVocabPage = () => {
  return (
    <div className="container mx-auto p-4">
      {/* Step 1: Upload */}
      <PhotoUploadZone onUpload={handlePhotoUpload} />
      
      {/* Step 2: Review extracted words */}
      {extractedWords && (
        <WordReviewList 
          words={extractedWords}
          onConfirm={createPhotoSession}
          onEdit={updateWord}
          onRemove={removeWord}
        />
      )}
      
      {/* Step 3: Quick test button */}
      {sessionReady && (
        <Button onClick={() => router.push(`/study/photo-test/${sessionId}`)}>
          즉시 테스트 시작 (20문제)
        </Button>
      )}
    </div>
  )
}
```

#### B. Extraction Process
```typescript
const handlePhotoUpload = async (file: File) => {
  // 1. Upload to Firebase Storage
  const photoUrl = await uploadPhoto(file)
  
  // 2. Extract text using Google Vision API
  const extractedText = await callVisionAPI(photoUrl)
  
  // 3. Extract vocabulary words
  const words = await extractVocabularyWords(extractedText)
  
  // 4. Filter to get best 20-30 words
  const selectedWords = selectBestWords(words, 25)
  
  // 5. Show for review
  setExtractedWords(selectedWords)
}
```

### 3. Integration Points

#### A. Add to Study Menu
```tsx
// In /study/page.tsx
{
  title: '사진 단어',
  description: '사진에서 단어 추출하여 학습',
  icon: Camera,
  href: '/study/photo-vocab',
  color: 'bg-teal-500',
  stats: '즉시 학습',
  badge: 'BETA'
}
```

#### B. Extend WordAdapter
```typescript
// Add method to include photo words
async getWords(limit?: number): Promise<UnifiedWord[]> {
  const sources = await Promise.all([
    this.getRegularWords(limit),
    this.getPhotoWords(limit)  // New: include active photo sessions
  ])
  
  return this.mergeAndDeduplicate(sources)
}

private async getPhotoWords(limit?: number): Promise<UnifiedWord[]> {
  // Only get active sessions (last 24-48 hours)
  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - 48)
  
  const photoWords = await db
    .collection('photo_vocabulary')
    .where('userId', '==', this.userId)
    .where('isActive', '==', true)
    .where('createdAt', '>', cutoffTime)
    .limit(limit || 100)
    .get()
    
  return photoWords.docs.map(doc => this.convertToUnifiedWord(doc.data()))
}
```

### 4. Key Features for Your Use Case

#### A. Quick Test Mode
```typescript
// Immediate test after extraction
interface PhotoQuickTest {
  // Test types optimized for photo-extracted words:
  
  // 1. Context-based (using original sentences)
  contextTest: {
    question: "Choose the word that fits: [context with blank]",
    options: string[],
    answer: string
  }
  
  // 2. Definition matching
  definitionTest: {
    question: "What does '[word]' mean?",
    options: string[],
    answer: string
  }
  
  // 3. Visual recall (if keeping photo reference)
  visualTest: {
    photoUrl: string,
    highlightedWord: string,
    question: "What was this word in the photo?",
    options: string[]
  }
}
```

#### B. Session Management
```typescript
// Auto-expiring sessions
const SessionManager = {
  // Create new session
  async createSession(words: string[], photoUrl?: string) {
    const sessionId = generateId()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48)  // 48-hour default
    
    // Batch create all words
    const batch = db.batch()
    words.forEach(word => {
      const ref = db.collection('photo_vocabulary').doc()
      batch.set(ref, {
        word,
        sessionId,
        userId,
        photoUrl,
        isActive: true,
        expiresAt,
        createdAt: new Date()
      })
    })
    
    await batch.commit()
    return sessionId
  },
  
  // Auto-cleanup job (Cloud Function)
  async cleanupExpiredSessions() {
    const expired = await db
      .collection('photo_vocabulary')
      .where('expiresAt', '<', new Date())
      .get()
      
    const batch = db.batch()
    expired.docs.forEach(doc => batch.delete(doc.ref))
    await batch.commit()
  }
}
```

### 5. Smart Word Selection Algorithm

```typescript
const selectBestWords = (
  extractedWords: string[], 
  targetCount: number = 25
): string[] => {
  // 1. Filter out common words
  const filtered = extractedWords.filter(word => 
    !COMMON_WORDS.includes(word.toLowerCase()) &&
    word.length > 3
  )
  
  // 2. Check against existing vocabulary
  const existing = await checkExistingWords(filtered)
  
  // 3. Prioritize:
  //    - SAT-level words (if found in master DB)
  //    - Longer words (usually more complex)
  //    - Words not yet studied by user
  
  const scored = filtered.map(word => ({
    word,
    score: calculateWordScore(word, existing)
  }))
  
  // 4. Sort by score and take top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount)
    .map(item => item.word)
}

const calculateWordScore = (word: string, existingData: any): number => {
  let score = 0
  
  // Length bonus
  score += Math.min(word.length - 4, 5)
  
  // SAT word bonus
  if (existingData[word]?.isSAT) score += 10
  
  // Not studied bonus
  if (!existingData[word]?.studyStatus?.studied) score += 5
  
  // Difficulty bonus
  if (existingData[word]?.difficulty > 5) score += 3
  
  return score
}
```

### 6. Mobile-First Implementation

```tsx
// Responsive photo upload component
const PhotoUploadZone = ({ onUpload }) => {
  return (
    <div className="w-full">
      {/* Mobile: Big camera button */}
      <div className="md:hidden">
        <input
          type="file"
          accept="image/*"
          capture="environment"  // Use back camera
          onChange={handleFileSelect}
          className="hidden"
          id="mobile-camera"
        />
        <label
          htmlFor="mobile-camera"
          className="flex flex-col items-center justify-center w-full h-64 bg-blue-50 rounded-lg"
        >
          <Camera className="h-12 w-12 text-blue-500 mb-2" />
          <span className="text-lg font-medium">사진 촬영</span>
          <span className="text-sm text-gray-500">또는 갤러리에서 선택</span>
        </label>
      </div>
      
      {/* Desktop: Drag & drop */}
      <div className="hidden md:block">
        <DragDropZone onDrop={handleFileDrop} />
      </div>
    </div>
  )
}
```

### 7. Quick API Implementation

```typescript
// /api/photo-vocabulary/extract/route.ts
export async function POST(req: Request) {
  const { imageUrl } = await req.json()
  
  // 1. Call Google Vision API
  const vision = new ImageAnnotatorClient()
  const [result] = await vision.textDetection(imageUrl)
  const fullText = result.fullTextAnnotation?.text || ''
  
  // 2. Extract words (simple regex approach)
  const words = fullText
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z]/g, ''))
    .filter(w => w.length > 3)
    .filter((w, i, arr) => arr.indexOf(w) === i)  // Unique
  
  // 3. Enhance with existing data
  const enhanced = await enhanceWords(words.slice(0, 50))
  
  return NextResponse.json({
    success: true,
    words: enhanced,
    fullText
  })
}
```

### 8. Immediate Test Implementation

```tsx
// /study/photo-test/[sessionId]/page.tsx
const PhotoTestPage = ({ params: { sessionId } }) => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  
  useEffect(() => {
    loadSessionWords(sessionId).then(words => {
      // Generate 20 questions from the words
      const questions = generateQuestions(words)
      setQuestions(shuffleArray(questions))
    })
  }, [sessionId])
  
  const generateQuestions = (words: PhotoWord[]): Question[] => {
    return words.map(word => {
      // Mix of question types
      const type = Math.random() > 0.5 ? 'definition' : 'context'
      
      if (type === 'definition') {
        return {
          type: 'multiple-choice',
          question: `"${word.word}"의 뜻은?`,
          options: generateDefinitionOptions(word),
          answer: word.definition,
          wordId: word.id
        }
      } else {
        return {
          type: 'fill-blank',
          question: word.context?.replace(word.word, '_____'),
          answer: word.word,
          wordId: word.id
        }
      }
    })
  }
  
  return <QuizInterface questions={questions} onComplete={handleComplete} />
}
```

## 🚀 Deployment Steps

### Week 1: Core Features
1. **Day 1-2**: Set up Google Vision API and photo upload
2. **Day 3-4**: Implement word extraction and selection algorithm  
3. **Day 5-6**: Create photo vocabulary UI pages
4. **Day 7**: Testing and bug fixes

### Week 2: Enhancement
1. **Day 1-2**: Add word definitions using AI
2. **Day 3-4**: Implement quick test modes
3. **Day 5-6**: Mobile optimization
4. **Day 7**: Performance tuning

### Configuration Needed

```env
# .env.local
GOOGLE_CLOUD_VISION_API_KEY=your-api-key
PHOTO_SESSION_DURATION_HOURS=48
MAX_WORDS_PER_SESSION=30
AUTO_DELETE_PHOTOS=true
```

### Firebase Storage Rules

```javascript
// Storage rules for photo uploads
match /photo-vocabulary/{userId}/{fileName} {
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId 
    && request.resource.size < 10 * 1024 * 1024  // 10MB max
    && request.resource.contentType.matches('image/.*');
}
```

## 💡 Usage Scenarios

### Scenario 1: Lecture Photo
1. Student takes photo of lecture slide
2. System extracts technical vocabulary
3. Quick 5-minute test after class
4. Difficult words saved to personal vocabulary

### Scenario 2: Book Page
1. User photographs textbook page
2. Extracts key terms and concepts
3. Context-based questions using original sentences
4. Review before exam

### Scenario 3: Daily Article
1. Morning newspaper photo
2. Extract current events vocabulary  
3. Quick test during commute
4. Builds contemporary vocabulary

## 🎯 Key Differentiators

1. **Temporary Nature**: Unlike permanent vocabulary lists, photo sessions are ephemeral
2. **Immediate Testing**: Test within minutes of upload
3. **Context Preservation**: Keep original sentences for better learning
4. **Mobile-First**: Optimized for on-the-go learning
5. **Low Commitment**: No need to manage permanent lists

This design provides a lightweight, fast way to learn vocabulary from real-world sources while maintaining integration with your existing vocabulary system.