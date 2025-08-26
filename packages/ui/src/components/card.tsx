import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "shadow-sm hover:shadow-md",
        elevated: "shadow-md hover:shadow-lg",
        interactive: "shadow-sm hover:shadow-lg hover:-translate-y-1 cursor-pointer",
        flat: "shadow-none border-neutral-200",
        workspace: "shadow-md border-primary-200 bg-primary-50/50",
        decision: "shadow-lg border-accent-200 bg-gradient-to-br from-white to-accent-50/30",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  interactive?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, interactive = false, ...props }, ref) => {
    const cardVariant = interactive ? "interactive" : variant
    
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant: cardVariant, size, className }))}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    divider?: boolean
  }
>(({ className, divider = false, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "flex flex-col space-y-1.5 p-6",
      divider && "border-b border-neutral-200 pb-4 mb-4",
      className
    )} 
    {...props} 
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    size?: "sm" | "default" | "lg"
  }
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "text-lg font-medium",
    default: "text-xl font-semibold",
    lg: "text-2xl font-bold"
  }
  
  return (
    <h3
      ref={ref}
      className={cn(
        "leading-none tracking-tight text-neutral-900",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-neutral-600 leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    noPadding?: boolean
  }
>(({ className, noPadding = false, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      noPadding ? "" : "p-6 pt-0", 
      className
    )} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    divider?: boolean
    justify?: "start" | "center" | "end" | "between"
  }
>(({ className, divider = false, justify = "start", ...props }, ref) => {
  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between"
  }
  
  return (
    <div 
      ref={ref} 
      className={cn(
        "flex items-center p-6 pt-0",
        justifyClasses[justify],
        divider && "border-t border-neutral-200 pt-4 mt-4",
        className
      )} 
      {...props} 
    />
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
export type { CardProps }