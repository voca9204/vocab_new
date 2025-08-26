# 단어장 관리 시스템 설계 문서

## 📋 개요
단어장 관리 시스템은 관리자와 일반 사용자가 각자의 권한에 따라 단어장을 업로드하고 관리할 수 있는 체계입니다.

## 👥 사용자 권한 구조

### 관리자 (Admin)
- **전체 단어장 (Official Collections)** 업로드 가능
- **개인 단어장 (Personal Collections)** 업로드 가능
- 전용 관리자 메뉴 접근 가능
- 모든 단어장에 대한 수정/삭제 권한

### 일반 사용자 (Regular User)
- **개인 단어장 (Personal Collections)** 업로드만 가능
- 자신의 단어장만 수정/삭제 가능
- 공개된 단어장 열람 및 학습 가능

## 🗂️ 단어장 분류 체계

### 1. 전체 단어장 (Official Collections)
**관리자만 업로드 가능**

#### 카테고리 구분
- **SAT** - SAT 시험 대비 단어장
- **TOEFL** - 토플 시험 대비 단어장
- **TOEIC** - 토익 시험 대비 단어장
- **수능** - 대학수학능력시험 대비 단어장
- **GRE** - GRE 시험 대비 단어장
- **IELTS** - IELTS 시험 대비 단어장
- **기본** - 기초 영어 단어장

#### 데이터 구조
```typescript
interface OfficialCollection {
  id: string
  name: string                    // 예: "TOEFL 공식 단어장"
  category: 'SAT' | 'TOEFL' | 'TOEIC' | '수능' | 'GRE' | 'IELTS' | '기본'
  description: string
  wordCount: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]                  // ["시험대비", "필수", "2024"]
  isOfficial: true                // 항상 true
  uploadedBy: string              // 관리자 ID
  uploadedAt: Date
  lastUpdatedAt: Date
  version: string                 // "1.0.0"
  source: {
    type: 'pdf' | 'manual' | 'import'
    originalFile?: string
    publisher?: string           // "ETS", "College Board" 등
  }
  statistics: {
    totalUsers: number           // 학습 중인 사용자 수
    avgMastery: number          // 평균 숙련도
    completionRate: number      // 완료율
  }
}
```

### 2. 개인 단어장 (Personal Collections)
**모든 사용자 업로드 가능 (관리자 포함)**

#### 데이터 구조
```typescript
interface PersonalCollection {
  id: string
  userId: string                   // 소유자 ID
  name: string                     // 사용자 지정 이름
  description?: string
  wordCount: number
  isPrivate: boolean              // true: 비공개, false: 공개
  isShared: boolean               // 공유 여부
  tags: string[]                  // 사용자 정의 태그
  source: {
    type: 'pdf' | 'csv' | 'txt' | 'manual' | 'photo'
    filename?: string
    uploadedAt: Date
  }
  sharedWith?: string[]           // 공유된 사용자 ID 목록
  createdAt: Date
  updatedAt: Date
  statistics: {
    studied: number               // 학습한 단어 수
    mastered: number             // 마스터한 단어 수
    lastStudiedAt?: Date
  }
}
```

## 🔐 Firestore 컬렉션 구조

```
firestore/
├── vocabulary_collections/      # 전체 단어장 (관리자용)
│   ├── SAT/
│   │   └── {collectionId}/
│   ├── TOEFL/
│   │   └── {collectionId}/
│   ├── TOEIC/
│   │   └── {collectionId}/
│   └── 수능/
│       └── {collectionId}/
│
├── personal_collections/        # 개인 단어장
│   └── {userId}/
│       └── {collectionId}/
│
├── words/                       # 통합 단어 DB
│   └── {wordId}/
│
└── collection_words/            # 단어장-단어 매핑
    └── {collectionId}/
        └── words/
            └── {wordId}/
```

## 🖥️ UI/UX 설계

### 관리자 인터페이스

#### 1. 관리자 대시보드 (`/admin/collections`)
```typescript
<AdminCollectionDashboard>
  {/* 전체 단어장 관리 섹션 */}
  <OfficialCollectionsSection>
    <CategoryTabs>
      <Tab>SAT</Tab>
      <Tab>TOEFL</Tab>
      <Tab>TOEIC</Tab>
      <Tab>수능</Tab>
    </CategoryTabs>
    
    <CollectionList>
      <CollectionCard>
        <EditButton />
        <DeleteButton />
        <VersionControl />
        <Statistics />
      </CollectionCard>
    </CollectionList>
    
    <UploadOfficialButton />
  </OfficialCollectionsSection>
  
  {/* 개인 단어장 섹션 (관리자도 사용) */}
  <PersonalCollectionsSection>
    <MyCollections />
    <UploadPersonalButton />
  </PersonalCollectionsSection>
</AdminCollectionDashboard>
```

#### 2. 전체 단어장 업로드 모달
```typescript
<OfficialCollectionUploadModal>
  <CategorySelector>
    <option>SAT</option>
    <option>TOEFL</option>
    <option>TOEIC</option>
    <option>수능</option>
  </CategorySelector>
  
  <CollectionMetadata>
    <NameInput />
    <DescriptionInput />
    <DifficultySelector />
    <TagsInput />
    <PublisherInput />
    <VersionInput />
  </CollectionMetadata>
  
  <FileUploadSection>
    <PDFUploader />
    <WordExtractor />
    <ValidationResults />
  </FileUploadSection>
  
  <PublishButton />
</OfficialCollectionUploadModal>
```

### 일반 사용자 인터페이스

#### 1. 내 단어장 페이지 (`/my-collections`)
```typescript
<UserCollectionDashboard>
  {/* 개인 단어장만 표시 */}
  <MyCollectionsGrid>
    <CollectionCard>
      <WordCount />
      <Progress />
      <StudyButton />
      <ShareButton />
      <EditButton />
      <DeleteButton />
    </CollectionCard>
  </MyCollectionsGrid>
  
  <CreateNewButton />
  
  {/* 사용량 표시 */}
  <QuotaIndicator>
    <UsedSpace />
    <RemainingSpace />
    <UpgradeButton />
  </QuotaIndicator>
</UserCollectionDashboard>
```

#### 2. 개인 단어장 업로드 (공통 인터페이스)
```typescript
<PersonalCollectionUpload>
  <FileDropzone>
    <SupportedFormats>PDF, CSV, TXT, 사진</SupportedFormats>
    <FileSizeLimit />
  </FileDropzone>
  
  <CollectionSettings>
    <NameInput />
    <DescriptionInput />
    <PrivacyToggle />
    <TagsInput />
  </CollectionSettings>
  
  <WordPreview>
    <ExtractedWords />
    <EditableList />
    <AIEnhancement />
  </WordPreview>
  
  <SaveButton />
</PersonalCollectionUpload>
```

## 📡 API 엔드포인트

### 관리자 전용 API

```typescript
// POST /api/admin/collections/official
// 전체 단어장 업로드
interface UploadOfficialCollectionRequest {
  category: 'SAT' | 'TOEFL' | 'TOEIC' | '수능'
  name: string
  description: string
  difficulty: string
  words: Word[]
  metadata: {
    publisher?: string
    version: string
    tags: string[]
  }
}

// PUT /api/admin/collections/official/:id
// 전체 단어장 수정

// DELETE /api/admin/collections/official/:id
// 전체 단어장 삭제

// GET /api/admin/collections/statistics
// 전체 단어장 통계 조회
```

### 공통 API (관리자 & 일반 사용자)

```typescript
// POST /api/collections/personal
// 개인 단어장 업로드
interface UploadPersonalCollectionRequest {
  name: string
  description?: string
  isPrivate: boolean
  file?: File
  words?: Word[]
  tags?: string[]
}

// GET /api/collections/personal
// 내 개인 단어장 목록 조회

// PUT /api/collections/personal/:id
// 개인 단어장 수정 (소유자만)

// DELETE /api/collections/personal/:id
// 개인 단어장 삭제 (소유자만)

// POST /api/collections/personal/:id/share
// 개인 단어장 공유
```

### 일반 사용자 API

```typescript
// GET /api/collections/official
// 전체 단어장 목록 조회 (학습용)
interface GetOfficialCollectionsResponse {
  collections: {
    SAT: OfficialCollection[]
    TOEFL: OfficialCollection[]
    TOEIC: OfficialCollection[]
    수능: OfficialCollection[]
  }
}

// GET /api/collections/public
// 공개된 개인 단어장 탐색
```

## 🔒 권한 검증 미들웨어

```typescript
// 관리자 권한 확인
import { isAdmin } from '@/lib/auth/admin'

export async function checkAdminAccess(req: Request) {
  const user = await getCurrentUser(req)
  
  if (!user || !isAdmin(user.email)) {
    throw new UnauthorizedError('Admin access required')
  }
  
  return user
}

// 단어장 소유권 확인
export async function checkCollectionOwnership(
  userId: string,
  collectionId: string
) {
  const collection = await getCollection(collectionId)
  
  if (collection.userId !== userId && !isAdmin(userId)) {
    throw new ForbiddenError('You do not own this collection')
  }
  
  return collection
}
```

## 📊 사용 제한 및 플랜

### 무료 플랜 (Free)
- 개인 단어장: 최대 5개
- 단어장당 최대 단어: 100개
- 총 단어 수: 500개
- 파일 크기: 최대 5MB

### 프리미엄 플랜 (Premium)
- 개인 단어장: 최대 50개
- 단어장당 최대 단어: 1,000개
- 총 단어 수: 10,000개
- 파일 크기: 최대 20MB

### 관리자 (Admin)
- 제한 없음
- 전체 단어장 업로드 가능
- 모든 기능 접근 가능

## 🚀 구현 로드맵

### Phase 1: 기본 구조 (1주)
- [ ] Firestore 컬렉션 구조 설정
- [ ] 권한 시스템 구현
- [ ] 기본 API 엔드포인트 구현

### Phase 2: 관리자 기능 (1-2주)
- [ ] 관리자 대시보드 UI
- [ ] 전체 단어장 업로드 기능
- [ ] 카테고리별 관리 기능
- [ ] 버전 관리 시스템

### Phase 3: 사용자 기능 (1-2주)
- [ ] 개인 단어장 업로드 UI
- [ ] 파일 파서 구현 (PDF, CSV, TXT)
- [ ] 사용량 제한 시스템
- [ ] 공유 기능

### Phase 4: 고급 기능 (2주)
- [ ] AI 단어 정의 보완
- [ ] 단어장 검색 및 필터링
- [ ] 통계 및 분석
- [ ] 단어장 병합/분할 기능

## 📝 주요 고려사항

1. **보안**
   - 파일 업로드 시 악성 코드 검사
   - XSS, SQL Injection 방지
   - 권한 검증 철저히 수행

2. **성능**
   - 대용량 단어장 처리 최적화
   - 캐싱 전략 수립
   - 페이지네이션 구현

3. **사용성**
   - 직관적인 UI/UX
   - 드래그 앤 드롭 지원
   - 실시간 진행 상황 표시

4. **확장성**
   - 새로운 시험 카테고리 추가 용이
   - 다국어 지원 고려
   - API 버전 관리