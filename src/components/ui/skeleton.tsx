import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  animation?: 'pulse' | 'wave' | 'none'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  className,
  variant = 'text',
  animation = 'pulse',
  width,
  height,
  ...props
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700'
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  }
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg'
  }
  
  const style: React.CSSProperties = {
    width: width,
    height: height || (variant === 'circular' ? width : undefined)
  }
  
  return (
    <div
      className={cn(
        baseClasses,
        animationClasses[animation],
        variantClasses[variant],
        className
      )}
      style={style}
      {...props}
    />
  )
}

// Word Card Skeleton
export function WordCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      
      <div className="space-y-2">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="75%" />
      </div>
      
      <div className="flex gap-2">
        <Skeleton variant="rounded" width={60} height={24} />
        <Skeleton variant="rounded" width={60} height={24} />
      </div>
    </div>
  )
}

// Word List Skeleton
export function WordListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <WordCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Collection Card Skeleton
export function CollectionCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="circular" width={48} height={48} />
        <Skeleton variant="rounded" width={80} height={32} />
      </div>
      
      <div className="space-y-2">
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="100%" height={16} />
      </div>
      
      <div className="flex items-center justify-between pt-2">
        <Skeleton variant="text" width="30%" height={14} />
        <Skeleton variant="text" width="25%" height={14} />
      </div>
    </div>
  )
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" height={20} />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 py-2"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} variant="text" height={16} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Quiz Question Skeleton
export function QuizQuestionSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 space-y-6">
      <div className="text-center space-y-2">
        <Skeleton variant="text" width="20%" height={16} className="mx-auto" />
        <Skeleton variant="text" width="60%" height={28} className="mx-auto" />
      </div>
      
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <Skeleton variant="circular" width={20} height={20} />
            <Skeleton variant="text" width="80%" height={16} />
          </div>
        ))}
      </div>
      
      <div className="flex justify-center">
        <Skeleton variant="rounded" width={120} height={40} />
      </div>
    </div>
  )
}

// Dashboard Stat Skeleton
export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="50%" height={14} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <Skeleton variant="text" width="30%" height={32} />
      <Skeleton variant="text" width="70%" height={12} />
    </div>
  )
}

// Form Field Skeleton
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton variant="text" width="30%" height={14} />
      <Skeleton variant="rounded" width="100%" height={40} />
    </div>
  )
}

// Add shimmer animation to global CSS
const shimmerKeyframes = `
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}
`

if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = shimmerKeyframes + `
    .animate-shimmer {
      background: linear-gradient(
        90deg,
        rgba(156, 163, 175, 0.1) 0%,
        rgba(156, 163, 175, 0.3) 50%,
        rgba(156, 163, 175, 0.1) 100%
      );
      background-size: 1000px 100%;
      animation: shimmer 2s infinite linear;
    }
  `
  document.head.appendChild(style)
}