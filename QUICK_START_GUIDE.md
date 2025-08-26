# 빠른 시작 가이드 (Quick Start Guide)

## 🚀 5분 안에 시작하기

### 1. 프로젝트 설정
```bash
# 저장소 클론
git clone [repository-url]
cd vocabulary-v2

# 의존성 설치
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일 생성:
```env
# Firebase 설정 (필수)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (필수)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY="your_private_key"

# OpenAI (AI 기능 사용 시)
OPENAI_API_KEY=your_openai_key
```

### 3. 개발 서버 실행
```bash
npm run dev
# http://localhost:3000 접속
```

---

## 📱 주요 페이지 가이드

### 로그인/회원가입
- **경로**: `/login`
- **기능**: Google 로그인 지원

### 통합 대시보드
- **경로**: `/unified-dashboard`
- **기능**: 단어장 선택, 학습 통계 확인
- **사용법**:
  1. "단어장 선택하기" 클릭
  2. 학습할 단어장 선택
  3. 학습 모드 선택

### 학습 모드

#### 플래시카드
- **경로**: `/study/flashcards`
- **조작법**:
  - 카드 클릭: 뜻 보기
  - "모름" 버튼: 복습 대상 추가
  - "알고 있음" 버튼: 다음 단어

#### 일일학습
- **경로**: `/study/daily`
- **기능**: 매일 목표 단어 학습
- **기본 목표**: 30단어/일

#### 복습
- **경로**: `/study/review`
- **기능**: 틀린 단어, 어려운 단어 복습

#### 퀴즈
- **경로**: `/study/quiz`
- **기능**: 4지선다 객관식 문제

#### 타이핑
- **경로**: `/study/typing`
- **기능**: 철자 입력 연습

---

## 🎯 핵심 기능 사용법

### 단어장 관리
1. **공식 단어장**: 자동으로 제공 (SAT, TOEFL 등)
2. **개인 단어장**: PDF/사진에서 추출 또는 직접 생성

### PDF 단어 추출
1. `/pdf-extract` 페이지 접속
2. PDF 파일 업로드
3. 추출 모드 선택 (간단/상세)
4. 단어 목록 확인 및 저장

### 사진에서 단어 추출
1. 학습 페이지에서 카메라 아이콘 클릭
2. 사진 업로드 또는 촬영
3. 자동 텍스트 인식
4. 단어 선택 및 저장

### AI 기능
- **예문 생성**: 단어 카드의 "예문" 버튼
- **유의어**: 자동 생성 및 표시
- **어원**: AI 기반 어원 설명
- **발음**: 자동 발음 기호 표시

---

## 🛠 개발자를 위한 정보

### 주요 디렉토리
```
src/
├── app/          # 페이지 (App Router)
├── components/   # UI 컴포넌트
├── lib/         # 비즈니스 로직
├── contexts/    # 전역 상태
└── types/       # TypeScript 타입
```

### 주요 명령어
```bash
# 개발
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run lint         # 린트 검사
npm run type-check   # 타입 체크

# 테스트
npm test            # 테스트 실행
npm run test:watch  # 감시 모드
npm run test:coverage # 커버리지

# TaskMaster
tm next-task        # 다음 작업 확인
tm get-tasks        # 전체 작업 목록
```

### 디버깅 팁
1. **콘솔 로그**: 브라우저 개발자 도구 확인
2. **서버 로그**: 터미널에서 Next.js 로그 확인
3. **Firebase Console**: 데이터베이스 직접 확인
4. **Network 탭**: API 호출 상태 확인

---

## ⚠️ 자주 발생하는 문제

### Firebase 연결 오류
```
Error: Missing Firebase configuration
```
**해결**: `.env.local` 파일 확인

### OpenAI API 오류
```
Error: OpenAI API key not found
```
**해결**: `OPENAI_API_KEY` 환경 변수 설정

### 빌드 오류
```bash
# 캐시 삭제 후 재빌드
rm -rf .next
npm run build
```

---

## 📞 도움말

### 문서
- `PROJECT_DOCUMENTATION.md` - 전체 프로젝트 문서
- `DATABASE_ARCHITECTURE.md` - 데이터베이스 구조
- `DEVELOPMENT_LOG.md` - 개발 히스토리

### 지원
- GitHub Issues에 문제 보고
- 개발자에게 직접 문의

---

*Happy Learning! 📚*