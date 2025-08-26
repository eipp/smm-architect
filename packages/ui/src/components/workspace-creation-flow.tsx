"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { motion, AnimatePresence } from "framer-motion"

// Step Indicator Component
const StepIndicator = ({ 
  steps, 
  currentStep, 
  onStepClick 
}: { 
  steps: string[]
  currentStep: number
  onStepClick: (step: number) => void
}) => (
  <div className="flex items-center justify-center mb-8">
    {steps.map((step, index) => (
      <React.Fragment key={index}>
        <motion.button
          onClick={() => onStepClick(index)}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all duration-200",
            index < currentStep
              ? "bg-success-500 text-white shadow-md hover:shadow-lg"
              : index === currentStep
              ? "bg-primary-500 text-white shadow-lg ring-4 ring-primary-200"
              : "bg-neutral-200 text-neutral-500 hover:bg-neutral-300"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={index > currentStep}
        >
          {index < currentStep ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            index + 1
          )}
        </motion.button>
        {index < steps.length - 1 && (
          <div 
            className={cn(
              "flex-1 h-0.5 mx-4 transition-all duration-300",
              index < currentStep ? "bg-success-500" : "bg-neutral-200"
            )}
          />
        )}
      </React.Fragment>
    ))}
  </div>
)

// Step 1: Define Goals
const DefineGoalsStep = ({ 
  data, 
  onChange, 
  onNext 
}: { 
  data: any
  onChange: (data: any) => void
  onNext: () => void
}) => {
  const [goals, setGoals] = useState(data.goals || "")
  const [industry, setIndustry] = useState(data.industry || "")
  const [audience, setAudience] = useState(data.audience || "")

  const handleNext = useCallback(() => {
    onChange({ goals, industry, audience })
    onNext()
  }, [goals, industry, audience, onChange, onNext])

  const isValid = goals.trim() && industry.trim() && audience.trim()

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Define Your Goals</h2>
        <p className="text-neutral-600">Tell us about your social media marketing objectives</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Campaign Goals *
          </label>
          <Textarea
            placeholder="Describe your marketing goals, KPIs, and success metrics..."
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Industry *
          </label>
          <Input
            placeholder="e.g., Technology, Healthcare, E-commerce"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Target Audience *
          </label>
          <Textarea
            placeholder="Describe your target demographics, interests, and behaviors..."
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleNext} 
          disabled={!isValid}
          rightIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          }
        >
          Continue to Agents
        </Button>
      </div>
    </motion.div>
  )
}

// Step 2: Configure Agents
const ConfigureAgentsStep = ({ 
  data, 
  onChange, 
  onNext, 
  onPrev 
}: { 
  data: any
  onChange: (data: any) => void
  onNext: () => void
  onPrev: () => void
}) => {
  const [selectedAgents, setSelectedAgents] = useState(data.agents || [])

  const agentTypes = [
    {
      id: "content-creator",
      name: "Content Creator",
      description: "AI agent specialized in creating engaging social media content",
      capabilities: ["Text generation", "Hashtag optimization", "Trend analysis"],
      recommended: true
    },
    {
      id: "scheduler",
      name: "Content Scheduler",
      description: "Optimizes posting times and manages content calendar",
      capabilities: ["Time optimization", "Platform coordination", "Calendar management"],
      recommended: true
    },
    {
      id: "analyzer",
      name: "Performance Analyzer",
      description: "Tracks metrics and provides actionable insights",
      capabilities: ["Analytics tracking", "Performance reporting", "ROI calculation"],
      recommended: false
    },
    {
      id: "moderator",
      name: "Community Moderator",
      description: "Manages comments, DMs, and community engagement",
      capabilities: ["Comment moderation", "Response automation", "Community management"],
      recommended: false
    }
  ]

  const toggleAgent = useCallback((agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    )
  }, [])

  const handleNext = useCallback(() => {
    onChange({ agents: selectedAgents })
    onNext()
  }, [selectedAgents, onChange, onNext])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Configure AI Agents</h2>
        <p className="text-neutral-600">Select the AI agents that will power your workspace</p>
      </div>

      <div className="grid gap-4">
        {agentTypes.map((agent) => (
          <motion.div
            key={agent.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={cn(
                "cursor-pointer border-2 transition-all duration-200",
                selectedAgents.includes(agent.id)
                  ? "border-primary-500 bg-primary-50 shadow-md"
                  : "border-neutral-200 hover:border-primary-300 hover:shadow-md"
              )}
              onClick={() => toggleAgent(agent.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-neutral-900">{agent.name}</h3>
                      {agent.recommended && (
                        <span className="px-2 py-1 text-xs font-medium bg-accent-100 text-accent-700 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mb-3">{agent.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.map((capability) => (
                        <span
                          key={capability}
                          className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded"
                        >
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                    selectedAgents.includes(agent.id)
                      ? "bg-primary-500 border-primary-500"
                      : "border-neutral-300"
                  )}>
                    {selectedAgents.includes(agent.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          Back to Goals
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={selectedAgents.length === 0}
          rightIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          }
        >
          Continue to Policies
        </Button>
      </div>
    </motion.div>
  )
}

// Step 3: Set Policies
const SetPoliciesStep = ({ 
  data, 
  onChange, 
  onNext, 
  onPrev 
}: { 
  data: any
  onChange: (data: any) => void
  onNext: () => void
  onPrev: () => void
}) => {
  const [policies, setPolicies] = useState(data.policies || {
    contentApproval: "automatic",
    budgetLimit: "1000",
    postingFrequency: "daily",
    complianceLevel: "standard"
  })

  const updatePolicy = useCallback((key: string, value: string) => {
    setPolicies(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleNext = useCallback(() => {
    onChange({ policies })
    onNext()
  }, [policies, onChange, onNext])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Set Policies</h2>
        <p className="text-neutral-600">Configure governance and compliance settings</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Content Approval Process
              </label>
              <select
                value={policies.contentApproval}
                onChange={(e) => updatePolicy("contentApproval", e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="automatic">Automatic (AI-driven)</option>
                <option value="manual">Manual Review Required</option>
                <option value="hybrid">Hybrid (Smart + Human)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Monthly Budget Limit ($)
              </label>
              <Input
                type="number"
                value={policies.budgetLimit}
                onChange={(e) => updatePolicy("budgetLimit", e.target.value)}
                placeholder="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Posting Frequency
              </label>
              <select
                value={policies.postingFrequency}
                onChange={(e) => updatePolicy("postingFrequency", e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="daily">Daily</option>
                <option value="bidaily">Twice Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom Schedule</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Compliance Level
              </label>
              <select
                value={policies.complianceLevel}
                onChange={(e) => updatePolicy("complianceLevel", e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="strict">Strict</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          Back to Agents
        </Button>
        <Button 
          onClick={handleNext}
          rightIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          }
        >
          Review & Create
        </Button>
      </div>
    </motion.div>
  )
}

// Step 4: Review & Create
const ReviewCreateStep = ({ 
  data, 
  onPrev, 
  onCreate 
}: { 
  data: any
  onPrev: () => void
  onCreate: (data: any) => void
}) => {
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = useCallback(async () => {
    setIsCreating(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      onCreate(data)
    } finally {
      setIsCreating(false)
    }
  }, [data, onCreate])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Review & Create</h2>
        <p className="text-neutral-600">Review your workspace configuration before creation</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Goals & Audience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-neutral-700">Industry:</span>
                <p className="text-neutral-900">{data.industry}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-neutral-700">Goals:</span>
                <p className="text-neutral-900">{data.goals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selected Agents ({data.agents?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.agents?.map((agentId: string) => (
                <span
                  key={agentId}
                  className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                >
                  {agentId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-neutral-700">Content Approval:</span>
                <p className="text-neutral-900 capitalize">{data.policies?.contentApproval}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-neutral-700">Budget Limit:</span>
                <p className="text-neutral-900">${data.policies?.budgetLimit}/month</p>
              </div>
              <div>
                <span className="text-sm font-medium text-neutral-700">Posting Frequency:</span>
                <p className="text-neutral-900 capitalize">{data.policies?.postingFrequency}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-neutral-700">Compliance Level:</span>
                <p className="text-neutral-900 capitalize">{data.policies?.complianceLevel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isCreating}>
          Back to Policies
        </Button>
        <Button 
          onClick={handleCreate} 
          loading={isCreating}
          loadingText="Creating Workspace..."
          rightIcon={
            !isCreating && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )
          }
        >
          Create Workspace
        </Button>
      </div>
    </motion.div>
  )
}

// Main Workspace Creation Flow Component
export interface WorkspaceCreationFlowProps {
  onComplete?: (data: any) => void
  onCancel?: () => void
  className?: string
}

export const WorkspaceCreationFlow = React.forwardRef<
  HTMLDivElement,
  WorkspaceCreationFlowProps
>(({ onComplete, onCancel, className, ...props }, ref) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({})

  const steps = [
    "Define Goals",
    "Configure Agents", 
    "Set Policies",
    "Review & Create"
  ]

  const updateFormData = useCallback((stepData: any) => {
    setFormData(prev => ({ ...prev, ...stepData }))
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  }, [steps.length])

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  const handleStepClick = useCallback((step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step)
    }
  }, [currentStep])

  const handleComplete = useCallback((finalData: any) => {
    onComplete?.(finalData)
  }, [onComplete])

  return (
    <div 
      ref={ref} 
      className={cn("max-w-4xl mx-auto p-6", className)} 
      {...props}
    >
      <Card className="shadow-lg">
        <CardContent className="p-8">
          <StepIndicator 
            steps={steps} 
            currentStep={currentStep} 
            onStepClick={handleStepClick}
          />

          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <DefineGoalsStep
                key="goals"
                data={formData}
                onChange={updateFormData}
                onNext={nextStep}
              />
            )}
            {currentStep === 1 && (
              <ConfigureAgentsStep
                key="agents"
                data={formData}
                onChange={updateFormData}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 2 && (
              <SetPoliciesStep
                key="policies"
                data={formData}
                onChange={updateFormData}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 3 && (
              <ReviewCreateStep
                key="review"
                data={formData}
                onPrev={prevStep}
                onCreate={handleComplete}
              />
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
})

WorkspaceCreationFlow.displayName = "WorkspaceCreationFlow"

export default WorkspaceCreationFlow