# 📁 SAT Vocabulary Learning Platform V2 - 프로젝트 구조

**마지막 업데이트**: 2025-06-12  
**주요 변경**: V2 새 프로젝트 생성, Next.js 15 + TypeScript 구조, Firebase Emulator 기반

## 🌳 전체 프로젝트 구조

```
vocabulary-v2/
├── 📁 public/                    # 정적 파일 (Next.js)
├── 📁 src/                       # 소스 코드 (App Router)
│   ├── 📁 app/                   # Next.js App Router 페이지
│   ├── 📁 components/            # React 컴포넌트
│   ├── 📁 lib/                   # 라이브러리 및 유틸리티
│   ├── 📁 hooks/                 # Custom React Hooks
│   ├── 📁 types/                 # TypeScript 타입 정의
│   └── 📁 styles/                # 글로벌 스타일
├── 📁 .taskmaster/               # TaskMaster 설정 (15개 Tasks)
├── 📁 firebase/                  # Firebase 설정 및 규칙 (예정)
├── claude_context.md            # 프로젝트 V2 현황 요약
├── structure.md                 # 프로젝트 구조 (이 파일)
├── FILE_MAP.md                  # 파일 맵
├── README.md                    # 프로젝트 설명
├── package.json                # 의존성 관리
├── next.config.ts              # Next.js 설정
├── tailwind.config.ts          # Tailwind CSS 설정
├── tsconfig.json               # TypeScript 설정
├── jest.config.js              # Jest 테스트 설정
├── eslint.config.mjs           # ESLint 설정
└── firebase.json               # Firebase 설정 (예정)
```

## 📂 상세 디렉토리 구조

### 🎨 `/src/app/` - Next.js App Router
```
app/
├── layout.tsx                  # Root 레이아웃
├── page.tsx                    # 홈페이지
├── globals.css                 # 글로벌 스타일
├── 📁 (auth)/                  # 인증 관련 페이지
│   ├── login/
│   │   └── page.tsx            # 로그인 페이지
│   ├── register/
│   │   └── page.tsx            # 회원가입 페이지
│   └── layout.tsx              # 인증 레이아웃
├── 📁 dashboard/               # 대시보드
│   ├── page.tsx                # 메인 대시보드
│   ├── vocabulary/
│   │   └── page.tsx            # 어휘 관리
│   ├── quiz/
│   │   └── page.tsx            # 퀴즈 페이지
│   ├── progress/
│   │   └── page.tsx            # 진도 추적
│   └── layout.tsx              # 대시보드 레이아웃
├── 📁 learn/                   # 학습 페이지
│   ├── vocabulary/
│   │   └── page.tsx            # 어휘 학습
│   ├── news/
│   │   └── page.tsx            # 뉴스 기반 학습
│   ├── quiz/
│   │   └── page.tsx            # 퀴즈 시스템
│   └── layout.tsx              # 학습 레이아웃
├── 📁 admin/                   # 관리자 페이지 (예정)
│   ├── dashboard/
│   ├── vocabulary/
│   └── analytics/
└── 📁 api/                     # API 라우트
    ├── auth/
    ├── vocabulary/
    ├── news/
    └── analytics/
```

### 🧱 `/src/components/` - UI 컴포넌트
```
components/
├── 📁 ui/                      # 기본 UI 컴포넌트
│   ├── button.tsx              # 버튼 컴포넌트
│   ├── input.tsx               # 입력 컴포넌트
│   ├── modal.tsx               # 모달 컴포넌트
│   ├── card.tsx                # 카드 컴포넌트
│   ├── loading-spinner.tsx     # 로딩 스피너
│   ├── progress-bar.tsx        # 진도 바
│   └── index.ts                # 컴포넌트 export
├── 📁 forms/                   # 폼 컴포넌트
│   ├── auth-form.tsx           # 인증 폼
│   ├── vocabulary-form.tsx     # 어휘 입력 폼
│   ├── quiz-form.tsx           # 퀴즈 폼
│   └── search-form.tsx         # 검색 폼
├── 📁 vocabulary/              # 어휘 관련 컴포넌트
│   ├── vocabulary-card.tsx     # 어휘 카드
│   ├── vocabulary-list.tsx     # 어휘 목록
│   ├── word-detail.tsx         # 단어 상세
│   ├── pronunciation.tsx       # 발음 컴포넌트
│   └── definition-list.tsx     # 정의 목록
├── 📁 quiz/                    # 퀴즈 컴포넌트
│   ├── multiple-choice.tsx     # 객관식 문제
│   ├── fill-blank.tsx          # 빈칸 채우기
│   ├── contextual-quiz.tsx     # 맥락 퀴즈
│   ├── quiz-results.tsx        # 퀴즈 결과
│   └── quiz-progress.tsx       # 퀴즈 진도
├── 📁 news/                    # 뉴스 관련 컴포넌트
│   ├── news-article.tsx        # 뉴스 기사
│   ├── highlighted-text.tsx    # 하이라이트된 텍스트
│   ├── word-tooltip.tsx        # 단어 툴팁
│   └── reading-progress.tsx    # 읽기 진도
├── 📁 analytics/               # 분석 컴포넌트
│   ├── progress-chart.tsx      # 진도 차트
│   ├── performance-stats.tsx   # 성능 통계
│   ├── learning-streak.tsx     # 학습 연속 기록
│   └── achievement-badge.tsx   # 성취 배지
├── 📁 layout/                  # 레이아웃 컴포넌트
│   ├── header.tsx              # 헤더
│   ├── navigation.tsx          # 네비게이션
│   ├── sidebar.tsx             # 사이드바
│   ├── footer.tsx              # 푸터
│   └── breadcrumb.tsx          # 브레드크럼
└── 📁 providers/               # Context Providers
    ├── auth-provider.tsx       # 인증 프로바이더
    ├── vocabulary-provider.tsx # 어휘 프로바이더
    ├── theme-provider.tsx      # 테마 프로바이더
    └── app-providers.tsx       # 앱 프로바이더 통합
```

### 🛠️ `/src/lib/` - 라이브러리 및 유틸리티
```
lib/
├── 📄 constants.ts             # 앱 상수 ✅
├── 📄 utils.ts                 # 유틸리티 함수 ✅
├── 📄 validations.ts           # 폼 검증 스키마 (예정)
├── 📁 firebase/                # Firebase 관련 (예정)
│   ├── config.ts               # Firebase 설정
│   ├── auth.ts                 # 인증 함수
│   ├── firestore.ts            # Firestore 함수
│   ├── security-rules.ts       # 보안 규칙
│   └── emulator.ts             # Emulator 설정
├── 📁 api/                     # API 클라이언트 (예정)
│   ├── dictionary.ts           # Dictionary API
│   ├── news.ts                 # News API
│   ├── vocabulary.ts           # 어휘 API
│   └── analytics.ts            # 분석 API
├── 📁 algorithms/              # 학습 알고리즘 (예정)
│   ├── spaced-repetition.ts    # 간격 반복
│   ├── adaptive-difficulty.ts  # 적응형 난이도
│   ├── progress-tracking.ts    # 진도 추적
│   └── recommendation.ts       # 추천 시스템
└── 📁 __tests__/               # 라이브러리 테스트
    └── utils.test.ts           # 유틸리티 테스트 ✅
```

### 🎯 `/src/hooks/` - Custom React Hooks
```
hooks/
├── 📄 use-auth.ts              # 인증 Hook (예정)
├── 📄 use-vocabulary.ts        # 어휘 Hook (예정)
├── 📄 use-quiz.ts              # 퀴즈 Hook (예정)
├── 📄 use-progress.ts          # 진도 Hook (예정)
├── 📄 use-news.ts              # 뉴스 Hook (예정)
├── 📄 use-local-storage.ts     # 로컬 스토리지 Hook (예정)
├── 📄 use-debounce.ts          # 디바운스 Hook (예정)
└── 📄 use-firebase.ts          # Firebase Hook (예정)
```

### 📊 `/src/types/` - TypeScript 타입 정의
```
types/
├── 📄 index.ts                 # 전역 타입 ✅
├── 📄 auth.ts                  # 인증 타입 (예정)
├── 📄 vocabulary.ts            # 어휘 타입 (예정)
├── 📄 quiz.ts                  # 퀴즈 타입 (예정)
├── 📄 news.ts                  # 뉴스 타입 (예정)
├── 📄 analytics.ts             # 분석 타입 (예정)
└── 📄 api.ts                   # API 응답 타입 (예정)
```

### 🎨 `/src/styles/` - 스타일 관련
```
styles/
├── 📄 globals.css              # 글로벌 스타일 (예정)
├── 📄 components.css           # 컴포넌트 스타일 (예정)
├── 📄 tailwind.css             # Tailwind 확장 (예정)
└── 📄 print.css                # 인쇄 스타일 (예정)
```

## 🏗️ 아키텍처 패턴 (V2)

### 📋 **Next.js App Router 구조**
```
App
├── RootLayout
│   ├── AppProviders
│   │   ├── AuthProvider
│   │   ├── VocabularyProvider
│   │   └── ThemeProvider
│   ├── Header
│   │   ├── Navigation
│   │   └── UserMenu
│   ├── Main Content
│   │   ├── Page Components
│   │   └── Dynamic Routes
│   └── Footer
└── ErrorBoundary
```

### 🔄 **데이터 흐름 (V2)**
```
External APIs → API Routes → Firebase → React Context → Components
     ↓              ↓           ↓           ↓            ↓
- Dictionary   - Next.js API  - Firestore  - Global     - UI Rendering
- News APIs    - Server Side  - Auth       - State      - User Interaction
- Firebase     - Edge Funcs   - Functions  - Actions    - Event Handling
```

### 🗃️ **Firebase Firestore 구조 (V2)**

**개발 환경: Firebase Emulator**
```
🔥 Firestore Collections (Emulator)
├── users/                      # 사용자 프로필
│   ├── {userId}/
│   │   ├── profile: UserProfile
│   │   ├── preferences: Settings
│   │   ├── progress: ProgressData
│   │   └── achievements: Achievement[]
├── vocabulary/                 # SAT 어휘 데이터베이스
│   ├── {wordId}/
│   │   ├── word: string
│   │   ├── definitions: Definition[]
│   │   ├── examples: string[]
│   │   ├── partOfSpeech: string[]
│   │   ├── difficulty: number (1-10)
│   │   ├── frequency: number (1-10)
│   │   ├── satLevel: boolean
│   │   ├── pronunciation: string
│   │   ├── etymology: Etymology
│   │   ├── categories: string[]
│   │   ├── sources: string[]
│   │   ├── apiSource: string
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│   │   └── metadata: LearningMetadata
├── news/                       # 뉴스 기사 데이터
│   ├── {articleId}/
│   │   ├── title: string
│   │   ├── content: string
│   │   ├── url: string
│   │   ├── source: string
│   │   ├── publishedAt: timestamp
│   │   ├── processedAt: timestamp
│   │   ├── satWords: string[]
│   │   └── difficulty: number
├── progress/                   # 학습 진도 추적
│   ├── {userId}/
│   │   └── words/
│   │       └── {wordId}/
│   │           ├── attempts: number
│   │           ├── correct: number
│   │           ├── masteryLevel: number
│   │           ├── lastStudied: timestamp
│   │           └── nextReview: timestamp
└── analytics/                  # 사용 분석 데이터
    ├── daily/
    ├── weekly/
    └── monthly/

목표: 2000+ SAT 단어 저장
```

**보안 규칙 (Firebase Security Rules)**
```javascript
// 예정: 엄격한 보안 규칙 적용
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 데이터: 본인만 접근
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 어휘 데이터: 읽기 전용 (인증된 사용자)
    match /vocabulary/{wordId} {
      allow read: if request.auth != null;
      allow write: if false; // 관리자만 가능
    }
    
    // 진도 데이터: 본인만 접근
    match /progress/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🔄 V1 vs V2 구조 비교

### 🔄 **V1 구조** (백업됨)
```
vocabulary/ (Vite + React)
├── src/
│   ├── components/            # React 컴포넌트
│   ├── pages/                 # 페이지 컴포넌트
│   ├── contexts/              # Context API
│   ├── services/              # API 서비스
│   ├── utils/                 # 유틸리티
│   ├── data/                  # 하드코딩 데이터
│   └── config/                # 설정
└── .taskmaster/              # 21개 Tasks
```

### 🆕 **V2 구조** (현재)
```
vocabulary-v2/ (Next.js + TypeScript)
├── src/
│   ├── app/                   # App Router 페이지
│   ├── components/            # TypeScript 컴포넌트
│   ├── lib/                   # 라이브러리 함수
│   ├── hooks/                 # Custom Hooks
│   ├── types/                 # TypeScript 타입
│   └── styles/                # Tailwind 스타일
├── firebase/                  # Firebase 설정
└── .taskmaster/              # 15개 Tasks
```

## 📋 TaskMaster 관리 구조 (V2)
```
.taskmaster/
├── tasks/
│   └── tasks.json              # 15개 Tasks 관리
├── reports/
│   └── task-complexity-report.json # 복잡도 분석
└── docs/
    └── prd.txt                 # V2 PRD 문서

V2 Tasks 현황:
├── ✅ 완료 (1개): Task 1 (Next.js 설정)
├── 🔄 대기 (14개): Tasks 2-15
└── 🎯 우선순위: Firebase 설정 → SAT 어휘 → 뉴스 크롤링
```

## 📁 핵심 파일 설명 (V2)

### 🎯 **주요 엔트리 포인트**
- `src/app/layout.tsx` - Root 레이아웃 및 프로바이더
- `src/app/page.tsx` - 홈페이지 컴포넌트
- `src/lib/constants.ts` - 앱 전역 상수 ✅
- `src/types/index.ts` - 전역 TypeScript 타입 ✅

### 📊 **설정 파일들**
- `next.config.ts` - Next.js 설정
- `tailwind.config.ts` - Tailwind CSS 설정
- `tsconfig.json` - TypeScript 설정 (strict mode)
- `eslint.config.mjs` - ESLint 규칙 (엄격한 설정)
- `jest.config.js` - Jest 테스트 설정 ✅

### 🔧 **Firebase 관련** (예정)
- `firebase.json` - Firebase 프로젝트 설정
- `src/lib/firebase/config.ts` - Firebase 초기화
- `src/lib/firebase/emulator.ts` - Emulator 설정
- `firestore.rules` - Firestore 보안 규칙

### 🎨 **UI 및 스타일**
- `src/app/globals.css` - 글로벌 스타일
- `src/components/ui/` - 재사용 가능한 UI 컴포넌트
- `src/lib/utils.ts` - cn() 함수 등 유틸리티 ✅

## 🔧 개발 환경 구조 (V2)

### 📦 **빌드 도구**
- **Next.js 15** - App Router + Server Components
- **TypeScript** - Strict mode 타입 검사
- **Tailwind CSS 4.0** - 유틸리티 퍼스트 CSS

### 🎯 **상태 관리**
- **React Context** - 전역 상태 (V1 경험 활용)
- **Server State** - TanStack Query (예정)
- **Local State** - useState + useReducer

### 🔌 **API 통합** (예정)
- **Dictionary APIs**: Free Dictionary, Merriam-Webster, Words API
- **News APIs**: RSS feeds, News aggregators
- **Firebase APIs**: Firestore, Authentication, Functions
- **Next.js API Routes**: Server-side processing

### 🧪 **테스팅**
- **Jest** - 단위 테스트 프레임워크 ✅
- **React Testing Library** - 컴포넌트 테스트 ✅
- **Coverage**: 80% 목표 설정 ✅
- **E2E**: Playwright (예정)

## 📈 확장성 고려사항 (V2)

### 🚀 **확장 가능한 구조**
- **App Router**: 페이지 기반 자동 라우팅
- **Server Components**: 성능 최적화
- **API Routes**: Backend 로직 분리
- **TypeScript**: 컴파일 타임 오류 검출

### 🔄 **유지보수성**
- **일관된 명명**: kebab-case 파일, PascalCase 컴포넌트
- **모듈화 구조**: 기능별 디렉토리 분리
- **타입 안전성**: 엄격한 TypeScript 설정
- **코드 품질**: ESLint + Prettier 자동화

### 🛡️ **보안 고려사항**
- **Firebase Security Rules**: 엄격한 데이터 접근 제어
- **Environment Variables**: API 키 보안 관리
- **Input Validation**: Zod 스키마 검증 (예정)
- **XSS Protection**: 입력 데이터 sanitization

이 V2 구조는 **안정성, 확장성, 보안성**을 우선으로 설계되었으며, **2000개 이상의 SAT 단어와 뉴스 기반 맥락 학습**을 효율적으로 지원합니다.
