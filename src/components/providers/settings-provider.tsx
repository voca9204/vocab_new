'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './auth-provider'
import { UserSettingsService } from '@/lib/settings/user-settings-service'
import type { UserSettings } from '@/types/user-settings'

interface SettingsContextType {
  settings: UserSettings | null
  textSize: 'small' | 'medium' | 'large'
  displayOptions: {
    showSynonyms: boolean
    showAntonyms: boolean
    showEtymology: boolean
    showExamples: boolean
  }
  loading: boolean
}

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  textSize: 'medium',
  displayOptions: {
    showSynonyms: true,
    showAntonyms: false,
    showEtymology: true,
    showExamples: true
  },
  loading: true,
})

const settingsService = new UserSettingsService()

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSettings = React.useCallback(async () => {
    if (!user) return

    try {
      const userSettings = await settingsService.getUserSettings(user.uid)
      setSettings(userSettings)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadSettings()
      
      // 설정이 변경될 때마다 다시 로드하기 위한 이벤트 리스너
      const handleSettingsUpdate = () => {
        loadSettings()
      }
      
      window.addEventListener('settings-updated', handleSettingsUpdate)
      
      return () => {
        window.removeEventListener('settings-updated', handleSettingsUpdate)
      }
    } else {
      setSettings(null)
      setLoading(false)
    }
  }, [user, loadSettings])

  const textSize = settings?.textSize || 'medium'
  
  const displayOptions = {
    showSynonyms: settings?.displayOptions?.showSynonyms ?? true,
    showAntonyms: settings?.displayOptions?.showAntonyms ?? false,
    showEtymology: settings?.displayOptions?.showEtymology ?? true,
    showExamples: settings?.displayOptions?.showExamples ?? true
  }

  return (
    <SettingsContext.Provider value={{ settings, textSize, displayOptions, loading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}

// 텍스트 크기에 따른 Tailwind 클래스를 반환하는 유틸리티 함수
export const getTextSizeClass = (size: 'small' | 'medium' | 'large', type: 'normal' | 'title' = 'normal') => {
  if (type === 'title') {
    switch (size) {
      case 'small': return 'text-base'
      case 'large': return 'text-xl'
      default: return 'text-lg'
    }
  }
  
  switch (size) {
    case 'small': return 'text-sm'
    case 'large': return 'text-lg'
    default: return 'text-base'
  }
}