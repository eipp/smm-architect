import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const textareaVariants = cva(
  "flex w-full rounded-md border bg-background text-sm transition-all duration-200 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default: "border-neutral-300 focus-visible:ring-primary-500 focus-visible:border-primary-500",
        error: "border-error-500 focus-visible:ring-error-500 text-error-900",
        success: "border-success-500 focus-visible:ring-success-500",
        ghost: "border-transparent bg-neutral-100 focus-visible:bg-white focus-visible:ring-primary-500",
      },
      size: {
        sm: "min-h-[60px] px-2 py-1 text-xs",
        default: "min-h-[80px] px-3 py-2",
        lg: "min-h-[120px] px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  autoResize?: boolean
  maxRows?: number
  minRows?: number
  error?: boolean
  label?: string
  helperText?: string
  errorMessage?: string
  characterCount?: boolean
  maxLength?: number
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    size, 
    autoResize = false,
    maxRows = 10,
    minRows = 3,
    error,
    label,
    helperText,
    errorMessage,
    characterCount = false,
    maxLength,
    value,
    onChange,
    id,
    ...props 
  }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const [charCount, setCharCount] = React.useState(0)
    const textareaId = id || React.useId()
    const finalVariant = error ? "error" : variant
    
    // Auto-resize functionality
    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current
      if (!textarea || !autoResize) return
      
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto'
      
      // Calculate line height
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight)
      const maxHeight = lineHeight * maxRows
      const minHeight = lineHeight * minRows
      
      // Set new height within bounds
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
    }, [autoResize, maxRows, minRows])
    
    // Handle value changes
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setCharCount(newValue.length)
      onChange?.(e)
      
      // Trigger resize after state update
      requestAnimationFrame(adjustHeight)
    }, [onChange, adjustHeight])
    
    // Set up refs
    React.useImperativeHandle(ref, () => textareaRef.current!, [])
    
    // Initial setup and value changes
    React.useEffect(() => {
      if (value !== undefined) {
        setCharCount(String(value).length)
      }
      adjustHeight()
    }, [value, adjustHeight])
    
    // Setup resize observer for dynamic content
    React.useEffect(() => {
      const textarea = textareaRef.current
      if (!textarea || !autoResize) return
      
      const resizeObserver = new ResizeObserver(() => {
        adjustHeight()
      })
      
      resizeObserver.observe(textarea)
      
      return () => {
        resizeObserver.disconnect()
      }
    }, [adjustHeight, autoResize])
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={textareaId}
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            id={textareaId}
            ref={textareaRef}
            className={cn(textareaVariants({ variant: finalVariant, size }), className)}
            value={value}
            onChange={handleChange}
            maxLength={maxLength}
            {...props}
          />
          {characterCount && maxLength && (
            <div className="absolute bottom-2 right-2 text-xs text-neutral-500 bg-white px-1 rounded">
              {charCount}/{maxLength}
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
        {characterCount && !maxLength && (
          <p className="mt-1 text-xs text-neutral-500 text-right">
            {charCount} characters
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
export type { TextareaProps }