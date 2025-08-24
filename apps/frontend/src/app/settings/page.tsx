"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Settings, User, DollarSign, Shield, Plus, Edit, Trash2 } from "lucide-react"

// Mock data - in real app this would come from API
const mockPersonas = [
  {
    id: "persona-1",
    name: "Professional Thought Leader",
    description: "Authoritative voice in industry insights",
    tone: "professional" as const,
    traits: ["analytical", "expert", "data-driven"],
    industries: ["Technology", "Marketing"],
    isActive: true,
  },
  {
    id: "persona-2", 
    name: "Friendly Brand Voice",
    description: "Approachable and engaging communication",
    tone: "friendly" as const,
    traits: ["conversational", "helpful", "engaging"],
    industries: ["Retail", "Consumer Goods"],
    isActive: true,
  }
]

const mockBudgetSettings = {
  weeklyBudget: 1000,
  hardCap: 5000,
  alertThreshold: 80,
  currency: "USD",
  autoApprovalLimit: 200,
}

const mockPolicySettings = {
  requireApprovalAbove: 500,
  duplicateContentThreshold: 0.8,
  citationRequirement: true,
  brandSafetyEnabled: true,
  complianceChecks: ["GDPR", "CCPA", "Industry Standards"],
}

interface Persona {
  id: string
  name: string
  description: string
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative'
  traits: string[]
  industries: string[]
  isActive: boolean
}

export default function SettingsPage() {
  const [personas, setPersonas] = React.useState<Persona[]>(mockPersonas)
  const [budgetSettings, setBudgetSettings] = React.useState(mockBudgetSettings)
  const [policySettings, setPolicySettings] = React.useState(mockPolicySettings)
  const [selectedPersona, setSelectedPersona] = React.useState<Persona | null>(null)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs defaultValue="personas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personas" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personas
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personas" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-semibold tracking-tight">Brand Personas</h3>
            <Button onClick={() => setSelectedPersona({} as Persona)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Persona
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona) => (
              <Card key={persona.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{persona.name}</CardTitle>
                    <Badge variant={persona.isActive ? "default" : "secondary"}>
                      {persona.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>{persona.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Tone</Label>
                    <Badge variant="outline" className="ml-2 capitalize">
                      {persona.tone}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Traits</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {persona.traits.slice(0, 3).map((trait) => (
                        <Badge key={trait} variant="secondary" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                      {persona.traits.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{persona.traits.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Industries</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {persona.industries.map((industry) => (
                        <Badge key={industry} variant="outline" className="text-xs">
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setSelectedPersona(persona)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {}}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-semibold tracking-tight">Budget Controls</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Budget Cap</CardTitle>
                <CardDescription>
                  Maximum amount to spend per week across all campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="weekly-budget">Weekly Budget ({budgetSettings.currency})</Label>
                  <Input
                    id="weekly-budget"
                    type="number"
                    value={budgetSettings.weeklyBudget}
                    onChange={(e) => setBudgetSettings(prev => ({
                      ...prev,
                      weeklyBudget: Number(e.target.value)
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hard-cap">Hard Cap ({budgetSettings.currency})</Label>
                  <Input
                    id="hard-cap"
                    type="number"
                    value={budgetSettings.hardCap}
                    onChange={(e) => setBudgetSettings(prev => ({
                      ...prev,
                      hardCap: Number(e.target.value)
                    }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Settings</CardTitle>
                <CardDescription>
                  Configure when to receive budget alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="alert-threshold">Alert Threshold (%)</Label>
                  <Input
                    id="alert-threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={budgetSettings.alertThreshold}
                    onChange={(e) => setBudgetSettings(prev => ({
                      ...prev,
                      alertThreshold: Number(e.target.value)
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when {budgetSettings.alertThreshold}% of budget is spent
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auto-approval">Auto-Approval Limit ({budgetSettings.currency})</Label>
                  <Input
                    id="auto-approval"
                    type="number"
                    value={budgetSettings.autoApprovalLimit}
                    onChange={(e) => setBudgetSettings(prev => ({
                      ...prev,
                      autoApprovalLimit: Number(e.target.value)
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Campaigns under this amount are auto-approved
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-semibold tracking-tight">Policy Configuration</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Approval Requirements</CardTitle>
                <CardDescription>
                  Configure when manual approval is required
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="approval-threshold">Require Approval Above ({budgetSettings.currency})</Label>
                  <Input
                    id="approval-threshold"
                    type="number"
                    value={policySettings.requireApprovalAbove}
                    onChange={(e) => setPolicySettings(prev => ({
                      ...prev,
                      requireApprovalAbove: Number(e.target.value)
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duplicate-threshold">Duplicate Content Threshold</Label>
                  <Input
                    id="duplicate-threshold"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={policySettings.duplicateContentThreshold}
                    onChange={(e) => setPolicySettings(prev => ({
                      ...prev,
                      duplicateContentThreshold: Number(e.target.value)
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Similarity threshold for duplicate detection (0-1)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Policies</CardTitle>
                <CardDescription>
                  Configure content validation rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Citation Requirement</Label>
                    <p className="text-xs text-muted-foreground">
                      Require sources for claims and statistics
                    </p>
                  </div>
                  <Badge variant={policySettings.citationRequirement ? "default" : "secondary"}>
                    {policySettings.citationRequirement ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Brand Safety</Label>
                    <p className="text-xs text-muted-foreground">
                      Scan content for brand safety issues
                    </p>
                  </div>
                  <Badge variant={policySettings.brandSafetyEnabled ? "default" : "secondary"}>
                    {policySettings.brandSafetyEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div>
                  <Label>Compliance Checks</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {policySettings.complianceChecks.map((check) => (
                      <Badge key={check} variant="outline" className="text-xs">
                        {check}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}