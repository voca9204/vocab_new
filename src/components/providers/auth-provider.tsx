'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { onAuthStateChanged, auth } from '@/lib/firebase/auth'
import type { User as AppUser } from '@/types'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser)
        
        if (firebaseUser) {
          // Firebase User를 AppUser 형태로 변환
          const userData: AppUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || null,
            photoURL: firebaseUser.photoURL || null,
            createdAt: new Date(firebaseUser.metadata.creationTime!),
            lastLoginAt: new Date(firebaseUser.metadata.lastSignInTime!),
          }
          setAppUser(userData)
        } else {
          setAppUser(null)
        }
      } catch (error) {
        console.error('Error processing auth state change:', error)
        setUser(null)
        setAppUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true)
    try {
      const { loginUser } = await import('@/lib/firebase/auth')
      await loginUser(email, password)
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, displayName?: string): Promise<void> => {
    setLoading(true)
    try {
      const { registerUser } = await import('@/lib/firebase/auth')
      await registerUser(email, password, displayName)
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true)
    try {
      const { loginWithGoogle } = await import('@/lib/firebase/auth')
      await loginWithGoogle()
    } catch (error) {
      console.error('Google sign in error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async (): Promise<void> => {
    setLoading(true)
    try {
      const { logoutUser } = await import('@/lib/firebase/auth')
      await logoutUser()
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string): Promise<void> => {
    try {
      const { resetPassword: resetUserPassword } = await import('@/lib/firebase/auth')
      await resetUserPassword(email)
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    appUser,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}