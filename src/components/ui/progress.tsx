// UI Components - Progress Bar Component

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const progressVariants = cva(
  "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      size: {
        sm: "h-1",
        default: "h-2",
        lg: "h-3",
        xl: "h-4",
      }
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const progressBarVariants = cva(
  "h-full w-full flex-1 transition-all duration-300 ease-in-out",
  {
    variants: {
      variant: {
        default: "bg-primary",
        success: "bg-green-500",
        warning: "bg-orange-500",
        destructive: "bg-red-500",
        gradient: "bg-gradient-to-r from-blue-500 to-purple-500",
        mastery: "bg-gradient-to-r from-green-400 to-blue-500",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value?: number
  max?: number
  variant?: VariantProps<typeof progressBarVariants>['variant']
  showLabel?: boolean
  label?: string
  animated?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value = 0, 
    max = 100, 
    size, 
    variant = "default",
    showLabel = false,
    label,
    animated = false,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    return (
      <div className="w-full">
        {(showLabel || label) && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">
              {label || "Progress"}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
        
        <div
          ref={ref}
          className={cn(progressVariants({ size }), className)}
          {...props}
        >
          <div
            className={cn(
              progressBarVariants({ variant }),
              animated && "animate-pulse"
            )}
            style={{
              transform: `translateX(-${100 - percentage}%)`,
            }}
          />
        </div>
      </div>
    )
  }
)
Progress.displayName = "Progress"

// Specialized progress components for SAT learning
export interface LearningProgressProps extends Omit<ProgressProps, 'variant'> {
  wordsLearned: number
  totalWords: number
  masteryLevel?: number
}

export const LearningProgress = React.forwardRef<HTMLDivElement, LearningProgressProps>(
  ({ wordsLearned, totalWords, masteryLevel, ...props }, ref) => {
    const getVariant = () => {
      const percentage = (wordsLearned / totalWords) * 100
      if (percentage >= 80) return 'success'
      if (percentage >= 50) return 'gradient'
      if (percentage >= 25) return 'warning'
      return 'default'
    }

    return (
      <Progress
        ref={ref}
        value={wordsLearned}
        max={totalWords}
        variant={getVariant()}
        showLabel
        label={`SAT Words Progress: ${wordsLearned}/${totalWords}`}
        {...props}
      />
    )
  }
)
LearningProgress.displayName = "LearningProgress"

export interface ReadingProgressProps extends Omit<ProgressProps, 'variant'> {
  currentPosition: number
  totalLength: number
  articleTitle?: string
}

export const ReadingProgress = React.forwardRef<HTMLDivElement, ReadingProgressProps>(
  ({ currentPosition, totalLength, articleTitle, ...props }, ref) => {
    return (
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <Progress
          ref={ref}
          value={currentPosition}
          max={totalLength}
          variant="gradient"
          size="sm"
          className="rounded-none"
          {...props}
        />
        {articleTitle && (
          <div className="px-4 py-2">
            <p className="text-sm text-muted-foreground truncate">
              Reading: {articleTitle}
            </p>
          </div>
        )}
      </div>
    )
  }
)
ReadingProgress.displayName = "ReadingProgress"

// Multi-segment progress for different learning phases
export interface MultiProgressProps {
  segments: Array<{
    label: string
    value: number
    max: number
    variant?: VariantProps<typeof progressBarVariants>['variant']
    color?: string
  }>
  className?: string
}

export const MultiProgress = React.forwardRef<HTMLDivElement, MultiProgressProps>(
  ({ segments, className }, ref) => {
    const totalMax = segments.reduce((acc, segment) => acc + segment.max, 0)
    
    return (
      <div ref={ref} className={cn("w-full", className)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Learning Progress</span>
          <span className="text-sm text-muted-foreground">
            {segments.reduce((acc, seg) => acc + seg.value, 0)}/{totalMax}
          </span>
        </div>
        
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
          {segments.map((segment, index) => {
            const segmentPercentage = (segment.value / segment.max) * 100
            const segmentWidth = (segment.max / totalMax) * 100
            
            return (
              <div
                key={index}
                className="relative overflow-hidden"
                style={{ width: `${segmentWidth}%` }}
              >
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    segment.variant ? progressBarVariants({ variant: segment.variant }) : "bg-primary"
                  )}
                  style={{
                    width: `${segmentPercentage}%`,
                    backgroundColor: segment.color,
                  }}
                />
              </div>
            )
          })}
        </div>
        
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          {segments.map((segment, index) => (
            <span key={index} className="text-center">
              {segment.label}: {segment.value}/{segment.max}
            </span>
          ))}
        </div>
      </div>
    )
  }
)
MultiProgress.displayName = "MultiProgress"

export { Progress, progressVariants, progressBarVariants }
