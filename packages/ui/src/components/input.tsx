import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border bg-background text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-neutral-300 focus-visible:ring-primary-500 focus-visible:border-primary-500",
        error: "border-error-500 focus-visible:ring-error-500 text-error-900",
        success: "border-success-500 focus-visible:ring-success-500",
        ghost: "border-transparent bg-neutral-100 focus-visible:bg-white focus-visible:ring-primary-500",
      },
      size: {
        sm: "h-8 px-2 py-1 text-xs",
        default: "h-10 px-3 py-2",
        lg: "h-12 px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  label?: string
  helperText?: string
  errorMessage?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    type, 
    error, 
    leftIcon, 
    rightIcon, 
    label, 
    helperText, 
    errorMessage, 
    id,
    ...props 
  }, ref) => {
    const inputId = id || React.useId()
    const finalVariant = error ? "error" : variant
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              inputVariants({ variant: finalVariant, size }),
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
              {rightIcon}
            </div>
          )}
        </div>
        {(helperText || errorMessage) && (
          <p className={cn(
            "mt-1 text-xs",
            error ? "text-error-600" : "text-neutral-600"
          )}>
            {error ? errorMessage : helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
export type { InputProps }