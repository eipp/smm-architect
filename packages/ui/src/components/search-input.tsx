import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const searchInputVariants = cva(
  "flex w-full rounded-md border bg-background text-sm transition-all duration-200 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-neutral-300 focus-visible:ring-primary-500 focus-visible:border-primary-500",
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

export interface SearchSuggestion {
  id: string
  label: string
  value: string
  category?: string
}

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>,
    VariantProps<typeof searchInputVariants> {
  onSearch?: (query: string) => void
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
  suggestions?: SearchSuggestion[]
  loading?: boolean
  debounceMs?: number
  showSuggestions?: boolean
  clearable?: boolean
  searchIcon?: React.ReactNode
  clearIcon?: React.ReactNode
  loadingIcon?: React.ReactNode
  label?: string
  helperText?: string
  noResultsText?: string
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ 
    className, 
    variant, 
    size, 
    onSearch,
    onSuggestionSelect,
    suggestions = [],
    loading = false,
    debounceMs = 300,
    showSuggestions = true,
    clearable = true,
    searchIcon,
    clearIcon,
    loadingIcon,
    label,
    helperText,
    noResultsText = "No results found",
    value,
    defaultValue,
    id,
    ...props 
  }, ref) => {
    const [query, setQuery] = React.useState(value || defaultValue || "")
    const [isOpen, setIsOpen] = React.useState(false)
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
    
    const inputRef = React.useRef<HTMLInputElement>(null)
    const suggestionsRef = React.useRef<HTMLDivElement>(null)
    const debounceRef = React.useRef<NodeJS.Timeout>()
    
    const inputId = id || React.useId()
    const suggestionsId = `${inputId}-suggestions`
    
    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current!, [])
    
    // Debounced search
    const debouncedSearch = React.useCallback((searchQuery: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      
      debounceRef.current = setTimeout(() => {
        onSearch?.(searchQuery)
      }, debounceMs)
    }, [onSearch, debounceMs])
    
    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setQuery(newValue)
      setHighlightedIndex(-1)
      setIsOpen(showSuggestions && newValue.length > 0)
      
      if (newValue.trim()) {
        debouncedSearch(newValue)
      } else {
        setIsOpen(false)
      }
    }
    
    // Handle suggestion selection
    const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
      setQuery(suggestion.value)
      setIsOpen(false)
      setHighlightedIndex(-1)
      onSuggestionSelect?.(suggestion)
      inputRef.current?.focus()
    }
    
    // Handle clear
    const handleClear = () => {
      setQuery("")
      setIsOpen(false)
      setHighlightedIndex(-1)
      onSearch?.("")
      inputRef.current?.focus()
    }
    
    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || suggestions.length === 0) {
        if (e.key === "Escape") {
          setIsOpen(false)
          setHighlightedIndex(-1)
        }
        return
      }
      
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          )
          break
          
        case "ArrowUp":
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          )
          break
          
        case "Enter":
          e.preventDefault()
          if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
            handleSuggestionSelect(suggestions[highlightedIndex])
          } else if (query.trim()) {
            setIsOpen(false)
            onSearch?.(query)
          }
          break
          
        case "Escape":
          setIsOpen(false)
          setHighlightedIndex(-1)
          break
      }
    }
    
    // Click outside to close
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          suggestionsRef.current &&
          !suggestionsRef.current.contains(event.target as Node) &&
          !inputRef.current?.contains(event.target as Node)
        ) {
          setIsOpen(false)
          setHighlightedIndex(-1)
        }
      }
      
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])
    
    // Sync external value changes
    React.useEffect(() => {
      if (value !== undefined && value !== query) {
        setQuery(String(value))
      }
    }, [value])
    
    // Default icons
    const defaultSearchIcon = (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
    
    const defaultClearIcon = (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
    
    const defaultLoadingIcon = (
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
    )
    
    return (
      <div className="relative w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {/* Search Icon */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
            {loading ? (loadingIcon || defaultLoadingIcon) : (searchIcon || defaultSearchIcon)}
          </div>
          
          {/* Input */}
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => showSuggestions && query.length > 0 && setIsOpen(true)}
            className={cn(
              searchInputVariants({ variant, size }),
              "pl-9",
              (clearable && query) && "pr-9",
              className
            )}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={isOpen ? suggestionsId : undefined}
            aria-autocomplete="list"
            role="combobox"
            {...props}
          />
          
          {/* Clear Button */}
          {clearable && query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Clear search"
            >
              {clearIcon || defaultClearIcon}
            </button>
          )}
        </div>
        
        {/* Suggestions Dropdown */}
        {isOpen && showSuggestions && (
          <div
            ref={suggestionsRef}
            id={suggestionsId}
            className="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-md shadow-lg max-h-60 overflow-auto"
            role="listbox"
          >
            {suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none",
                    index === highlightedIndex && "bg-primary-50 text-primary-900"
                  )}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  role="option"
                  aria-selected={index === highlightedIndex}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{suggestion.label}</span>
                    {suggestion.category && (
                      <span className="text-xs text-neutral-500">{suggestion.category}</span>
                    )}
                  </div>
                </button>
              ))
            ) : query.trim() && !loading ? (
              <div className="px-3 py-2 text-sm text-neutral-500">
                {noResultsText}
              </div>
            ) : null}
          </div>
        )}
        
        {helperText && (
          <p className="mt-1 text-xs text-neutral-600">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"

export { SearchInput, searchInputVariants }
export type { SearchInputProps }