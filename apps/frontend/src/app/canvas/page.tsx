"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

// Mock canvas data
const mockSteps = [
  {
    id: "discover",
    name: "Discover",
    status: "completed" as const,
    duration: "2m 34s",
    description: "Research trending topics and analyze competitor content",
  },
  {
    id: "plan",
    name: "Plan",
    status: "completed" as const,
    duration: "1m 12s",
    description: "Generate content strategy and posting schedule",
  },
  {
    id: "draft",
    name: "Draft",
    status: "running" as const,
    duration: "0m 45s",
    progress: 67,
    description: "Create content variations for each platform",
  },
  {
    id: "verify",
    name: "Verify",
    status: "failed" as const,
    description: "Policy compliance and quality assurance checks",
  },
  {
    id: "approve",
    name: "Approve",
    status: "pending" as const,
    description: "Human review and approval process",
  },
  {
    id: "post",
    name: "Post",
    status: "pending" as const,
    description: "Schedule and publish content across platforms",
  },
]

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "success"
    case "running":
      return "default"
    case "failed":
      return "destructive"
    case "pending":
      return "secondary"
    default:
      return "outline"
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    case "running":
      return <Clock className="h-4 w-4 animate-pulse" />
    case "failed":
      return <AlertCircle className="h-4 w-4" />
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-current" />
  }
}

export default function CanvasPage() {
  const [mode, setMode] = useState<"plan" | "live">("live")
  const [isRunning, setIsRunning] = useState(true)

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Interactive Canvas
          </h1>
          <p className="text-muted-foreground">
            Monitor your campaign workflow in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={mode === "live" ? "default" : "secondary"}>
            {mode === "live" ? "Live Mode" : "Plan Mode"}
          </Badge>
          <Button
            variant="outline"
            onClick={() => setMode(mode === "live" ? "plan" : "live")}
          >
            Switch to {mode === "live" ? "Plan" : "Live"}
          </Button>
        </div>
      </div>

      {/* Micro-Graph Visualization */}
      <Card className="bg-canvas-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workflow Progress</CardTitle>
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsRunning(false)}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsRunning(true)}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              )}
              <Button size="sm" variant="outline">
                <RotateCcw className="h-4 w-4 mr-1" />
                Restart
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between max-w-5xl mx-auto py-8">
            {mockSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {/* Step Node */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="relative">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                        step.status === "completed"
                          ? "bg-success text-white border-success"
                          : step.status === "running"
                          ? "bg-primary text-white border-primary animate-pulse"
                          : step.status === "failed"
                          ? "bg-destructive text-white border-destructive"
                          : "bg-canvas-node border-canvas-edge"
                      }`}
                    >
                      {getStatusIcon(step.status)}
                    </div>
                    {/* Progress ring for running steps */}
                    {step.status === "running" && step.progress && (
                      <svg className="absolute inset-0 w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="30"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeOpacity="0.3"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="30"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray={`${step.progress * 1.88} 188`}
                          className="text-primary transition-all duration-300"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="text-center min-w-0">
                    <div className="text-sm font-medium">{step.name}</div>
                    {step.duration && (
                      <div className="text-xs text-muted-foreground">
                        {step.duration}
                      </div>
                    )}
                    {step.status === "running" && step.progress && (
                      <div className="text-xs text-muted-foreground">
                        {step.progress}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector */}
                {index < mockSteps.length - 1 && (
                  <div className="flex-1 flex items-center justify-center mx-4">
                    <div
                      className={`h-0.5 w-full transition-colors duration-200 ${
                        step.status === "completed" || step.status === "running"
                          ? "bg-primary"
                          : "bg-border"
                      }`}
                    />
                    {mode === "live" &&
                      (step.status === "completed" ||
                        step.status === "running") && (
                        <div className="absolute w-2 h-2 bg-primary rounded-full animate-ping" />
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Details */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockSteps.map((step) => (
          <Card
            key={step.id}
            className={`${
              step.status === "running"
                ? "border-primary/50 bg-primary/5"
                : step.status === "completed"
                ? "border-success/50 bg-success/5"
                : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{step.name}</CardTitle>
                <Badge variant={getStatusColor(step.status)}>
                  {step.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>{step.description}</CardDescription>
              {step.duration && (
                <div className="text-sm text-muted-foreground">
                  Duration: {step.duration}
                </div>
              )}
              {step.status === "running" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{step.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              )}
              {step.status === "completed" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Results
                  </Button>
                  <Button size="sm" variant="outline">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Rerun
                  </Button>
                </div>
              )}
              {step.status === "failed" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Error
                  </Button>
                  <Button size="sm">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline & Replay */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline & Replay</CardTitle>
          <CardDescription>
            Scrub through the workflow execution timeline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <div className="w-full h-2 bg-muted rounded-full">
              <div className="w-1/2 h-2 bg-primary rounded-full" />
            </div>
            <div className="absolute top-[-4px] left-1/2 w-4 h-4 bg-primary rounded-full transform -translate-x-1/2 cursor-pointer" />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Start: 10:30 AM</span>
            <span>Current: 10:32 AM</span>
            <span>Est. End: 10:35 AM</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Play className="h-3 w-3 mr-1" />
              Play Timeline
            </Button>
            <Button size="sm" variant="outline">
              Export Timeline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}