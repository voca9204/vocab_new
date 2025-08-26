# 📁 Project Structure
*Last Updated: 2025-08-23*

## 🌳 Root Directory Overview

```
vocabulary-v2/
├── 📚 Documentation
│   ├── README.md                    # 🔥 MAIN - Project overview & quick start
│   ├── CLAUDE.md                    # Claude Code instructions
│   ├── CHANGELOG.md                 # Auto-generated from Git history
│   └── docs/                        # Structured documentation (see below)
│
├── 🔧 Configuration
│   ├── .env.local                   # Environment variables (local)
│   ├── .gitignore                   # Git ignore rules
│   ├── .eslintrc.json              # ESLint configuration
│   ├── next.config.ts               # Next.js configuration
│   ├── tailwind.config.ts           # Tailwind CSS configuration
│   ├── tsconfig.json                # TypeScript configuration
│   ├── package.json                 # Dependencies and scripts
│   ├── firebase.json                # Firebase configuration
│   ├── firestore.rules             # Firestore security rules
│   └── firestore.indexes.json      # Firestore indexes
│
├── 📱 Application Source
│   └── src/                         # Main application code (see detailed structure below)
│
├── 🧪 Testing & Quality
│   ├── __tests__/                   # Global test files
│   ├── jest.config.js               # Jest testing configuration
│   └── playwright.config.ts        # Playwright E2E testing
│
├── 🚀 Deployment & DevOps
│   ├── .vercel/                     # Vercel deployment config
│   ├── .github/                     # GitHub Actions workflows
│   └── scripts/                     # Utility and maintenance scripts
│
├── 📦 Build & Dependencies
│   ├── node_modules/                # NPM dependencies
│   ├── .next/                       # Next.js build output
│   └── dist/                        # Production build directory
│
└── 🗃️ Project Management
    ├── .taskmaster/                 # TaskMaster AI configuration
    └── .obsidian/                   # Obsidian notes (if using)
```

## 📁 Detailed `/src` Structure

```
src/
├── 📄 Pages (Next.js App Router)
│   └── app/
│       ├── layout.tsx               # Root layout component
│       ├── page.tsx                 # Home page
│       ├── loading.tsx              # Global loading component
│       ├── error.tsx                # Global error boundary
│       │
│       ├── 🔐 Authentication
│       │   └── (auth)/
│       │       └── login/
│       │           └── page.tsx     # Login page
│       │
│       ├── 📚 Study System
│       │   └── study/
│       │       ├── page.tsx         # Study dashboard
│       │       ├── daily/page.tsx   # Daily study session
│       │       ├── flashcards/page.tsx  # Flashcard study mode
│       │       ├── quiz/page.tsx    # Quiz study mode
│       │       ├── typing/page.tsx  # Typing practice mode
│       │       ├── list/page.tsx    # Word list view
│       │       ├── review/page.tsx  # Review session
│       │       └── [id]/page.tsx    # Individual collection study
│       │
│       ├── 📋 Collections
│       │   ├── collections/page.tsx # Collection browser
│       │   └── my-collections/page.tsx # Personal collections
│       │
│       ├── ⚙️ Settings & Admin
│       │   ├── settings/page.tsx    # User settings
│       │   └── admin/
│       │       ├── migrate/page.tsx # Database migration tools
│       │       └── collections/page.tsx # Admin collection management
│       │
│       ├── 📄 Utilities
│       │   ├── pdf-extract/page.tsx # PDF vocabulary extraction
│       │   └── wordbooks/page.tsx   # Wordbook management
│       │
│       └── 🌐 API Routes
│           └── api/
│               ├── auth/             # Authentication endpoints
│               ├── vocabulary/       # Word-related endpoints
│               ├── collections/      # Collection management
│               ├── user-words/      # User progress tracking
│               ├── study-progress/  # Study session management
│               ├── pdf-extract/     # PDF processing
│               ├── photo-vocabulary/ # Photo OCR processing
│               └── migrate-etymology/ # Database migration
│
├── 🧩 Components
│   └── components/
│       ├── ui/                      # Base UI components
│       │   ├── index.ts            # Component exports
│       │   ├── button.tsx          # Button variants
│       │   ├── modal.tsx           # Modal system
│       │   ├── card.tsx            # Card layouts
│       │   ├── progress-bar.tsx    # Progress indicators
│       │   ├── loading-spinner.tsx # Loading states
│       │   ├── skeleton.tsx        # Skeleton loading
│       │   └── offline-indicator.tsx # PWA offline status
│       │
│       ├── 📚 Vocabulary Components
│       │   └── vocabulary/
│       │       ├── word-detail-modal.tsx    # Word detail popup
│       │       ├── discovery-modal.tsx      # AI word generation
│       │       ├── word-list.tsx           # Word list display
│       │       ├── virtual-word-list.tsx   # Virtualized large lists
│       │       ├── word-card.tsx           # Individual word cards
│       │       └── collection-selector.tsx # Collection chooser
│       │
│       ├── 🎯 Study Components
│       │   └── study/
│       │       ├── flashcard.tsx           # Flashcard component
│       │       ├── quiz-question.tsx       # Quiz interface
│       │       ├── typing-challenge.tsx    # Typing practice
│       │       ├── progress-tracker.tsx    # Study progress
│       │       └── session-summary.tsx     # Session results
│       │
│       ├── 📱 Layout Components
│       │   └── layout/
│       │       ├── header.tsx              # App header
│       │       ├── sidebar.tsx             # Navigation sidebar
│       │       ├── footer.tsx              # App footer
│       │       └── navigation.tsx          # Main navigation
│       │
│       ├── 📋 Forms
│       │   └── forms/
│       │       ├── auth-form.tsx           # Authentication forms
│       │       ├── collection-form.tsx     # Collection creation
│       │       └── settings-form.tsx       # User settings
│       │
│       ├── 📄 PDF & File Processing
│       │   └── pdf/
│       │       ├── vocabulary-pdf-upload.tsx # PDF upload interface
│       │       ├── pdf-preview.tsx         # PDF preview component
│       │       └── extraction-results.tsx   # Extraction results display
│       │
│       ├── 📸 Photo Vocabulary
│       │   └── photo/
│       │       ├── camera-capture.tsx      # Camera interface
│       │       ├── image-upload.tsx        # Image upload component
│       │       └── ocr-results.tsx         # OCR results display
│       │
│       ├── 🗂️ Collections
│       │   └── collections/
│       │       ├── collection-card.tsx     # Collection preview cards
│       │       ├── collection-browser.tsx  # Collection browser
│       │       └── collection-stats.tsx    # Collection statistics
│       │
│       ├── 📊 Dashboard
│       │   └── dashboard/
│       │       ├── stats-widget.tsx        # Statistics widgets
│       │       ├── recent-activity.tsx     # Recent study activity
│       │       ├── progress-chart.tsx      # Progress visualization
│       │       └── daily-goal.tsx          # Daily goal tracker
│       │
│       ├── 🔧 Typing Components
│       │   └── typing/
│       │       ├── word-display-card.tsx   # Word display for typing
│       │       ├── typing-input.tsx        # Typing input field
│       │       └── typing-feedback.tsx     # Typing accuracy feedback
│       │
│       ├── 🚨 Error Handling
│       │   └── error-boundary/
│       │       ├── error-boundary.tsx      # React error boundaries
│       │       ├── error-fallback.tsx      # Error fallback UI
│       │       └── not-found.tsx          # 404 page component
│       │
│       └── 🔌 Providers
│           └── providers/
│               ├── auth-provider.tsx       # Authentication context
│               ├── settings-provider.tsx   # Settings context
│               └── query-provider.tsx      # React Query setup
│
├── 🎣 Custom Hooks
│   └── hooks/
│       ├── use-auth.ts                     # Authentication hook
│       ├── use-word-detail-modal.ts        # Modal state management
│       ├── use-loading-state.ts            # Loading state management
│       ├── use-offline-status.ts           # PWA offline detection
│       ├── use-predictive-prefetch.ts      # Performance optimization
│       └── queries/                        # React Query hooks
│           ├── use-words.ts               # Word data queries
│           ├── use-collections.ts         # Collection queries
│           ├── use-user-progress.ts       # Progress queries
│           └── use-study-sessions.ts      # Study session queries
│
├── 🔄 State Management
│   └── contexts/
│       ├── collection-context-v2.tsx      # Collection state
│       └── settings-context.tsx           # Global settings
│
├── 🛠️ Utilities & Libraries
│   └── lib/
│       ├── 🔥 Firebase Integration
│       │   └── firebase/
│       │       ├── config.ts              # Firebase configuration
│       │       ├── auth.ts                # Authentication utilities
│       │       ├── firestore-v2.ts        # Firestore helpers
│       │       └── admin.ts               # Admin SDK utilities
│       │
│       ├── 🔌 Data Access Layer
│       │   └── adapters/
│       │       ├── word-adapter.ts         # Legacy word adapter
│       │       ├── word-adapter-unified.ts # New unified adapter
│       │       ├── word-adapter-bridge.ts  # Compatibility bridge
│       │       ├── word-adapter-server.ts  # Server-side adapter
│       │       └── __tests__/             # Adapter unit tests
│       │
│       ├── 💾 Cache Management
│       │   └── cache/
│       │       ├── local-cache-manager.ts  # LocalStorage cache
│       │       ├── memory-cache.ts         # In-memory cache
│       │       └── cache-keys.ts          # Cache key constants
│       │
│       ├── 🧮 Business Logic
│       │   ├── settings/
│       │   │   └── user-settings-service.ts # Settings management
│       │   ├── vocabulary-v2/
│       │   │   └── user-word-service.ts    # User progress service
│       │   └── vocabulary/
│       │       └── vocabulary-pdf-service-v2.ts # PDF processing
│       │
│       ├── 🌐 External APIs
│       │   └── api/
│       │       ├── dictionary-api.ts       # External dictionary APIs
│       │       ├── translation-api.ts      # Translation services
│       │       └── openai-client.ts       # OpenAI integration
│       │
│       ├── 📄 File Processing
│       │   ├── pdf/
│       │   │   ├── pdf-parser.ts          # PDF text extraction
│       │   │   └── simplified-pdf-extractor.ts # Simplified extraction
│       │   └── extraction/
│       │       ├── hybrid-extractor.ts     # Multi-format extraction
│       │       └── pattern-matching.ts     # Content pattern detection
│       │
│       ├── 🧰 Utilities
│       │   └── utils/
│       │       ├── cn.ts                  # className utility
│       │       ├── logger.ts              # Logging system
│       │       ├── validation.ts          # Input validation
│       │       ├── date-helpers.ts        # Date manipulation
│       │       ├── string-helpers.ts      # String utilities
│       │       └── performance.ts         # Performance monitoring
│       │
│       ├── 🔐 Authentication & Security
│       │   └── auth/
│       │       ├── admin.ts               # Admin role management
│       │       ├── permissions.ts         # Permission checks
│       │       └── session-management.ts  # Session handling
│       │
│       └── 🎨 Services
│           └── services/
│               ├── study-service.ts       # Study session management
│               ├── progress-service.ts    # Progress calculation
│               ├── spaced-repetition.ts   # SRS algorithm
│               └── notification-service.ts # Push notifications
│
├── 🏷️ Type Definitions
│   └── types/
│       ├── unified-word.ts               # Core word type definitions
│       ├── unified-word-v3.ts           # V3 unified structure
│       ├── vocabulary-v2.ts             # Legacy vocabulary types
│       ├── user-settings.ts             # Settings type definitions
│       ├── collections.ts               # Collection types
│       ├── unified-wordbook.ts          # Wordbook types
│       ├── extracted-vocabulary.ts      # Extraction types
│       └── api-responses.ts             # API response types
│
├── 🎨 Styling & Assets
│   ├── styles/
│   │   ├── globals.css                  # Global styles
│   │   ├── components.css               # Component-specific styles
│   │   └── utilities.css                # Utility classes
│   │
│   └── public/
│       ├── icons/                       # App icons
│       ├── images/                      # Static images
│       ├── manifest.json                # PWA manifest
│       ├── sw.js                        # Service worker
│       └── offline.html                 # Offline fallback page
│
└── 🔍 Development & Testing
    ├── __tests__/                       # Component tests
    ├── scripts/                         # Utility scripts
    └── docs/                           # Component documentation
```

## 📦 Key Dependencies

### Core Framework
- **Next.js 15**: React framework with App Router
- **React 18**: UI library with concurrent features
- **TypeScript**: Type-safe JavaScript development

### Database & Backend
- **Firebase**: Authentication, Firestore, Cloud Functions
- **Firebase Admin SDK**: Server-side operations

### UI & Styling
- **Tailwind CSS 4.0**: Utility-first CSS framework
- **Radix UI**: Headless UI components
- **Lucide React**: Icon system

### Data Management
- **React Query (TanStack Query)**: Server state management
- **React Context**: Client state management

### Development & Testing
- **ESLint**: Code linting and style enforcement
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing

### AI & External APIs
- **OpenAI API**: GPT-4 integration for word generation
- **Tesseract.js**: OCR for photo vocabulary extraction

## 🗂️ File Organization Patterns

### Component Structure
```typescript
// Component file structure
ComponentName/
├── index.ts              # Export file
├── ComponentName.tsx     # Main component
├── ComponentName.test.tsx # Tests
├── ComponentName.stories.tsx # Storybook stories (if applicable)
└── types.ts             # Component-specific types
```

### Service Layer Pattern
```typescript
// Service file structure
ServiceName/
├── index.ts             # Export file
├── service.ts           # Main service logic
├── types.ts             # Service types
├── utils.ts             # Service utilities
├── __tests__/           # Test directory
└── README.md            # Service documentation
```

### API Route Structure
```typescript
// API route structure
api/
└── feature/
    ├── route.ts         # Main API handler
    ├── [id]/route.ts    # Dynamic route handler
    └── utils.ts         # Route-specific utilities
```

## 🔄 Data Flow Architecture

### Request Flow
```
User Interface
    ↓
React Query Hook
    ↓
WordAdapterBridge
    ↓
UnifiedWordAdapter
    ↓
Firebase Firestore
```

### State Management
```
Firebase Data
    ↓
React Query Cache (5 min)
    ↓
Memory Cache (session)
    ↓
LocalStorage (24 hour)
    ↓
Component State
```

## 📋 Configuration Files Purpose

### Build & Development
- `next.config.ts`: Next.js build and runtime configuration
- `package.json`: Dependencies, scripts, and project metadata
- `tsconfig.json`: TypeScript compiler configuration
- `tailwind.config.ts`: Tailwind CSS customization

### Code Quality
- `.eslintrc.json`: ESLint rules and configuration
- `jest.config.js`: Jest testing framework setup
- `playwright.config.ts`: End-to-end testing configuration

### Firebase
- `firebase.json`: Firebase project configuration
- `firestore.rules`: Database security rules
- `firestore.indexes.json`: Database performance indexes

### Deployment
- `.vercel/`: Vercel deployment configuration
- `.env.local`: Environment variables (local development)
- `.github/`: GitHub Actions workflows

## 🎯 Performance Considerations

### Code Splitting
- **Route-based**: Automatic with Next.js App Router
- **Component-based**: Dynamic imports for large components
- **Library-based**: Separate chunks for large dependencies

### Caching Strategy
- **Static Assets**: CDN caching with Vercel
- **API Responses**: React Query with stale-while-revalidate
- **Database Queries**: Multi-layer caching system
- **Build Output**: Incremental Static Regeneration (ISR)

### Bundle Optimization
- **Tree Shaking**: Automatic dead code elimination
- **Code Minification**: Production build optimization
- **Image Optimization**: Next.js automatic image optimization
- **Font Optimization**: Next.js font loading optimization

## 🔗 Related Documentation

- **[Database Architecture](database.md)** - Database structure and relationships
- **[Current Architecture Status](current-status.md)** - System performance metrics
- **[Development History](../DEVELOPMENT/history.md)** - Project timeline and changes