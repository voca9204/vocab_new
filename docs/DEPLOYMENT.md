# Deployment Guide

## Overview

This project uses Vercel for hosting the Next.js application and Firebase for backend services. Deployments can be automated through GitHub integration.

## Deployment Architecture

```
GitHub Repository → GitHub Actions / Vercel Integration → Vercel Hosting
                                                        ↓
                                                    Firebase Services
                                                    (Auth, Firestore, Functions)
```

## Automatic Deployment Setup

### Option 1: Vercel GitHub Integration (Recommended)

1. **Connect GitHub to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com)
   - Select your project
   - Navigate to Settings → Git
   - Connect to `voca9204/vocab_new` repository

2. **Automatic Triggers**:
   - **Production**: Pushes to `main` branch
   - **Preview**: Pull requests
   - **Branch Deployments**: Other branches (optional)

3. **Benefits**:
   - Zero configuration
   - Automatic preview URLs for PRs
   - Built-in rollback functionality
   - Environment variable management in Vercel dashboard

### Option 2: GitHub Actions

If you prefer more control over the deployment process, use the provided GitHub Actions workflows.

#### Required Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

```bash
# Vercel
VERCEL_TOKEN          # Get from https://vercel.com/account/tokens
VERCEL_ORG_ID         # team_bKsPYU9jfI2JvCtdptfYbS2I
VERCEL_PROJECT_ID     # prj_9y70edy1upkm7eWLW5NKC8nUqkJ6

# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

#### Workflows

1. **`.github/workflows/ci.yml`** - Continuous Integration
   - Runs on all pushes and PRs
   - Linting, type checking, and tests
   - Generates test coverage reports

2. **`.github/workflows/deploy.yml`** - Production Deployment
   - Triggers on push to `main` branch
   - Builds and deploys to Vercel production

3. **`.github/workflows/preview.yml`** - Preview Deployments
   - Triggers on pull requests
   - Creates preview deployments
   - Comments PR with preview URL

## Manual Deployment

### Deploy to Production

```bash
# Using Vercel CLI
vercel --prod

# Using npm script (if configured)
npm run deploy
```

### Deploy Preview

```bash
# Deploy to preview environment
vercel
```

### Deploy Specific Branch

```bash
# Deploy from specific branch
vercel --prod --scope=team_bKsPYU9jfI2JvCtdptfYbS2I
```

## Environment Variables

### Vercel Dashboard

Configure these in Vercel Dashboard → Settings → Environment Variables:

**Production & Preview**:
```
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
OPENAI_API_KEY
```

**All Environments** (including Development):
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

### Local Development

Create `.env.local`:
```bash
# Copy from .env.example
cp .env.example .env.local
# Edit with your values
```

## Deployment Checklist

### Pre-deployment

- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Environment variables configured in Vercel
- [ ] Firebase security rules updated if needed

### Post-deployment

- [ ] Verify deployment at production URL
- [ ] Test authentication flow
- [ ] Check Firebase connectivity
- [ ] Monitor error logs in Vercel dashboard
- [ ] Test critical user flows

## Rollback Procedure

### Via Vercel Dashboard

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." menu → "Promote to Production"

### Via CLI

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

## Monitoring

### Vercel Analytics

- Real User Metrics (Web Vitals)
- Function execution logs
- Error tracking

### Firebase Console

- Firestore usage metrics
- Authentication metrics
- Cloud Functions logs

## Troubleshooting

### Build Failures

1. **Missing Environment Variables**
   - Check Vercel dashboard for all required vars
   - Ensure FIREBASE_ADMIN_PRIVATE_KEY is properly formatted

2. **TypeScript Errors**
   - Run `npm run type-check` locally
   - Fix all type errors before pushing

3. **Module Not Found**
   - Clear cache: `rm -rf .next node_modules`
   - Reinstall: `npm install`

### Runtime Errors

1. **Firebase Connection Issues**
   - Verify Firebase Admin SDK credentials
   - Check Firebase project status

2. **API Route Timeouts**
   - Check function duration in vercel.json
   - Optimize long-running operations

## Best Practices

1. **Branch Strategy**
   - `main`: Production-ready code
   - `develop`: Integration branch
   - Feature branches: `feature/description`

2. **Commit Messages**
   - Use conventional commits
   - Examples: `feat:`, `fix:`, `docs:`, `chore:`

3. **Pull Requests**
   - Always create PR for main branch
   - Wait for preview deployment
   - Test preview URL before merging

4. **Secrets Management**
   - Never commit secrets
   - Use environment variables
   - Rotate keys regularly

## Firebase Deployment

While the main app is hosted on Vercel, Firebase services may need separate deployment:

```bash
# Deploy Firestore rules only
firebase deploy --only firestore:rules

# Deploy Cloud Functions only
firebase deploy --only functions

# Deploy everything
firebase deploy
```

## Support

- Vercel Status: https://vercel-status.com
- Firebase Status: https://status.firebase.google.com
- Project Issues: https://github.com/voca9204/vocab_new/issues