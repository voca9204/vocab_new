# Words Quality Improvement Agent

## 개요
Firestore `words` 컬렉션의 데이터 품질을 자동으로 개선하는 스크립트입니다.

## 주요 기능

### 1. 데이터 정리
- **어원 분리**: definition 필드에 섞여있는 어원 정보를 etymology 필드로 분리
- **잘못된 데이터 수정**: "N/A", 빈 값 등 처리

### 2. AI를 통한 데이터 보완
- **한국어 정의 추가**: 누락된 한국어 정의 생성
- **영어 정의 추가**: 누락된 영어 정의 생성
- **어원 정보 추가**: 단어의 기원과 역사 추가
- **예문 생성**: 2-3개의 실용적인 예문 생성
- **동의어/반의어 추가**: 관련 단어 정보 추가
- **난이도 설정**: 1-10 레벨로 난이도 자동 평가
- **SAT 플래그**: SAT 시험 빈출 단어 여부 판단

## 사용 방법

### 기본 실행
```bash
node scripts/improve-words-quality.js
```

### 옵션
```bash
# 테스트 모드 (DB 업데이트 없이 시뮬레이션)
node scripts/improve-words-quality.js --dry-run

# 처리할 단어 수 제한
node scripts/improve-words-quality.js --limit 100

# 배치 크기 조정 (기본값: 10)
node scripts/improve-words-quality.js --batch 5

# 조합 사용
node scripts/improve-words-quality.js --dry-run --limit 50 --batch 5
```

### 도움말
```bash
node scripts/improve-words-quality.js --help
```

## 기능 상세

### 진행 상황 추적
- **체크포인트 시스템**: 중단 시 자동 저장, 재시작 시 이어서 처리
- **실시간 로그**: 처리 상황을 콘솔과 파일에 기록
- **통계 리포트**: 처리 완료 후 상세 통계 제공

### 파일 생성
- `word-quality-checkpoint.json`: 진행 상황 저장
- `word-quality-improvement.log`: 상세 로그 기록

### 처리 우선순위
1. definition이 없거나 "N/A"인 단어
2. definition에 어원이 섞여있는 단어
3. examples가 없는 단어
4. etymology가 없는 단어

## 예상 결과

### Before (promise 단어)
```json
{
  "word": "promise",
  "partOfSpeech": ["n."],
  "definition": null,
  "englishDefinition": null,
  "difficulty": 3,
  "isSAT": false
}
```

### After
```json
{
  "word": "promise",
  "partOfSpeech": ["n.", "v."],
  "definition": "약속, 맹세",
  "englishDefinition": "A declaration that one will do or refrain from doing something",
  "etymology": "From Latin 'promittere' meaning 'send forth, promise'",
  "examples": [
    "She made a promise to visit her grandmother every week.",
    "The new technology promises to revolutionize the industry."
  ],
  "synonyms": ["vow", "pledge", "commitment", "oath"],
  "antonyms": ["break", "betray"],
  "difficulty": 3,
  "isSAT": true,
  "qualityImproved": true,
  "qualityImprovedAt": "2025-08-21T..."
}
```

## 성능 고려사항

### API 사용량
- OpenAI API 호출: 누락된 데이터가 있는 단어당 1회
- 배치 처리로 효율성 향상
- 2초 딜레이로 rate limit 방지

### 처리 시간
- 단어당 평균 처리 시간: 1-2초
- 2,500개 단어 예상 시간: 약 1-2시간
- 체크포인트로 중단/재개 가능

### 비용 예상
- GPT-4o-mini 사용
- 단어당 약 500-1000 토큰
- 2,500개 단어: 약 $1-3 예상

## 안전장치

### 데이터 보호
- `--dry-run` 모드로 사전 테스트
- 원본 데이터 보존 (update only)
- 체크포인트로 진행상황 보호
- 상세 로그로 모든 변경사항 추적

### 에러 처리
- API 실패 시 해당 단어 스킵
- 네트워크 에러 시 자동 재시도
- 치명적 에러 시 체크포인트 저장 후 종료

## 모니터링

### 실시간 진행상황
```
[2025-08-21T12:00:00] [BATCH] 📦 Processing batch 1/250
[2025-08-21T12:00:01] [ADD] - Added Korean definition: 약속
[2025-08-21T12:00:01] [SUCCESS] ✅ Updated "promise" with 5 improvements
[2025-08-21T12:00:02] [PROGRESS] 📈 Progress: 10/2500 (0.4%)
```

### 최종 리포트
```
===========================================================
✅ WORDS QUALITY IMPROVEMENT COMPLETED
===========================================================
📊 Final Statistics:
   Total Processed: 2500
   Words Updated: 1800
   Words Skipped: 700
   Definitions Added: 500
   Etymology Separated: 300
   Success Rate: 72.00%
```

## 주의사항

1. **첫 실행은 반드시 `--dry-run`으로 테스트**
2. **OpenAI API 키 확인 필수**
3. **Firebase Admin 권한 필요**
4. **실행 중 중단 시 체크포인트 자동 저장됨**
5. **다음 실행 시 자동으로 이어서 처리**

## 문제 해결

### API 키 오류
```bash
export OPENAI_API_KEY="your-api-key"
export FIREBASE_ADMIN_PROJECT_ID="vocabulary-app-new"
```

### 메모리 부족
```bash
# 배치 크기 줄이기
node scripts/improve-words-quality.js --batch 5
```

### 특정 단어부터 시작
체크포인트 파일 수정:
```json
{
  "lastProcessedId": "specific-word-id"
}
```