# 단어장 UI 통합 재설계 문서

## 프로젝트 개요

### 목표
현재 분산된 단어장 선택 시스템을 통합하여 직관적이고 일관된 사용자 경험 제공

### 현재 문제점
1. **분산된 선택 지점**: 설정, 탐색, 내 단어장, 사진 단어 등 여러 곳에 흩어진 단어장 관리
2. **중복된 학습 시스템**: 공식/개인/사진 단어장마다 별도 학습 페이지 구현
3. **복잡한 사용자 플로우**: 단어장 선택부터 학습까지 단계가 너무 많음
4. **일관성 부족**: 단어장 타입별로 다른 UI/UX 패턴

## 설계 목표

### 핵심 원칙
- **단순성**: 하나의 대시보드에서 모든 단어장 관리
- **일관성**: 모든 단어장 타입에서 동일한 학습 경험
- **직관성**: 사용자가 의도한 작업을 최소 클릭으로 수행
- **확장성**: 새로운 단어장 타입 추가 시 기존 시스템 활용

### 성공 지표
- 단어장 선택부터 학습 시작까지 클릭 수 50% 감소
- 사용자 인터페이스 일관성 100% 달성
- 코드 중복 70% 감소
- 신규 사용자 온보딩 시간 30% 단축

## 시스템 아키텍처

### 현재 구조
```
📁 현재 시스템
├── 설정 (/settings)
│   └── 공식 단어장 선택
├── 단어장 탐색 (/collections)
│   └── 공식 단어장 목록
├── 내 단어장 (/my-collections)
│   └── 개인 단어장 관리
├── 사진 단어 (/study/photo-vocab)
│   └── 독립적인 학습 시스템
└── 학습 메뉴 (/study/*)
    ├── /list (공식 단어장만)
    ├── /flashcards (공식 단어장만)
    ├── /personal/[id] (개인 단어장 전용)
    └── /photo-test/[id] (사진 단어 전용)
```

### 목표 구조
```
📁 통합 시스템
├── 대시보드 (/dashboard)
│   ├── 📚 선택된 단어장 표시
│   ├── ➕ 단어장 추가 (통합 모달)
│   ├── ⚡ 빠른 학습 시작
│   └── 📊 학습 진도 시각화
├── 통합 학습 시스템 (/study/*)
│   ├── /list (모든 선택된 단어장)
│   ├── /flashcards (모든 선택된 단어장)
│   ├── /quiz (모든 선택된 단어장)
│   └── /typing (모든 선택된 단어장)
└── 관리 페이지들 (기존 유지, 접근성 개선)
    ├── /collections (탐색 전용)
    ├── /my-collections (관리 전용)
    └── /settings (시스템 설정)
```

## 기술적 구현

### 1. 데이터 모델

#### 통합 단어장 타입
```typescript
interface UnifiedWordbook {
  id: string
  name: string
  description?: string
  type: 'official' | 'personal' | 'photo' | 'public'
  category?: string
  wordCount: number
  createdAt: Date
  updatedAt: Date
  
  // 선택 상태
  isSelected: boolean
  
  // 학습 진도
  progress?: {
    studied: number
    mastered: number
    lastStudiedAt?: Date
  }
  
  // 메타데이터
  metadata: {
    difficulty?: 'easy' | 'medium' | 'hard'
    estimatedTime?: number // 완주 예상 시간 (분)
    tags?: string[]
    thumbnail?: string
  }
}
```

#### 사용자 단어장 설정
```typescript
interface UserWordbookSettings {
  selectedWordbooks: {
    id: string
    type: UnifiedWordbook['type']
    selectedAt: Date
  }[]
  
  // 기존 설정 통합
  studyPreferences: {
    dailyGoal: number
    showPronunciation: boolean
    showEtymology: boolean
    showExamples: boolean
    textSize: 'small' | 'medium' | 'large'
  }
  
  // 학습 이력
  studyHistory: {
    totalWords: number
    totalTime: number // 분
    streak: number // 연속 학습일
    lastStudyDate?: Date
  }
}
```

### 2. Context 확장

#### 통합 VocabularyContext
```typescript
interface VocabularyContextValue {
  // 단어장 관리
  wordbooks: UnifiedWordbook[]
  selectedWordbooks: UnifiedWordbook[]
  
  // 단어 데이터 (통합된 모든 선택 단어장의 단어들)
  words: UnifiedWord[]
  filteredWords: UnifiedWord[]
  
  // 학습 상태
  studySession: {
    currentWordbook?: string
    progress: number
    timeSpent: number
  }
  
  // 액션
  selectWordbook: (id: string) => void
  unselectWordbook: (id: string) => void
  refreshWordbooks: () => Promise<void>
  
  // 필터링 (기존 유지)
  filter: VocabularyFilter
  setFilter: (filter: VocabularyFilter) => void
}
```

### 3. 컴포넌트 구조

#### 대시보드 컴포넌트
```typescript
// /src/app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="dashboard-layout">
      <DashboardHeader />
      
      <div className="dashboard-content">
        {/* 선택된 단어장 */}
        <SelectedWordbooksSection />
        
        {/* 단어장 추가 */}
        <AddWordbookSection />
        
        {/* 빠른 학습 시작 */}
        <QuickStudySection />
        
        {/* 학습 통계 */}
        <StudyStatsSection />
      </div>
    </div>
  )
}
```

#### 통합 단어장 선택 모달
```typescript
// /src/components/wordbook-selection-modal.tsx
interface WordbookSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (wordbook: UnifiedWordbook) => void
}

export function WordbookSelectionModal({ isOpen, onClose, onSelect }: WordbookSelectionModalProps) {
  const [activeTab, setActiveTab] = useState<UnifiedWordbook['type']>('official')
  
  const tabs = [
    { id: 'official', name: '공식 단어장', icon: '📖' },
    { id: 'personal', name: '내 단어장', icon: '👤' },
    { id: 'photo', name: '사진 단어', icon: '📸' },
    { id: 'public', name: '공개 단어장', icon: '🌍' }
  ]
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <h2>단어장 추가</h2>
      </ModalHeader>
      
      <TabNavigation tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      
      <ModalContent>
        <WordbookGrid 
          type={activeTab} 
          onSelect={onSelect}
          selectedIds={selectedWordbooks.map(w => w.id)}
        />
      </ModalContent>
    </Modal>
  )
}
```

## UI/UX 설계

### 1. 대시보드 레이아웃

```
┌─────────────────────────────────────────────────┐
│ 📚 Vocabulary Learning Hub                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🎯 내 학습 단어장                                │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │   SAT   │ │ 내단어장  │ │ 사진단어  │ │   +   │ │
│ │ 1,205   │ │   45    │ │   23    │ │ 추가하기 │ │
│ │ ████░░  │ │ ██████  │ │ ███░░░  │ │       │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│                                                 │
│ ⚡ 빠른 학습 시작                                │
│ [플래시카드] [퀴즈] [타이핑] [단어목록]           │
│                                                 │
│ 📊 이번 주 학습 현황                             │
│ • 학습한 단어: 127개                            │
│ • 학습 시간: 2시간 34분                         │
│ • 연속 학습: 5일                               │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2. 단어장 카드 디자인

```typescript
interface WordbookCardProps {
  wordbook: UnifiedWordbook
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onStartStudy: (id: string) => void
}

function WordbookCard({ wordbook, isSelected, onToggleSelect, onStartStudy }: WordbookCardProps) {
  return (
    <div className={cn(
      "wordbook-card",
      isSelected && "selected",
      `type-${wordbook.type}`
    )}>
      {/* 카드 헤더 */}
      <div className="card-header">
        <div className="wordbook-info">
          <h3>{wordbook.name}</h3>
          <p className="word-count">{wordbook.wordCount}개 단어</p>
        </div>
        <div className="actions">
          <Button
            variant={isSelected ? "destructive" : "primary"}
            size="sm"
            onClick={() => onToggleSelect(wordbook.id)}
          >
            {isSelected ? "제거" : "추가"}
          </Button>
        </div>
      </div>
      
      {/* 진도 표시 */}
      {wordbook.progress && (
        <div className="progress-section">
          <ProgressBar 
            value={(wordbook.progress.studied / wordbook.wordCount) * 100}
            className="mb-2"
          />
          <div className="progress-stats">
            <span>학습: {wordbook.progress.studied}</span>
            <span>완료: {wordbook.progress.mastered}</span>
          </div>
        </div>
      )}
      
      {/* 빠른 액션 */}
      <div className="quick-actions">
        <Button variant="outline" size="sm" onClick={() => onStartStudy(wordbook.id)}>
          학습 시작
        </Button>
      </div>
    </div>
  )
}
```

### 3. 색상 시스템

```css
:root {
  /* 단어장 타입별 색상 */
  --wordbook-official: #10b981; /* 초록 */
  --wordbook-personal: #8b5cf6; /* 보라 */
  --wordbook-photo: #f59e0b;    /* 주황 */
  --wordbook-public: #3b82f6;   /* 파랑 */
  
  /* 상태별 색상 */
  --selected-border: #2563eb;
  --progress-bg: #e5e7eb;
  --progress-fill: #10b981;
}

.wordbook-card {
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
  
  &.selected {
    border-color: var(--selected-border);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
  }
  
  &.type-official { border-left: 4px solid var(--wordbook-official); }
  &.type-personal { border-left: 4px solid var(--wordbook-personal); }
  &.type-photo { border-left: 4px solid var(--wordbook-photo); }
  &.type-public { border-left: 4px solid var(--wordbook-public); }
}
```

## 구현 단계

### Phase 1: 기반 구조 (Week 1-2)

#### 1.1 데이터 모델 및 타입 정의
- [ ] `UnifiedWordbook` 타입 정의
- [ ] `UserWordbookSettings` 타입 정의  
- [ ] 기존 타입과의 호환성 확보

#### 1.2 VocabularyContext 확장
- [ ] 단어장 선택/해제 로직 추가
- [ ] 통합 단어 로드 시스템 구현
- [ ] 기존 VocabularyContext와의 호환성 유지

#### 1.3 기본 컴포넌트 생성
- [ ] `WordbookCard` 컴포넌트
- [ ] `WordbookGrid` 컴포넌트
- [ ] `ProgressBar` 컴포넌트

### Phase 2: 대시보드 구현 (Week 3-4)

#### 2.1 대시보드 페이지 생성
- [ ] `/dashboard` 라우트 생성
- [ ] 대시보드 레이아웃 구현
- [ ] 선택된 단어장 표시 섹션

#### 2.2 단어장 선택 시스템
- [ ] 통합 단어장 선택 모달
- [ ] 탭 기반 카테고리 분류
- [ ] 검색 및 필터링 기능

#### 2.3 빠른 학습 시작
- [ ] 학습 모드 선택 버튼
- [ ] 선택된 단어장 기반 학습 시작
- [ ] 학습 세션 관리

### Phase 3: 통합 학습 시스템 (Week 5-6)

#### 3.1 기존 학습 페이지 개선
- [ ] 모든 선택된 단어장의 단어 통합 표시
- [ ] 단어장 필터링 옵션 추가
- [ ] 학습 진도 실시간 업데이트

#### 3.2 개별 학습 페이지 마이그레이션
- [ ] `/study/personal/[id]` → 통합 시스템 리다이렉트
- [ ] `/study/photo-test/[id]` → 통합 시스템 리다이렉트
- [ ] 기존 코드 점진적 제거

### Phase 4: 고급 기능 (Week 7-8)

#### 4.1 스마트 추천 시스템
- [ ] 학습 패턴 기반 추천
- [ ] 난이도 적합성 분석
- [ ] 개인화된 단어장 제안

#### 4.2 학습 분석 대시보드
- [ ] 학습 통계 시각화
- [ ] 진도 추적 차트
- [ ] 성취도 분석

#### 4.3 사용자 경험 개선
- [ ] 애니메이션 및 트랜지션
- [ ] 로딩 상태 최적화
- [ ] 반응형 디자인 완성

## 테스트 계획

### 단위 테스트
- [ ] VocabularyContext 로직 테스트
- [ ] 단어장 선택/해제 기능 테스트
- [ ] 통합 단어 로드 시스템 테스트

### 통합 테스트
- [ ] 대시보드 → 학습 시스템 플로우
- [ ] 단어장 선택 → 즉시 반영 테스트
- [ ] 크로스 브라우저 호환성 테스트

### 사용자 테스트
- [ ] 기존 사용자 마이그레이션 테스트
- [ ] 신규 사용자 온보딩 테스트
- [ ] 성능 및 사용성 테스트

## 마이그레이션 전략

### 1. 점진적 배포
- 기존 시스템 유지하면서 새 시스템 병행 운영
- 사용자가 선택적으로 새 UI 사용 가능
- A/B 테스트를 통한 효과 검증

### 2. 데이터 마이그레이션
```typescript
// 기존 사용자 설정을 새 형식으로 변환
function migrateUserSettings(oldSettings: OldUserSettings): UserWordbookSettings {
  return {
    selectedWordbooks: oldSettings.selectedVocabularies.map(vocabName => ({
      id: getWordbookIdByName(vocabName),
      type: 'official',
      selectedAt: new Date()
    })),
    studyPreferences: {
      dailyGoal: oldSettings.dailyGoal,
      showPronunciation: oldSettings.showPronunciation,
      showEtymology: oldSettings.showEtymology,
      showExamples: oldSettings.showExamples,
      textSize: oldSettings.textSize
    }
  }
}
```

### 3. 호환성 보장
- 기존 URL 구조 유지 (리다이렉트)
- 기존 API 엔드포인트 호환성
- 점진적 기능 제거 (deprecated 표시)

## 성능 고려사항

### 1. 데이터 로딩 최적화
- 단어장 메타데이터만 초기 로드
- 단어 데이터는 필요 시점에 lazy loading
- 무한 스크롤링으로 대용량 단어장 처리

### 2. 캐싱 전략
- 선택된 단어장 정보 로컬 캐시
- 학습 진도 실시간 동기화
- 오프라인 모드 지원

### 3. 번들 크기 최적화
- 코드 스플리팅으로 초기 로드 시간 단축
- 사용하지 않는 컴포넌트 tree shaking
- 이미지 최적화 및 lazy loading

## 접근성 (a11y)

### 키보드 네비게이션
- 모든 interactive 요소 키보드 접근 가능
- 논리적인 tab order 구성
- 단축키 지원

### 스크린 리더 지원
- 적절한 ARIA 라벨링
- 의미있는 헤딩 구조
- 상태 변화 알림

### 시각적 접근성
- 고대비 색상 조합
- 충분한 터치 타겟 크기
- 텍스트 크기 조절 지원

## 유지보수 계획

### 코드 품질
- TypeScript strict 모드 적용
- ESLint/Prettier 설정 강화
- 단위 테스트 90% 이상 커버리지

### 문서화
- 컴포넌트 Storybook 작성
- API 문서 자동 생성
- 사용자 가이드 작성

### 모니터링
- 사용자 행동 분석
- 성능 메트릭 추적
- 오류 로깅 및 알림

---

## 부록

### A. 기존 시스템과의 비교

| 항목 | 기존 시스템 | 새 시스템 | 개선사항 |
|------|------------|----------|----------|
| 단어장 선택 | 5개 페이지에 분산 | 1개 대시보드로 통합 | 복잡성 80% 감소 |
| 학습 시스템 | 타입별 개별 구현 | 통합 시스템 | 코드 중복 70% 감소 |
| 사용자 플로우 | 7-10 클릭 | 2-3 클릭 | 효율성 60% 향상 |
| 일관성 | 타입별 다른 UI | 통일된 UI/UX | 학습 곡선 50% 단축 |

### B. 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| Frontend | Next.js 15, React 18 | App Router 사용 |
| Styling | Tailwind CSS 4.0 | 커스텀 컴포넌트 시스템 |
| State Management | React Context + hooks | 복잡한 상태는 zustand 고려 |
| Database | Firebase Firestore | 기존 구조 유지 |
| Testing | Jest, React Testing Library | E2E는 Playwright |

### C. 디자인 시스템

#### 컬러 팔레트
- Primary: Blue (#3b82f6)
- Success: Green (#10b981)
- Warning: Orange (#f59e0b)
- Error: Red (#ef4444)
- Neutral: Gray (#6b7280)

#### 타이포그래피
- Heading: Inter (700)
- Body: Inter (400)
- Code: Fira Code (400)

#### 스페이싱
- Base unit: 4px
- Common sizes: 4, 8, 12, 16, 24, 32, 48, 64px

---

## 변경 이력

| 버전 | 날짜 | 변경사항 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2025-08-09 | 초기 문서 작성 | Claude Code |

---

*이 문서는 프로젝트 진행에 따라 지속적으로 업데이트됩니다.*