export interface UserSettings {
  id?: string
  userId: string
  selectedVocabularies: string[] // 선택된 단어장 파일명 목록 (레거시 호환용)
  dailyGoal?: number // 일일 학습 목표 단어 수 (기본값: 30)
  textSize?: 'small' | 'medium' | 'large' // 영어 설명, 어원, 예문 텍스트 크기 (기본값: 'medium')
  
  // 단어 표시 설정
  displayOptions?: {
    showSynonyms: boolean     // 유사어 표시 (기본값: true)
    showAntonyms: boolean     // 반의어 표시 (기본값: false)
    showEtymology: boolean    // 어원 표시 (기본값: true)
    showExamples: boolean     // 예문 표시 (기본값: true)
  }

  // 통합 단어장 선택 시스템 (새로운 방식)
  selectedWordbooks?: SelectedWordbook[]
  
  // 학습 기록 및 통계 (확장된 기능)
  studyHistory?: {
    totalWords: number        // 총 학습한 단어 수
    totalTime: number         // 총 학습 시간 (분)
    streak: number           // 연속 학습일
    lastStudyDate?: Date     // 마지막 학습 날짜
  }
  
  createdAt: Date
  updatedAt: Date
}

// 통합 단어장 선택 정보
export interface SelectedWordbook {
  id: string                    // 단어장 ID
  type: WordbookType           // 단어장 타입
  name: string                 // 단어장 이름 (캐시용)
  selectedAt: Date             // 선택된 시간
  priority?: number            // 학습 우선순위 (1-10, 높을수록 우선)
}

// 단어장 타입 정의
export type WordbookType = 'official' | 'personal' | 'ai-generated' | 'photo' | 'public'

// 기본 설정값 정의
export const DEFAULT_USER_SETTINGS: Partial<UserSettings> = {
  selectedVocabularies: [],
  selectedWordbooks: [],
  dailyGoal: 30,
  textSize: 'medium',
  displayOptions: {
    showSynonyms: true,
    showAntonyms: false,
    showEtymology: true,
    showExamples: true,
  },
  studyHistory: {
    totalWords: 0,
    totalTime: 0,
    streak: 0,
  }
}

// 유틸리티 함수: 레거시 설정을 새 형식으로 변환
export function migrateLegacySettings(oldSettings: UserSettings): UserSettings {
  // 이미 새 형식이면 그대로 반환
  if (oldSettings.selectedWordbooks) {
    return oldSettings
  }

  // 레거시 selectedVocabularies를 selectedWordbooks로 변환
  const selectedWordbooks: SelectedWordbook[] = oldSettings.selectedVocabularies.map((vocabName, index) => ({
    id: vocabName, // 레거시 시스템에서는 이름이 ID 역할
    type: 'official' as WordbookType, // 기존은 모두 공식 단어장
    name: vocabName,
    selectedAt: new Date(),
    priority: index + 1
  }))

  return {
    ...oldSettings,
    selectedWordbooks,
    studyHistory: oldSettings.studyHistory || DEFAULT_USER_SETTINGS.studyHistory
  }
}

// 유틸리티 함수: 새 형식을 레거시 형식으로 변환 (하위 호환성)
export function toLegacySettings(newSettings: UserSettings): UserSettings {
  const legacyVocabularies = newSettings.selectedWordbooks
    ?.filter(wb => wb.type === 'official')
    .map(wb => wb.name) || newSettings.selectedVocabularies

  return {
    ...newSettings,
    selectedVocabularies: legacyVocabularies
  }
}