# SAT Vocabulary Learning Platform V2

A modern, contextual SAT vocabulary learning platform built with Next.js 15, Firebase, and TypeScript. This application helps students learn SAT vocabulary through real-world news context and advanced learning algorithms.

**Project Status**: 50% complete (8/16 tasks done)

## 🚀 Features

- **2000+ SAT Vocabulary**: Comprehensive database from V.ZIP 3K and other sources
- **Contextual Learning**: Learn SAT vocabulary through real news articles
- **AI-Powered Features**: Word discovery, etymology generation, synonym suggestions
- **Photo Vocabulary**: Extract and learn words from uploaded photos
- **PDF Extraction**: Import vocabulary from PDF files with AI enhancement
- **Spaced Repetition**: Scientifically-proven learning algorithm
- **Progress Tracking**: Comprehensive analytics and progress visualization
- **Customizable Settings**: Control display of synonyms, antonyms, etymology, examples
- **Modern Tech Stack**: Next.js 15, TypeScript, Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **Backend**: Firebase (Firestore, Authentication, Functions)
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint with TypeScript integration
- **Development**: Firebase Emulator Suite

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Firebase CLI (for emulator)

## 🚀 Getting Started

### 1. Clone and Install

\`\`\`bash
git clone https://github.com/voca9204/vocab_new.git
cd vocab_new
npm install
\`\`\`

### 2. Environment Setup

Create a \`.env.local\` file:

\`\`\`env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Dictionary API Keys
MERRIAM_WEBSTER_API_KEY=your_key
WORDS_API_KEY=your_key
\`\`\`

### 3. Development

\`\`\`bash
# Start development server with Firebase emulators (RECOMMENDED)
npm run dev:emulators

# Start development server only
npm run dev

# Run Firebase emulators only
npm run emulators

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Type checking
npm run type-check

# Build for production
npm run build
\`\`\`

## 📁 Project Structure

\`\`\`
src/
├── app/                    # Next.js App Router pages
│   ├── study/             # Learning pages (flashcards, quiz, list)
│   ├── settings/          # User settings
│   └── admin/             # Admin tools
├── components/            # Reusable UI components
│   ├── ui/                # Base UI components
│   └── vocabulary/        # Vocabulary-specific components
├── contexts/              # React Context providers
├── lib/                   # Utility functions and configurations
│   ├── api/               # API service layers
│   ├── firebase/          # Firebase configuration
│   └── vocabulary/        # Vocabulary services
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript type definitions
\`\`\`

## 🧪 Testing

This project uses Jest and React Testing Library for testing:

\`\`\`bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
\`\`\`

## 📖 Development Guidelines

### Code Quality
- Maximum 1500 lines per file
- Maximum 5 props per component  
- Maximum cyclomatic complexity of 10
- 80% test coverage required

### TypeScript
- Strict mode enabled
- No \`any\` types allowed
- Explicit return types for functions

### Security
- Firebase Security Rules enforced
- Input validation on all forms
- API key protection via environment variables

## 🚀 Deployment

### Vercel (Primary Hosting)
\`\`\`bash
npm run build
vercel           # Deploy to preview
vercel --prod    # Deploy to production
\`\`\`

### Firebase Services
\`\`\`bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions
\`\`\`

## 📊 Monitoring

- Performance: Core Web Vitals tracking
- Errors: Error boundary and logging
- Analytics: User engagement metrics
- Security: Regular security audits

## 🤝 Contributing

1. Follow TypeScript and ESLint rules
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commit messages

## 📄 License

This project is proprietary and confidential.

## 📚 Documentation

### 🔥 Essential Reading
- **[Quick Start Guide](docs/GUIDES/quick-start.md)** - Get running in 5 minutes
- **[CLAUDE.md](CLAUDE.md)** - Claude Code development instructions
- **[Architecture Status](docs/ARCHITECTURE/current-status.md)** - Current system status and metrics

### 📖 Complete Documentation
- **[Architecture](docs/ARCHITECTURE/)** - System design, database structure, project organization
- **[Development](docs/DEVELOPMENT/)** - Development history, migration logs, and timeline
- **[Guides](docs/GUIDES/)** - Developer and user guides
- **[Reference](docs/REFERENCE/)** - API documentation and technical references

### 📋 Quick Links
- [Database Schema](docs/ARCHITECTURE/database.md) - Complete database structure
- [Development Timeline](docs/DEVELOPMENT/history.md) - Project history and milestones
- [Project Structure](docs/ARCHITECTURE/project-structure.md) - Detailed codebase organization

---

**Built with ❤️ for SAT preparation success**

*Documentation last organized: 2025-08-23*
