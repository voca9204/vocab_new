# 📄 SAT Vocabulary Learning Platform V2 - 파일 맵

**마지막 업데이트**: 2025-06-12  
**총 파일 수**: 30+ 파일 (V2 신규 생성)  
**프로젝트 루트**: `/users/voca/projects/vocabulary-v2`

## 🎯 핵심 파일 Quick Access

### 📊 **프로젝트 현황 & 관리**
- `claude_context.md` - **📋 V2 프로젝트 현재 상황 요약** ⭐
- `structure.md` - **🏗️ V2 프로젝트 구조 가이드** ⭐
- `FILE_MAP.md` - **📄 이 파일 (V2 파일 맵)** ⭐
- `.taskmaster/tasks/tasks.json` - **📋 15개 Tasks 관리** ⭐

### 🔥 **가장 중요한 파일들**
- `src/types/index.ts` - **📚 전역 TypeScript 타입 정의**
- `src/lib/constants.ts` - **🔗 앱 전역 상수 및 설정**
- `src/lib/utils.ts` - **🛠️ 유틸리티 함수**
- `package.json` - **📦 프로젝트 의존성 관리**

---

## 📁 전체 파일 목록

### 🌳 **루트 디렉토리**
```
/users/voca/projects/vocabulary-v2/
├── 📋 claude_context.md        # V2 프로젝트 현황 요약
├── 📋 structure.md             # V2 프로젝트 구조
├── 📋 FILE_MAP.md              # V2 파일 맵 (이 파일)
├── 📋 README.md                # V2 프로젝트 설명
├── ⚙️ package.json             # 의존성 관리 (Next.js 15 + Firebase)
├── ⚙️ next.config.ts           # Next.js 설정
├── ⚙️ tailwind.config.ts       # Tailwind CSS 설정
├── ⚙️ tsconfig.json            # TypeScript 설정 (strict mode)
├── ⚙️ jest.config.js           # Jest 테스트 설정
├── ⚙️ jest.setup.js            # Jest 초기화 설정
├── ⚙️ eslint.config.mjs        # ESLint 설정
├── ⚙️ postcss.config.mjs       # PostCSS 설정
├── 📊 .gitignore               # Git 무시 파일
├── 📊 .env.local               # 환경 변수 (생성 예정)
└── 📊 next-env.d.ts            # Next.js TypeScript 정의
```

### 📁 **TaskMaster 관리** (`.taskmaster/`)
```
.taskmaster/
├── tasks/
│   └── 📋 tasks.json           # 15개 Tasks & Subtasks 관리
├── reports/
│   └── 📊 task-complexity-report.json # 복잡도 분석 (예정)
└── docs/
    └── 📄 prd.txt              # V2 PRD 문서
```

### 📁 **소스 코드** (`src/`)

#### 🎯 **Next.js App Router** (`src/app/`)
```
app/
├── 🚀 layout.tsx               # Root 레이아웃 (예정)
├── 🚀 page.tsx                 # 홈페이지 (예정)
├── 🎨 globals.css              # 글로벌 스타일 (예정)
├── 📁 (auth)/                  # 인증 그룹 라우트 (예정)
│   ├── login/
│   │   └── page.tsx            # 로그인 페이지
│   ├── register/
│   │   └── page.tsx            # 회원가입 페이지
│   └── layout.tsx              # 인증 레이아웃
├── 📁 dashboard/               # 대시보드 라우트 (예정)
│   ├── page.tsx                # 대시보드 메인
│   ├── vocabulary/
│   ├── quiz/
│   ├── progress/
│   └── layout.tsx
├── 📁 learn/                   # 학습 라우트 (예정)
│   ├── vocabulary/
│   ├── news/
│   ├── quiz/
│   └── layout.tsx
└── 📁 api/                     # API 라우트 (예정)
    ├── auth/
    ├── vocabulary/
    ├── news/
    └── analytics/
```

#### 🧱 **UI 컴포넌트** (`src/components/`)
```
components/
├── 📁 ui/                      # 기본 UI 컴포넌트 (예정)
│   ├── 🔲 button.tsx           # 버튼 컴포넌트
│   ├── 📝 input.tsx            # 입력 컴포넌트
│   ├── 🔲 modal.tsx            # 모달 컴포넌트
│   ├── 🔲 card.tsx             # 카드 컴포넌트
│   ├── ⏳ loading-spinner.tsx  # 로딩 스피너
│   ├── 📊 progress-bar.tsx     # 진도 바
│   └── 📄 index.ts             # 컴포넌트 export
├── 📁 forms/                   # 폼 컴포넌트 (예정)
│   ├── 🔐 auth-form.tsx        # 인증 폼
│   ├── 📚 vocabulary-form.tsx  # 어휘 입력 폼
│   ├── 🎯 quiz-form.tsx        # 퀴즈 폼
│   └── 🔍 search-form.tsx      # 검색 폼
├── 📁 vocabulary/              # 어휘 관련 컴포넌트 (예정)
│   ├── 📋 vocabulary-card.tsx  # 어휘 카드
│   ├── 📋 vocabulary-list.tsx  # 어휘 목록
│   ├── 📖 word-detail.tsx      # 단어 상세
│   ├── 🔊 pronunciation.tsx    # 발음 컴포넌트
│   └── 📝 definition-list.tsx  # 정의 목록
├── 📁 quiz/                    # 퀴즈 컴포넌트 (예정)
│   ├── ❓ multiple-choice.tsx  # 객관식 문제
│   ├── ✏️ fill-blank.tsx      # 빈칸 채우기
│   ├── 📰 contextual-quiz.tsx  # 맥락 퀴즈
│   ├── 📊 quiz-results.tsx     # 퀴즈 결과
│   └── 📈 quiz-progress.tsx    # 퀴즈 진도
├── 📁 news/                    # 뉴스 관련 컴포넌트 (예정)
│   ├── 📰 news-article.tsx     # 뉴스 기사
│   ├── 🎨 highlighted-text.tsx # 하이라이트된 텍스트
│   ├── 💬 word-tooltip.tsx     # 단어 툴팁
│   └── 📊 reading-progress.tsx # 읽기 진도
├── 📁 analytics/               # 분석 컴포넌트 (예정)
│   ├── 📈 progress-chart.tsx   # 진도 차트
│   ├── 📊 performance-stats.tsx # 성능 통계
│   ├── 🔥 learning-streak.tsx  # 학습 연속 기록
│   └── 🏆 achievement-badge.tsx # 성취 배지
├── 📁 layout/                  # 레이아웃 컴포넌트 (예정)
│   ├── 📌 header.tsx           # 헤더
│   ├── 🧭 navigation.tsx       # 네비게이션
│   ├── 📂 sidebar.tsx          # 사이드바
│   ├── 📌 footer.tsx           # 푸터
│   └── 🍞 breadcrumb.tsx       # 브레드크럼
└── 📁 providers/               # Context Providers (예정)
    ├── 🔐 auth-provider.tsx    # 인증 프로바이더
    ├── 📚 vocabulary-provider.tsx # 어휘 프로바이더
    ├── 🎨 theme-provider.tsx   # 테마 프로바이더
    └── 🏠 app-providers.tsx    # 앱 프로바이더 통합
```

#### 🛠️ **라이브러리 & 유틸리티** (`src/lib/`)
```
lib/
├── 📄 constants.ts             # 앱 전역 상수 ✅
├── 📄 utils.ts                 # 유틸리티 함수 ✅
├── 📄 validations.ts           # 폼 검증 스키마 (예정)
├── 📁 firebase/                # Firebase 관련 (예정)
│   ├── ⚙️ config.ts            # Firebase 설정
│   ├── 🔐 auth.ts              # 인증 함수
│   ├── 🗃️ firestore.ts         # Firestore 함수
│   ├── 🛡️ security-rules.ts    # 보안 규칙
│   └── 🧪 emulator.ts          # Emulator 설정
├── 📁 api/                     # API 클라이언트 (예정)
│   ├── 📖 dictionary.ts        # Dictionary API
│   ├── 📰 news.ts              # News API
│   ├── 📚 vocabulary.ts        # 어휘 API
│   └── 📊 analytics.ts         # 분석 API
├── 📁 algorithms/              # 학습 알고리즘 (예정)
│   ├── ⏰ spaced-repetition.ts # 간격 반복
│   ├── 🎯 adaptive-difficulty.ts # 적응형 난이도
│   ├── 📈 progress-tracking.ts # 진도 추적
│   └── 💡 recommendation.ts    # 추천 시스템
└── 📁 __tests__/               # 라이브러리 테스트
    └── 🧪 utils.test.ts        # 유틸리티 테스트 ✅
```

#### 🎯 **Custom Hooks** (`src/hooks/`)
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

#### 📊 **TypeScript 타입** (`src/types/`)
```
types/
├── 📄 index.ts                 # 전역 타입 정의 ✅
├── 📄 auth.ts                  # 인증 타입 (예정)
├── 📄 vocabulary.ts            # 어휘 타입 (예정)
├── 📄 quiz.ts                  # 퀴즈 타입 (예정)
├── 📄 news.ts                  # 뉴스 타입 (예정)
├── 📄 analytics.ts             # 분석 타입 (예정)
└── 📄 api.ts                   # API 응답 타입 (예정)
```

#### 🎨 **스타일** (`src/styles/`)
```
styles/
├── 📄 globals.css              # 글로벌 스타일 (예정)
├── 📄 components.css           # 컴포넌트 스타일 (예정)
├── 📄 tailwind.css             # Tailwind 확장 (예정)
└── 📄 print.css                # 인쇄 스타일 (예정)
```

### 📁 **정적 파일** (`public/`)
```
public/
├── 📄 next.svg                 # Next.js 로고
├── 📄 vercel.svg               # Vercel 로고
├── 📱 favicon.ico              # 파비콘
├── 📱 manifest.json            # PWA 매니페스트 (예정)
├── 🔧 sw.js                    # 서비스 워커 (예정)
├── 🖼️ icons/                   # 아이콘 폴더 (예정)
└── 🖼️ images/                  # 이미지 폴더 (예정)
```

### 📁 **Firebase 설정** (`firebase/`) - 예정
```
firebase/
├── 📄 firebase.json            # Firebase 프로젝트 설정
├── 📄 firestore.rules          # Firestore 보안 규칙
├── 📄 firestore.indexes.json   # Firestore 인덱스
├── 📁 functions/               # Firebase Functions
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── 📁 emulators/               # Emulator 데이터
```

---

## 🔍 파일별 중요도 및 설명

### ⭐⭐⭐ **최고 중요도** (현재 존재)
| 파일 | 설명 | 상태 |
|------|------|------|
| `src/types/index.ts` | **전역 TypeScript 타입 정의** | ✅ 생성 완료 |
| `src/lib/constants.ts` | **앱 전역 상수 및 설정** | ✅ 생성 완료 |
| `src/lib/utils.ts` | **핵심 유틸리티 함수** | ✅ 생성 완료 |
| `package.json` | **프로젝트 의존성 관리** | ✅ 설정 완료 |

### ⭐⭐ **고중요도** (다음 생성 예정)
| 파일 | 설명 | 우선순위 |
|------|------|----------|
| `src/lib/firebase/config.ts` | **Firebase 초기화 설정** | Task 2 |
| `src/lib/firebase/emulator.ts` | **Emulator 설정** | Task 2 |
| `firebase.json` | **Firebase 프로젝트 설정** | Task 2 |
| `src/app/layout.tsx` | **Root 레이아웃** | Task 4 |

### ⭐ **중요도** (계획됨)
| 파일 | 설명 | 관련 Task |
|------|------|-----------|
| `src/lib/api/vocabulary.ts` | **어휘 API 클라이언트** | Task 6 |
| `src/components/vocabulary/vocabulary-card.tsx` | **어휘 카드 컴포넌트** | Task 4 |
| `src/lib/api/news.ts` | **뉴스 API 클라이언트** | Task 10 |
| `src/hooks/use-vocabulary.ts` | **어휘 관리 Hook** | Task 7 |

---

## 🔄 최근 변경된 파일들

### 📅 **2025-06-12 변경사항 (V2 프로젝트 생성)**

**🆕 새로 생성된 파일:**
- `src/types/index.ts` - 전역 TypeScript 타입 정의 (User, VocabularyWord 등)
- `src/lib/constants.ts` - 앱 전역 상수 (API endpoints, Firebase collections 등)
- `src/lib/utils.ts` - 유틸리티 함수 (cn, formatDate, calculateReadingTime 등)
- `src/lib/__tests__/utils.test.ts` - 유틸리티 함수 테스트 (6개 테스트 통과)
- `jest.config.js` - Jest 테스트 설정
- `jest.setup.js` - Jest 초기화 설정
- `eslint.config.mjs` - ESLint 설정 (TypeScript 엄격 모드)

**📝 자동 생성된 파일 (Next.js):**
- `package.json` - Next.js 15 + TypeScript + Firebase 의존성
- `next.config.ts` - Next.js 설정
- `tailwind.config.ts` - Tailwind CSS 설정
- `tsconfig.json` - TypeScript strict mode 설정
- `postcss.config.mjs` - PostCSS 설정

**🔧 설정 완료:**
- ✅ 테스트 환경: Jest + React Testing Library
- ✅ 코드 품질: ESLint + TypeScript strict
- ✅ 스타일링: Tailwind CSS 4.0
- ✅ 의존성: Firebase v11.9.1, clsx, tailwind-merge

---

## 🎯 다음 주요 파일 생성 예정

### 🔥 **Task 2 - Firebase & Emulator Suite**
- `src/lib/firebase/config.ts` (Firebase 초기화)
- `src/lib/firebase/emulator.ts` (Emulator 설정)
- `firebase.json` (Firebase 프로젝트 설정)
- `firestore.rules` (보안 규칙)
- `.env.local` (환경 변수)

### 🏗️ **Task 4 - Core UI Components**
- `src/app/layout.tsx` (Root 레이아웃)
- `src/app/page.tsx` (홈페이지)
- `src/components/ui/button.tsx` (버튼 컴포넌트)
- `src/components/ui/input.tsx` (입력 컴포넌트)
- `src/components/ui/card.tsx` (카드 컴포넌트)

### 📚 **Task 5 - SAT Vocabulary Database**
- `src/lib/api/vocabulary.ts` (어휘 API)
- `src/hooks/use-vocabulary.ts` (어휘 Hook)
- `src/components/vocabulary/vocabulary-card.tsx` (어휘 카드)
- Firestore collection: `/vocabulary/{wordId}` (2000+ 단어)

### 📰 **Task 10 - News System**
- `src/lib/api/news.ts` (뉴스 API)
- `src/components/news/news-article.tsx` (뉴스 기사)
- `src/components/news/highlighted-text.tsx` (단어 하이라이팅)

---

## 💡 파일 탐색 팁

### 🔍 **빠른 검색 패턴**
```bash
# TypeScript 파일 검색
find src/ -name "*.ts" -o -name "*.tsx"

# 컴포넌트 검색
find src/components/ -name "*.tsx"

# 라이브러리 검색
find src/lib/ -name "*.ts"

# 타입 정의 검색
find src/types/ -name "*.ts"

# 테스트 파일 검색
find src/ -name "*.test.ts" -o -name "*.test.tsx"
```

### 📋 **TaskMaster 명령어**
```bash
tm get-tasks              # 전체 Tasks 확인
tm get-task 2            # Task 2 상세 정보 (Firebase 설정)
tm next-task             # 다음 우선순위 확인
tm set-task-status 2 in-progress  # Task 2 시작
```

### 🏃‍♂️ **개발 서버**
```bash
npm run dev              # Next.js 개발 서버
npm test                 # Jest 테스트 실행
npm run test:watch       # 테스트 watch 모드
npm run lint             # ESLint 검사
npm run build            # 프로덕션 빌드
```

---

## 📊 V1 vs V2 파일 구조 비교

### 🔄 **V1 파일 구조** (백업됨)
```
vocabulary/ (47개 파일)
├── src/data/vocabularyData.js    # 47개 SAT 단어 하드코딩
├── src/services/vocabularyAPI.js # JavaScript 기반 API
├── src/contexts/AppContext.jsx   # Context API
├── src/components/*.jsx          # React 컴포넌트 (PropTypes)
└── 21개 복잡한 Tasks
```

### 🆕 **V2 파일 구조** (현재)
```
vocabulary-v2/ (30+ 파일)
├── src/types/index.ts           # TypeScript 타입 시스템
├── src/lib/constants.ts         # 구조화된 상수 관리
├── src/lib/utils.ts             # 타입 안전한 유틸리티
├── src/components/*.tsx         # TypeScript 컴포넌트
└── 15개 체계적 Tasks
```

## 🎯 V2 파일 관리 원칙

### 📝 **파일 명명 규칙**
- **컴포넌트**: PascalCase (VocabularyCard.tsx)
- **파일명**: kebab-case (vocabulary-card.tsx)
- **디렉토리**: kebab-case (custom-hooks/)
- **상수**: UPPER_SNAKE_CASE (API_ENDPOINTS)

### 🔧 **코드 품질 규칙**
- **파일 크기**: 최대 1500줄 (PRD 요구사항)
- **컴포넌트**: 최대 5개 props
- **함수 복잡도**: Cyclomatic complexity ≤ 10
- **테스트 커버리지**: 80% 목표

### 🛡️ **���안 관련 파일**
- `.env.local`: API 키 보안 관리
- `firestore.rules`: 엄격한 데이터 접근 제어
- `src/lib/firebase/security-rules.ts`: 보안 규칙 관리

---

**V2 파일 맵은 안정적이고 확장 가능한 Next.js 아키텍처를 기반으로 체계적으로 관리됩니다.** 🚀  
**모든 파일은 TypeScript 타입 안전성과 개발 효율성을 최우선으로 설계되었습니다.**
