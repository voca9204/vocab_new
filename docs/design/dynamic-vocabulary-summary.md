# Dynamic Vocabulary System - Design Summary

## Executive Summary

The Dynamic Vocabulary System enables users to discover, save, and manage words beyond the current vocabulary database, with intelligent conflict resolution and relationship tracking.

## Key Features

### 1. Synonym Discovery Flow
- **Current State**: Clicking synonyms only works for words already in the database
- **New Capability**: Discover any word through AI generation with Korean definitions
- **User Experience**: Seamless exploration of related vocabulary

### 2. Multi-Source Definition Management
- **Source Hierarchy**: PDF (authoritative) → Verified AI → Dictionary API → Unverified AI
- **Conflict Resolution**: Intelligent merging and context-based selection
- **User Control**: Preferences for definition style and source priority

### 3. Relationship Network
- **Relationship Types**: Synonym, Antonym, Derived, Related, Compound
- **Bidirectional Tracking**: Automatic reverse relationship creation
- **Strength Scoring**: AI confidence + user feedback + co-occurrence

### 4. Smart Conflict Resolution
- **Conflict Detection**: Semantic analysis to identify definition differences
- **Resolution Strategies**: Merge, context-based selection, user preference
- **Transparency**: Always show source and reasoning

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
✅ **Database Schema**
- dynamic_vocabulary collection
- word_relationships collection  
- definition_variants collection

✅ **Basic Discovery API**
- POST /api/vocabulary/discover
- POST /api/vocabulary/dynamic-words

### Phase 2: Relationships (Week 2)
📋 **Relationship System**
- Bidirectional relationship creation
- Strength calculation algorithm
- Relationship visualization

📋 **Discovery UI**
- Discovery modal component
- Synonym click handling
- Save/Study/Skip actions

### Phase 3: Conflict Resolution (Week 3)
📋 **Conflict Detection**
- Semantic similarity analysis
- Conflict type classification
- Confidence scoring

📋 **Resolution UI**
- Definition comparison view
- Source indicators
- User preference settings

### Phase 4: Polish & Scale (Week 4)
📋 **Performance**
- Caching layer
- Batch operations
- Query optimization

📋 **User Experience**
- Batch discovery
- Export/Import
- Analytics dashboard

## Technical Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend UI   │────▶│  Discovery API  │────▶│   AI Service    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                         │
         ▼                       ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Word Modal      │     │ Firestore DB    │     │ OpenAI/Claude   │
│ Discovery Modal │     │ - dynamic_vocab │     │ - Definitions   │
│ Conflict UI     │     │ - relationships │     │ - Examples      │
└─────────────────┘     │ - definitions   │     │ - Etymology     │
                        └─────────────────┘     └─────────────────┘
```

## Key Design Decisions

### 1. Why Separate Collections?
- **Maintain Source Integrity**: Veterans vocabulary remains unchanged
- **Scalability**: Dynamic vocabulary can grow without affecting core data
- **Performance**: Optimized queries for different use cases

### 2. Why Track Relationships?
- **Learning Enhancement**: Study related words together
- **Discovery Path**: Understand how users explore vocabulary
- **AI Improvement**: Better synonym generation over time

### 3. Why Multiple Definition Sources?
- **Flexibility**: Different definitions for different contexts
- **Authority**: Respect PDF as primary for SAT preparation
- **Evolution**: Allow community to improve definitions

## Success Metrics

### User Engagement
- Synonym click → save rate: Target 30%
- Words discovered per session: Target 5-10
- Relationship exploration depth: Target 2-3 levels

### Data Quality  
- AI definition accuracy: Target 90%
- Conflict resolution satisfaction: Target 85%
- User verification rate: Target 20%

### System Performance
- Discovery API response: <500ms
- Modal load time: <200ms
- Batch operation efficiency: 10 words/second

## Risk Mitigation

### 1. Data Quality
- **Risk**: Poor AI-generated definitions
- **Mitigation**: User voting, source tracking, manual review

### 2. Scale
- **Risk**: Unlimited vocabulary growth
- **Mitigation**: User quotas, quality thresholds, cleanup jobs

### 3. Complexity
- **Risk**: Confusing multiple definitions
- **Mitigation**: Clear UI, source indicators, user education

## Next Steps

1. **Immediate Actions**
   - Create Firestore collections
   - Implement discovery API endpoint
   - Add discovery modal to word detail modal

2. **Short Term (2 weeks)**
   - Complete relationship system
   - Add conflict resolution
   - Launch beta testing

3. **Long Term (1 month)**
   - Performance optimization
   - Community features
   - Analytics and insights

## Conclusion

The Dynamic Vocabulary System transforms the vocabulary learning experience from a fixed database to an expandable knowledge network. By intelligently handling multiple sources, tracking relationships, and resolving conflicts, we create a richer, more personalized learning environment while maintaining the integrity of authoritative sources.