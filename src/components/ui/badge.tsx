// UI Components - Badge Component

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        warning:
          "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
        // SAT-specific variants
        difficulty: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        mastery: "border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
        category: "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0 text-xs",
        lg: "px-3 py-1 text-sm",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
  removable?: boolean
  onRemove?: () => void
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, icon, removable, onRemove, children, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)} 
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
        {removable && (
          <button
            type="button"
            className="ml-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
            onClick={onRemove}
            aria-label="Remove badge"
          >
            <svg 
              className="h-3 w-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        )}
      </div>
    )
  }
)
Badge.displayName = "Badge"

// Specialized badges for SAT learning
export interface DifficultyBadgeProps extends Omit<BadgeProps, 'variant'> {
  difficulty: number // 1-10
}

export const DifficultyBadge = React.forwardRef<HTMLDivElement, DifficultyBadgeProps>(
  ({ difficulty, className, ...props }, ref) => {
    const getDifficultyVariant = (diff: number) => {
      if (diff <= 3) return 'success'
      if (diff <= 6) return 'warning'
      return 'destructive'
    }
    
    const getDifficultyLabel = (diff: number) => {
      if (diff <= 3) return 'Easy'
      if (diff <= 6) return 'Medium'
      return 'Hard'
    }

    return (
      <Badge
        ref={ref}
        variant={getDifficultyVariant(difficulty)}
        className={className}
        {...props}
      >
        {getDifficultyLabel(difficulty)} ({difficulty}/10)
      </Badge>
    )
  }
)
DifficultyBadge.displayName = "DifficultyBadge"

export interface MasteryBadgeProps extends Omit<BadgeProps, 'variant'> {
  masteryLevel: number // 0-1
}

export const MasteryBadge = React.forwardRef<HTMLDivElement, MasteryBadgeProps>(
  ({ masteryLevel, className, ...props }, ref) => {
    const getMasteryVariant = (level: number) => {
      if (level < 0.3) return 'destructive'
      if (level < 0.7) return 'warning'
      return 'success'
    }
    
    const getMasteryLabel = (level: number) => {
      if (level === 0) return 'Not Started'
      if (level < 0.3) return 'Learning'
      if (level < 0.7) return 'Practicing'
      return 'Mastered'
    }

    return (
      <Badge
        ref={ref}
        variant={getMasteryVariant(masteryLevel)}
        className={className}
        {...props}
      >
        {getMasteryLabel(masteryLevel)} ({Math.round(masteryLevel * 100)}%)
      </Badge>
    )
  }
)
MasteryBadge.displayName = "MasteryBadge"

export { Badge, badgeVariants }
