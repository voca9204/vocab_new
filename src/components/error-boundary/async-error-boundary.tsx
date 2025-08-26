'use client'

import { useEffect, useState, ReactNode } from 'react'
import { ErrorBoundary } from './error-boundary'
import { logger } from '@/lib/utils/logger'

interface AsyncErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error) => void
}

/**
 * Error boundary that also catches async errors
 */
export function AsyncErrorBoundary({
  children,
  fallback,
  onError
}: AsyncErrorBoundaryProps) {
  const [asyncError, setAsyncError] = useState<Error | null>(null)

  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection:', event.reason)
      
      const error = new Error(
        event.reason?.message || 'Unhandled promise rejection'
      )
      error.stack = event.reason?.stack
      
      setAsyncError(error)
      onError?.(error)
      
      // Prevent default browser handling
      event.preventDefault()
    }

    // Handle global errors
    const handleError = (event: ErrorEvent) => {
      logger.error('Global error:', event.error)
      
      const error = event.error || new Error(event.message)
      setAsyncError(error)
      onError?.(error)
      
      // Prevent default browser handling
      event.preventDefault()
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [onError])

  // Throw async error to be caught by ErrorBoundary
  if (asyncError) {
    throw asyncError
  }

  return (
    <ErrorBoundary
      fallback={fallback}
      onError={onError}
      resetOnPropsChange
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Hook for handling async errors within components
 */
export function useAsyncError() {
  const [, setError] = useState()

  return (error: Error) => {
    setError(() => {
      throw error
    })
  }
}

/**
 * Wrapper for async operations with error handling
 */
export async function withAsyncErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    fallbackValue?: T
    onError?: (error: Error) => void
    retries?: number
    retryDelay?: number
  } = {}
): Promise<T | undefined> {
  const {
    fallbackValue,
    onError,
    retries = 0,
    retryDelay = 1000
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      logger.error(`Async operation failed (attempt ${attempt + 1}/${retries + 1}):`, lastError)
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  // All retries failed
  if (lastError) {
    onError?.(lastError)
    
    if (fallbackValue !== undefined) {
      return fallbackValue
    }
    
    throw lastError
  }

  return undefined
}