"use client"

import * as React from "react"
import { Send, Paperclip, MoreVertical, Bot, User, Copy, ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/cn"
import { Button } from "./button"
import { Input } from "./input"
import { Card, CardContent, CardHeader } from "./card"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Badge } from "./badge"
import { ScrollArea } from "./scroll-area"

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  metadata?: {
    model?: string
    tokens?: number
    cost?: number
    reasoning?: string
    sources?: Array<{
      title: string
      url: string
      snippet: string
    }>
  }
  status?: 'sending' | 'sent' | 'error'
  reactions?: {
    helpful: boolean
    unhelpful: boolean
  }
}

interface AgentChatWindowProps {
  messages: ChatMessage[]
  isLoading?: boolean
  isTyping?: boolean
  agentName?: string
  agentAvatar?: string
  placeholder?: string
  onSendMessage?: (message: string) => void
  onMessageReaction?: (messageId: string, reaction: 'helpful' | 'unhelpful') => void
  onCopyMessage?: (message: ChatMessage) => void
  className?: string
}

const AgentChatWindow = React.forwardRef<HTMLDivElement, AgentChatWindowProps>(
  ({
    messages,
    isLoading = false,
    isTyping = false,
    agentName = "AI Assistant",
    agentAvatar,
    placeholder = "Type your message...",
    onSendMessage,
    onMessageReaction,
    onCopyMessage,
    className
  }, ref) => {
    const [inputValue, setInputValue] = React.useState("")
    const [attachments, setAttachments] = React.useState<File[]>([])
    const messagesEndRef = React.useRef<HTMLDivElement>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    React.useEffect(() => {
      scrollToBottom()
    }, [messages, isTyping])

    const handleSend = () => {
      if (inputValue.trim() && onSendMessage) {
        onSendMessage(inputValue.trim())
        setInputValue("")
        setAttachments([])
      }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }

    const handleFileAttach = () => {
      fileInputRef.current?.click()
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      setAttachments(prev => [...prev, ...files])
    }

    const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const formatTimestamp = (date: Date) => {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const renderMessage = (message: ChatMessage) => {
      const isUser = message.role === 'user'
      const isSystem = message.role === 'system'

      if (isSystem) {
        return (
          <div key={message.id} className="flex justify-center py-2">
            <Badge variant="outline" className="text-xs">
              {message.content}
            </Badge>
          </div>
        )
      }

      return (
        <div key={message.id} className={cn(
          "flex gap-3 p-4 group",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          <Avatar className="w-8 h-8 flex-shrink-0">
            {isUser ? (
              <>
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </>
            ) : (
              <>
                <AvatarImage src={agentAvatar} />
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </>
            )}
          </Avatar>

          <div className={cn(
            "flex-1 space-y-2",
            isUser ? "items-end" : "items-start"
          )}>
            <div className={cn(
              "max-w-[80%] rounded-lg p-3 text-sm",
              isUser 
                ? "bg-primary text-primary-foreground ml-auto" 
                : "bg-muted"
            )}>
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
              
              {message.metadata?.sources && message.metadata.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/20">
                  <div className="text-xs opacity-80 mb-1">Sources:</div>
                  {message.metadata.sources.map((source, index) => (
                    <div key={index} className="text-xs opacity-80 truncate">
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {source.title}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={cn(
              "flex items-center gap-2 text-xs text-muted-foreground",
              isUser ? "justify-end" : "justify-start"
            )}>
              <span>{formatTimestamp(message.timestamp)}</span>
              
              {message.metadata?.model && (
                <Badge variant="outline" className="text-xs">
                  {message.metadata.model}
                </Badge>
              )}
              
              {message.metadata?.tokens && (
                <span>{message.metadata.tokens} tokens</span>
              )}
              
              {message.status === 'sending' && (
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              )}
              
              {message.status === 'error' && (
                <Badge variant="destructive" className="text-xs">
                  Error
                </Badge>
              )}
            </div>

            {!isUser && message.status === 'sent' && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => onCopyMessage?.(message)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-6 w-6 p-0",
                    message.reactions?.helpful && "text-green-600"
                  )}
                  onClick={() => onMessageReaction?.(message.id, 'helpful')}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-6 w-6 p-0",
                    message.reactions?.unhelpful && "text-red-600"
                  )}
                  onClick={() => onMessageReaction?.(message.id, 'unhelpful')}
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <Card ref={ref} className={cn("flex flex-col h-96", className)}>
        <CardHeader className="flex-row items-center justify-between py-3 px-4 border-b">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={agentAvatar} />
              <AvatarFallback>
                <Bot className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{agentName}</span>
            {isTyping && (
              <Badge variant="secondary" className="text-xs">
                Typing...
              </Badge>
            )}
          </div>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="min-h-0">
              {messages.map(renderMessage)}
              
              {isTyping && (
                <div className="flex gap-3 p-4">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={agentAvatar} />
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {attachments.length > 0 && (
            <div className="border-t p-2">
              <div className="flex flex-wrap gap-1">
                {attachments.map((file, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs cursor-pointer"
                    onClick={() => removeAttachment(index)}
                  >
                    {file.name} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={handleFileAttach}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                disabled={isLoading}
                className="flex-1"
              />
              
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="h-8 px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </CardContent>
      </Card>
    )
  }
)

AgentChatWindow.displayName = "AgentChatWindow"

export { AgentChatWindow, type ChatMessage }