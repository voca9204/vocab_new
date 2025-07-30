# 데이터베이스 마이그레이션 계획

## 개요
기존 3개 컬렉션 구조에서 새로운 5개 컬렉션 구조로 마이그레이션

### 마이그레이션 대상
- `veterans_vocabulary` → `words` + `vocabularies` + `vocabulary_words`
- `vocabulary_collections` → `vocabularies`
- `user_vocabulary_progress` → `user_vocabularies` + `user_words`

## 마이그레이션 단계

### Phase 1: 사전 준비 (Day 1)
1. **백업 생성**
   - Firebase 콘솔에서 전체 백업
   - 로컬 JSON 백업 생성
   - 백업 검증

2. **마이그레이션 스크립트 작성**
   - 데이터 변환 로직
   - 중복 제거 로직
   - 검증 로직

3. **테스트 환경 준비**
   - Firebase 에뮬레이터에서 테스트
   - 샘플 데이터로 검증

### Phase 2: 마스터 단어 DB 구축 (Day 2)
1. **단어 추출 및 중복 제거**
   ```typescript
   // veterans_vocabulary에서 고유 단어 추출
   const uniqueWords = new Map<string, Word>()
   
   // 중복 제거하며 words 컬렉션 생성
   for (const vocab of veteransVocabulary) {
     if (!uniqueWords.has(vocab.word)) {
       uniqueWords.set(vocab.word, {
         word: vocab.word,
         definitions: [{
           definition: vocab.definition,
           language: 'ko',
           source: 'veterans',
           examples: vocab.examples
         }],
         pronunciation: vocab.pronunciation,
         partOfSpeech: vocab.partOfSpeech,
         etymology: vocab.etymology,
         difficulty: vocab.difficulty,
         frequency: vocab.frequency,
         isSAT: vocab.isSAT,
         createdAt: vocab.createdAt,
         createdBy: vocab.userId || 'system'
       })
     }
   }
   ```

2. **Words 컬렉션 생성**
   - 고유 단어들을 words 컬렉션에 저장
   - AI 생성 콘텐츠 표시
   - 총 예상: ~1821개 단어

### Phase 3: 단어장 생성 (Day 2)
1. **시스템 단어장 생성**
   ```typescript
   // Veterans 단어장 생성
   const veteransVocabulary = {
     name: "V.ZIP 3K 단어장",
     description: "V.ZIP 3K PDF에서 추출한 SAT 단어",
     type: 'system',
     ownerType: 'system',
     ownerId: 'system',
     visibility: 'public',
     category: 'SAT',
     level: 'advanced',
     tags: ['SAT', 'V.ZIP', '3K'],
     wordCount: 1821,
     source: {
       type: 'pdf',
       filename: 'V.ZIP 3K.pdf',
       uploadedAt: new Date()
     }
   }
   ```

2. **사용자 단어장 마이그레이션**
   - vocabulary_collections → vocabularies
   - 소유자 정보 매핑
   - 공개/비공개 설정

### Phase 4: 단어-단어장 매핑 (Day 3)
1. **VocabularyWords 생성**
   ```typescript
   // 각 단어장의 단어들을 매핑
   for (const vocab of veteransVocabulary) {
     const wordId = wordMap.get(vocab.word)
     await vocabularyWordService.addWordToVocabulary(
       veteransVocabularyId,
       wordId,
       'system'
     )
   }
   ```

2. **순서 정보 유지**
   - 기존 순서 정보 보존
   - 새로운 order 필드에 매핑

### Phase 5: 사용자 데이터 마이그레이션 (Day 3)
1. **UserVocabularies 생성**
   - 사용자별 단어장 구독 정보
   - 학습 진도 정보
   - 설정 정보

2. **UserWords 생성**
   - user_vocabulary_progress → user_words
   - 학습 상태 매핑
   - 북마크 정보 보존

### Phase 6: 검증 및 전환 (Day 4)
1. **데이터 검증**
   - 총 개수 확인
   - 무결성 검사
   - 샘플 데이터 검증

2. **애플리케이션 코드 전환**
   - 새로운 서비스 클래스 사용
   - UI 컴포넌트 업데이트
   - API 엔드포인트 수정

3. **롤백 계획**
   - 백업에서 복원 절차
   - 문제 발생 시 대응 방안

## 예상 소요 시간
- 총 4일 (개발 환경)
- 실제 마이그레이션: 2-3시간

## 리스크 및 대응 방안

### 리스크 1: 데이터 손실
- **대응**: 완전한 백업 및 검증
- **롤백**: 백업에서 즉시 복원

### 리스크 2: 중복 데이터
- **대응**: 중복 제거 로직 철저히 테스트
- **검증**: 마이그레이션 후 중복 검사

### 리스크 3: 성능 저하
- **대응**: 배치 처리 및 인덱스 최적화
- **모니터링**: 실행 시간 추적

## 성공 기준
1. ✅ 모든 데이터 손실 없이 마이그레이션
2. ✅ 중복 단어 제거로 효율성 향상
3. ✅ 기존 기능 모두 정상 작동
4. ✅ 성능 저하 없음

## 다음 단계
1. 마이그레이션 스크립트 작성
2. 로컬 환경에서 테스트
3. 검증 후 실행