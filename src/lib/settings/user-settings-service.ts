import { db } from '../firebase/config'
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  Timestamp 
} from 'firebase/firestore'
import { UserSettings } from '@/types/user-settings'

export class UserSettingsService {
  private readonly collectionName = 'userSettings'

  /**
   * 사용자 설정 가져오기
   */
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const docRef = doc(db, this.collectionName, userId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          userId: data.userId,
          selectedVocabularies: data.selectedVocabularies || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
      }
      
      // 설정이 없으면 기본값으로 생성
      const defaultSettings: UserSettings = {
        userId,
        selectedVocabularies: [], // 빈 배열 = 전체 선택
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await this.saveUserSettings(defaultSettings)
      return defaultSettings
    } catch (error) {
      console.error('Error getting user settings:', error)
      return null
    }
  }

  /**
   * 사용자 설정 저장
   */
  async saveUserSettings(settings: UserSettings): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, settings.userId)
      await setDoc(docRef, {
        userId: settings.userId,
        selectedVocabularies: settings.selectedVocabularies,
        createdAt: Timestamp.fromDate(settings.createdAt),
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error saving user settings:', error)
      throw error
    }
  }

  /**
   * 선택된 단어장 업데이트
   */
  async updateSelectedVocabularies(userId: string, vocabularies: string[]): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, userId)
      await updateDoc(docRef, {
        selectedVocabularies: vocabularies,
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      // 문서가 없으면 생성
      if (error instanceof Error && error.message.includes('No document')) {
        const settings: UserSettings = {
          userId,
          selectedVocabularies: vocabularies,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        await this.saveUserSettings(settings)
      } else {
        throw error
      }
    }
  }
}

export default UserSettingsService