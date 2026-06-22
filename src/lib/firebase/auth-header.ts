import { auth } from './config'

/**
 * 인증된 사용자의 Firebase ID 토큰을 Authorization 헤더로 반환.
 * 로그인되어 있지 않으면 빈 객체. (서버에서 토큰 검증 후 401 처리)
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser
  if (!user) return {}
  try {
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}
