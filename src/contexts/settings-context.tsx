'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { db } from '@/lib/firebase/config'
import { doc, onSnapshot } from 'firebase/firestore'
import type { UserSettings } from '@/types/user-settings'

interface SettingsContextValue {
  settings: UserSettings | null
  loading: boolean
  displayOptions: {
    showSynonyms: boolean
    showAntonyms: boolean
    showEtymology: boolean
    showExamples: boolean
  }
  textSize: 'small' | 'medium' | 'large'
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: null,
  loading: true,
  displayOptions: {
    showSynonyms: true,
    showAntonyms: false,
    showEtymology: true,
    showExamples: true
  },
  textSize: 'medium'
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSettings(null)
      setLoading(false)
      return
    }

    const unsubscribe = onSnapshot(
      doc(db, 'userSettings', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          setSettings({
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as UserSettings)
        }
        setLoading(false)
      },
      (error) => {
        console.error('Error listening to settings:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  // settings-updated 이벤트 리스너 추가
  useEffect(() => {
    const handleSettingsUpdate = () => {
      // 설정이 업데이트되면 컴포넌트 리렌더링
      console.log('Settings updated event received')
    }

    window.addEventListener('settings-updated', handleSettingsUpdate)
    return () => window.removeEventListener('settings-updated', handleSettingsUpdate)
  }, [])

  const displayOptions = {
    showSynonyms: settings?.displayOptions?.showSynonyms ?? true,
    showAntonyms: settings?.displayOptions?.showAntonyms ?? false,
    showEtymology: settings?.displayOptions?.showEtymology ?? true,
    showExamples: settings?.displayOptions?.showExamples ?? true
  }

  const textSize = settings?.textSize || 'medium'

  return (
    <SettingsContext.Provider value={{ settings, loading, displayOptions, textSize }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
