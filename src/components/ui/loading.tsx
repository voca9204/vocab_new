// UI Components - Loading Spinner Component

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const spinnerVariants = cva(
  "animate-spin rounded-full border-solid border-current border-r-transparent",
  {
    variants: {
      size: {
        xs: "h-3 w-3 border",
        sm: "h-4 w-4 border",
        default: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-2",
        xl: "h-12 w-12 border-4",
        "2xl": "h-16 w-16 border-4",
      },
      variant: {
        default: "text-primary",
        secondary: "text-secondary-foreground", 
        muted: "text-muted-foreground",
        white: "text-white",
        current: "text-current",
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
  centered?: boolean
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, label, centered = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2",
          centered && "justify-center w-full",
          className
        )}
        role="status"
        aria-label={label || "Loading"}
        {...props}
      >
        <div className={cn(spinnerVariants({ size, variant }))} />
        {label && (
          <span className="text-sm text-muted-foreground">
            {label}
          </span>
        )}
        <span className="sr-only">{label || "Loading..."}</span>
      </div>
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

// Skeleton loading component for content placeholders
const skeletonVariants = cva(
  "animate-pulse rounded-md bg-muted",
  {
    variants: {
      variant: {
        default: "bg-muted",
        shimmer: "bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-[shimmer_2s_infinite]",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number
  height?: string | number
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, width, height, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant }), className)}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

// Full page loading overlay
export interface LoadingOverlayProps {
  visible: boolean
  message?: string
  className?: string
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ visible, message = "Loading...", className }, ref) => {
    if (!visible) return null

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
          className
        )}
        role="status"
        aria-label={message}
      >
        <div className="text-center">
          <LoadingSpinner size="xl" className="mb-4" />
          <p className="text-lg font-medium text-foreground">{message}</p>
        </div>
      </div>
    )
  }
)
LoadingOverlay.displayName = "LoadingOverlay"

// Loading state for specific components
export interface LoadingStateProps {
  loading: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ loading, children, fallback, className }, ref) => {
    if (loading) {
      return (
        <div ref={ref} className={cn("w-full", className)}>
          {fallback || (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner size="lg" label="Loading content..." />
            </div>
          )}
        </div>
      )
    }

    return <>{children}</>
  }
)
LoadingState.displayName = "LoadingState"

// Skeleton components for common layouts
export const VocabularyCardSkeleton = () => (
  <div className="border rounded-lg p-6 space-y-4">
    <Skeleton height={24} width="60%" />
    <Skeleton height={16} width="100%" />
    <Skeleton height={16} width="80%" />
    <div className="flex gap-2">
      <Skeleton height={20} width={60} className="rounded-full" />
      <Skeleton height={20} width={80} className="rounded-full" />
    </div>
  </div>
)

export const NewsArticleSkeleton = () => (
  <div className="border rounded-lg p-6 space-y-4">
    <Skeleton height={28} width="90%" />
    <Skeleton height={14} width="40%" />
    <div className="space-y-2">
      <Skeleton height={16} width="100%" />
      <Skeleton height={16} width="95%" />
      <Skeleton height={16} width="85%" />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton height={16} width="30%" />
      <Skeleton height={32} width={80} className="rounded-md" />
    </div>
  </div>
)

export const ProfileSkeleton = () => (
  <div className="flex items-center space-x-4">
    <Skeleton height={64} width={64} className="rounded-full" />
    <div className="space-y-2">
      <Skeleton height={20} width={150} />
      <Skeleton height={16} width={200} />
    </div>
  </div>
)

// Add shimmer animation to globals.css
const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`

export { 
  LoadingSpinner, 
  Skeleton, 
  LoadingOverlay, 
  LoadingState,
  spinnerVariants, 
  skeletonVariants 
}
