import { collection, query, where, Query, DocumentData, or } from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * 사용자와 관리자가 업로드한 단어를 모두 가져오는 쿼리 생성
 * @param collectionName Firestore 컬렉션 이름
 * @param userId 현재 사용자 ID
 * @param additionalConstraints 추가 쿼리 조건들
 * @returns Firestore 쿼리
 */
export function createVocabularyQuery(
  collectionName: string,
  userId: string | null | undefined,
  ...additionalConstraints: any[]
): Query<DocumentData> {
  if (!userId) {
    // 로그인하지 않은 경우 관리자 콘텐츠만
    return query(
      collection(db, collectionName),
      where('userId', '==', 'admin'),
      ...additionalConstraints
    )
  }

  // 로그인한 경우 본인 콘텐츠 + 관리자 콘텐츠
  return query(
    collection(db, collectionName),
    or(
      where('userId', '==', userId),
      where('userId', '==', 'admin')
    ),
    ...additionalConstraints
  )
}

/**
 * 선택된 출처에 따른 쿼리 생성
 * @param collectionName Firestore 컬렉션 이름
 * @param userId 현재 사용자 ID
 * @param selectedSources 선택된 출처 목록
 * @returns Firestore 쿼리
 */
export function createVocabularyQueryWithSources(
  collectionName: string,
  userId: string | null | undefined,
  selectedSources: string[]
): Query<DocumentData> {
  const baseConstraints = []
  
  // 선택된 출처가 있고 __none__이 아닌 경우에만 필터링
  if (selectedSources.length > 0 && !selectedSources.includes('__none__')) {
    baseConstraints.push(where('source.filename', 'in', selectedSources))
  }
  
  return createVocabularyQuery(collectionName, userId, ...baseConstraints)
}