# 🚀 Quick Start Guide
*Last Updated: 2025-08-23*

## 🎯 Get Started in 5 Minutes

This guide will help you set up and run the Vocabulary V2 platform for development or testing.

## 📋 Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm or yarn** package manager
- **Firebase CLI** (optional, for emulators)
- **Git** for version control

## ⚡ Quick Setup

### 1. Clone and Install
```bash
git clone https://github.com/voca9204/vocab_new.git
cd vocab_new
npm install
```

### 2. Environment Configuration
Create `.env.local` file in the project root:
```bash
# Firebase Client Configuration (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=vocabulary-app-new.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=vocabulary-app-new
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=vocabulary-app-new.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=203198017310
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (For API routes)
FIREBASE_ADMIN_PROJECT_ID=vocabulary-app-new
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-*@vocabulary-app-new.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# OpenAI API (Optional, for AI features)
OPENAI_API_KEY=sk-your-openai-api-key

# External APIs (Optional)
MERRIAM_WEBSTER_API_KEY=your_key
WORDS_API_KEY=your_key
```

### 3. Start Development Server
```bash
# Option 1: Direct development (uses production Firestore)
npm run dev

# Option 2: With Firebase emulators (deprecated but available)
npm run dev:emulators
```

### 4. Open Application
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 🎮 Essential Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Testing
```bash
npm test             # Run all tests
npm run test:watch   # Watch mode for development
npm run test:coverage # Generate coverage report
```

### Database Operations
```bash
# Firebase emulators (if using)
npm run emulators    # Start Firebase emulator suite

# Database operations (via web interface)
# Navigate to /admin/migrate for database migrations
# Navigate to /admin/collections for collection management
```

## 🌟 First Steps After Setup

### 1. Create Account
- Go to `/login` page
- Sign in with Google
- Your account will be created automatically

### 2. Explore Features
- **Study Modes**: Try `/study/flashcards`, `/study/quiz`, `/study/typing`
- **Word Collections**: Browse `/collections` for official word lists
- **Personal Collections**: Create custom word lists in `/my-collections`
- **Photo Vocabulary**: Upload images to extract words (if OCR is enabled)
- **Settings**: Customize display preferences in `/settings`

### 3. Admin Features (if admin access)
- **Migration Tools**: `/admin/migrate` for database operations
- **Collection Management**: `/admin/collections` for official collections
- **System Status**: Check logs in browser console for system health

## 🔧 Configuration Options

### Firebase Setup
The application uses **production Firestore directly** by default. For local development:

1. **Production Mode** (Recommended):
   - Uses live Firebase project
   - Immediate access to all features
   - Real data for testing

2. **Emulator Mode** (Optional):
   - Local Firebase emulators
   - Isolated testing environment
   - Requires additional setup

### Environment Variables Explained
- **NEXT_PUBLIC_**: Client-side variables (publicly accessible)
- **FIREBASE_ADMIN_**: Server-side admin operations
- **OPENAI_API_KEY**: Required for AI word discovery features
- **External APIs**: Optional for enhanced word definitions

## 🚨 Common Issues & Solutions

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Clear node_modules if persistent issues
rm -rf node_modules package-lock.json
npm install
```

### Firebase Connection Issues
1. **Check Environment Variables**: Ensure all Firebase variables are correctly set
2. **Network Access**: Verify internet connection for production Firestore
3. **API Keys**: Confirm Firebase API keys are valid and have necessary permissions

### Development Server Issues
```bash
# Kill existing processes
lsof -ti:3000 | xargs kill -9  # Kill process on port 3000
npm run dev
```

### Database Issues
1. **Clear Cache**: Visit `/admin/clear-cache` or clear localStorage manually
2. **Check Console**: Browser console shows detailed error information
3. **Migration Status**: Use `/admin/migrate` to check database migration status

## 📚 Next Steps

### For Developers
1. **Read Architecture Docs**: [`docs/ARCHITECTURE/`](../ARCHITECTURE/) for system understanding
2. **Review Code Standards**: Check ESLint rules and TypeScript configuration
3. **Explore Components**: Browse `/src/components/` for reusable components
4. **API Documentation**: Review `/src/app/api/` for available endpoints

### For Users
1. **Study System**: Start with `/study` to begin learning vocabulary
2. **Create Collections**: Build personal word lists for focused study
3. **Track Progress**: Monitor learning progress in study dashboard
4. **Customize Experience**: Adjust settings for optimal learning experience

### For Admins
1. **Collection Management**: Use admin tools to manage official collections
2. **System Monitoring**: Check application logs and performance metrics
3. **User Support**: Help users with account and technical issues
4. **Data Management**: Use migration tools for database maintenance

## 🆘 Getting Help

### Documentation
- **Architecture**: [`docs/ARCHITECTURE/`](../ARCHITECTURE/) - System design and database structure
- **Development History**: [`docs/DEVELOPMENT/`](../DEVELOPMENT/) - Project timeline and changes
- **API Reference**: Browse `/src/app/api/` for endpoint documentation

### Support Channels
- **GitHub Issues**: Create issues for bugs and feature requests
- **Developer Console**: Check browser console for detailed error information
- **Admin Tools**: Use built-in admin interfaces for system management

### Debug Information
Enable debug logging by checking browser console:
- **Word Adapter**: Logs from data access layer
- **Cache System**: Cache hit/miss information
- **Firebase**: Connection and query logs
- **Performance**: Loading times and optimization metrics

---

**🎉 You're ready to start developing! The application should now be running at [http://localhost:3000](http://localhost:3000)**