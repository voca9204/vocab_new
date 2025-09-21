# 단어 데이터베이스 아키텍처 문서

## 개요
Vocabulary V2 프로젝트의 단어 데이터 저장 및 호출 방식을 정의한 문서입니다.

## 📊 데이터베이스 구조

### Firestore 컬렉션 구조
```
vocabulary-app-new/
├── 마스터 데이터 (공유)
│   ├── words/                      # 통합 마스터 단어 풀 (모든 단어, 출처 무관)
│   └── ai_generated_words/         # AI 생성 로그 (words에도 동기화)
│
├── 단어장 시스템
│   ├── vocabulary_collections/     # 공식 단어장 (관리자 전용, word ID 참조)
│   └── personal_collections/       # 개인 단어장 (모든 사용자, word ID 참조)
│
└── 사용자 데이터
    ├── user_words/                # 사용자 학습 진도
    └── user_settings/             # 사용자 설정
```

## 📚 단어 컬렉션 상세

### 1. words (통합 마스터 단어 풀)
**목적**: 시스템이 보유한 모든 단어의 중앙 저장소  
**특징**: 출처에 관계없이 모든 단어가 통합 저장  
**개수**: 2,500+ 단어 (계속 증가 중)  

**주의**: source 필드는 단순히 출처를 기록하는 메타데이터일 뿐, 단어 분류 기준이 아님

**데이터 구조**:
```typescript
{
  word: string,
  definition: string,
  etymology?: string,
  partOfSpeech: string[],
  examples: string[],
  pronunciation?: string,
  difficulty: number,
  frequency: number,
  isSAT: boolean,
  source: {
    type: 'veterans_pdf' | 'pdf' | 'ai_generated',
    origin: string,     // 파일명 또는 'discovery'
    addedAt: Date,
    uploadedBy?: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 2. ai_generated_words (AI 생성 단어)
**출처**: AI Discovery 시스템이 자동 생성  
**개수**: 동적으로 증가  
**UI 표시명**: (별도 표시 없음, 다른 컬렉션과 통합)  

**데이터 구조**:
```typescript
{
  word: string,
  normalizedWord: string,
  pronunciation: string,
  partOfSpeech: string[],
  definitions: Definition[],
  etymology: string,         // 영어 정의
  realEtymology: string,    // 실제 어원
  synonyms: string[],
  antonyms: string[],
  difficulty: number,
  frequency: number,
  isSAT: boolean,
  source: {
    type: 'ai_generated',
    origin: 'discovery',
    addedAt: Date,
    metadata: {
      context?: string,      // 발견된 문맥
      sourceWordId?: string, // 유사어 원본
      model: 'gpt-4',
      requestedBy: string    // 요청한 사용자 ID
    }
  },
  aiGenerated: {
    examples: boolean,
    etymology: boolean,
    generatedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 3. photo_vocabulary_words (사진 단어)
**출처**: 사진에서 추출한 단어들  
**특징**: UnifiedWord 시스템과 완전 통합  
**UI 표시명**: 사진 단어  

**데이터 구조**: (위의 photo_vocabulary_words 참조)

### 4. vocabulary_collections (공식 단어장 - 관리자 전용)
**목적**: 관리자가 제공하는 공식 단어장  
**핵심 개념**: words 컬렉션의 단어 ID를 참조하여 단어장 구성  
**카테고리**: SAT, TOEFL, TOEIC, 수능, GRE, IELTS, 기본  
**권한**: 관리자만 업로드/수정/삭제 가능  

**현재 공식 단어장**:
- SAT 공식 단어장: 1,821개 단어 (V.ZIP 3K.pdf 출처)
- 수능 공식 단어장: 282개 단어 (25년 수능 영단어 모음.pdf 출처)
- TOEFL 공식 단어장: 0개 (대기 중)
- TOEIC 공식 단어장: 0개 (대기 중)
- GRE 공식 단어장: 0개 (대기 중)
- IELTS 공식 단어장: 0개 (대기 중)
- 기본 영단어: 0개 (대기 중)  

**데이터 구조**:
```typescript
{
  name: string,              // 콜렉션 이름 (예: "TOEFL 공식 단어장")
  displayName: string,       // UI 표시명
  category: 'SAT' | 'TOEFL' | 'TOEIC' | '수능' | 'GRE' | 'IELTS' | '기본',
  description: string,       // 설명
  words: string[],          // 포함된 단어 ID 배열
  wordCount: number,        // 단어 수
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  isOfficial: true,         // 항상 true (공식 단어장)
  uploadedBy: string,       // 관리자 ID
  version: string,          // 버전 (예: "1.0.0")
  tags: string[],           // ["시험대비", "필수", "2024"]
  source: {
    type: 'pdf' | 'manual' | 'import',
    publisher?: string      // "ETS", "College Board" 등
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 5. personal_collections (개인 단어장 - 모든 사용자)
**목적**: 사용자별 커스텀 단어장 관리  
**핵심 개념**: words 컬렉션의 단어 ID를 참조하여 개인 단어장 구성  
**권한**: 모든 사용자 업로드 가능 (관리자 포함)  
**특징**: 소유자만 수정/삭제 가능  

**데이터 구조**:
```typescript
{
  userId: string,           // 소유자 ID
  name: string,             // 사용자 지정 이름
  description?: string,     // 설명
  words: string[],          // 포함된 단어 ID 배열
  wordCount: number,        // 단어 수
  isPrivate: boolean,       // true: 비공개, false: 공개
  isShared: boolean,        // 공유 여부
  sharedWith?: string[],    // 공유된 사용자 ID 목록
  tags: string[],           // 사용자 정의 태그
  source: {
    type: 'pdf' | 'csv' | 'txt' | 'manual' | 'photo',
    filename?: string,
    uploadedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

## 🎯 단어장-단어 참조 시스템

### 핵심 원칙
1. **words 컬렉션**: 마스터 단어 풀 (모든 단어의 실제 데이터)
2. **단어장 컬렉션**: 단어 ID 배열로 단어장 구성
3. **참조 방식**: 단어장.words = ['word-id-1', 'word-id-2', ...]

### 데이터 흐름
```
사용자가 단어장 선택
    ↓
vocabulary_collections 또는 personal_collections에서 단어 ID 배열 가져오기
    ↓
words 컬렉션에서 ID로 실제 단어 데이터 조회
    ↓
UnifiedWord 형태로 변환하여 학습 페이지에 표시
```

## 🔄 데이터 통합 시스템

### UnifiedWord 타입
모든 단어 데이터를 통합하는 공통 인터페이스:

```typescript
interface UnifiedWord {
  id: string
  word: string
  definition: string
  etymology?: string
  partOfSpeech: string[]
  examples: string[]
  pronunciation?: string
  synonyms?: string[]
  difficulty: number
  frequency: number
  isSAT: boolean
  studyStatus?: StudyStatus
  source: WordSource
  createdAt: Date
  updatedAt: Date
}
```

### WordAdapter 서비스
**위치**: `/src/lib/adapters/word-adapter.ts`  
**목적**: 여러 컬렉션의 데이터를 UnifiedWord 형태로 변환  

**기능**:
- 레거시 데이터 구조를 통합 구조로 변환
- 여러 컬렉션에서 단어 검색 (우선순위 기반)
- 캐싱을 통한 성능 최적화
- 유연한 단어 검색 (변형, 복수형 등)

**컬렉션 우선순위**:
1. words (통합 마스터 DB)
2. ai_generated_words (AI 생성 단어)
3. photo_vocabulary_words (사진 단어)

## 📡 API 엔드포인트

### 단어 개수 조회
**경로**: `/api/vocabulary-count`  
**메서드**: GET  
**파라미터**: `?collection={컬렉션명}`  

**예시**:
```bash
GET /api/vocabulary-count?collection=veterans_vocabulary
GET /api/vocabulary-count?collection=vocabulary
GET /api/vocabulary-count?collection=words
```

**응답**:
```json
{
  "success": true,
  "collection": "veterans_vocabulary",
  "count": 1821
}
```

### 단어장 컬렉션 조회
**경로**: `/api/vocabulary-collections`  
**메서드**: GET  

**응답**:
```json
{
  "collections": [
    {
      "name": "V.ZIP 3K 단어장",
      "words": ["word1", "word2", ...],
      "isPrivate": false,
      "userId": "user123"
    }
  ]
}
```

## 🔧 데이터 호출 방식

### 1. 설정 페이지에서 단어장 목록 로드
**파일**: `/src/app/settings/page.tsx`  

**프로세스**:
1. `vocabulary_collections`에서 컬렉션 목록 조회
2. 각 레거시 컬렉션의 단어 개수 API 호출
3. 사용자 설정에서 선택된 단어장 확인
4. UI에 단어장 목록 표시

**코드 흐름**:
```javascript
// 1. 컬렉션 목록 가져오기
const response = await fetch('/api/vocabulary-collections')
const { collections } = await response.json()

// 2. vocabulary_collections의 단어 개수는 위에서 이미 처리됨
// 더 이상 레거시 컬렉션을 직접 조회하지 않음

for (const { name, displayName } of legacyCollections) {
  const response = await fetch(`/api/vocabulary-count?collection=${name}`)
  const { count } = await response.json()
  if (count > 0) {
    sourceMap.set(displayName, count)
  }
}
```

### 2. VocabularyContext를 통한 단어 데이터 관리
**파일**: `/src/contexts/vocabulary-context.tsx`  

**기능**:
- 선택된 단어장의 단어들을 통합하여 제공
- WordAdapter를 사용하여 데이터 변환
- 필터링 및 검색 기능 제공
- 캐싱을 통한 성능 최적화

**사용 예시**:
```javascript
const { words, loading, filter, setFilter } = useVocabulary()
```

### 3. WordAdapter를 통한 단어 검색
**파일**: `/src/lib/adapters/word-adapter.ts`  

**메서드**:
- `searchWord(word: string)`: 정확한 단어 검색
- `searchWordFlexible(word: string)`: 유연한 단어 검색 (변형 포함)
- `getAllWords(limit?: number)`: 모든 단어 조회
- `getWordsByCollection(collection: string)`: 특정 컬렉션 단어 조회

**검색 우선순위**:
1. words (마스터 DB)
2. veterans_vocabulary (SAT 단어장)
3. vocabulary (수능 단어장)
4. ai_generated_words (AI 생성 단어)

## 💾 캐싱 전략

### CacheContext
**파일**: `/src/contexts/cache-context.tsx`  

**캐시 데이터**:
- 단어 검색 결과
- 유사어 생성 결과
- API 응답 데이터

**캐시 키 전략**:
- 단어 검색: `word:{단어명}`
- 유사어: `synonyms:{단어명}`
- API 응답: `api:{엔드포인트}:{파라미터}`

## 🏗️ 데이터 흐름

### 단어 학습 시 데이터 흐름
```
1. 사용자가 단어장 선택 (settings)
   ↓
2. VocabularyContext가 선택된 단어장 데이터 로드
   ↓
3. WordAdapter가 여러 컬렉션에서 데이터 수집
   ↓
4. UnifiedWord 형태로 변환하여 UI에 제공
   ↓
5. 사용자 학습 진도는 user_words에 저장
```

### 단어 검색 시 데이터 흐름
```
1. 검색어 입력
   ↓
2. CacheContext에서 캐시 확인
   ↓
3. 캐시 없으면 WordAdapter.searchWordFlexible() 호출
   ↓
4. 우선순위별로 컬렉션 검색
   ↓
5. 결과를 UnifiedWord로 변환하여 반환
   ↓
6. 결과를 캐시에 저장
```

## 📱 메뉴별 단어 호출 방식

### 1. 단어 목록 페이지 (/study/list)
**파일**: `/src/app/study/list/page.tsx`  
**데이터 소스**: VocabularyContext  

**호출 방식**:
```javascript
const { words, loading, filter, setFilter } = useVocabulary()
```

**특징**:
- VocabularyContext에서 전체 단어 목록 제공
- 필터링 (전체/학습완료/미학습) 지원
- 검색 기능 연동
- 페이지네이션 처리

### 2. 플래시카드 페이지 (/study/flashcards)
**파일**: `/src/app/study/flashcards/page.tsx`  
**데이터 소스**: VocabularyContext  

**호출 방식**:
```javascript
const { words, loading, filter, setFilter } = useVocabulary()
const [wordAdapter] = useState(() => new WordAdapter())
```

**특징**:
- 현재 인덱스 기반으로 단어 표시
- 로컬스토리지에 진도 저장
- 유사어 클릭 시 WordAdapter로 검색
- AI Discovery Modal 자동 연동

### 3. 퀴즈 페이지 (/study/quiz)
**파일**: `/src/app/study/quiz/page.tsx`  
**데이터 소스**: VocabularyContext  

**특징**:
- 무작위로 문제 단어 선택
- 오답 선택지는 다른 단어들에서 랜덤 선택
- 학습 진도 자동 업데이트

### 4. 대시보드 (/dashboard)
**파일**: `/src/app/dashboard/page.tsx`  
**데이터 소스**: vocabularyService 직접 호출  

**호출 방식**:
```javascript
const { vocabularyService } = await import('@/lib/api')
const result = await vocabularyService.getAll(undefined, 2000, user.uid)
```

**특징**:
- 통계 표시를 위한 요약 데이터만 로드
- UserWordService로 학습 진도 조회

## 🪟 모달별 단어 호출 방식

### 1. WordDetailModal (단어 상세 모달)
**파일**: `/src/components/vocabulary/word-detail-modal.tsx`  
**데이터 소스**: 부모 컴포넌트에서 전달받은 UnifiedWord  

**주요 기능**:
- 예문 생성: `/api/generate-examples` 호출
- 어원 생성: `/api/generate-etymology` 호출
- 발음 조회: `/api/fetch-pronunciation` 호출
- 유사어 클릭: `onSynonymClick` 콜백 실행

**데이터 흐름**:
```javascript
// 부모 컴포넌트에서
<WordDetailModal
  word={selectedWord}
  onSynonymClick={handleSynonymClick}
  // ... 기타 props
/>

// 유사어 클릭 처리
const handleSynonymClick = async (synonymWord: string) => {
  const foundWord = await wordAdapter.searchWordFlexible(synonymWord)
  if (foundWord) {
    openModal(foundWord)
  } else {
    openDiscoveryModal(synonymWord, selectedWord?.word || '', 'synonym')
  }
}
```

### 2. DiscoveryModal (AI 단어 탐색 모달)
**파일**: `/src/components/vocabulary/discovery-modal.tsx`  
**데이터 소스**: OpenAI API + WordAdapter  

**호출 방식**:
```javascript
// 1. AI로 단어 정보 생성 (자동으로 ai_generated_words에 저장)
const response = await fetch('/api/vocabulary/discover', {
  method: 'POST',
  body: JSON.stringify({ 
    word: targetWord,
    userId: user.uid
  })
})

// 2. 개인 단어장에 추가
const saveResponse = await fetch('/api/vocabulary/save-to-personal', {
  method: 'POST',
  body: JSON.stringify({
    userId: user.uid,
    wordId: discoveredWord.id,
    word: discoveredWord.word,
    collectionName: '나만의 단어장'
  })
})
```

**특징**:
- DB에 없는 단어를 AI로 실시간 생성
- AI 생성 단어는 자동으로 ai_generated_words에 저장
- "개인 단어장에 추가" 버튼으로 personal_vocabulary에 추가
- 기존 단어 발견 시 WordDetailModal로 전환

### 3. 유사어 자동 생성
**파일**: 모든 단어 표시 컴포넌트  
**API**: `/api/generate-synonyms`  

**호출 조건**:
1. DB에 유사어가 없을 때
2. 캐시에도 없을 때
3. 플래시카드에서 답 공개 시

**캐싱 전략**:
```javascript
// 1. DB 확인
if (currentWord.synonyms && currentWord.synonyms.length > 0) {
  setSynonyms(currentWord.synonyms)
}
// 2. 캐시 확인
const cachedSynonyms = getSynonyms(currentWord.word)
if (cachedSynonyms) {
  setSynonyms(cachedSynonyms)
}
// 3. AI 생성
const response = await fetch('/api/generate-synonyms', {
  method: 'POST',
  body: JSON.stringify({ word, definition })
})
```

## 🔄 통합 데이터 플로우

### 메뉴 → 모달 데이터 전달
```
1. VocabularyContext에서 단어 목록 로드
   ↓
2. 메뉴 페이지에서 단어 표시
   ↓
3. 단어 클릭 시 UnifiedWord 객체 전달
   ↓
4. WordDetailModal에서 상세 정보 표시
   ↓
5. 유사어 클릭 시 WordAdapter로 검색
   ↓
6. 없으면 DiscoveryModal로 AI 생성
```

### 캐시 활용 흐름
```
요청 → CacheContext 확인 → 캐시 히트 → 즉시 반환
           ↓ (미스)
        WordAdapter 검색
           ↓
        DB 조회 (3개 컬렉션)
           ↓
        결과 캐싱 → 반환
```

## 📋 요약

### 현재 데이터 구조
1. **통합 마스터 DB** (words) - 2,106개
   - SAT 단어 (source.type: 'veterans_pdf') - 1,821개
   - 수능 단어 (source.type: 'pdf') - 282개
   - AI 생성 단어 (source.type: 'ai_generated') - 3개
2. **AI 생성 단어 전용** (ai_generated_words) - 동적 증가
3. **단어장 그룹** (vocabulary_collections) - 사용자가 학습할 단어장 선택

### 개인 데이터 시스템
- **personal_vocabulary**: 개인 단어장 (마스터 DB 참조)
- **user_words**: 학습 진도 추적
- **user_settings**: 사용자 설정

### 핵심 특징
- **통합 시스템**: WordAdapter로 모든 데이터 소스 통합
- **성능 최적화**: 다층 캐싱으로 빠른 응답
- **유연한 검색**: 단어 변형까지 고려한 검색
- **사용자 중심**: 개인별 학습 진도 및 설정 관리
- **AI 자동 저장**: AI 생성 단어는 마스터 DB에 자동 저장
- **개인 단어장**: 사용자별 커스텀 단어장 관리

### 데이터 흐름
1. **AI 단어 생성** → ai_generated_words에 자동 저장 (공유)
2. **"개인 단어장에 추가"** → personal_vocabulary에 추가 (개인)
3. **학습 진도** → user_words에 기록 (개인)

### 메뉴별 데이터 사용
- **목록/플래시카드/퀴즈**: VocabularyContext 사용
- **대시보드**: 직접 API 호출로 통계 데이터 조회
- **모달**: 부모 컴포넌트에서 전달받은 데이터 + API 보완

### Photo Vocabulary (`photo_sessions` & `photo_vocabulary`)
사진에서 추출한 임시 단어 학습 시스템입니다.

**Photo Sessions 데이터 형식**:
```typescript
{
  id: string,
  userId: string,
  title: string,              // 세션 제목
  photoUrl: string,          // Firebase Storage URL
  thumbnailUrl?: string,
  extractedAt: Date,
  extractionMethod: 'ocr' | 'ai_vision' | 'manual',
  sourceLanguage?: string,
  isTemporary: boolean,      // 임시 세션 여부
  expiresAt?: Date,         // 만료 시간 (기본 48시간)
  tags: string[],
  wordCount: number,
  testedCount: number,
  masteredCount: number,
  createdAt: Date,
  updatedAt: Date
}
```

**Photo Vocabulary 데이터 형식**:
```typescript
{
  id: string,
  userId: string,
  sessionId: string,         // 세션 참조
  word: string,
  context?: string,          // 원본 문장
  definition?: string,       // AI 생성 정의
  photoUrl?: string,
  uploadedAt: Date,
  isActive: boolean,
  expiresAt: Date,
  tested: boolean,
  correct: boolean,
  createdAt: Date
}
```

**특징**:
- 48시간 후 자동 삭제 (설정 가능)
- 즉시 테스트 가능
- 영구 보관 전환 가능
- 개인 단어장으로 내보내기 가능

### 향후 확장성
- 새로운 PDF 단어장 업로드 시 자동 처리
- 다양한 출처의 단어 데이터 통합 가능
- 개인 단어장 공유 기능 추가 가능
- 태그 기반 단어 분류 시스템 확장
- 인터넷에서 수집한 단어들 (`online_vocabulary/`)
- 사용자가 직접 입력한 단어들 (`custom_vocabulary/`)
- 다른 PDF 단어장에서 추출한 단어들 (`other_pdf_vocabulary/`)