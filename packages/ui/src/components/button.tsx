import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        primary: "bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500 shadow-md hover:shadow-lg",
        secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus-visible:ring-neutral-400 border border-neutral-300",
        outline: "border border-primary-300 bg-transparent text-primary-600 hover:bg-primary-50 hover:text-primary-700 focus-visible:ring-primary-500",
        ghost: "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-400",
        danger: "bg-error-500 text-white hover:bg-error-600 focus-visible:ring-error-500 shadow-md hover:shadow-lg",
        success: "bg-success-500 text-white hover:bg-success-600 focus-visible:ring-success-500 shadow-md hover:shadow-lg",
        warning: "bg-warning-500 text-white hover:bg-warning-600 focus-visible:ring-warning-500 shadow-md hover:shadow-lg",
        link: "text-primary-600 underline-offset-4 hover:underline hover:text-primary-700 focus-visible:ring-primary-500",
      },
      size: {
        sm: "h-8 px-3 py-1.5 text-xs rounded-md",
        default: "h-10 px-4 py-2 text-sm rounded-md",
        lg: "h-12 px-6 py-3 text-base rounded-lg",
        icon: "h-10 w-10 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-12 w-12 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  ripple?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false, 
    loadingText,
    leftIcon,
    rightIcon,
    children, 
    disabled, 
    ripple = true,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const content = (
      <>
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        )}
        <span className="flex-1">
          {loading ? (loadingText || "Loading...") : children}
        </span>
        {!loading && rightIcon && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
        {ripple && (
          <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
            <span className="absolute inset-0 rounded-[inherit] bg-white/20 scale-0 group-active:scale-100 transition-transform duration-200" />
          </span>
        )}
      </>
    )
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }), 
          "group transform transition-transform duration-200 active:scale-95 hover:scale-105"
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }