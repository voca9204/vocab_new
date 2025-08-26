'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Trash2, RefreshCw, AlertCircle } from 'lucide-react'

export default function ClearCachePage() {
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState({ count: 0, sizeKB: 0, sizeMB: 0 })
  const router = useRouter()

  const clearAllCaches = async () => {
    setClearing(true)
    setMessage('캐시 클리어 중...')
    
    try {
      // 1. Clear localStorage
      const keys = Object.keys(localStorage)
      let clearedCount = 0
      
      keys.forEach(key => {
        if (key.startsWith('vocab_cache_') || key.startsWith('word_')) {
          localStorage.removeItem(key)
          clearedCount++
        }
      })
      
      // 2. Clear sessionStorage
      sessionStorage.clear()
      
      // 3. Clear IndexedDB if exists
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases?.() || []
        for (const db of databases) {
          if (db.name?.includes('vocab') || db.name?.includes('word')) {
            indexedDB.deleteDatabase(db.name)
          }
        }
      }
      
      // 4. Clear Service Worker cache if exists
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames
            .filter(name => name.includes('vocab') || name.includes('word'))
            .map(name => caches.delete(name))
        )
      }
      
      setMessage(`✅ 캐시 클리어 완료! ${clearedCount}개 항목 삭제`)
      
      // 5. Force reload after 2 seconds
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
      
    } catch (error) {
      console.error('Error clearing cache:', error)
      setMessage('❌ 캐시 클리어 실패: ' + error)
    } finally {
      setClearing(false)
    }
  }

  const getCacheStats = () => {
    if (typeof window === 'undefined') {
      return { count: 0, sizeKB: 0, sizeMB: 0 }
    }
    
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(k => 
      k.startsWith('vocab_cache_') || 
      k.startsWith('word_')
    )
    
    let totalSize = 0
    cacheKeys.forEach(key => {
      const value = localStorage.getItem(key) || ''
      totalSize += value.length * 2 // UTF-16
    })
    
    return {
      count: cacheKeys.length,
      sizeKB: Math.round(totalSize / 1024),
      sizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
    }
  }

  useEffect(() => {
    setStats(getCacheStats())
  }, [])

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            캐시 클리어 도구
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">주의사항</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>모든 로컬 캐시가 삭제됩니다</li>
                  <li>페이지가 자동으로 새로고침됩니다</li>
                  <li>첫 로딩이 느려질 수 있습니다</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">현재 캐시 상태</h3>
            <div className="space-y-1 text-sm">
              <p>캐시된 항목: {stats.count}개</p>
              <p>사용 용량: {stats.sizeKB} KB ({stats.sizeMB} MB)</p>
              <p>localStorage 항목: {typeof window !== 'undefined' ? Object.keys(localStorage).length : 0}개</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={clearAllCaches}
              disabled={clearing}
              className="w-full"
              variant="destructive"
            >
              {clearing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  클리어 중...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  모든 캐시 클리어
                </>
              )}
            </Button>
            
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="w-full"
            >
              돌아가기
            </Button>
          </div>

          {message && (
            <div className={`text-sm text-center ${
              message.includes('✅') ? 'text-green-600' : 
              message.includes('❌') ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}