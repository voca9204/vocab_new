# CLAUDE.md - SAT Vocabulary Learning Platform V2

AI Assistant guidance for Claude Code when working with this repository. This file follows SuperClaude framework standards.

## 🎯 Project Overview

**Name**: SAT Vocabulary Learning Platform V2
**Purpose**: A modern, contextual SAT vocabulary learning platform built with Next.js 15, Firebase, and TypeScript
**Key Feature**: Learn SAT vocabulary through real-world news context with advanced learning algorithms

### Project Status
- **Overall Completion**: 50% (8/16 tasks done)
- **Current Priority**: Task 7 (Search & filtering), Task 8 (Quiz system), Task 11 (Contextual learning)
- **Documentation**: ✅ Fully restructured with 5-tier documentation system (January 2025)

### ✅ Completed Features
- Next.js 15 setup with App Router
- Firebase configuration (production Firestore only)
- Authentication system with role-based access
- Core UI components library
- SAT vocabulary database (3,141+ words in words_v3)
- Dictionary API integrations
- News crawling system
- User settings with field refactoring (Task 16)

### 📌 Next Priorities
1. **Task 7**: Search & filtering system
2. **Task 8**: Quiz system with spaced repetition
3. **Task 11**: Contextual learning with news integration

## 🔥 Critical Guidelines

### DO's ✅
- **Always** use production Firestore directly (never emulators)
- **Always** refer to `docs/architecture/database.md` before database changes
- **Always** use `words_v3` collection as primary data source
- **Always** maintain backward compatibility with WordAdapterBridge
- **Always** increment cache version when modifying word data structure
- **Always** follow existing UI component patterns in `components/ui/`
- **Always** use TypeScript strict mode (no `any` types)

### DON'Ts ❌
- **Never** use Firebase emulators (deprecated)
- **Never** modify database schema without updating documentation
- **Never** directly access legacy collections (use adapters)
- **Never** exceed 1500 lines per file or 5 props per component
- **Never** skip testing for critical paths
- **Never** commit secrets or API keys

## 🚀 Essential Commands

### Development
```bash
npm run dev                    # Start development (production Firestore)
npm run test                   # Run tests
npm run test:watch            # Watch mode for TDD
npm run test:coverage         # Coverage report (target: 80%)
npm run lint                  # ESLint checks
npm run type-check            # TypeScript validation
```

### Build & Deploy
```bash
npm run build                 # Production build
vercel                        # Deploy to Vercel (primary)
```

### TaskMaster AI
```bash
tm next-task                  # Get next priority task
tm get-tasks --status all     # View all tasks
tm get-task 7                 # Check specific task
tm set-task-status 7 in-progress  # Update task status
```

## 🏗️ Architecture Overview

### Tech Stack
| Category | Technology | Notes |
|----------|------------|-------|
| **Frontend** | Next.js 15 | App Router, Server Components |
| **Language** | TypeScript | Strict mode, no `any` types |
| **Styling** | Tailwind CSS 4.0 | Utility-first CSS |
| **Database** | Firebase Firestore | Production only (no emulators) |
| **Auth** | Firebase Authentication | Role-based access control |
| **Testing** | Jest + RTL | 80% coverage target |
| **Task Management** | TaskMaster AI | Custom task system |

### Project Structure
```
vocabulary-v2/
├── src/
│   ├── app/              # Next.js 15 App Router pages
│   ├── components/       # UI components (compound pattern)
│   │   ├── ui/          # Core UI library
│   │   └── vocabulary/  # Domain-specific components
│   ├── contexts/        # React Context providers
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Core utilities
│   │   ├── adapters/   # Bridge Pattern for data
│   │   ├── api/        # External API services
│   │   ├── cache/      # Multi-layer caching
│   │   ├── firebase/   # Firebase configuration
│   │   └── vocabulary/ # Word service layer
│   └── types/          # TypeScript definitions
├── docs/               # 5-tier documentation system
│   ├── ARCHITECTURE/  # System design
│   ├── DEVELOPMENT/   # History & logs
│   ├── GUIDES/        # How-to guides
│   ├── REFERENCE/     # API docs
│   └── ARCHIVE/       # Historical docs
└── public/            # Static assets
```

### Architectural Patterns
1. **App Router**: Server Components by default, Client Components when needed
2. **Bridge Adapter**: Unified data access with backward compatibility
3. **Multi-Layer Cache**: React Query (5min) → Memory → LocalStorage (24hr)
4. **Compound Components**: UI components with sub-components exported together
5. **Service Layer**: Business logic separated from components
6. **Repository Pattern**: Data access through adapters
7. **Observer Pattern**: React Context for cross-cutting concerns
8. **Factory Pattern**: Dynamic adapter selection based on data source

## 📊 Data Architecture

### Firebase Collections

#### Primary Collections
| Collection | Purpose | Access |
|------------|---------|--------|
| `words_v3/` | Master word database (3,141+ words) | 🔥 PRIMARY SOURCE |
| `user_words/` | User learning progress & stats | Per-user |
| `userSettings/` | User preferences & display settings | Per-user |
| `vocabulary_collections/` | Official collections (SAT, GRE, etc) | Admin only |
| `personal_collections/` | User-created collections | All users |

#### Feature Collections
| Collection | Purpose | Retention |
|------------|---------|----------|
| `ai_generated_words/` | Discovery modal generations | Permanent |
| `photo_vocabulary_words/` | OCR extracted words | 48hr sessions |
| `news_context/` | News article associations | 30 days |

#### Legacy (Deprecated)
- `words/` → Migrated to `words_v3`
- `veterans_vocabulary/` → Migrated to `words_v3`
- `vocabulary/` → Migrated to `words_v3`

### Performance Optimizations
- **Batch Queries**: 30 items per batch (96% reduction)
- **Indexed Queries**: Firestore composite indexes deployed
- **Cache Strategy**: 3-layer (React Query → Memory → LocalStorage)
- **Lazy Loading**: Components use dynamic imports
- **Image Optimization**: Next.js Image component with WebP

## 🚧 Development Workflow

### Quick Start (New Session)
1. **Check current task**: `tm next-task`
2. **Review recent changes**: 
   - `docs/DEVELOPMENT/history.md` - Timeline
   - `docs/architecture/current-status.md` - System state
3. **Start development**: `npm run dev`
4. **Run tests**: `npm run test:watch`

### Common Entry Points
- **Pages**: `/src/app/*/page.tsx`
- **Components**: `/src/components/vocabulary/`
- **Services**: `/src/lib/vocabulary/`
- **Types**: `/src/types/`
- **Hooks**: `/src/hooks/`

### Adding New Features
1. Update types in `/src/types/`
2. Create service in `/src/lib/`
3. Build component in `/src/components/`
4. Add hook if needed in `/src/hooks/`
5. Update documentation
6. Write tests (80% coverage)
7. Increment cache version if data changes

## 📚 Documentation System

### 5-Tier Documentation Structure
```
docs/
├── ARCHITECTURE/         # System design & technical decisions
│   ├── current-status.md # 🔥 CRITICAL: Current system state
│   ├── database.md       # 🔥 CRITICAL: Database schema
│   └── improvement-plan.md
├── DEVELOPMENT/         # Development history & logs
│   ├── history.md       # Development timeline
│   ├── changelog.md     # Version changes
│   └── migration-log.md # Data migrations
├── GUIDES/              # How-to guides
│   ├── developer-guide.md
│   ├── deployment.md
│   └── troubleshooting.md
├── REFERENCE/           # API & technical specs
│   ├── api-reference.md
│   ├── type-definitions.md
│   └── firebase-rules.md
└── ARCHIVE/            # Historical docs
    └── 2025-Q1/
```

### Must-Read Documents
1. **`docs/architecture/database.md`** - Database structure (MANDATORY before DB changes)
2. **`docs/architecture/current-status.md`** - System metrics & status
3. **`docs/architecture/improvement-plan.md`** - Collection architecture improvements
4. **`docs/DEVELOPMENT/history.md`** - Development decisions & rationale
5. **`QUICK_START_GUIDE.md`** - 5-minute setup guide

## 🛠️ Common Development Tasks

### Adding UI Components
```typescript
// 1. Create component in src/components/ui/
// 2. Use compound pattern
// 3. Export from index.ts
// 4. Use cn() for className merging
```

### Database Operations
```typescript
// 1. ALWAYS check docs/architecture/database.md first
// 2. Use WordAdapterBridge for data access
// 3. Never access collections directly
// 4. Increment cache version after schema changes
```

### Testing Checklist
- [ ] Unit tests for business logic
- [ ] Component tests with RTL
- [ ] Integration tests for API calls
- [ ] 80% coverage minimum
- [ ] Test error boundaries

### Debugging Guide
| Issue | Solution |
|-------|----------|
| Data inconsistency | Clear cache: `localStorage.clear()` |
| Auth issues | Check Firebase Console |
| Build errors | Run `npm run type-check` |
| Test failures | Check `npm run test:coverage` |
| Performance | Check React Query DevTools |

## 🚀 Deployment

### Vercel Configuration
- **Production**: https://voca-*.vercel.app
- **Branch Deployments**: Automatic from main
- **Environment Variables**: Set in Vercel Dashboard

### Required Environment Variables
```env
# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=vocabulary-app-new
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-*@...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

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

## 🔧 Admin Tools

- **Clear Cache**: `/admin/clear-cache`
- **Database Migration**: `/admin/migrate`
- **Admin Users**: Update in `/src/lib/auth/admin.ts`
- **Firestore Console**: https://console.firebase.google.com

## 📈 Performance Metrics

### Current Performance (August 2025)
- **Load Time**: <3s (3G), <1s (WiFi)
- **Bundle Size**: 450KB initial, 1.8MB total
- **Query Reduction**: 96% (100+ → 3-4)
- **Cache Hit Rate**: 85%+
- **Test Coverage**: 75% (target: 80%)

### Optimization Achievements
- ✅ Batch queries implemented
- ✅ 3-layer caching active
- ✅ React Query integration
- ✅ Firestore indexes deployed
- ✅ 85% faster loading achieved

## 🎓 Learning Resources

- **Next.js 15 Docs**: https://nextjs.org/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **React Query**: https://tanstack.com/query/latest
- **Tailwind CSS**: https://tailwindcss.com/docs

---

*Last Updated: January 2025 | Version: 2.0.0 | SuperClaude Compliant*
