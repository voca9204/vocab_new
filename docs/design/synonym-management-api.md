# Synonym Word Management API Design

## Overview
This document defines the API structure for managing synonym discovery, storage, and relationships in the dynamic vocabulary system.

## API Endpoints

### 1. Word Discovery API

#### POST /api/vocabulary/discover
Discover and analyze a new word not in the database.

**Request:**
```typescript
interface DiscoverWordRequest {
  word: string
  context?: {
    sourceWordId?: string    // Word that led to this discovery
    sourceWord?: string      // For quick reference
    relationship?: 'synonym' | 'antonym' | 'related'
    sentence?: string        // Usage context
  }
  userId: string
}
```

**Response:**
```typescript
interface DiscoverWordResponse {
  success: boolean
  data?: {
    word: string
    pronunciation?: string
    partOfSpeech: string[]
    definition: {
      korean: string
      english?: string
      confidence: number
    }
    examples: string[]
    etymology?: string
    difficulty: number
    existsInDb: boolean
    existingDefinitions?: DefinitionVariant[]
    suggestedRelationships: {
      synonyms: string[]
      antonyms: string[]
      related: string[]
    }
  }
  error?: {
    code: string
    message: string
  }
}
```

**Example:**
```bash
POST /api/vocabulary/discover
{
  "word": "omnipresent",
  "context": {
    "sourceWordId": "word_ubiquitous_001",
    "sourceWord": "ubiquitous",
    "relationship": "synonym"
  },
  "userId": "user_123"
}

Response:
{
  "success": true,
  "data": {
    "word": "omnipresent",
    "pronunciation": "/ˌɑːmnɪˈpreznt/",
    "partOfSpeech": ["adj."],
    "definition": {
      "korean": "어디에나 존재하는, 편재하는",
      "english": "present everywhere at the same time",
      "confidence": 0.92
    },
    "examples": [
      "The company's omnipresent advertising became annoying.",
      "In the digital age, smartphones are omnipresent."
    ],
    "etymology": "From Latin omni- 'all' + present",
    "difficulty": 7,
    "existsInDb": false,
    "suggestedRelationships": {
      "synonyms": ["ubiquitous", "pervasive", "everywhere"],
      "antonyms": ["absent", "limited"],
      "related": ["prevalent", "widespread"]
    }
  }
}
```

### 2. Save Dynamic Word API

#### POST /api/vocabulary/dynamic-words
Save a discovered word to the user's dynamic vocabulary.

**Request:**
```typescript
interface SaveDynamicWordRequest {
  word: string
  definition: {
    korean: string
    english?: string
  }
  partOfSpeech: string[]
  examples?: string[]
  pronunciation?: string
  etymology?: string
  difficulty?: number
  discovery: {
    sourceWordId?: string
    relationship?: string
    method: 'synonym_click' | 'manual_search' | 'ai_suggestion'
  }
  userId: string
}
```

**Response:**
```typescript
interface SaveDynamicWordResponse {
  success: boolean
  data?: {
    wordId: string
    word: DynamicVocabulary
    relationships: WordRelationship[]
  }
  error?: {
    code: string
    message: string
  }
}
```

### 3. Word Relationships API

#### GET /api/vocabulary/words/:wordId/relationships
Get all relationships for a specific word.

**Response:**
```typescript
interface WordRelationshipsResponse {
  success: boolean
  data?: {
    word: {
      id: string
      word: string
      source: string
    }
    relationships: {
      synonyms: RelatedWord[]
      antonyms: RelatedWord[]
      derived: RelatedWord[]
      related: RelatedWord[]
    }
    graph?: {
      nodes: GraphNode[]
      edges: GraphEdge[]
    }
  }
}

interface RelatedWord {
  id: string
  word: string
  strength: number
  source: string
  inVocabulary: boolean
  definition?: string
}
```

#### POST /api/vocabulary/relationships
Create a new relationship between words.

**Request:**
```typescript
interface CreateRelationshipRequest {
  word1: {
    id?: string
    word: string
  }
  word2: {
    id?: string  
    word: string
  }
  relationship: {
    type: 'synonym' | 'antonym' | 'derived' | 'related'
    strength?: number  // 0-1, defaults to 0.8
    bidirectional?: boolean  // defaults to true for synonym/antonym
  }
  source?: {
    type: 'user' | 'ai' | 'imported'
    confidence?: number
  }
  userId: string
}
```

### 4. Definition Management API

#### GET /api/vocabulary/words/:word/definitions
Get all definition variants for a word.

**Response:**
```typescript
interface DefinitionsResponse {
  success: boolean
  data?: {
    word: string
    primary: DefinitionVariant
    variants: DefinitionVariant[]
    conflicts?: ConflictResult[]
    userPreference?: string
  }
}
```

#### POST /api/vocabulary/definitions/resolve
Resolve conflicts between definitions.

**Request:**
```typescript
interface ResolveDefinitionRequest {
  word: string
  selectedDefinitionId?: string
  mergeStrategy?: 'prefer_pdf' | 'prefer_ai' | 'merge' | 'keep_all'
  savePreference?: boolean
  userId: string
}
```

### 5. Batch Operations API

#### POST /api/vocabulary/discover/batch
Discover multiple words at once (e.g., all synonyms).

**Request:**
```typescript
interface BatchDiscoverRequest {
  words: string[]
  context?: {
    sourceWordId?: string
    relationship?: string
  }
  userId: string
  options?: {
    skipExisting?: boolean
    includeRelationships?: boolean
    maxWords?: number  // Limit to prevent abuse
  }
}
```

**Response:**
```typescript
interface BatchDiscoverResponse {
  success: boolean
  data?: {
    discovered: DiscoveredWord[]
    existing: ExistingWord[]
    failed: FailedWord[]
    relationships: WordRelationship[]
  }
  summary?: {
    total: number
    discovered: number
    existing: number
    failed: number
  }
}
```

### 6. User Preferences API

#### GET /api/vocabulary/preferences
Get user's vocabulary preferences.

**Response:**
```typescript
interface PreferencesResponse {
  success: boolean
  data?: {
    definitionStyle: 'concise' | 'detailed' | 'academic'
    sourcePreference: string[]  // Ordered by priority
    showAlternatives: boolean
    autoMergeDefinitions: boolean
    discoverySettings: {
      autoSaveSynonyms: boolean
      requireConfirmation: boolean
      defaultDifficulty: number
    }
  }
}
```

#### PUT /api/vocabulary/preferences
Update user preferences.

**Request:**
```typescript
interface UpdatePreferencesRequest {
  definitionStyle?: 'concise' | 'detailed' | 'academic'
  sourcePreference?: string[]
  showAlternatives?: boolean
  autoMergeDefinitions?: boolean
  discoverySettings?: Partial<DiscoverySettings>
}
```

## Implementation Details

### 1. Rate Limiting

```typescript
const rateLimits = {
  '/api/vocabulary/discover': {
    window: '1m',
    max: 10,
    message: 'Too many discovery requests'
  },
  '/api/vocabulary/discover/batch': {
    window: '5m',
    max: 3,
    message: 'Too many batch requests'
  },
  '/api/vocabulary/dynamic-words': {
    window: '1m',
    max: 20,
    message: 'Too many save requests'
  }
}
```

### 2. Caching Strategy

```typescript
interface CacheConfig {
  discoveries: {
    ttl: 3600,  // 1 hour
    key: (word: string) => `discover:${word.toLowerCase()}`
  },
  relationships: {
    ttl: 1800,  // 30 minutes
    key: (wordId: string) => `relations:${wordId}`
  },
  definitions: {
    ttl: 7200,  // 2 hours
    key: (word: string) => `definitions:${word.toLowerCase()}`
  }
}
```

### 3. Error Codes

```typescript
enum ErrorCode {
  // Discovery errors
  WORD_NOT_FOUND = 'WORD_NOT_FOUND',
  AI_GENERATION_FAILED = 'AI_GENERATION_FAILED',
  INVALID_WORD_FORMAT = 'INVALID_WORD_FORMAT',
  
  // Save errors
  DUPLICATE_WORD = 'DUPLICATE_WORD',
  INVALID_DEFINITION = 'INVALID_DEFINITION',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // Relationship errors
  INVALID_RELATIONSHIP = 'INVALID_RELATIONSHIP',
  CIRCULAR_RELATIONSHIP = 'CIRCULAR_RELATIONSHIP',
  WORD_NOT_EXISTS = 'WORD_NOT_EXISTS',
  
  // General errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

### 4. Security Considerations

```typescript
interface SecurityRules {
  // Input validation
  wordValidation: {
    maxLength: 50,
    pattern: /^[a-zA-Z\s\-']+$/,
    bannedWords: string[]  // Inappropriate content filter
  },
  
  // User limits
  userQuotas: {
    dailyDiscoveries: 100,
    dailySaves: 50,
    maxDynamicWords: 5000,
    maxRelationships: 10000
  },
  
  // Content moderation
  moderation: {
    checkDefinitions: boolean,
    checkExamples: boolean,
    flagThreshold: 0.8
  }
}
```

## Integration Examples

### 1. Synonym Click Handler

```typescript
async function handleSynonymClick(synonym: string, sourceWord: VocabularyWord) {
  try {
    // 1. Check if word exists in DB
    const existing = await vocabularyService.findByWord(synonym)
    
    if (existing) {
      // Show existing word modal
      openWordModal(existing)
      return
    }
    
    // 2. Discover new word
    const discovery = await fetch('/api/vocabulary/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: synonym,
        context: {
          sourceWordId: sourceWord.id,
          sourceWord: sourceWord.word,
          relationship: 'synonym'
        },
        userId: currentUser.id
      })
    })
    
    const result = await discovery.json()
    
    if (result.success) {
      // 3. Show discovery modal
      openDiscoveryModal({
        ...result.data,
        onSave: () => saveDynamicWord(result.data),
        onSkip: () => closeModal()
      })
    }
  } catch (error) {
    showError('Failed to discover word')
  }
}
```

### 2. Batch Synonym Discovery

```typescript
async function discoverAllSynonyms(word: VocabularyWord) {
  const synonyms = word.synonyms || []
  
  if (synonyms.length === 0) return
  
  try {
    const response = await fetch('/api/vocabulary/discover/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        words: synonyms,
        context: {
          sourceWordId: word.id,
          relationship: 'synonym'
        },
        userId: currentUser.id,
        options: {
          skipExisting: true,
          includeRelationships: true,
          maxWords: 10
        }
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      showBatchResults({
        discovered: result.data.discovered,
        onSaveAll: () => saveAllDiscoveries(result.data.discovered),
        onSaveSelected: (selected) => saveSelectedDiscoveries(selected)
      })
    }
  } catch (error) {
    showError('Failed to discover synonyms')
  }
}
```

## Performance Optimization

### 1. Database Indexes

```sql
-- Words collection
CREATE INDEX idx_word_lower ON dynamic_vocabulary(LOWER(word));
CREATE INDEX idx_user_word ON dynamic_vocabulary(userId, word);
CREATE INDEX idx_discovery_source ON dynamic_vocabulary(discoveredFrom.sourceWordId);

-- Relationships collection  
CREATE INDEX idx_rel_word1 ON word_relationships(word1Id);
CREATE INDEX idx_rel_word2 ON word_relationships(word2Id);
CREATE INDEX idx_rel_type ON word_relationships(relationship.type);
CREATE COMPOUND INDEX idx_rel_lookup ON word_relationships(word1Id, relationship.type);

-- Definitions collection
CREATE INDEX idx_def_word ON definition_variants(word);
CREATE INDEX idx_def_source ON definition_variants(source.type);
CREATE COMPOUND INDEX idx_def_lookup ON definition_variants(word, source.type);
```

### 2. Query Optimization

```typescript
// Optimized relationship query with single round trip
async function getWordWithRelationships(wordId: string) {
  const batch = firestore.batch()
  
  // Main word
  const wordRef = firestore.collection('vocabulary').doc(wordId)
  
  // Forward relationships
  const forwardQuery = firestore.collection('word_relationships')
    .where('word1Id', '==', wordId)
    .limit(50)
  
  // Reverse relationships  
  const reverseQuery = firestore.collection('word_relationships')
    .where('word2Id', '==', wordId)
    .where('relationship.bidirectional', '==', true)
    .limit(50)
    
  // Execute in parallel
  const [wordDoc, forwardDocs, reverseDocs] = await Promise.all([
    wordRef.get(),
    forwardQuery.get(),
    reverseQuery.get()
  ])
  
  return {
    word: wordDoc.data(),
    relationships: [...forwardDocs.docs, ...reverseDocs.docs]
  }
}
```

## Monitoring & Analytics

```typescript
interface APIMetrics {
  // Discovery metrics
  discoveryRate: number  // Discoveries per user per day
  discoverySuccess: number  // Success rate of AI generation
  popularDiscoveries: string[]  // Most discovered words
  
  // Relationship metrics
  relationshipDensity: number  // Avg relationships per word
  strongestConnections: Array<{  // Most connected word pairs
    word1: string
    word2: string
    strength: number
  }>
  
  // Usage patterns
  peakHours: number[]  // When users discover most
  preferredSources: Record<string, number>  // Source preferences
  conflictRate: number  // How often conflicts occur
}
```

## Future Enhancements

1. **GraphQL API**
   - More flexible querying
   - Reduced overfetching
   - Real-time subscriptions

2. **Webhook System**
   - Notify on new discoveries
   - Sync with external systems
   - Community features

3. **ML Integration**
   - Predictive discovery
   - Quality scoring
   - Personalization