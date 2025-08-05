# Definition Conflict Resolution System

## Overview
This document outlines the strategy for handling cases where AI-generated Korean definitions differ from vocabulary database definitions, and how to manage multiple definition sources effectively.

## Conflict Types

### 1. Semantic Conflicts

#### Minor Variations
**Example**: "arduous"
- PDF: "힘든, 고된"
- AI: "매우 힘들고 어려운"
- Resolution: Treat as equivalent, show both

#### Major Differences  
**Example**: "sanction"
- PDF: "제재"
- AI: "승인, 허가; 제재, 처벌"
- Resolution: Recognize multiple meanings, context-dependent display

#### Translation Style Differences
**Example**: "ubiquitous"
- PDF: "도처에 있는"
- AI: "어디에나 존재하는, 편재하는"
- Resolution: User preference for formal/casual style

### 2. Completeness Conflicts

#### Missing Context
**Example**: "precedent"
- PDF: "전례"
- AI: "선례, 전례 (법률); 이전의 사례"
- Resolution: AI provides additional context

#### Domain-Specific Usage
**Example**: "protocol"
- PDF: "규약"
- AI: "규약, 의정서 (외교); 규약, 프로토콜 (IT); 절차"
- Resolution: Show domain-specific meanings

## Conflict Detection Algorithm

```typescript
interface ConflictDetector {
  detectConflict(def1: string, def2: string): ConflictResult
}

interface ConflictResult {
  hasConflict: boolean
  severity: 'none' | 'minor' | 'major'
  type: ConflictType
  confidence: number
  reasoning: string
}

enum ConflictType {
  EQUIVALENT = 'equivalent',           // Same meaning, different words
  SUBSET = 'subset',                  // One contains the other
  PARTIAL_OVERLAP = 'partial_overlap', // Some shared meaning
  DIFFERENT_CONTEXT = 'different_context', // Different usage contexts
  CONTRADICTORY = 'contradictory'     // Opposing meanings
}

class DefinitionConflictDetector implements ConflictDetector {
  async detectConflict(pdfDef: string, aiDef: string): Promise<ConflictResult> {
    // 1. Normalize definitions
    const normalizedPdf = this.normalize(pdfDef)
    const normalizedAi = this.normalize(aiDef)
    
    // 2. Check exact match
    if (this.areEquivalent(normalizedPdf, normalizedAi)) {
      return {
        hasConflict: false,
        severity: 'none',
        type: ConflictType.EQUIVALENT,
        confidence: 1.0,
        reasoning: 'Definitions are equivalent'
      }
    }
    
    // 3. Check subset relationship
    if (this.isSubset(normalizedPdf, normalizedAi)) {
      return {
        hasConflict: true,
        severity: 'minor',
        type: ConflictType.SUBSET,
        confidence: 0.8,
        reasoning: 'One definition contains the other'
      }
    }
    
    // 4. Analyze semantic similarity
    const similarity = await this.semanticSimilarity(pdfDef, aiDef)
    
    if (similarity > 0.8) {
      return {
        hasConflict: true,
        severity: 'minor',
        type: ConflictType.PARTIAL_OVERLAP,
        confidence: similarity,
        reasoning: 'Definitions have high semantic overlap'
      }
    }
    
    // 5. Check for contradictions
    if (await this.areContradictory(pdfDef, aiDef)) {
      return {
        hasConflict: true,
        severity: 'major',
        type: ConflictType.CONTRADICTORY,
        confidence: 0.9,
        reasoning: 'Definitions appear contradictory'
      }
    }
    
    // 6. Default to different context
    return {
      hasConflict: true,
      severity: 'major',
      type: ConflictType.DIFFERENT_CONTEXT,
      confidence: 0.7,
      reasoning: 'Definitions refer to different contexts or meanings'
    }
  }
  
  private normalize(text: string): string {
    // Remove punctuation, normalize spacing
    return text
      .replace(/[,;.]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  }
  
  private areEquivalent(def1: string, def2: string): boolean {
    // Check if definitions are essentially the same
    const words1 = new Set(def1.split(' '))
    const words2 = new Set(def2.split(' '))
    const overlap = [...words1].filter(w => words2.has(w)).length
    return overlap / Math.max(words1.size, words2.size) > 0.8
  }
  
  private isSubset(def1: string, def2: string): boolean {
    // Check if one definition contains all elements of the other
    const words1 = new Set(def1.split(' '))
    const words2 = new Set(def2.split(' '))
    const allIn1 = [...words2].every(w => def1.includes(w))
    const allIn2 = [...words1].every(w => def2.includes(w))
    return allIn1 || allIn2
  }
}
```

## Resolution Strategies

### 1. Merge Strategy
Combine complementary information from multiple sources.

```typescript
interface MergeStrategy {
  merge(definitions: DefinitionVariant[]): MergedDefinition
}

class ComplementaryMerger implements MergeStrategy {
  merge(definitions: DefinitionVariant[]): MergedDefinition {
    // Sort by source priority
    const sorted = definitions.sort((a, b) => 
      this.getSourcePriority(b.source.type) - this.getSourcePriority(a.source.type)
    )
    
    const primary = sorted[0]
    const additional = sorted.slice(1)
    
    return {
      primary: primary.definition.korean,
      extended: this.combineUnique(definitions),
      sources: definitions.map(d => ({
        type: d.source.type,
        text: d.definition.korean
      })),
      confidence: this.calculateConfidence(definitions)
    }
  }
  
  private combineUnique(definitions: DefinitionVariant[]): string {
    const allParts = definitions.flatMap(d => 
      d.definition.korean.split(/[,;]/).map(p => p.trim())
    )
    const unique = [...new Set(allParts)]
    return unique.join('; ')
  }
  
  private getSourcePriority(type: string): number {
    const priorities = {
      'pdf': 100,
      'dictionary': 80,
      'ai': 60,
      'manual': 50,
      'crowdsourced': 40
    }
    return priorities[type] || 0
  }
}
```

### 2. Context-Based Selection
Choose definition based on user's learning context.

```typescript
interface ContextualSelector {
  selectBest(
    word: string,
    definitions: DefinitionVariant[],
    context: LearningContext
  ): DefinitionVariant
}

interface LearningContext {
  studyGoal: 'sat' | 'general' | 'business' | 'academic'
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  previousWords: string[] // Recently studied words
  domain?: string // Specific subject area
}

class SmartDefinitionSelector implements ContextualSelector {
  selectBest(
    word: string,
    definitions: DefinitionVariant[],
    context: LearningContext
  ): DefinitionVariant {
    // 1. Filter by study goal
    if (context.studyGoal === 'sat') {
      const satDefs = definitions.filter(d => 
        d.source.type === 'pdf' || d.metadata.domain === 'sat'
      )
      if (satDefs.length > 0) return satDefs[0]
    }
    
    // 2. Match user level
    const levelAppropriate = definitions.filter(d => 
      this.matchesUserLevel(d, context.userLevel)
    )
    
    // 3. Consider domain relevance
    if (context.domain) {
      const domainMatches = levelAppropriate.filter(d =>
        d.metadata.domain === context.domain
      )
      if (domainMatches.length > 0) return domainMatches[0]
    }
    
    // 4. Default to highest priority source
    return levelAppropriate[0] || definitions[0]
  }
  
  private matchesUserLevel(
    def: DefinitionVariant,
    level: string
  ): boolean {
    // Simple heuristic: shorter definitions for beginners
    const length = def.definition.korean.length
    switch (level) {
      case 'beginner': return length < 20
      case 'intermediate': return length < 50
      case 'advanced': return true
      default: return true
    }
  }
}
```

### 3. User Preference System

```typescript
interface UserPreferences {
  definitionStyle: 'concise' | 'detailed' | 'academic'
  sourcePreference: SourceType[]
  showAlternatives: boolean
  autoMerge: boolean
}

class PreferenceBasedResolver {
  resolve(
    word: string,
    conflicts: ConflictResult[],
    preferences: UserPreferences
  ): ResolvedDefinition {
    // Apply user preferences to conflict resolution
    const definitions = this.gatherDefinitions(word)
    
    // Filter by source preference
    const preferred = definitions.filter(d =>
      preferences.sourcePreference.includes(d.source.type)
    )
    
    // Apply style preference
    const styled = this.applyStyle(
      preferred.length > 0 ? preferred : definitions,
      preferences.definitionStyle
    )
    
    // Handle alternatives
    const result: ResolvedDefinition = {
      primary: styled[0],
      alternatives: preferences.showAlternatives ? styled.slice(1) : [],
      merged: preferences.autoMerge ? this.merge(styled) : null,
      conflicts: conflicts
    }
    
    return result
  }
}
```

## UI/UX for Conflict Resolution

### 1. Definition Display Component

```typescript
interface ConflictAwareDefinitionProps {
  word: string
  definitions: DefinitionVariant[]
  conflicts: ConflictResult[]
  onPreferenceChange: (def: DefinitionVariant) => void
}

// Visual representation:
// ┌─────────────────────────────────────┐
// │ abolish                             │
// │ [əˈbɑlɪʃ]          🔊              │
// ├─────────────────────────────────────┤
// │ 📚 V.ZIP: 폐지하다                  │ ← Primary (PDF)
// │                                     │
// │ 🤖 AI: 폐지하다, 철폐하다           │ ← Alternative
// │    ℹ️ 더 자세한 설명 제공           │
// │                                     │
// │ 📖 사전: 완전히 없애다              │ ← Reference
// │                                     │
// │ [이 정의 사용하기] [모두 보기]       │
// └─────────────────────────────────────┘
```

### 2. Conflict Indicator Design

```typescript
enum ConflictIndicator {
  NONE = '✓',        // Green check
  MINOR = '≈',       // Yellow approximately
  MAJOR = '!',       // Orange warning
  CONTRADICTION = '⚠' // Red alert
}

interface ConflictBadgeProps {
  conflict: ConflictResult
  onClick: () => void
}

// Shows inline with definition:
// "폐지하다 ≈" (click for details)
```

### 3. Resolution Modal

```typescript
interface ResolutionModalProps {
  word: string
  variants: DefinitionVariant[]
  conflict: ConflictResult
  onResolve: (resolution: Resolution) => void
}

// Modal shows:
// 1. Side-by-side comparison
// 2. Conflict explanation
// 3. User action options:
//    - Use PDF definition
//    - Use AI definition
//    - Use merged definition
//    - Report issue
//    - Set preference for future
```

## Implementation Roadmap

### Phase 1: Detection (Week 1)
- Implement conflict detection algorithm
- Add similarity scoring
- Create test suite with examples

### Phase 2: Resolution (Week 2)
- Build merge strategies
- Implement context-based selection
- Add user preference system

### Phase 3: UI Integration (Week 3)
- Create conflict-aware components
- Add resolution modal
- Implement preference persistence

### Phase 4: Optimization (Week 4)
- Cache resolution decisions
- Batch conflict detection
- Performance tuning

## Best Practices

### 1. Transparency
- Always show definition source
- Explain why conflicts exist
- Let users make informed choices

### 2. Consistency
- Remember user preferences
- Apply same resolution rules
- Maintain decision history

### 3. Learning
- Track resolution patterns
- Improve AI definitions
- Update conflict detection

## Success Metrics

1. **Conflict Resolution Rate**
   - % of conflicts successfully resolved
   - User satisfaction with resolutions
   - Time to resolution

2. **Definition Quality**
   - User preference tracking
   - Definition accuracy scores
   - Learning outcome correlation

3. **System Performance**
   - Conflict detection speed
   - Resolution caching hit rate
   - UI responsiveness