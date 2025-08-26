# SAT Vocabulary Learning Platform V2 - 프로젝트 문서

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [프로젝트 구조](#프로젝트-구조)
5. [데이터베이스 구조](#데이터베이스-구조)
6. [주요 시스템 아키텍처](#주요-시스템-아키텍처)
7. [개발 가이드](#개발-가이드)
8. [API 엔드포인트](#api-엔드포인트)
9. [배포 및 운영](#배포-및-운영)
10. [문제 해결 가이드](#문제-해결-가이드)

---

## 프로젝트 개요

### 프로젝트 정보
- **이름**: SAT Vocabulary Learning Platform V2
- **버전**: 2.0.0
- **목적**: SAT, TOEFL, GRE 등 표준화 시험 대비 어휘 학습 플랫폼
- **대상**: 영어 시험 준비생, 영어 학습자
- **개발 상태**: Production (50% 완료)

### 핵심 가치
- 🎯 **효율적 학습**: 과학적 반복 학습 알고리즘 (SM-2)
- 📚 **다양한 컨텐츠**: 공식/개인 단어장, AI 생성, 사진 추출
- 🔄 **통합 시스템**: 모든 단어 소스를 하나의 인터페이스로 관리
- 📱 **반응형 디자인**: 모바일/데스크톱 완벽 지원

---

## 주요 기능

### 1. 단어장 관리 시스템
```
📁 통합 단어장 (UnifiedWordbook)
├── 📚 공식 단어장 (Official Collections)
│   ├── SAT (2,106 단어)
│   ├── TOEFL
│   ├── GRE
│   └── 수능
├── 👤 개인 단어장 (Personal Collections)
├── 🤖 AI 생성 단어 (AI-Generated)
└── 📸 사진 추출 단어 (Photo Extracted)
```

### 2. 학습 모드
- **플래시카드**: 카드 넘기기 방식 학습
- **일일학습**: 매일 목표 단어 학습
- **복습**: 스페이스드 리피티션 기반 복습
- **퀴즈**: 객관식 문제 풀이
- **타이핑**: 철자 입력 연습

### 3. 스마트 기능
- **AI 예문 생성**: OpenAI GPT를 활용한 실시간 예문 생성
- **발음 기호**: 자동 발음 기호 추출 및 저장
- **어원 분석**: AI 기반 어원 설명 생성
- **유의어 추천**: 문맥 기반 유의어 자동 생성
- **PDF 추출**: PDF 문서에서 단어 자동 추출
- **사진 OCR**: 사진에서 텍스트 인식 및 단어 추출

### 4. 개인화 기능
- **학습 진도 추적**: 단어별 숙련도 관리
- **사용자 설정**: 일일 목표, 텍스트 크기, 표시 옵션
- **단어장 선택**: 학습할 단어장 자유 선택

---

## 기술 스택

### Frontend
```yaml
Framework: Next.js 15.0.3 (App Router)
Language: TypeScript 5.x
Styling: Tailwind CSS 4.0.0-alpha
UI Components: shadcn/ui + Custom Components
State Management: React Context API
```

### Backend & Database
```yaml
Database: Firebase Firestore
Authentication: Firebase Auth
Storage: Firebase Storage
Functions: Next.js API Routes
Admin SDK: Firebase Admin SDK
```

### AI & External APIs
```yaml
AI: OpenAI GPT-4
Dictionary: Free Dictionary API
OCR: Tesseract.js
PDF: pdf-parse
```

### Development Tools
```yaml
Package Manager: npm
Testing: Jest + React Testing Library
Linting: ESLint
Type Checking: TypeScript
Task Management: TaskMaster AI
Version Control: Git
```

---

## 프로젝트 구조

```
vocabulary-v2/
├── src/
│   ├── app/                  # Next.js App Router 페이지
│   │   ├── (auth)/           # 인증 관련 페이지
│   │   ├── study/            # 학습 페이지
│   │   │   ├── flashcards/   # 플래시카드
│   │   │   ├── daily/        # 일일학습
│   │   │   ├── review/       # 복습
│   │   │   ├── quiz/         # 퀴즈
│   │   │   └── typing/       # 타이핑
│   │   ├── api/              # API 엔드포인트
│   │   └── unified-dashboard/ # 통합 대시보드
│   │
│   ├── components/           # React 컴포넌트
│   │   ├── ui/              # 기본 UI 컴포넌트
│   │   ├── vocabulary/       # 단어 관련 컴포넌트
│   │   ├── wordbook/        # 단어장 관련 컴포넌트
│   │   └── dashboard/       # 대시보드 컴포넌트
│   │
│   ├── lib/                 # 유틸리티 & 서비스
│   │   ├── firebase/        # Firebase 설정 및 서비스
│   │   ├── adapters/        # 데이터 어댑터
│   │   ├── services/        # 비즈니스 로직 서비스
│   │   └── vocabulary-v2/   # V2 단어 서비스
│   │
│   ├── contexts/           # React Context Providers
│   │   └── unified-vocabulary-context.tsx
│   │
│   ├── hooks/             # Custom React Hooks
│   └── types/             # TypeScript 타입 정의
│
├── public/               # 정적 파일
├── docs/                # 프로젝트 문서
└── scripts/             # 유틸리티 스크립트
```

---

## 데이터베이스 구조

### Firestore Collections

#### 1. words (마스터 단어 DB)
```typescript
{
  id: string
  word: string
  pronunciation?: string
  partOfSpeech: string[]
  definitions: Definition[]
  etymology?: string
  realEtymology?: string
  synonyms: string[]
  antonyms: string[]
  difficulty: number (1-10)
  frequency: number
  isSAT: boolean
  examples?: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### 2. vocabulary_collections (공식 단어장)
```typescript
{
  id: string
  name: string
  category: 'SAT' | 'TOEFL' | 'GRE' | '수능' | 'IELTS'
  words: string[]  // word IDs
  isOfficial: boolean
  wordCount: number
  createdAt: Timestamp
}
```

#### 3. personal_collections (개인 단어장)
```typescript
{
  id: string
  userId: string
  name: string
  words: string[]  // word IDs
  isPublic: boolean
  tags: string[]
  createdAt: Timestamp
}
```

#### 4. personal_collection_words (개인 단어장 단어)
```typescript
{
  id: string
  collectionId: string
  word: string
  meaning: string
  partOfSpeech?: string
  examples?: string[]
  synonyms?: string[]
  pronunciation?: string
  etymology?: string
  createdAt: Timestamp
}
```

#### 5. user_words (사용자 학습 기록)
```typescript
{
  userId: string
  wordId: string
  studyStatus: {
    studied: boolean
    masteryLevel: number (0-100)
    totalReviews: number
    correctCount: number
    lastStudied: Timestamp
    nextReviewDate: Timestamp
    streakCount: number
    lastActivity: 'flashcard' | 'quiz' | 'typing' | 'review'
  }
}
```

#### 6. userSettings (사용자 설정)
```typescript
{
  userId: string
  selectedWordbooks: SelectedWordbook[]
  dailyGoal: number
  textSize: 'small' | 'medium' | 'large'
  displayOptions: {
    showSynonyms: boolean
    showAntonyms: boolean
    showEtymology: boolean
    showExamples: boolean
  }
}
```

---

## 주요 시스템 아키텍처

### 1. UnifiedWord 시스템
모든 단어 소스를 통합 관리하는 어댑터 패턴 구현

```typescript
UnifiedWord
├── WordAdapter (데이터 변환)
├── WordAdapterServer (서버사이드)
└── WordAdapterClient (클라이언트사이드)
```

### 2. 학습 알고리즘 (SM-2)
```typescript
// Spaced Repetition 알고리즘
calculateNextReview(quality: number, repetitions: number, interval: number) {
  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easinessFactor)
    repetitions++
  }
  return { interval, repetitions }
}
```

### 3. Context 기반 상태 관리
```typescript
UnifiedVocabularyContext
├── 단어장 관리
├── 단어 로딩
├── 필터링
├── 학습 진도
└── 사용자 설정
```

---

## API 엔드포인트

### 단어 관련
- `POST /api/generate-examples-unified` - AI 예문 생성
- `POST /api/generate-etymology-unified` - 어원 생성
- `POST /api/generate-synonyms` - 유의어 생성
- `POST /api/fetch-save-pronunciation` - 발음 기호 저장
- `POST /api/update-synonyms` - 유의어 업데이트

### 학습 관련
- `POST /api/study-progress` - 학습 진도 저장
- `GET /api/vocabulary/discover` - 단어 검색

### 추출 관련
- `POST /api/pdf-extract` - PDF 단어 추출
- `POST /api/photo-vocabulary/extract` - 사진 단어 추출

### 컬렉션 관련
- `GET /api/collections` - 컬렉션 목록
- `POST /api/collections/create` - 컬렉션 생성

---

## 개발 가이드

### 환경 설정
```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env.local)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
OPENAI_API_KEY=...

# 3. 개발 서버 실행
npm run dev
```

### 코딩 규칙
1. **TypeScript**: Strict mode 활성화, any 타입 금지
2. **컴포넌트**: 함수형 컴포넌트, Hooks 사용
3. **스타일**: Tailwind CSS 클래스 사용
4. **파일 구조**: 기능별 폴더 구분
5. **네이밍**: camelCase (변수/함수), PascalCase (컴포넌트)

### 테스트
```bash
# 단위 테스트
npm test

# 테스트 커버리지
npm run test:coverage

# E2E 테스트
npm run test:e2e
```

---

## 배포 및 운영

### Vercel 배포
```bash
# 프로덕션 빌드
npm run build

# Vercel 배포
vercel --prod
```

### 환경별 설정
- **Development**: 로컬 개발 환경
- **Staging**: 테스트 환경
- **Production**: 실제 서비스 환경

### 모니터링
- **에러 추적**: Sentry (계획)
- **분석**: Google Analytics (계획)
- **성능**: Web Vitals 모니터링

---

## 문제 해결 가이드

### 자주 발생하는 문제

#### 1. 단어장 선택 후 재로그인 시 초기화
**원인**: Context 초기화 로직 문제
**해결**: `hasInitializedRef` 리셋 및 설정 복원 로직 수정

#### 2. 복습 페이지 빈 화면
**원인**: 학습 기록 미저장
**해결**: 플래시카드에서 study-progress API 호출 추가

#### 3. Firebase 인증 오류
**원인**: 환경 변수 미설정
**해결**: `.env.local` 파일 확인 및 Firebase 프로젝트 설정 확인

#### 4. AI 생성 실패
**원인**: OpenAI API 키 문제
**해결**: API 키 유효성 확인 및 사용량 한도 확인

### 디버깅 팁
1. 브라우저 콘솔 로그 확인
2. Next.js 서버 로그 확인
3. Firebase Console에서 데이터 확인
4. Network 탭에서 API 호출 확인

---

## 향후 계획

### 단기 (1-2개월)
- [ ] 오프라인 모드 지원 (PWA)
- [ ] 학습 통계 대시보드 강화
- [ ] 음성 발음 기능
- [ ] 단어장 공유 기능

### 중기 (3-6개월)
- [ ] 모바일 앱 개발 (React Native)
- [ ] AI 기반 개인화 추천
- [ ] 소셜 학습 기능
- [ ] 게임화 요소 추가

### 장기 (6개월+)
- [ ] 다국어 지원
- [ ] 교사용 관리 도구
- [ ] 기업용 B2B 서비스
- [ ] AI 튜터 기능

---

## 기여 가이드

### 기여 방법
1. 이슈 등록 또는 기존 이슈 선택
2. 브랜치 생성 (`feature/기능명`)
3. 코드 작성 및 테스트
4. PR 생성 및 리뷰 요청
5. 머지 및 배포

### 커밋 메시지 규칙
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가
chore: 빌드 및 설정 수정
```

---

## 라이선스
Private Project - All Rights Reserved

---

## 연락처
- **개발자**: Sinclair
- **이메일**: [Contact Email]
- **GitHub**: [Repository URL]

---

*Last Updated: 2025년 1월*