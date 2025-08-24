import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, CheckCircle, ArrowRight, Settings, Users, MessageSquare } from "lucide-react"

export default function OnboardPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          Auto Setup
          <Badge variant="secondary">New</Badge>
        </h1>
        <p className="text-muted-foreground">
          Get started with SMM Architect in minutes. We&apos;ll guide you through the setup process.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Connect Accounts
            </CardTitle>
            <CardDescription>
              Link your social media accounts to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm">LinkedIn Business</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-muted" />
                <span className="text-sm text-muted-foreground">Twitter/X</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-muted" />
                <span className="text-sm text-muted-foreground">Facebook</span>
              </div>
            </div>
            <Button className="w-full">
              <ArrowRight className="mr-2 h-4 w-4" />
              Connect More Accounts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configure Preferences
            </CardTitle>
            <CardDescription>
              Set up your brand voice and content preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Brand Voice</div>
              <div className="text-sm text-muted-foreground">Professional, friendly, engaging</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Content Types</div>
              <div className="flex gap-1 flex-wrap">
                <Badge variant="outline" className="text-xs">Product Updates</Badge>
                <Badge variant="outline" className="text-xs">Industry News</Badge>
                <Badge variant="outline" className="text-xs">Team Highlights</Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Customize Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Preview & Launch
            </CardTitle>
            <CardDescription>
              Review your setup and start your first campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Everything looks good! Your workspace is ready to generate engaging content across your connected platforms.
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Estimated setup time: 2-3 minutes</div>
              <div className="text-xs text-muted-foreground">First posts: Ready in 5 minutes</div>
            </div>
            <Button className="w-full">
              Launch Workspace
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Shadow Run Results</h2>
        <Card>
          <CardHeader>
            <CardTitle>Preview Campaign</CardTitle>
            <CardDescription>
              Here&apos;s what your AI assistant would create based on your preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">Sample LinkedIn Post</div>
                <div className="bg-muted p-3 rounded text-sm">
                  🚀 Exciting news! We&apos;re thriving in Q4 with innovative solutions that drive real results for our clients. 
                  Our team&apos;s dedication to excellence continues to set new standards in the industry. 
                  #Innovation #Growth #TeamWork
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Sample Twitter Post</div>
                <div className="bg-muted p-3 rounded text-sm">
                  Breaking: Industry insights that matter 📊 
                  
                  Key trends we&apos;re watching:
                  ✅ AI integration
                  ✅ Sustainable practices  
                  ✅ Customer-first approach
                  
                  What&apos;s your take? 🤔
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button>Approve & Start</Button>
              <Button variant="outline">Customize First</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}