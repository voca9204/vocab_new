import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 보호가 필요한 경로들
const protectedPaths = [
  '/dashboard',
  '/learn',
  '/quiz',
  '/progress',
  '/admin'
]

// 인증된 사용자가 접근하면 안 되는 경로들 (로그인/회원가입 페이지 등)
const authPaths = [
  '/login',
  '/register'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 정적 파일과 API 라우트는 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 현재는 클라이언트 사이드에서 리다이렉트 처리
  // Firebase Auth는 클라이언트 사이드에서만 작동하므로
  // 서버 사이드 미들웨어에서는 기본적인 경로 보호만 수행
  
  // 홈페이지(/)는 클라이언트에서 인증 상태에 따라 리다이렉트
  if (pathname === '/') {
    return NextResponse.next()
  }

  // 보호된 경로들도 일단 통과시키고 클라이언트에서 인증 확인
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 인증 경로들도 통과시키고 클라이언트에서 리다이렉트 처리
  if (authPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

// 미들웨어가 실행될 경로 설정
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}