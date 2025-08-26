"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { Badge } from "./badge"
import { motion, AnimatePresence } from "framer-motion"

// Disclosure Level Types
type DisclosureLevel = "basic" | "intermediate" | "advanced"

// Progressive Disclosure Container
const ProgressiveDisclosure = ({ 
  children, 
  level, 
  currentLevel, 
  title, 
  description,
  badge,
  onLevelChange 
}: {
  children: React.ReactNode
  level: DisclosureLevel
  currentLevel: DisclosureLevel
  title: string
  description?: string
  badge?: string
  onLevelChange: (level: DisclosureLevel) => void
}) => {
  const isVisible = useMemo(() => {
    const levels: DisclosureLevel[] = ["basic", "intermediate", "advanced"]
    const currentIndex = levels.indexOf(currentLevel)
    const levelIndex = levels.indexOf(level)
    return levelIndex <= currentIndex
  }, [level, currentLevel])

  const getLevelColor = (level: DisclosureLevel) => {
    switch (level) {
      case "basic": return "bg-success-100 text-success-700"
      case "intermediate": return "bg-warning-100 text-warning-700"
      case "advanced": return "bg-error-100 text-error-700"
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <Badge className={cn("text-xs", getLevelColor(level))}>
                    {level}
                  </Badge>
                  {badge && (
                    <Badge variant="outline" className="text-xs">
                      {badge}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const levels: DisclosureLevel[] = ["basic", "intermediate", "advanced"]
                    const currentIndex = levels.indexOf(currentLevel)
                    const nextLevel = currentIndex < levels.length - 1 
                      ? levels[currentIndex + 1] 
                      : levels[0]
                    onLevelChange(nextLevel)
                  }}
                >
                  {currentLevel === "advanced" ? "Simplify" : "More Options"}
                </Button>
              </div>
              {description && (
                <p className="text-sm text-neutral-600">{description}</p>
              )}
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Level Indicator Component
const LevelIndicator = ({ 
  currentLevel, 
  onLevelChange 
}: {
  currentLevel: DisclosureLevel
  onLevelChange: (level: DisclosureLevel) => void
}) => {
  const levels: { key: DisclosureLevel; label: string; description: string }[] = [
    {
      key: "basic",
      label: "Basic",
      description: "Essential settings for quick setup"
    },
    {
      key: "intermediate",
      label: "Intermediate", 
      description: "Additional configuration options"
    },
    {
      key: "advanced",
      label: "Advanced",
      description: "Full control and customization"
    }
  ]

  return (
    <div className="flex items-center gap-2 mb-6 p-4 bg-neutral-50 rounded-lg">
      <span className="text-sm font-medium text-neutral-700 mr-2">Configuration Level:</span>
      {levels.map((level, index) => (
        <React.Fragment key={level.key}>
          <motion.button
            onClick={() => onLevelChange(level.key)}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
              currentLevel === level.key
                ? "bg-primary-500 text-white shadow-md"
                : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {level.label}
          </motion.button>
          {index < levels.length - 1 && (
            <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// Agent Configuration Component
const AgentConfiguration = ({ 
  level, 
  onConfigChange 
}: {
  level: DisclosureLevel
  onConfigChange: (config: any) => void
}) => {
  const [config, setConfig] = useState({
    name: "",
    role: "",
    objectives: "",
    autonomyLevel: "supervised",
    budgetLimit: "1000",
    apiKeys: [],
    customPrompt: "",
    learningMode: "enabled",
    safetyFilters: ["inappropriate-content", "brand-compliance"],
    escalationRules: [],
    performanceMetrics: []
  })

  const updateConfig = useCallback((key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    onConfigChange(newConfig)
  }, [config, onConfigChange])

  return (
    <div className="space-y-4">
      <ProgressiveDisclosure
        level="basic"
        currentLevel={level}
        title="Basic Agent Settings"
        description="Essential configuration for your AI agent"
        onLevelChange={() => {}}
      >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Agent Name *
            </label>
            <Input
              placeholder="e.g., Content Creator Pro"
              value={config.name}
              onChange={(e) => updateConfig("name", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Primary Role *
            </label>
            <select
              value={config.role}
              onChange={(e) => updateConfig("role", e.target.value)}
              className="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select role...</option>
              <option value="content-creator">Content Creator</option>
              <option value="scheduler">Content Scheduler</option>
              <option value="analyzer">Performance Analyzer</option>
              <option value="moderator">Community Moderator</option>
              <option value="strategist">Campaign Strategist</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Objectives
            </label>
            <Textarea
              placeholder="Describe what this agent should accomplish..."
              value={config.objectives}
              onChange={(e) => updateConfig("objectives", e.target.value)}
            />
          </div>
        </div>
      </ProgressiveDisclosure>

      <ProgressiveDisclosure
        level="intermediate"
        currentLevel={level}
        title="Autonomy & Control"
        description="Configure how much independence the agent has"
        badge="Recommended"
        onLevelChange={() => {}}
      >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Autonomy Level
            </label>
            <select
              value={config.autonomyLevel}
              onChange={(e) => updateConfig("autonomyLevel", e.target.value)}
              className="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="supervised">Supervised - Requires approval</option>
              <option value="semi-autonomous">Semi-Autonomous - Auto-approve safe actions</option>
              <option value="autonomous">Autonomous - Full independence</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Budget Limit ($/month)
            </label>
            <Input
              type="number"
              value={config.budgetLimit}
              onChange={(e) => updateConfig("budgetLimit", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Safety Filters
            </label>
            <div className="space-y-2">
              {[
                "inappropriate-content",
                "brand-compliance", 
                "privacy-protection",
                "spam-prevention",
                "sentiment-monitoring"
              ].map((filter) => (
                <label key={filter} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.safetyFilters.includes(filter)}
                    onChange={(e) => {
                      const filters = e.target.checked
                        ? [...config.safetyFilters, filter]
                        : config.safetyFilters.filter(f => f !== filter)
                      updateConfig("safetyFilters", filters)
                    }}
                    className="rounded border-neutral-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700 capitalize">
                    {filter.replace('-', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </ProgressiveDisclosure>

      <ProgressiveDisclosure
        level="advanced"
        currentLevel={level}
        title="Advanced Configuration"
        description="Fine-tune behavior and performance"
        badge="Expert"
        onLevelChange={() => {}}
      >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Custom Prompt Engineering
            </label>
            <Textarea
              placeholder="Advanced: Add custom instructions for the AI model..."
              value={config.customPrompt}
              onChange={(e) => updateConfig("customPrompt", e.target.value)}
              className="min-h-[100px] font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Learning Mode
            </label>
            <select
              value={config.learningMode}
              onChange={(e) => updateConfig("learningMode", e.target.value)}
              className="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="enabled">Enabled - Learn from interactions</option>
              <option value="limited">Limited - Learn within constraints</option>
              <option value="disabled">Disabled - No learning</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Performance Metrics
            </label>
            <div className="space-y-2">
              {[
                "engagement-rate",
                "conversion-tracking",
                "sentiment-analysis",
                "reach-optimization", 
                "cost-efficiency"
              ].map((metric) => (
                <label key={metric} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.performanceMetrics.includes(metric)}
                    onChange={(e) => {
                      const metrics = e.target.checked
                        ? [...config.performanceMetrics, metric]
                        : config.performanceMetrics.filter(m => m !== metric)
                      updateConfig("performanceMetrics", metrics)
                    }}
                    className="rounded border-neutral-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700 capitalize">
                    {metric.replace('-', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </ProgressiveDisclosure>
    </div>
  )
}

// Contextual Help System
const ContextualHelp = ({ 
  topic, 
  isOpen, 
  onClose 
}: {
  topic: string
  isOpen: boolean
  onClose: () => void
}) => {
  const helpContent = {
    "autonomy-levels": {
      title: "Understanding Autonomy Levels",
      content: `
        <div class="space-y-3">
          <div>
            <strong>Supervised:</strong> Agent will always ask for approval before taking actions. 
            Best for beginners or sensitive campaigns.
          </div>
          <div>
            <strong>Semi-Autonomous:</strong> Agent can automatically approve safe, low-risk actions 
            but will escalate important decisions. Recommended for most users.
          </div>
          <div>
            <strong>Autonomous:</strong> Agent operates independently with minimal oversight. 
            Only for experienced users with well-defined policies.
          </div>
        </div>
      `
    },
    "safety-filters": {
      title: "Safety Filter Options",
      content: `
        <div class="space-y-3">
          <div>
            <strong>Inappropriate Content:</strong> Prevents posting of offensive or inappropriate material.
          </div>
          <div>
            <strong>Brand Compliance:</strong> Ensures all content aligns with your brand guidelines.
          </div>
          <div>
            <strong>Privacy Protection:</strong> Prevents sharing of sensitive or personal information.
          </div>
        </div>
      `
    }
  }

  const help = helpContent[topic as keyof typeof helpContent]

  return (
    <AnimatePresence>
      {isOpen && help && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">{help.title}</h3>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <div 
              className="text-sm text-neutral-600"
              dangerouslySetInnerHTML={{ __html: help.content }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Main Progressive Disclosure Component
export interface ProgressiveDisclosureSystemProps {
  initialLevel?: DisclosureLevel
  onConfigurationChange?: (config: any) => void
  className?: string
}

export const ProgressiveDisclosureSystem = React.forwardRef<
  HTMLDivElement,
  ProgressiveDisclosureSystemProps
>(({ initialLevel = "basic", onConfigurationChange, className, ...props }, ref) => {
  const [currentLevel, setCurrentLevel] = useState<DisclosureLevel>(initialLevel)
  const [helpTopic, setHelpTopic] = useState<string | null>(null)

  const handleLevelChange = useCallback((level: DisclosureLevel) => {
    setCurrentLevel(level)
  }, [])

  const handleConfigChange = useCallback((config: any) => {
    onConfigurationChange?.(config)
  }, [onConfigurationChange])

  return (
    <div 
      ref={ref} 
      className={cn("max-w-4xl mx-auto p-6", className)} 
      {...props}
    >
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Agent Configuration
          </h1>
          <p className="text-neutral-600">
            Configure your AI agent with progressive complexity control
          </p>
        </div>

        <LevelIndicator 
          currentLevel={currentLevel} 
          onLevelChange={handleLevelChange} 
        />

        <AgentConfiguration 
          level={currentLevel} 
          onConfigChange={handleConfigChange} 
        />

        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            onClick={() => setHelpTopic("autonomy-levels")}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            Need Help?
          </Button>
        </div>
      </div>

      <ContextualHelp
        topic={helpTopic || ""}
        isOpen={!!helpTopic}
        onClose={() => setHelpTopic(null)}
      />
    </div>
  )
})

ProgressiveDisclosureSystem.displayName = "ProgressiveDisclosureSystem"

export default ProgressiveDisclosureSystem