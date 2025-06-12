# SAT Vocabulary Learning Platform V2

A modern, contextual SAT vocabulary learning platform built with Next.js, Firebase, and TypeScript. This application helps students learn SAT vocabulary through real-world news context and advanced learning algorithms.

## 🚀 Features

- **Contextual Learning**: Learn SAT vocabulary through real news articles
- **Adaptive Difficulty**: AI-powered difficulty adjustment based on performance  
- **Spaced Repetition**: Scientifically-proven learning algorithm
- **Progress Tracking**: Comprehensive analytics and progress visualization
- **Secure & Scalable**: Firebase backend with robust security rules
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
git clone <repository-url>
cd vocabulary-v2
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
# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Build for production
npm run build
\`\`\`

## 📁 Project Structure

\`\`\`
src/
├── app/                    # Next.js App Router pages
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── styles/               # Global styles and Tailwind config
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

### Firebase Emulator (Development)
\`\`\`bash
firebase emulators:start
\`\`\`

### Vercel (Production)
\`\`\`bash
npm run build
vercel deploy
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

---

**Built with ❤️ for SAT preparation success**
