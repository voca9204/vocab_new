'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UnifiedDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // 대시보드는 더 이상 사용하지 않으므로 홈페이지로 리다이렉트
    router.replace('/')
  }, [router])

  return null
}