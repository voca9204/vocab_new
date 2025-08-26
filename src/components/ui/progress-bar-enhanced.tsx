import * as React from "react"
import { cn } from "@/lib/utils"

// Enhanced ProgressBar interface
interface EnhancedProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number // 0-100 percentage or actual value if max is provided
  max?: number
  size?: "sm" | "md" | "lg"
  variant?: "default" | "success" | "warning" | "danger" | "error"
  showLabel?: boolean
  label?: string
  animated?: boolean
  striped?: boolean
}

const EnhancedProgressBar = React.forwardRef<HTMLDivElement, EnhancedProgressBarProps>(
  ({ 
    className, 
    value, 
    max = 100,
    size = "md", 
    variant = "default", 
    showLabel = false,
    label,
    animated = false,
    striped = false,
    ...props 
  }, ref) => {
    const sizeClasses = {
      sm: "h-2",
      md: "h-3",
      lg: "h-4"
    }

    const variantClasses = {
      default: "bg-blue-600",
      success: "bg-green-600", 
      warning: "bg-yellow-600",
      danger: "bg-red-600",
      error: "bg-red-600"
    }

    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    const displayValue = Math.round(percentage)

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {(showLabel || label) && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">
              {label || "Progress"}
            </span>
            <span className="text-sm text-gray-500">{displayValue}%</span>
          </div>
        )}
        <div 
          className={cn(
            "w-full bg-gray-200 rounded-full overflow-hidden",
            sizeClasses[size]
          )}
        >
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out rounded-full",
              variantClasses[variant],
              animated && "animate-pulse",
              striped && "bg-gradient-to-r from-transparent via-white to-transparent bg-[length:20px_20px] opacity-20"
            )}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={label}
          />
        </div>
      </div>
    )
  }
)
EnhancedProgressBar.displayName = "EnhancedProgressBar"

// 원형 진도 바
interface CircularProgressBarProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  className?: string
  showLabel?: boolean
  variant?: "default" | "success" | "warning" | "danger" | "error"
  children?: React.ReactNode
}

const CircularProgressBar = React.forwardRef<SVGSVGElement, CircularProgressBarProps>(
  ({
    value,
    max = 100,
    size = 120,
    strokeWidth = 8,
    className,
    showLabel = true,
    variant = "default",
    children
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (percentage / 100) * circumference
    
    const colors = {
      default: '#3b82f6',
      success: '#10b981', 
      warning: '#f59e0b',
      danger: '#ef4444',
      error: '#ef4444'
    }
    
    const color = colors[variant]
    
    return (
      <div className={cn('relative inline-flex items-center justify-center', className)}>
        <svg
          ref={ref}
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Label or children */}
        <div className="absolute inset-0 flex items-center justify-center">
          {children || (showLabel && (
            <div className="text-center">
              <div className="text-lg font-semibold">{Math.round(percentage)}%</div>
            </div>
          ))}
        </div>
      </div>
    )
  }
)
CircularProgressBar.displayName = "CircularProgressBar"

// 스택된 진도 바 (여러 항목의 진도를 세로로 표시)
interface StackedProgressBarProps {
  items: Array<{
    label: string
    value: number
    max: number
    variant?: "default" | "success" | "warning" | "danger" | "error"
  }>
  className?: string
}

const StackedProgressBar = React.forwardRef<HTMLDivElement, StackedProgressBarProps>(
  ({ items, className }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)}>
        {items.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">{item.label}</span>
              <span className="text-gray-500">
                {item.value} / {item.max}
              </span>
            </div>
            <EnhancedProgressBar
              value={item.value}
              max={item.max}
              variant={item.variant}
              size="sm"
            />
          </div>
        ))}
      </div>
    )
  }
)
StackedProgressBar.displayName = "StackedProgressBar"

export { EnhancedProgressBar, CircularProgressBar, StackedProgressBar }