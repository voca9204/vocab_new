export interface ExtractedVocabulary {
  id?: string
  number?: number // 단어장에서의 번호
  word: string
  definition: string
  partOfSpeech: string[]
  examples: string[]
  pronunciation?: string
  etymology?: string // 영어 정의 (영어 설명)
  realEtymology?: string // 실제 어원 (단어의 기원과 역사)
  synonyms?: string[]
  antonyms?: string[]
  difficulty?: number // 1-10
  frequency?: number // 빈도수
  source: {
    type: 'pdf' | 'manual' | 'api'
    filename?: string
    uploadedAt: Date
  }
  userId: string
  uploadedBy?: string // 관리자가 업로드한 경우 실제 업로더 ID
  isAdminContent?: boolean // 관리자가 업로드한 콘텐츠인지 여부
  createdAt: Date
  updatedAt: Date
  isSAT: boolean // SAT 단어 여부
  studyStatus: {
    studied: boolean
    masteryLevel: number // 0-100
    lastStudied?: Date
    reviewCount: number
    quizCount?: number
    typingCount?: number
  }
}

export interface VocabularyCollection {
  id?: string
  name: string
  description?: string
  words: string[] // word IDs
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface StudySession {
  id?: string
  userId: string
  wordIds: string[]
  startedAt: Date
  completedAt?: Date
  correctAnswers: number
  totalQuestions: number
  sessionType: 'quiz' | 'flashcard' | 'writing' | 'review'
}