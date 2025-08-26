'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Redirect page - redirects to the new personal collection study page
export default function StudyCollectionRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const collectionId = params.id as string

  useEffect(() => {
    // Redirect to the new personal collection study page
    if (collectionId) {
      router.replace(`/study/personal/${collectionId}`)
    }
  }, [collectionId, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">학습 페이지로 이동 중...</p>
      </div>
    </div>
  )
}