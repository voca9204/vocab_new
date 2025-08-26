'use client'

import { useOfflineStatus } from '@/hooks/use-offline-status'
import { WifiOff, Wifi, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

export function OfflineIndicator() {
  const { isOnline, lastSyncTime, pendingActions } = useOfflineStatus()
  const [showBanner, setShowBanner] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true)
    } else if (showBanner) {
      // Keep banner visible for 3 seconds after coming back online
      setIsTransitioning(true)
      const timer = setTimeout(() => {
        setShowBanner(false)
        setIsTransitioning(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, showBanner])
  
  if (!showBanner) return null
  
  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 px-4 py-3 transition-all duration-500',
        isOnline && isTransitioning
          ? 'bg-green-500 text-white'
          : 'bg-orange-500 text-white'
      )}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isOnline && isTransitioning ? (
            <>
              <Wifi className="h-5 w-5" />
              <span className="font-medium">연결이 복원되었습니다</span>
            </>
          ) : (
            <>
              <WifiOff className="h-5 w-5 animate-pulse" />
              <div>
                <span className="font-medium">오프라인 모드</span>
                {pendingActions > 0 && (
                  <span className="ml-2 text-sm opacity-90">
                    ({pendingActions}개 작업 대기 중)
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        
        {lastSyncTime && !isOnline && (
          <div className="flex items-center gap-2 text-sm opacity-90">
            <AlertCircle className="h-4 w-4" />
            <span>
              마지막 동기화: {new Date(lastSyncTime).toLocaleTimeString('ko-KR')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Small offline indicator for specific components
 */
export function OfflineStatusBadge({ className }: { className?: string }) {
  const { isOnline } = useOfflineStatus()
  
  if (isOnline) return null
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full',
        'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
        className
      )}
    >
      <WifiOff className="h-3 w-3" />
      <span>오프라인</span>
    </div>
  )
}