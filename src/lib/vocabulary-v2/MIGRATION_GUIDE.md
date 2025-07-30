# 데이터베이스 마이그레이션 가이드

## 개요
이 가이드는 기존 3개 컬렉션 구조에서 새로운 5개 컬렉션 구조로 안전하게 마이그레이션하는 방법을 설명합니다.

## 사전 준비

### 1. 백업 생성
```bash
# Firebase 콘솔에서 수동 백업
# 또는 Firebase Admin SDK를 사용한 백업
firebase firestore:export gs://your-backup-bucket/migration-backup-$(date +%Y%m%d)
```

### 2. 종속성 확인
```bash
# ts-node가 설치되어 있는지 확인
npm list ts-node

# 없다면 설치
npm install --save-dev ts-node
```

## 마이그레이션 실행

### Step 1: Dry Run (테스트 실행)
먼저 실제 데이터를 변경하지 않고 시뮬레이션합니다.

```bash
# Firebase 에뮬레이터 시작
npm run emulators

# 다른 터미널에서 dry run 실행
npm run migrate:dry
```

예상 출력:
```
🚀 마이그레이션 시작 (DRY RUN: true)
📦 백업 확인 중...
✅ 백업 확인 완료

📚 단어 마이그레이션 시작...
✅ 단어 마이그레이션 완료: 1821개 (중복 0개)

📂 단어장 마이그레이션 시작...
✅ 단어장 마이그레이션 완료: 1개

🔗 단어-단어장 매핑 시작...
✅ 단어-단어장 매핑 완료: 1821개

👤 사용자 진도 마이그레이션 시작...
✅ 사용자 진도 마이그레이션 완료: 0개

🔍 마이그레이션 검증 중...
✅ 검증 완료

📊 마이그레이션 결과 보고서
========================
총 단어 수: 1821
중복 제거된 단어: 0
총 단어장 수: 1
단어-단어장 매핑: 1821
사용자 진도 기록: 0

✅ 오류 없이 완료!
```

### Step 2: 실제 마이그레이션
Dry run이 성공적으로 완료되면 실제 마이그레이션을 실행합니다.

```bash
# 실제 마이그레이션 실행
npm run migrate:execute
```

⚠️ **주의**: 이 명령은 실제로 데이터베이스를 변경합니다!

### Step 3: 검증
마이그레이션 후 데이터 무결성을 확인합니다.

```bash
# Firebase 콘솔에서 확인
# 1. words 컬렉션: ~1821개 문서
# 2. vocabularies 컬렉션: 최소 1개 (V.ZIP 시스템 단어장)
# 3. vocabulary_words 컬렉션: ~1821개 매핑
# 4. user_vocabularies 컬렉션: 사용자 수에 따라 다름
# 5. user_words 컬렉션: 학습 기록에 따라 다름
```

## 롤백 절차

마이그레이션에 문제가 발생한 경우:

### 1. 백업에서 복원
```bash
# Firebase 콘솔에서 복원
firebase firestore:import gs://your-backup-bucket/migration-backup-20250130
```

### 2. 코드 원복
```bash
# 이전 커밋으로 되돌리기
git checkout <previous-commit-hash>
```

## 마이그레이션 후 작업

### 1. 애플리케이션 코드 업데이트
```typescript
// 기존 코드
import { VocabularyService } from '@/lib/api/vocabulary-service'

// 새 코드
import { WordService } from '@/lib/vocabulary-v2/word-service'
import { VocabularyService } from '@/lib/vocabulary-v2/vocabulary-service'
```

### 2. UI 컴포넌트 업데이트
- 단어 목록 페이지
- 학습 페이지
- 진도 표시 컴포넌트

### 3. 기존 서비스 제거
마이그레이션이 완료되고 안정화되면:
- 기존 서비스 파일 제거
- 기존 타입 정의 제거
- 사용하지 않는 컬렉션 삭제

## 트러블슈팅

### 문제 1: ts-node 실행 오류
```bash
# tsconfig 문제인 경우
npx ts-node --project tsconfig.json src/lib/vocabulary-v2/migration-script.ts
```

### 문제 2: Firebase 권한 오류
```bash
# Firebase 로그인 확인
firebase login

# 프로젝트 확인
firebase use vocabulary-app-new
```

### 문제 3: 메모리 부족
대량의 데이터가 있는 경우:
```bash
# 메모리 할당 증가
NODE_OPTIONS="--max-old-space-size=4096" npm run migrate:execute
```

## 성공 지표

마이그레이션이 성공적으로 완료되었는지 확인:

1. ✅ 모든 단어가 중복 없이 마이그레이션됨
2. ✅ 단어장이 올바르게 생성됨
3. ✅ 단어-단어장 매핑이 정확함
4. ✅ 사용자 학습 기록이 보존됨
5. ✅ 애플리케이션이 정상 작동함

## 다음 단계

1. 호환성 레이어 구현 (필요한 경우)
2. 기존 코드 점진적 마이그레이션
3. 성능 모니터링 및 최적화
4. 사용자 피드백 수집