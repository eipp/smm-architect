"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Zap,
  Clock,
  CheckCircle,
} from "lucide-react"

// Mock chat data
const mockMessages = [
  {
    id: "1",
    type: "bot" as const,
    content:
      "Hello! I'm your SMM Architect AI assistant. I can help you with campaign planning, content creation, and strategy optimization. What would you like to work on today?",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    agent: "Master Agent",
  },
  {
    id: "2",
    type: "user" as const,
    content: "I need help creating a LinkedIn campaign for our new product launch.",
    timestamp: new Date(Date.now() - 4 * 60 * 1000),
  },
  {
    id: "3",
    type: "bot" as const,
    content:
      "Great! I'll help you create a LinkedIn campaign for your product launch. Let me gather some information first. Can you tell me:\n\n1. What's the product name and key features?\n2. Who is your target audience?\n3. What's your campaign timeline?\n4. Do you have any specific messaging or brand guidelines?",
    timestamp: new Date(Date.now() - 3 * 60 * 1000),
    agent: "Research Agent",
  },
  {
    id: "4",
    type: "user" as const,
    content:
      "The product is 'FlowSync Pro' - a workflow automation tool for small businesses. Target audience is SMB owners and operations managers. Timeline is 4 weeks starting next Monday.",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: "5",
    type: "bot" as const,
    content:
      "Perfect! I'm now analyzing your requirements and researching the SMB automation market. I'll create a comprehensive campaign strategy that includes:\n\n✅ Competitive analysis\n✅ Content calendar (4 weeks)\n✅ Post variations for different audience segments\n✅ Engagement optimization tips\n\nThis will take about 2-3 minutes. Would you like me to start?",
    timestamp: new Date(Date.now() - 1 * 60 * 1000),
    agent: "Planner Agent",
    actions: ["Start Campaign Planning", "Customize Parameters"],
  },
]

export default function ChatPage() {
  const [message, setMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = () => {
    if (!message.trim()) return
    // Handle sending message
    setMessage("")
    setIsTyping(true)
    // Simulate AI response
    setTimeout(() => setIsTyping(false), 2000)
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 md:p-8 pt-6 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              Agent Chat
            </h1>
            <p className="text-muted-foreground">
              Collaborate with AI agents to optimize your campaigns
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              3 Agents Active
            </Badge>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
        {mockMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.type === "bot" && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            )}
            
            <div className={`max-w-2xl ${
              msg.type === "user" ? "order-1" : ""
            }`}>
              {msg.type === "bot" && msg.agent && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-primary">
                    {msg.agent}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
              )}
              
              <Card className={`${
                msg.type === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/50"
              }`}>
                <CardContent className="p-3">
                  <div className="text-sm whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  
                  {msg.actions && (
                    <div className="flex gap-2 mt-3">
                      {msg.actions.map((action, index) => (
                        <Button key={index} size="sm" variant="outline">
                          {action}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {msg.type === "user" && (
                <div className="text-xs text-muted-foreground text-right mt-1">
                  {formatTimestamp(msg.timestamp)}
                </div>
              )}
            </div>
            
            {msg.type === "user" && (
              <div className="flex-shrink-0 order-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                  <span className="text-xs text-muted-foreground">AI is thinking...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t p-4 md:p-8">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask about campaigns, content ideas, or strategy..."
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
          <Button onClick={handleSendMessage} disabled={!message.trim() || isTyping}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMessage("Help me create a new campaign")}
          >
            <Zap className="h-3 w-3 mr-1" />
            New Campaign
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMessage("Show me campaign performance")}
          >
            <Clock className="h-3 w-3 mr-1" />
            Performance
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMessage("Generate content ideas")}
          >
            Content Ideas
          </Button>
        </div>
      </div>
    </div>
  )
}