import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number // 0-100 percentage
  size?: "sm" | "md" | "lg"
  variant?: "default" | "success" | "warning" | "danger"
  showLabel?: boolean
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ 
    className, 
    value, 
    size = "md", 
    variant = "default", 
    showLabel = false,
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
      danger: "bg-red-600"
    }

    const clampedValue = Math.min(100, Math.max(0, value))

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {showLabel && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{clampedValue}%</span>
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
              "h-full transition-all duration-300 ease-in-out rounded-full",
              variantClasses[variant]
            )}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
      </div>
    )
  }
)
ProgressBar.displayName = "ProgressBar"

export { ProgressBar }
