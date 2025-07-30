# Firestore 인덱스 설정 가이드

## 중복 방지를 위한 권장 설정

### 1. Firestore 콘솔에서 설정할 인덱스

#### words 컬렉션
```
컬렉션: words
필드: word (오름차순)
쿼리 범위: 컬렉션
```

이 인덱스는 `findWordByText()` 쿼리 성능을 향상시킵니다.

### 2. 추가 보안 규칙 (firestore.rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // words 컬렉션 규칙
    match /words/{wordId} {
      // 읽기는 모든 사용자 허용
      allow read: if true;
      
      // 쓰기는 인증된 사용자만
      allow create: if request.auth != null
        && request.resource.data.word is string
        && request.resource.data.word.size() > 0;
      
      // 업데이트는 단어 필드를 변경하지 않는 경우만 허용
      allow update: if request.auth != null
        && request.resource.data.word == resource.data.word;
      
      // 삭제는 관리자만 (추후 구현)
      allow delete: if false;
    }
  }
}
```

### 3. 클라이언트 사이드 검증 추가

WordService에 추가할 수 있는 개선사항:

```typescript
// 단어 정규화 함수
private normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // 중복 공백 제거
    .replace(/[^\w\s-]/g, ''); // 특수문자 제거 (하이픈 제외)
}
```

### 4. 배치 작업 시 중복 방지

대량 단어 추가 시:

```typescript
async addMultipleWords(words: Array<Partial<Word> & { word: string }>): Promise<Word[]> {
  // 먼저 모든 단어를 정규화하고 중복 제거
  const uniqueWords = new Map<string, typeof words[0]>();
  
  for (const word of words) {
    const normalized = this.normalizeWord(word.word);
    if (!uniqueWords.has(normalized)) {
      uniqueWords.set(normalized, { ...word, word: normalized });
    }
  }
  
  // 기존 단어 확인
  const existingWords = await this.checkExistingWords(Array.from(uniqueWords.keys()));
  
  // 새 단어만 추가
  const newWords = Array.from(uniqueWords.entries())
    .filter(([word]) => !existingWords.has(word))
    .map(([, wordData]) => wordData);
  
  // 배치로 추가
  return this.batchCreateWords(newWords);
}
```

### 5. 모니터링 및 정기 검사

```typescript
// 정기적으로 중복 검사 실행
async checkDatabaseIntegrity(): Promise<{
  totalWords: number;
  duplicates: string[];
}> {
  const words = await this.getAllWords();
  const wordMap = new Map<string, string[]>();
  
  words.forEach(word => {
    const normalized = this.normalizeWord(word.word);
    if (!wordMap.has(normalized)) {
      wordMap.set(normalized, []);
    }
    wordMap.get(normalized)!.push(word.id);
  });
  
  const duplicates = Array.from(wordMap.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([word]) => word);
  
  return {
    totalWords: words.length,
    duplicates
  };
}
```

## 요약

현재 구현으로도 중복 방지가 되지만, 다음을 추가하면 더 견고해집니다:

1. **Firestore 인덱스** - 쿼리 성능 향상
2. **보안 규칙** - 서버 레벨에서 중복 방지
3. **단어 정규화** - 일관된 형식 유지
4. **배치 작업 최적화** - 대량 작업 시 중복 방지
5. **정기 검사** - 데이터 무결성 모니터링