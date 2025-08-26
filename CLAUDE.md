# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SAT Vocabulary Learning Platform V2 - A modern, contextual SAT vocabulary learning platform built with Next.js 15, Firebase, and TypeScript. The application helps students learn SAT vocabulary through real-world news context and advanced learning algorithms.

**Project Status**: 50% complete (8/16 tasks done)
- ✅ Completed: Next.js setup, Firebase/Emulator, Auth system, UI components, SAT vocabulary DB, Dictionary APIs, News crawling, User settings & field refactoring (Task 16)
- 📌 Next Priority: Task 7 (Search & filtering), Task 8 (Quiz system), Task 11 (Contextual learning)

**Documentation Status**: ✅ Fully restructured (January 2025)
- 체계적인 5단계 문서 구조 확립
- 개발 히스토리 및 아키텍처 문서 통합
- 지속적 문서 관리 프로세스 구축

## Essential Commands

### Development
```bash
# Start development server (use production Firestore directly)
npm run dev

# ⚠️ DO NOT USE Firebase emulators - use production Firestore directly
# npm run dev:emulators  # DEPRECATED - DO NOT USE
# npm run emulators      # DEPRECATED - DO NOT USE
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

### TaskMaster Commands
```bash
# View current tasks
tm get-tasks --status all

# Get next priority task
tm next-task

# Check specific task
tm get-task 7

# Update task status
tm set-task-status 7 in-progress
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS 4.0
- **Backend**: Firebase (Firestore, Authentication, Functions)
- **Testing**: Jest + React Testing Library
- **Task Management**: TaskMaster AI

### Project Structure
```
src/
├── app/           # Next.js App Router pages
├── components/    # Reusable UI components
├── contexts/      # React Context providers
├── lib/           # Utility functions and Firebase config
│   ├── adapters/  # Word adapters (Bridge Pattern)
│   ├── cache/     # Cache management
│   └── firebase/  # Firebase configuration
├── hooks/         # Custom React hooks
└── types/         # TypeScript type definitions
```

### Key Architectural Patterns

1. **App Router Structure**: All pages use Next.js 15 App Router with Server Components by default
2. **Firebase Integration**: Direct production Firestore (emulators deprecated)
3. **Component Organization**: UI components use compound pattern with exports from `components/ui/index.ts`
4. **State Management**: React Query for server state + Context API for client state
5. **API Integration**: External APIs wrapped in service classes in `lib/api/`
6. **Bridge Adapter Pattern**: Unified words_v3 with backward compatibility
7. **Caching Strategy**: 3-layer caching (React Query 5min → Memory → LocalStorage 24hr)
8. **Performance**: Batch queries (30 items), indexed queries, optimized loading

### Firebase Configuration

**Emulator Ports**:
- Auth: 9199
- Firestore: 8181
- Functions: 5501
- Storage: 9299

**Main Collections**:
- `words_v3/` - **NEW** Unified master word database (3,141+ words, primary source)
- `words/` - Legacy master word database (being phased out)
- `ai_generated_words/` - AI-generated words from Discovery
- `vocabulary_collections/` - Official collections (Admin only)
  - Categories: SAT, TOEFL, TOEIC, 수능, GRE, IELTS, 기본
- `personal_collections/` - Personal collections (All users)
  - Admin: Can upload both official and personal collections
  - Regular users: Can only upload personal collections
- `photo_vocabulary_words/` - Words extracted from photos
- `user_words/` - User learning progress
- `userSettings/` - User preferences and settings

**Legacy Collections** (deprecated):
- `veterans_vocabulary/` - V.ZIP 3K PDF words (migrated to words_v3)
- `vocabulary/` - Old SAT words (migrated to words_v3)

### Development Guidelines

1. **TypeScript**: Strict mode is enabled. No `any` types allowed.
2. **Components**: Follow the existing pattern in `components/ui/` for new components
3. **Testing**: Aim for 80% coverage. Test files go in `__tests__` folders
4. **Code Style**: ESLint rules enforce no-console (warning), no-var, prefer-const
5. **Imports**: Use `@/` alias for src directory imports
6. **Database Architecture**: 🔥 **MANDATORY**: Always refer to `docs/ARCHITECTURE/database.md` before making any database-related changes
7. **File Constraints**: Max 1500 lines per file, max 5 props per component

## Recent Architecture Improvements (August 2025)

### Phase 1 Complete ✅
- **Batch Queries**: 96% reduction (100+ → 3-4 queries)
- **Multi-layer Cache**: React Query → Memory → LocalStorage
- **Environment Logging**: Production-safe logging system
- **React Query**: Full integration with DevTools
- **Firestore Indexes**: Optimized and deployed

### Phase 2 In Progress (75%)
- **Unified Database**: 3,141 words in `words_v3` collection
- **Bridge Adapter**: Backward compatibility maintained
- **Quality Scoring**: Automatic assessment (0-100)
- **Performance**: 85% faster loading achieved

### Feature Systems
- **Photo Vocabulary**: OCR with 48hr sessions
- **PDF Extraction**: AI-powered multi-format support
- **Discovery Modal**: Real-time word generation
- **User Settings**: Display preferences with React Context

## 📚 Documentation Structure

### Core Documentation Hierarchy
```
프로젝트 루트/
├── README.md                    # 프로젝트 개요 및 시작점
├── CLAUDE.md                    # Claude Code AI 어시스턴트 가이드
├── QUICK_START_GUIDE.md         # 5분 빠른 시작 가이드
└── docs/
    ├── ARCHITECTURE/           # 🏗️ 시스템 설계 및 아키텍처
    │   ├── current-status.md   # 현재 아키텍처 상태
    │   ├── database.md         # 데이터베이스 스키마 및 구조
    │   └── improvement-plan.md # 아키텍처 개선 로드맵
    ├── DEVELOPMENT/            # 📝 개발 히스토리 및 로그
    │   ├── history.md          # 체계적인 개발 타임라인
    │   ├── changelog.md        # 버전별 변경사항
    │   └── migration-log.md   # 데이터 마이그레이션 기록
    ├── GUIDES/                 # 📖 가이드 및 튜토리얼
    │   ├── developer-guide.md # 개발자 가이드
    │   ├── deployment.md      # 배포 가이드
    │   └── troubleshooting.md # 문제 해결 가이드
    ├── REFERENCE/              # 📑 기술 참조 문서
    │   ├── api-reference.md   # API 문서
    │   ├── type-definitions.md # TypeScript 타입 정의
    │   └── firebase-rules.md  # Firebase 보안 규칙
    └── ARCHIVE/               # 📦 과거 문서 보관
        └── 2025-Q1/          # 분기별 아카이브
```

### Primary Reference Files
- `docs/ARCHITECTURE/current-status.md` - 📊 현재 시스템 상태 및 메트릭스
- `docs/ARCHITECTURE/database.md` - 🔥 **필수**: 데이터베이스 구조 및 데이터 플로우
- `docs/DEVELOPMENT/history.md` - 📝 개발 이력 및 주요 결정사항
- `QUICK_START_GUIDE.md` - 🚀 신규 개발자를 위한 빠른 시작
- `docs/GUIDES/troubleshooting.md` - 🔧 일반적인 문제 해결

## Common Tasks

### Adding a new UI component
1. Create component in `src/components/ui/`
2. Export from `src/components/ui/index.ts`
3. Follow existing patterns (use `cn()` utility for className merging)

### Working with Firebase
1. Always use production Firestore directly (emulator deprecated)
2. Check `firestore.rules` for security rules
3. Use type-safe Firestore converters
4. Primary data source is `words_v3` collection

### Adding new vocabulary features
1. Update types in `src/types/unified-word.ts`
2. Use WordAdapterBridge for data access
3. Create/update hooks in `src/hooks/`
4. Update `docs/ARCHITECTURE/database.md`
5. Increment cache version in `word-adapter-unified.ts`
6. Document changes in `docs/DEVELOPMENT/changelog.md`

### Debugging Tips
1. Check browser console for adapter logs (WordAdapterBridge, UnifiedWordAdapter)
2. Verify environment variables in `.env.local`
3. Clear cache if data inconsistencies: `/admin/clear-cache` or `localStorage.clear()`
4. Check cache version in console: `localStorage.getItem('word_cache_version')`
5. Monitor Firestore usage in Firebase Console

## Deployment Configuration

### Vercel (Primary)
- Production URL: https://voca-*.vercel.app
- Environment variables must be set in Vercel dashboard
- Automatic deployments from main branch

### Required Environment Variables
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

## Quick Start for New Session

1. **Check current task status**:
   ```bash
   tm next-task
   ```

2. **Review recent changes**:
   - Check `docs/DEVELOPMENT/history.md` for development timeline
   - Check `docs/ARCHITECTURE/current-status.md` for system status
   - Review any TODO comments in code

3. **Start development**:
   ```bash
   npm run dev
   ```

4. **Common entry points**:
   - Settings page: `/src/app/settings/page.tsx`
   - Word services: `/src/lib/vocabulary/`
   - Type definitions: `/src/types/`
   - UI components: `/src/components/vocabulary/`

5. **Admin tools**:
   - Migration page: `/admin/migrate` - For database field migrations
   - Admin emails: Update in `/src/lib/auth/admin.ts`
