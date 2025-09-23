// Simplified Collection Types - V4 Refactoring
// Focus: Official collections only, maximum simplicity

// 공식 단어장 카테고리
export type OfficialCategory = 'SAT' | 'TOEFL' | 'TOEIC' | '수능' | 'GRE' | 'IELTS' | '기본' | '학원'

// 난이도 레벨
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

// 단순화된 공식 컬렉션
export interface SimpleCollection {
  id: string
  name: string                    // 예: "SAT Essential"
  category: OfficialCategory
  difficulty: DifficultyLevel
  description: string
  wordCount: number
  icon?: string                   // 카드 UI용 아이콘
  color?: string                  // 카드 UI용 색상
  estimatedStudyTime?: number     // 예상 학습 시간 (분)
  popularityScore?: number        // 인기도 (정렬용)
}

// 레벨별 컬렉션 그룹
export interface LevelGroup {
  category: OfficialCategory
  levels: {
    beginner?: SimpleCollection
    intermediate?: SimpleCollection
    advanced?: SimpleCollection
  }
}

// API Response (단순화)
export interface CollectionResponse {
  collection: SimpleCollection
  words?: any[] // UnifiedWord[] - 필요시만 포함
}

// 컬렉션 목록 응답 (단순화)
export interface CollectionsListResponse {
  collections: SimpleCollection[]
  groupedByCategory?: LevelGroup[]
}

// 간단한 필터 옵션
export interface SimpleFilterOptions {
  category?: OfficialCategory
  difficulty?: DifficultyLevel
}

// 학습 진도 (별도 관리)
export interface StudyProgress {
  userId: string
  collectionId: string
  studiedWords: number
  masteredWords: number
  lastStudiedAt?: Date
  currentStreak?: number
}

// Helper functions
export function getCollectionPath(category: OfficialCategory, difficulty: DifficultyLevel): string {
  return `/study/${category.toLowerCase()}/${difficulty}`
}

export function getCollectionId(category: OfficialCategory, difficulty: DifficultyLevel): string {
  return `${category.toLowerCase()}_${difficulty}`
}

// 카테고리별 색상 매핑
export const categoryColors: Record<OfficialCategory, string> = {
  'SAT': 'bg-blue-500',
  'TOEFL': 'bg-green-500',
  'TOEIC': 'bg-purple-500',
  '수능': 'bg-red-500',
  'GRE': 'bg-indigo-500',
  'IELTS': 'bg-orange-500',
  '기본': 'bg-gray-500',
  '학원': 'bg-yellow-500'
}

// 카테고리별 아이콘 매핑
export const categoryIcons: Record<OfficialCategory, string> = {
  'SAT': '🎓',
  'TOEFL': '🌍',
  'TOEIC': '💼',
  '수능': '🇰🇷',
  'GRE': '📚',
  'IELTS': '🌐',
  '기본': '📖',
  '학원': '🏫'
}