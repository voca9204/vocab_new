'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

const RadioGroupContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}>({})

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, disabled, ...props }, ref) => {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange, disabled }}>
        <div
          ref={ref}
          className={cn('grid gap-2', className)}
          {...props}
        />
      </RadioGroupContext.Provider>
    )
  }
)
RadioGroup.displayName = 'RadioGroup'

interface RadioGroupItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string
  id?: string
  disabled?: boolean
}

export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, id, disabled, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)
    const isChecked = context.value === value
    const isDisabled = disabled || context.disabled

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isChecked}
        data-state={isChecked ? 'checked' : 'unchecked'}
        data-disabled={isDisabled ? '' : undefined}
        disabled={isDisabled}
        id={id}
        className={cn(
          'aspect-square h-4 w-4 rounded-full border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          isChecked && 'border-blue-600 bg-blue-600',
          className
        )}
        onClick={() => {
          if (!isDisabled && context.onValueChange) {
            context.onValueChange(value)
          }
        }}
        {...props}
      >
        {isChecked && (
          <span className="flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
        )}
      </button>
    )
  }
)
RadioGroupItem.displayName = 'RadioGroupItem'