'use client'

import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from './error-boundary'
import { ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QueryErrorBoundaryProps {
  children: ReactNode
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode
  showDetails?: boolean
}

/**
 * Error boundary specifically for React Query errors
 */
export function QueryErrorBoundary({
  children,
  fallback,
  showDetails = process.env.NODE_ENV === 'development'
}: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onError={(error) => {
            // Log query errors differently
            console.error('[Query Error]:', error)
          }}
          fallback={
            fallback ? (
              fallback({ error: new Error('Query failed'), reset })
            ) : (
              <QueryErrorFallback reset={reset} showDetails={showDetails} />
            )
          }
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

function QueryErrorFallback({
  reset,
  showDetails
}: {
  reset: () => void
  showDetails: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        데이터를 불러올 수 없습니다
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md">
        서버와의 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>
      
      <div className="flex gap-3">
        <Button
          onClick={reset}
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          다시 시도
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          페이지 새로고침
        </Button>
      </div>

      {showDetails && (
        <details className="mt-6 text-left max-w-xl">
          <summary className="cursor-pointer text-xs text-gray-500">
            기술적 세부사항
          </summary>
          <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs">
            <p>Query error occurred. Check network tab for details.</p>
          </div>
        </details>
      )}
    </div>
  )
}

/**
 * Hook to get query error reset function
 */
export function useQueryErrorReset() {
  const queryErrorResetBoundary = QueryErrorResetBoundary.useErrorBoundary()
  return queryErrorResetBoundary.reset
}