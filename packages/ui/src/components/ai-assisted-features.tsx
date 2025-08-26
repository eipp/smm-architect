"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { Badge } from "./badge"
import { motion, AnimatePresence } from "framer-motion"

// AI Suggestion Types
interface AISuggestion {
  id: string
  type: "completion" | "improvement" | "compliance" | "optimization"
  title: string
  description: string
  value: string
  confidence: number
  impact: "low" | "medium" | "high"
}

interface ComplianceHint {
  id: string
  level: "info" | "warning" | "error"
  message: string
  suggestion?: string
  field?: string
}

// Smart Suggestion Card
const SuggestionCard = ({ 
  suggestion, 
  onApply, 
  onDismiss 
}: {
  suggestion: AISuggestion
  onApply: (value: string) => void
  onDismiss: () => void
}) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "completion": return "bg-primary-100 border-primary-300 text-primary-800"
      case "improvement": return "bg-accent-100 border-accent-300 text-accent-800"
      case "compliance": return "bg-warning-100 border-warning-300 text-warning-800"
      case "optimization": return "bg-success-100 border-success-300 text-success-800"
      default: return "bg-neutral-100 border-neutral-300 text-neutral-800"
    }
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "high": return "🚀"
      case "medium": return "⚡"
      case "low": return "💡"
      default: return "💡"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn("border rounded-lg p-3", getTypeColor(suggestion.type))}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{getImpactIcon(suggestion.impact)}</span>
          <h4 className="font-medium text-sm">{suggestion.title}</h4>
          <Badge variant="outline" className="text-xs">
            {Math.round(suggestion.confidence * 100)}% confident
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>
      
      <p className="text-xs opacity-80 mb-3">{suggestion.description}</p>
      
      {suggestion.value && (
        <div className="bg-white bg-opacity-50 rounded p-2 mb-3 text-xs font-mono">
          {suggestion.value.length > 100 
            ? `${suggestion.value.substring(0, 100)}...` 
            : suggestion.value
          }
        </div>
      )}
      
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onApply(suggestion.value)}
          className="text-xs"
        >
          Apply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="text-xs"
        >
          Dismiss
        </Button>
      </div>
    </motion.div>
  )
}

// Compliance Indicator
const ComplianceIndicator = ({ 
  hints 
}: {
  hints: ComplianceHint[]
}) => {
  const errorCount = hints.filter(h => h.level === "error").length
  const warningCount = hints.filter(h => h.level === "warning").length
  
  const getOverallStatus = () => {
    if (errorCount > 0) return { status: "error", color: "text-error-600 bg-error-100" }
    if (warningCount > 0) return { status: "warning", color: "text-warning-600 bg-warning-100" }
    return { status: "success", color: "text-success-600 bg-success-100" }
  }

  const overall = getOverallStatus()

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-neutral-900">Policy Compliance</h3>
          <Badge className={cn("text-xs", overall.color)}>
            {overall.status === "success" ? "✓ Compliant" : 
             overall.status === "warning" ? "⚠ Review Needed" : 
             "✗ Issues Found"}
          </Badge>
        </div>
        
        {hints.length > 0 && (
          <div className="space-y-2">
            {hints.map((hint) => (
              <div
                key={hint.id}
                className={cn(
                  "flex items-start gap-2 p-2 rounded text-xs",
                  hint.level === "error" ? "bg-error-50 text-error-700" :
                  hint.level === "warning" ? "bg-warning-50 text-warning-700" :
                  "bg-primary-50 text-primary-700"
                )}
              >
                <span className="mt-0.5">
                  {hint.level === "error" ? "🚫" : 
                   hint.level === "warning" ? "⚠️" : "ℹ️"}
                </span>
                <div className="flex-1">
                  <p>{hint.message}</p>
                  {hint.suggestion && (
                    <p className="mt-1 font-medium">💡 {hint.suggestion}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Smart Form Field
const SmartFormField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = "text",
  suggestions = [],
  complianceHints = [],
  onSuggestionApply,
  onSuggestionDismiss
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "text" | "textarea"
  suggestions?: AISuggestion[]
  complianceHints?: ComplianceHint[]
  onSuggestionApply: (suggestionId: string, value: string) => void
  onSuggestionDismiss: (suggestionId: string) => void
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const handleApply = useCallback((suggestionId: string, suggestionValue: string) => {
    onChange(suggestionValue)
    onSuggestionApply(suggestionId, suggestionValue)
    setShowSuggestions(false)
  }, [onChange, onSuggestionApply])

  const fieldHints = complianceHints.filter(hint => hint.field === label.toLowerCase())

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-neutral-700">{label}</label>
        {suggestions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Suggestions ({suggestions.length})
          </Button>
        )}
      </div>
      
      {type === "textarea" ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(fieldHints.some(h => h.level === "error") && "border-error-500")}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(fieldHints.some(h => h.level === "error") && "border-error-500")}
        />
      )}
      
      {fieldHints.length > 0 && (
        <div className="space-y-1">
          {fieldHints.map((hint) => (
            <div
              key={hint.id}
              className={cn(
                "flex items-center gap-1 text-xs",
                hint.level === "error" ? "text-error-600" :
                hint.level === "warning" ? "text-warning-600" :
                "text-primary-600"
              )}
            >
              <span>
                {hint.level === "error" ? "❌" : 
                 hint.level === "warning" ? "⚠️" : "ℹ️"}
              </span>
              <span>{hint.message}</span>
            </div>
          ))}
        </div>
      )}
      
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={(value) => handleApply(suggestion.id, value)}
                onDismiss={() => onSuggestionDismiss(suggestion.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Cost Optimization Component
const CostOptimization = ({ 
  currentCost, 
  optimizedCost, 
  suggestions 
}: {
  currentCost: number
  optimizedCost: number
  suggestions: string[]
}) => {
  const savings = currentCost - optimizedCost
  const savingsPercent = Math.round((savings / currentCost) * 100)

  return (
    <Card className="bg-gradient-to-r from-success-50 to-accent-50 border-success-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-neutral-900">💰 Cost Optimization</h3>
          <Badge className="bg-success-100 text-success-700">
            Save ${savings}/month ({savingsPercent}%)
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-neutral-700">${currentCost}</div>
            <div className="text-xs text-neutral-600">Current Cost</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-success-600">${optimizedCost}</div>
            <div className="text-xs text-neutral-600">Optimized Cost</div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="text-xs font-medium text-neutral-700">Optimization suggestions:</div>
          {suggestions.map((suggestion, index) => (
            <div key={index} className="text-xs text-neutral-600 flex items-center gap-1">
              <span>💡</span>
              <span>{suggestion}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Main AI-Assisted Features Component
export interface AIAssistedFeaturesProps {
  onFormDataChange?: (data: any) => void
  initialData?: any
  className?: string
}

export const AIAssistedFeatures = React.forwardRef<
  HTMLDivElement,
  AIAssistedFeaturesProps
>(({ onFormDataChange, initialData = {}, className, ...props }, ref) => {
  const [formData, setFormData] = useState({
    campaignName: initialData.campaignName || "",
    description: initialData.description || "",
    targetAudience: initialData.targetAudience || "",
    budget: initialData.budget || "",
    ...initialData
  })

  const [suggestions, setSuggestions] = useState<Record<string, AISuggestion[]>>({
    campaignName: [
      {
        id: "name-1",
        type: "completion",
        title: "Brand-aligned name suggestion",
        description: "Based on your industry and goals",
        value: "AI-Powered Growth Campaign 2024",
        confidence: 0.85,
        impact: "medium"
      }
    ],
    description: [
      {
        id: "desc-1",
        type: "improvement",
        title: "Enhanced description",
        description: "More compelling copy with clear value proposition",
        value: "Leverage AI-driven social media automation to increase engagement by 300% while reducing manual effort by 80%. Target B2B decision-makers with personalized content that converts.",
        confidence: 0.92,
        impact: "high"
      }
    ],
    targetAudience: [
      {
        id: "audience-1",
        type: "optimization",
        title: "Refined audience targeting",
        description: "Data-driven audience segmentation",
        value: "B2B decision-makers, 35-55 years old, in technology and finance sectors, actively seeking automation solutions",
        confidence: 0.88,
        impact: "high"
      }
    ]
  })

  const [complianceHints, setComplianceHints] = useState<ComplianceHint[]>([
    {
      id: "comp-1",
      level: "info",
      message: "All fields meet basic compliance requirements",
      field: "campaignName"
    }
  ])

  // Simulate real-time compliance checking
  useEffect(() => {
    const timer = setTimeout(() => {
      const hints: ComplianceHint[] = []
      
      if (formData.budget && parseInt(formData.budget) > 5000) {
        hints.push({
          id: "budget-warning",
          level: "warning",
          message: "Budget exceeds recommended monthly limit",
          suggestion: "Consider splitting into multiple campaigns",
          field: "budget"
        })
      }
      
      if (formData.description && formData.description.length < 50) {
        hints.push({
          id: "desc-warning",
          level: "warning",
          message: "Description could be more detailed",
          suggestion: "Add specific goals and success metrics",
          field: "description"
        })
      }
      
      setComplianceHints(hints)
    }, 1000)

    return () => clearTimeout(timer)
  }, [formData])

  const updateField = useCallback((field: string, value: string) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onFormDataChange?.(newData)
  }, [formData, onFormDataChange])

  const handleSuggestionApply = useCallback((suggestionId: string, value: string) => {
    // Remove applied suggestion
    setSuggestions(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(field => {
        updated[field] = updated[field].filter(s => s.id !== suggestionId)
      })
      return updated
    })
  }, [])

  const handleSuggestionDismiss = useCallback((suggestionId: string) => {
    setSuggestions(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(field => {
        updated[field] = updated[field].filter(s => s.id !== suggestionId)
      })
      return updated
    })
  }, [])

  const costOptimization = useMemo(() => {
    const current = parseInt(formData.budget) || 1000
    const optimized = Math.round(current * 0.75)
    return {
      current,
      optimized,
      suggestions: [
        "Use automated scheduling to reduce manual costs",
        "Leverage AI content generation for 40% cost reduction",
        "Optimize targeting to improve ROI by 25%"
      ]
    }
  }, [formData.budget])

  return (
    <div 
      ref={ref} 
      className={cn("max-w-4xl mx-auto p-6", className)} 
      {...props}
    >
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            AI-Assisted Campaign Creation
          </h1>
          <p className="text-neutral-600">
            Smart suggestions and real-time guidance for optimal results
          </p>
        </div>

        <ComplianceIndicator hints={complianceHints} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Campaign Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SmartFormField
                  label="Campaign Name"
                  value={formData.campaignName}
                  onChange={(value) => updateField("campaignName", value)}
                  placeholder="Enter campaign name..."
                  suggestions={suggestions.campaignName || []}
                  complianceHints={complianceHints}
                  onSuggestionApply={handleSuggestionApply}
                  onSuggestionDismiss={handleSuggestionDismiss}
                />

                <SmartFormField
                  label="Description"
                  value={formData.description}
                  onChange={(value) => updateField("description", value)}
                  placeholder="Describe your campaign goals and strategy..."
                  type="textarea"
                  suggestions={suggestions.description || []}
                  complianceHints={complianceHints}
                  onSuggestionApply={handleSuggestionApply}
                  onSuggestionDismiss={handleSuggestionDismiss}
                />

                <SmartFormField
                  label="Target Audience"
                  value={formData.targetAudience}
                  onChange={(value) => updateField("targetAudience", value)}
                  placeholder="Define your target audience..."
                  type="textarea"
                  suggestions={suggestions.targetAudience || []}
                  complianceHints={complianceHints}
                  onSuggestionApply={handleSuggestionApply}
                  onSuggestionDismiss={handleSuggestionDismiss}
                />

                <SmartFormField
                  label="Monthly Budget ($)"
                  value={formData.budget}
                  onChange={(value) => updateField("budget", value)}
                  placeholder="1000"
                  complianceHints={complianceHints}
                  onSuggestionApply={handleSuggestionApply}
                  onSuggestionDismiss={handleSuggestionDismiss}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <CostOptimization
              currentCost={costOptimization.current}
              optimizedCost={costOptimization.optimized}
              suggestions={costOptimization.suggestions}
            />

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-neutral-900 mb-3">🎯 Smart Insights</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>📈</span>
                    <span>Optimal posting time: 9:00 AM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🎨</span>
                    <span>Visual content gets 3x engagement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📱</span>
                    <span>80% of audience uses mobile</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button className="px-8">
            Create AI-Optimized Campaign
          </Button>
        </div>
      </div>
    </div>
  )
})

AIAssistedFeatures.displayName = "AIAssistedFeatures"

export default AIAssistedFeatures