export interface UserSettings {
  id?: string
  userId: string
  selectedVocabularies: string[] // 선택된 단어장 파일명 목록
  dailyGoal?: number // 일일 학습 목표 단어 수 (기본값: 30)
  textSize?: 'small' | 'medium' | 'large' // 영어 설명, 어원, 예문 텍스트 크기 (기본값: 'medium')
  createdAt: Date
  updatedAt: Date
}