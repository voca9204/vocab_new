'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  isolate?: boolean
  level?: 'page' | 'section' | 'component'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null
  private previousResetKeys: Array<string | number> = []

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props
    
    // Log error with context
    logger.error(`[ErrorBoundary-${level}] Component error:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level
    })

    // Call custom error handler if provided
    onError?.(error, errorInfo)

    // Update state with error info
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Auto-recover after 3 errors
    if (this.state.errorCount >= 3) {
      this.scheduleReset(10000) // Reset after 10 seconds
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props
    
    // Reset on prop changes if enabled
    if (resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
    }

    // Reset when resetKeys change
    if (
      resetKeys &&
      prevProps.resetKeys &&
      this.hasResetKeyChanged(prevProps.resetKeys, resetKeys)
    ) {
      this.resetErrorBoundary()
    }
  }

  hasResetKeyChanged = (
    prevKeys: Array<string | number>,
    nextKeys: Array<string | number>
  ): boolean => {
    return (
      prevKeys.length !== nextKeys.length ||
      prevKeys.some((key, index) => key !== nextKeys[index])
    )
  }

  scheduleReset = (delay: number) => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }

    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary()
    }, delay)
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    })
  }

  render() {
    const { hasError, error, errorCount } = this.state
    const { children, fallback, isolate = true, level = 'component' } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>
      }

      // Default error UI based on level
      return (
        <div className={`error-boundary-fallback error-boundary-${level}`}>
          {level === 'page' ? (
            <PageErrorFallback
              error={error}
              resetErrorBoundary={this.resetErrorBoundary}
              errorCount={errorCount}
            />
          ) : level === 'section' ? (
            <SectionErrorFallback
              error={error}
              resetErrorBoundary={this.resetErrorBoundary}
              errorCount={errorCount}
              isolate={isolate}
            />
          ) : (
            <ComponentErrorFallback
              error={error}
              resetErrorBoundary={this.resetErrorBoundary}
              errorCount={errorCount}
              isolate={isolate}
            />
          )}
        </div>
      )
    }

    return children
  }
}

// Page-level error fallback
function PageErrorFallback({
  error,
  resetErrorBoundary,
  errorCount
}: {
  error: Error
  resetErrorBoundary: () => void
  errorCount: number
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            문제가 발생했습니다
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            예기치 않은 오류가 발생했습니다. 불편을 드려 죄송합니다.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="w-full mb-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                오류 세부정보
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto">
                {error.message}
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <Button
              onClick={resetErrorBoundary}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              홈으로
            </Button>
          </div>

          {errorCount > 1 && (
            <p className="text-xs text-gray-500 mt-4">
              오류 발생 횟수: {errorCount}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Section-level error fallback
function SectionErrorFallback({
  error,
  resetErrorBoundary,
  errorCount,
  isolate
}: {
  error: Error
  resetErrorBoundary: () => void
  errorCount: number
  isolate: boolean
}) {
  return (
    <div className={`p-6 ${isolate ? 'border border-red-200 dark:border-red-800' : ''} rounded-lg bg-red-50 dark:bg-red-900/10`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 dark:text-red-400 mb-1">
            섹션 로드 실패
          </h3>
          <p className="text-sm text-red-700 dark:text-red-500 mb-3">
            이 섹션을 불러오는 중 문제가 발생했습니다.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-3">
              <summary className="cursor-pointer text-xs text-red-600">
                오류 정보
              </summary>
              <pre className="mt-1 text-xs bg-white dark:bg-gray-900 p-2 rounded overflow-auto">
                {error.message}
              </pre>
            </details>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={resetErrorBoundary}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            재시도
          </Button>
        </div>
      </div>
    </div>
  )
}

// Component-level error fallback
function ComponentErrorFallback({
  error,
  resetErrorBoundary,
  errorCount,
  isolate
}: {
  error: Error
  resetErrorBoundary: () => void
  errorCount: number
  isolate: boolean
}) {
  return (
    <div className={`inline-flex items-center gap-2 p-3 ${isolate ? 'border border-amber-200 dark:border-amber-800' : ''} rounded bg-amber-50 dark:bg-amber-900/10`}>
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <span className="text-sm text-amber-700 dark:text-amber-400">
        컴포넌트 오류
      </span>
      <button
        onClick={resetErrorBoundary}
        className="text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400"
        title="재시도"
      >
        <RefreshCw className="h-3 w-3" />
      </button>
    </div>
  )
}