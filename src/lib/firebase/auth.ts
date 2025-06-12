import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'
import type { User as AppUser } from '@/types'

// Google Auth Provider 초기화
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

// 사용자 회원가입
export const registerUser = async (
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    
    // 프로필 업데이트
    if (displayName) {
      await updateProfile(userCredential.user, { displayName })
    }
    
    // Firestore에 사용자 문서 생성
    await createUserDocument(userCredential.user)
    
    return userCredential
  } catch (error) {
    console.error('Registration error:', error)
    throw error
  }
}

// 사용자 로그인
export const loginUser = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    
    // 마지막 로그인 시간 업데이트
    await updateLastLogin(userCredential.user.uid)
    
    return userCredential
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

// Google 로그인
export const loginWithGoogle = async (): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider)
    
    // Firestore에 사용자 문서 생성 (첫 로그인 시)
    await createUserDocument(userCredential.user)
    
    // 마지막 로그인 시간 업데이트
    await updateLastLogin(userCredential.user.uid)
    
    return userCredential
  } catch (error) {
    console.error('Google login error:', error)
    throw error
  }
}

// 사용자 로그아웃
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Logout error:', error)
    throw error
  }
}

// 비밀번호 재설정 이메일 발송
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    console.error('Password reset error:', error)
    throw error
  }
}

// Firestore에 사용자 문서 생성
const createUserDocument = async (user: User): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.uid)
    
    // 이미 문서가 존재하는지 확인
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
      return
    }
    
    const userData: Omit<AppUser, 'id'> = {
      email: user.email!,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    }
    
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error creating user document:', error)
    throw error
  }
}

// 마지막 로그인 시간 업데이트
const updateLastLogin = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId)
    await setDoc(userRef, { 
      lastLoginAt: serverTimestamp() 
    }, { merge: true })
  } catch (error) {
    console.error('Error updating last login:', error)
    // 로그인 자체는 성공했으므로 에러를 throw하지 않음
  }
}

// 현재 사용자 가져오기
export const getCurrentUser = (): User | null => {
  return auth.currentUser
}

// 사용자 인증 상태 변화 감지를 위한 헬퍼
export { onAuthStateChanged } from 'firebase/auth'
export { auth }