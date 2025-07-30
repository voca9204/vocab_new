export interface UserSettings {
  id?: string
  userId: string
  selectedVocabularies: string[] // 선택된 단어장 파일명 목록
  createdAt: Date
  updatedAt: Date
}