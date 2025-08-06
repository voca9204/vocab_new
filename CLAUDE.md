# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SAT Vocabulary Learning Platform V2 - A modern, contextual SAT vocabulary learning platform built with Next.js 15, Firebase, and TypeScript. The application helps students learn SAT vocabulary through real-world news context and advanced learning algorithms.

**Project Status**: 46.7% complete (7/15 tasks done)
- ✅ Completed: Next.js setup, Firebase/Emulator, Auth system, UI components, SAT vocabulary DB, Dictionary APIs, News crawling
- 🔄 Next Priority: Task 7 (Search & filtering), Task 8 (Quiz system), Task 11 (Contextual learning)

## Essential Commands

### Development
```bash
# Start development server
npm run dev

# Start with Firebase emulators
npm run dev:emulators

# Run Firebase emulators only
npm run emulators
```

### Testing
```bash
# Run tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Code Quality
```bash
# Run linting
npm run lint

# Type checking
npm run type-check
```

### Build & Deploy
```bash
# Build for production
npm run build

# Deploy to Vercel (Primary hosting)
vercel

# Deploy to Firebase (Deprecated - replaced by Vercel)
npm run firebase:deploy
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS 4.0
- **Backend**: Firebase (Firestore, Authentication, Functions)
- **Testing**: Jest + React Testing Library

### Project Structure
```
src/
├── app/           # Next.js App Router pages
├── components/    # Reusable UI components
├── lib/           # Utility functions and Firebase config
├── hooks/         # Custom React hooks
└── types/         # TypeScript type definitions
```

### Key Architectural Patterns

1. **App Router Structure**: All pages use Next.js 15 App Router with Server Components by default
2. **Firebase Integration**: Firebase SDK is initialized in `lib/firebase/config.ts` with emulator support
3. **Component Organization**: UI components use compound pattern with exports from `components/ui/index.ts`
4. **State Management**: Uses React Context for global state (AuthProvider, VocabularyProvider)
5. **API Integration**: External APIs (Dictionary, News) are wrapped in service classes in `lib/api/`

### Firebase Configuration

**Emulator Ports**:
- Auth: 9199
- Firestore: 8181
- Functions: 5501
- Storage: 9299

**Collections Structure**:
- `users/` - User profiles and preferences
- `vocabulary/` - SAT vocabulary database (2000+ words)
- `news/` - News articles with SAT word highlighting
- `progress/` - User learning progress tracking
- `veterans_vocabulary/` - V.ZIP 3K PDF에서 추출한 단어들 (1821개)
- `vocabulary_collections/` - 단어 컬렉션 그룹화

### Development Guidelines

1. **TypeScript**: Strict mode is enabled. No `any` types allowed.
2. **Components**: Follow the existing pattern in `components/ui/` for new components
3. **Testing**: Aim for 80% coverage. Test files go in `__tests__` folders
4. **Code Style**: ESLint rules enforce no-console (warning), no-var, prefer-const
5. **Imports**: Use `@/` alias for src directory imports
6. **Database Architecture**: 🔥 **MANDATORY**: Always refer to `DATABASE_ARCHITECTURE.md` before making any database-related changes. Update this file immediately after any changes to:
   - Collection structures
   - Data flow patterns
   - API endpoints
   - Menu/Modal data access patterns
   - Caching strategies

### Common Tasks

**Adding a new UI component**:
1. Create component in `src/components/ui/`
2. Export from `src/components/ui/index.ts`
3. Follow existing patterns (use `cn()` utility for className merging)

**Working with Firebase**:
1. Always use the emulator in development
2. Check `firestore.rules` for security rules
3. Use type-safe Firestore converters

**Adding new vocabulary features**:
1. Update types in `src/types/vocabulary.ts`
2. Add service methods in `src/lib/api/vocabulary-service.ts`
3. Create/update hooks in `src/hooks/`
4. 🔥 **CRITICAL**: Update `DATABASE_ARCHITECTURE.md` with:
   - New collection structures
   - Data flow changes
   - API endpoint additions
   - Menu/Modal access patterns

### Important Notes

- The project uses Tailwind CSS 4.0 with PostCSS
- Firebase project ID: `vocabulary-app-new`
- All API keys should be in `.env.local` (not committed)
- The project aims to support 2000+ SAT vocabulary words with contextual learning through news articles

## TaskMaster Integration

The project uses TaskMaster for task management. Key commands:
```bash
# View all tasks
tm get-tasks --status all

# Get next priority task
tm next-task

# Check specific task
tm get-task 7

# Start working on a task
tm set-task-status 7 in-progress
```

**Current Task Status**:
- 15 total tasks in `.taskmaster/tasks/tasks.json`
- Completed: Tasks 1-6, 10 (infrastructure & APIs)
- Next priorities: Task 7 (search/filter), Task 8 (quiz), Task 11 (contextual learning)

## Project History & Context

**V1 → V2 Migration**: This is a complete rewrite from Vite/React to Next.js 15 for better stability
- V1 backup: `vocabulary-backup-20250612_021030` (contains 47 SAT words)
- V2 improvements: TypeScript strict mode, Firebase Emulator, better architecture

**Key Files for Reference**:
- `claude_context.md` - Current project status and progress
- `structure.md` - Detailed project structure guide
- `FILE_MAP.md` - Complete file listing with descriptions
- `DATABASE_ARCHITECTURE.md` - 🔥 **CRITICAL**: Database structure and data flow documentation

## Code Quality Standards

**File Constraints**:
- Maximum 1500 lines per file
- Maximum 5 props per component
- Cyclomatic complexity ≤ 10
- 80% test coverage target

**Naming Conventions**:
- Components: PascalCase (e.g., `VocabularyCard`)
- Files: kebab-case (e.g., `vocabulary-card.tsx`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS`)

## Current Implementation Status

**Completed Infrastructure**:
- ✅ Firebase Authentication with emulator
- ✅ Firestore database structure for 2000+ SAT words
- ✅ Multiple Dictionary API integration (Free Dictionary, Merriam-Webster, Words API)
- ✅ News crawling and processing system
- ✅ Core UI component library
- ✅ PDF vocabulary extraction system (V.ZIP format)
- ✅ Veterans vocabulary database (1821 words from V.ZIP 3K)

**Pending Features**:
- 🔄 Advanced search and filtering (Task 7)
- 🔄 Quiz system with multiple formats (Task 8)
- 🔄 Contextual learning interface (Task 11)
- 🔄 User progress tracking (Task 9)
- 🔄 Spaced repetition algorithm (Task 12)

## Vocabulary Database Structure

### Main Collections

#### `words` Collection
메인 단어 데이터베이스 - 모든 표준 SAT 단어들

#### `ai_generated_words` Collection  
AI로 생성된 단어 정의들 (Discovery Modal에서 생성)

#### `photo_vocabulary_words` Collection
사진에서 추출한 단어들을 영구 저장하는 컬렉션

**데이터 형식**:
```typescript
{
  id: string,
  word: string,
  definition?: string,       // 한글 정의
  context?: string,          // 원문 컨텍스트
  partOfSpeech?: string[],
  
  // AI 향상 필드 (나중에 추가됨)
  etymology?: string,        // 영어 설명
  realEtymology?: string,    // 실제 어원
  examples?: string[],       // 예문
  synonyms?: string[],       // 동의어
  pronunciation?: string,
  
  // 메타데이터
  collectionId: string,      // 속한 컬렉션 ID
  userId: string,
  createdAt: Date,
  updatedAt: Date,
  isActive: boolean,
  
  // 학습 상태
  studyStatus: {
    studied: boolean,
    masteryLevel: number,
    reviewCount: number,
    // ...
  }
}
```

#### `photo_vocabulary_collections` Collection
사진 단어들을 그룹화하는 컬렉션 (날짜별, 주제별 정리)

### Unified Word System

**UnifiedWord Interface**:
모든 단어 컬렉션을 통합하여 일관된 형식으로 처리하는 시스템

**WordAdapter**:
- 클라이언트: `words`, `photo_vocabulary_words` 접근 가능
- 서버: 모든 컬렉션 접근 가능 (WordAdapterServer)
- 자동 변환 및 캐싱 지원

### API Endpoints for Vocabulary

#### Unified APIs (All Collections Support)
- `/api/generate-examples-unified` - 모든 컬렉션의 단어에 예문 생성
- `/api/generate-etymology-unified` - 모든 컬렉션의 단어에 어원 생성
- `/api/update-synonyms` - 모든 컬렉션의 단어에 동의어 업데이트
- `/api/fetch-pronunciation` - 발음 정보 가져오기

#### Discovery API
- `/api/vocabulary/discover` - 새 단어 검색 및 AI 정의 생성

### Caching Strategy

**CacheContext**:
- 메모리 기반 캐싱 (페이지 리로드 시 초기화)
- 동의어, Discovery 결과 캐싱
- TTL: 동의어 10분, Discovery 5분

**동의어 저장 흐름**:
1. AI 생성 → CacheContext 저장
2. 동시에 DB 업데이트 (`updateWordSynonyms`)
3. 다음 로드 시 DB에서 우선 확인

### Recent Improvements

#### Photo Vocabulary Integration (2025-08)
- ✅ Photo vocabulary words를 UnifiedWord 시스템에 통합
- ✅ WordAdapter에 photo_vocabulary_words 컬렉션 지원 추가
- ✅ 서버 사이드 WordAdapterServer 생성 (권한 문제 해결)
- ✅ 모든 API가 photo vocabulary words 지원

#### UI/UX Improvements
- ✅ WordDetailModal 조건부 렌더링 → 항상 렌더링 (안정성 향상)
- ✅ 유사어 클릭 시 DB 우선 검색 (Discovery Modal 최소화)
- ✅ 검색 중 로딩 상태 표시
- ✅ 정의 표시 문제 수정 (definitions[0].definition 지원)

## Deployment Configuration

### Hosting Architecture
- **Primary Hosting**: Vercel (Next.js optimized)
- **Backend Services**: Firebase (Firestore, Authentication, Functions)
- **Previous Setup**: Firebase Hosting (deprecated after moving to Next.js)

### Vercel Configuration

**Project Information**:
- Project ID: `prj_9y70edy1upkm7eWLW5NKC8nUqkJ6`
- Organization ID: `team_bKsPYU9jfI2JvCtdptfYbS2I`
- Production URL: https://voca-*.vercel.app

**Configuration File** (`vercel.json`):
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "src/app/api/health/route.ts": {
      "maxDuration": 10
    },
    "src/app/api/test-env/route.ts": {
      "maxDuration": 10
    }
  }
}
```

**Required Environment Variables**:
```bash
# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=vocabulary-app-new
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-*@vocabulary-app-new.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# OpenAI API
OPENAI_API_KEY=sk-...

# Firebase Client SDK (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=vocabulary-app-new.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=vocabulary-app-new
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=vocabulary-app-new.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=203198017310
NEXT_PUBLIC_FIREBASE_APP_ID=1:203198017310:web:...
```

### Firebase Configuration

**Firebase Services Used**:
- Firestore Database
- Authentication
- Cloud Functions (for server-side operations)
- Storage (for PDF uploads)

**Configuration File** (`firebase.json`):
```json
{
  "projects": {
    "default": "vocabulary-app-new"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions"
  },
  "emulators": {
    "auth": { "port": 9199 },
    "firestore": { "port": 8181 },
    "functions": { "port": 5501 },
    "storage": { "port": 9299 }
  }
}
```

### Deployment History

1. **Initial Setup**: Firebase Hosting for static site
2. **Migration to Next.js**: Switched to Vercel for better Next.js support
3. **Key Fixes**:
   - OpenAI API initialization moved to runtime (commit: 496519d)
   - Added debugging endpoints for Vercel environment (commit: 7138f19)
   - Firebase Admin SDK integration for server-side operations

### Deployment Commands

```bash
# Deploy to Vercel
vercel                    # Deploy to preview
vercel --prod            # Deploy to production

# Local development with Firebase emulators
npm run dev:emulators    # Start both Next.js and Firebase emulators

# Firebase-only deployment (if needed)
firebase deploy --only firestore:rules    # Deploy Firestore rules
firebase deploy --only functions          # Deploy Cloud Functions
```

### Important Notes

- Vercel handles Next.js hosting and API routes
- Firebase provides backend services (database, auth, storage)
- Environment variables must be configured in Vercel dashboard
- Firebase Admin SDK private key needs proper formatting in Vercel (use quotes and \n for line breaks)