import { UserSettingsService } from './user-settings-service'

const settingsService = new UserSettingsService()

/**
 * 사용자가 선택한 단어장 목록을 가져옵니다.
 * @param userId 사용자 ID
 * @returns 선택된 단어장 파일명 배열 (빈 배열 = 전체 선택, ['__none__'] = 아무것도 선택 안함)
 */
export async function getSelectedSources(userId: string): Promise<string[]> {
  try {
    const settings = await settingsService.getUserSettings(userId)
    return settings?.selectedVocabularies || []
  } catch (error) {
    console.error('Error getting selected sources:', error)
    return [] // 오류 시 전체 선택
  }
}

/**
 * 단어를 선택된 단어장으로 필터링합니다.
 */
export function filterWordsBySelectedSources<T extends { source?: { filename?: string } }>(
  words: T[],
  selectedSources: string[]
): T[] {
  // 빈 배열 = 전체 선택
  if (selectedSources.length === 0) {
    return words
  }
  
  // '__none__' = 아무것도 선택 안함
  if (selectedSources.includes('__none__')) {
    return []
  }
  
  // 선택된 단어장으로 필터링
  return words.filter(word => 
    selectedSources.includes(word.source?.filename || '')
  )
}