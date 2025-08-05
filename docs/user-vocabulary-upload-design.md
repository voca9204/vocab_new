# 일반 사용자 단어장 업로드 기능 설계

## 개요
일반 사용자가 자신만의 단어장을 업로드하고 관리할 수 있는 기능을 구현합니다.

## 주요 기능
1. 개인 단어장 관리 시스템
2. PDF/CSV/TXT 파일 업로드 지원
3. 사용자별 저장 공간 제한
4. 공유 옵션 (개인용/공개)
5. 중복 검사 및 품질 관리

## 시스템 아키텍처

### 1. 데이터베이스 구조

```typescript
// 사용자 단어장 컬렉션
interface UserVocabulary {
  id: string
  userId: string
  name: string
  description?: string
  isPrivate: boolean
  isPublished: boolean  // 공개 여부
  wordCount: number
  language: 'ko' | 'en' | 'mixed'
  tags: string[]
  source: {
    type: 'pdf' | 'csv' | 'txt' | 'manual'
    filename?: string
    uploadedAt: Date
  }
  stats: {
    totalWords: number
    verifiedWords: number
    reportCount: number
    likeCount: number
  }
  createdAt: Date
  updatedAt: Date
}

// 사용자 단어 컬렉션
interface UserWord {
  id: string
  vocabularyId: string
  userId: string
  word: string
  definitions: WordDefinition[]
  partOfSpeech: string[]
  examples?: string[]
  pronunciation?: string
  isVerified: boolean
  reportCount: number
  createdAt: Date
  updatedAt: Date
}

// 사용자 저장 공간 제한
interface UserQuota {
  userId: string
  plan: 'free' | 'premium' | 'pro'
  limits: {
    maxVocabularies: number    // free: 5, premium: 50, pro: unlimited
    maxWordsPerVocabulary: number  // free: 100, premium: 1000, pro: 10000
    maxTotalWords: number     // free: 500, premium: 10000, pro: unlimited
    maxFileSize: number       // free: 5MB, premium: 20MB, pro: 100MB
  }
  usage: {
    vocabularyCount: number
    totalWordCount: number
    storageUsed: number  // bytes
  }
  updatedAt: Date
}
```

### 2. API 엔드포인트 설계

```typescript
// POST /api/user/vocabulary/upload
interface UploadVocabularyRequest {
  file: File
  name: string
  description?: string
  isPrivate: boolean
  tags?: string[]
}

interface UploadVocabularyResponse {
  success: boolean
  vocabularyId?: string
  extractedWords?: number
  errors?: string[]
  quotaUsage?: {
    used: number
    limit: number
    remaining: number
  }
}

// GET /api/user/vocabulary
interface GetUserVocabulariesResponse {
  vocabularies: UserVocabulary[]
  quota: UserQuota
  totalCount: number
}

// POST /api/user/vocabulary/:id/publish
interface PublishVocabularyRequest {
  vocabularyId: string
  tags: string[]
  category: string
}

// POST /api/user/vocabulary/:id/share
interface ShareVocabularyRequest {
  vocabularyId: string
  shareType: 'link' | 'email' | 'public'
  expiresIn?: number  // hours
}

// GET /api/public/vocabularies
interface GetPublicVocabulariesRequest {
  page: number
  limit: number
  sortBy: 'popular' | 'recent' | 'rating'
  tags?: string[]
  search?: string
}
```

### 3. 컴포넌트 구조

```typescript
// 단어장 업로드 컴포넌트
<UserVocabularyUpload>
  <FileDropzone>
    <FileTypeSelector />  // PDF, CSV, TXT
    <FileSizeIndicator />
    <QuotaIndicator />
  </FileDropzone>
  
  <VocabularyMetadata>
    <NameInput />
    <DescriptionInput />
    <TagSelector />
    <PrivacyToggle />
  </VocabularyMetadata>
  
  <ExtractionPreview>
    <WordList />
    <ErrorList />
    <EditableWordForm />
  </ExtractionPreview>
  
  <UploadActions>
    <SaveButton />
    <PublishButton />
    <CancelButton />
  </UploadActions>
</UserVocabularyUpload>

// 내 단어장 관리 컴포넌트
<MyVocabulariesDashboard>
  <QuotaCard>
    <UsageBar />
    <UpgradePlanButton />
  </QuotaCard>
  
  <VocabularyGrid>
    <VocabularyCard>
      <WordCount />
      <PrivacyBadge />
      <ShareButton />
      <EditButton />
      <DeleteButton />
    </VocabularyCard>
  </VocabularyGrid>
  
  <CreateNewButton />
</MyVocabulariesDashboard>

// 공개 단어장 탐색 컴포넌트
<PublicVocabularyExplorer>
  <SearchBar />
  <TagFilter />
  <SortSelector />
  
  <VocabularyList>
    <PublicVocabularyCard>
      <AuthorInfo />
      <WordPreview />
      <Stats />  // likes, downloads, reports
      <ImportButton />
      <ReportButton />
    </PublicVocabularyCard>
  </VocabularyList>
  
  <Pagination />
</PublicVocabularyExplorer>
```

### 4. 파일 처리 시스템

```typescript
// 파일 파서 인터페이스
interface FileParser {
  parse(file: File): Promise<ParseResult>
  validate(content: string): ValidationResult
  extractWords(content: string): VocabularyEntry[]
}

// CSV 파서
class CSVParser implements FileParser {
  supportedFormats = [
    'word,definition,partOfSpeech,example',
    'word,meaning,pos,sentence',
    'term,translation,type,usage'
  ]
  
  async parse(file: File): Promise<ParseResult> {
    // CSV 파싱 로직
    // 헤더 자동 감지
    // 인코딩 자동 감지 (UTF-8, EUC-KR)
  }
}

// TXT 파서
class TXTParser implements FileParser {
  patterns = [
    /^(\w+)\s*:\s*(.+)$/,  // word: definition
    /^(\w+)\s*-\s*(.+)$/,   // word - definition
    /^(\d+)\.\s*(\w+)\s*(.+)$/  // 1. word definition
  ]
  
  async parse(file: File): Promise<ParseResult> {
    // 패턴 매칭을 통한 추출
  }
}

// 통합 파서
class UnifiedVocabularyParser {
  private parsers: Map<string, FileParser>
  
  async parseFile(file: File): Promise<ExtractionResult> {
    const parser = this.selectParser(file)
    const result = await parser.parse(file)
    
    // 품질 검증
    const validated = await this.validateExtraction(result)
    
    // 중복 제거
    const deduplicated = this.removeDuplicates(validated)
    
    // 기본 정보 보완 (품사 추론, 예문 생성 등)
    const enhanced = await this.enhanceData(deduplicated)
    
    return enhanced
  }
}
```

### 5. 권한 및 보안

```typescript
// 권한 체크 미들웨어
async function checkVocabularyQuota(userId: string, wordCount: number) {
  const quota = await getUserQuota(userId)
  const remaining = quota.limits.maxTotalWords - quota.usage.totalWordCount
  
  if (wordCount > remaining) {
    throw new QuotaExceededError({
      requested: wordCount,
      available: remaining,
      limit: quota.limits.maxTotalWords
    })
  }
}

// 파일 검증
async function validateUploadedFile(file: File) {
  // 파일 크기 체크
  // 파일 타입 검증
  // 악성 코드 스캔
  // 콘텐츠 적절성 검사
}

// 콘텐츠 모더레이션
async function moderateVocabularyContent(words: UserWord[]) {
  // 부적절한 단어 필터링
  // 스팸 감지
  // 저작권 침해 검사
}
```

### 6. 구현 계획

#### Phase 1: 기본 업로드 기능 (1-2주)
1. 파일 업로드 UI 구현
2. PDF/CSV/TXT 파서 구현
3. 사용자 단어장 저장 기능
4. 기본 쿼터 시스템

#### Phase 2: 관리 기능 (1-2주)
1. 내 단어장 대시보드
2. 단어 편집/삭제 기능
3. 단어장 공유 기능
4. 검색 및 필터링

#### Phase 3: 커뮤니티 기능 (2-3주)
1. 공개 단어장 마켓플레이스
2. 좋아요/평가 시스템
3. 신고 및 모더레이션
4. 추천 알고리즘

#### Phase 4: 고급 기능 (2-3주)
1. AI 기반 단어 정의 보완
2. 협업 단어장 편집
3. 버전 관리
4. 단어장 병합/분할

### 7. UI/UX 플로우

```
사용자 단어장 업로드 플로우:

1. 대시보드
   ├── 단어장 업로드 버튼 클릭
   │   ├── 파일 선택 (PDF/CSV/TXT)
   │   ├── 파일 분석 및 추출
   │   ├── 추출 결과 미리보기
   │   ├── 단어 편집/검증
   │   ├── 메타데이터 입력
   │   └── 저장
   │
   ├── 내 단어장 관리
   │   ├── 단어장 목록 보기
   │   ├── 단어장 상세 보기
   │   ├── 단어 편집/삭제
   │   └── 공유 설정
   │
   └── 공개 단어장 탐색
       ├── 검색/필터링
       ├── 인기/최신 단어장
       ├── 단어장 미리보기
       └── 내 계정으로 가져오기
```

### 8. 기술 스택

- **Frontend**: Next.js, React, TypeScript
- **File Processing**: 
  - PDF: pdf-parse, pdfjs-dist
  - CSV: papaparse
  - TXT: 내장 파서
- **Storage**: Firebase Storage (파일), Firestore (메타데이터)
- **Authentication**: Firebase Auth
- **Search**: Algolia 또는 Firebase 전문 검색
- **Moderation**: Google Cloud Natural Language API

### 9. 보안 고려사항

1. **파일 업로드 보안**
   - 파일 크기 제한 (최대 100MB)
   - 파일 타입 검증 (MIME type + 확장자)
   - 바이러스 스캔 (Google Cloud Security Scanner)
   - 임시 파일 자동 삭제

2. **콘텐츠 보안**
   - XSS 방지 (입력값 sanitize)
   - SQL Injection 방지 (Firestore 사용)
   - 부적절한 콘텐츠 필터링
   - 저작권 침해 검사

3. **사용자 데이터 보호**
   - 개인 단어장 암호화
   - 공유 링크 만료 기능
   - 접근 권한 세분화
   - 활동 로그 기록

### 10. 성능 최적화

1. **파일 처리**
   - Web Worker를 사용한 백그라운드 처리
   - 청크 단위 파일 읽기
   - 스트리밍 파싱

2. **데이터 로딩**
   - 페이지네이션
   - 무한 스크롤
   - 캐싱 전략
   - 지연 로딩

3. **검색 최적화**
   - 인덱싱 전략
   - 검색 결과 캐싱
   - 자동완성 기능

## 다음 단계

1. 상세 API 명세서 작성
2. UI/UX 디자인 목업 제작
3. 프로토타입 개발
4. 사용자 테스트 및 피드백 수집
5. 점진적 기능 출시