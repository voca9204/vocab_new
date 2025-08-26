# 통합 파일 추출 시스템

## 개요

2025년 1월 기준으로 파일 추출 메커니즘이 통합되었습니다. 모든 파일 형식(이미지, PDF, TXT, CSV)에 대해 일관된 추출 방식을 사용합니다.

## 아키텍처

### 추출 전략
- **이미지/사진**: Google Cloud Vision API (OCR) 우선, OpenAI Vision API 폴백
- **PDF/TXT/CSV**: 텍스트 추출 후 OpenAI API로 단어 정의 생성
- **Discovery**: OpenAI API로 새 단어 정의 실시간 생성

### 통합 API 엔드포인트
- **메인 엔드포인트**: `/api/extract`
  - 파일 업로드 및 Discovery 요청 모두 처리
  - FormData (파일) 또는 JSON (Discovery) 지원

### 하위 호환성 엔드포인트 (통합 API로 프록시)
- `/api/collections/extract-words`: 컬렉션 단어 추출
- `/api/photo-vocabulary/extract`: 사진 단어 추출
- `/api/vocabulary/discover`: Discovery 단어 생성

## 핵심 서비스

### UnifiedExtractionService
위치: `/src/lib/extraction/unified-extraction-service.ts`

주요 기능:
- 파일 타입 자동 감지
- OCR 프로바이더 선택 (Google/OpenAI)
- AI 기반 정의 생성
- 일반 단어 필터링
- 다국어 지원 (한국어/영어)

### 메서드
- `extractFromFile()`: 파일에서 단어 추출
- `extractFromImage()`: 이미지 OCR
- `extractFromPDF()`: PDF 텍스트 추출
- `extractFromText()`: 텍스트 파일 처리
- `extractFromCSV()`: CSV 파일 처리
- `discoverWord()`: 새 단어 정의 생성
- `extractWordsWithAI()`: AI로 단어+정의 추출

## 옵션

```typescript
interface ExtractionOptions {
  // 공통 옵션
  maxWords?: number              // 최대 단어 수
  targetLanguage?: 'en' | 'ko' | 'both'  // 대상 언어
  removeCommonWords?: boolean    // 일반 단어 제거
  
  // AI 옵션
  useAI?: boolean                // AI 사용 여부
  aiModel?: 'gpt-4' | 'gpt-3.5-turbo'  // AI 모델
  generateDefinitions?: boolean  // 정의 생성 여부
  
  // OCR 옵션
  ocrProvider?: 'google' | 'openai'  // OCR 프로바이더
  ocrConfidenceThreshold?: number    // OCR 신뢰도 임계값
  
  // 파일별 옵션
  pdfMaxPages?: number           // PDF 최대 페이지
  csvDelimiter?: string          // CSV 구분자
  csvHasHeader?: boolean         // CSV 헤더 여부
}
```

## 사용 예시

### 파일 업로드
```javascript
const formData = new FormData()
formData.append('file', file)
formData.append('options', JSON.stringify({
  maxWords: 1000,
  generateDefinitions: true,
  ocrProvider: 'google'
}))

const response = await fetch('/api/extract', {
  method: 'POST',
  body: formData
})
```

### Discovery 요청
```javascript
const response = await fetch('/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    word: 'ubiquitous',
    context: 'The smartphone has become ubiquitous in modern society',
    options: { aiModel: 'gpt-4' }
  })
})
```

## 에러 처리

### 폴백 전략
1. Google Vision 실패 → OpenAI Vision 시도
2. OpenAI Vision 실패 → 텍스트 전용 추출
3. AI 정의 생성 실패 → 단순 단어 목록 반환

### 에러 코드
- 400: 잘못된 요청 (파일 없음, 파일 크기 초과)
- 500: 서버 오류 (API 실패, 추출 실패)

## 성능 최적화

### 캐싱
- 싱글톤 서비스 인스턴스
- API 키 재사용
- 클라이언트 연결 유지

### 제한사항
- 파일 크기: 최대 20MB
- 단어 수: 최대 5000개
- PDF 페이지: 기본 10페이지 제한

## 마이그레이션 가이드

### 기존 엔드포인트에서 이동
1. `/api/collections/extract-words` → `/api/extract` (자동 프록시됨)
2. `/api/photo-vocabulary/extract` → `/api/extract` (자동 프록시됨)
3. `/api/vocabulary/discover` → `/api/extract` (자동 프록시됨)

### 코드 변경 없이 동작
모든 기존 엔드포인트는 하위 호환성을 위해 유지되며, 내부적으로 통합 API를 호출합니다.

## 향후 개선사항

### 계획된 기능
- [ ] 배치 파일 처리
- [ ] 실시간 진행률 표시
- [ ] 더 많은 파일 형식 지원 (DOCX, XLSX)
- [ ] 사용자 정의 추출 규칙
- [ ] 추출 히스토리 저장

### 성능 개선
- [ ] 병렬 처리 최적화
- [ ] 결과 캐싱 강화
- [ ] 스트리밍 응답 지원