export interface UserSettings {
  id?: string
  userId: string
  selectedVocabularies: string[] // 선택된 단어장 파일명 목록
  dailyGoal?: number // 일일 학습 목표 단어 수 (기본값: 30)
  createdAt: Date
  updatedAt: Date
}