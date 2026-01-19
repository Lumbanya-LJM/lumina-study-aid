import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Send, 
  Loader2,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIAssistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  classTitle: string;
  classDescription?: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  { icon: HelpCircle, label: "Explain this concept", prompt: "Can you explain the current topic being discussed in simpler terms?" },
  { icon: Lightbulb, label: "Give me an example", prompt: "Can you provide a practical example related to what's being taught?" },
  { icon: BookOpen, label: "Key takeaways", prompt: "What are the key points I should remember from this class so far?" },
  { icon: GraduationCap, label: "Quiz me", prompt: "Ask me a question to test my understanding of the material." },
];

export function AIAssistPanel({
  isOpen,
  onClose,
  classTitle,
  classDescription
}: AIAssistPanelProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize with a welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hi! I'm your AI study assistant for "${classTitle}". I'm here to help you understand concepts, answer questions, and support your learning during this class. What would you like to know?`
      }]);
    }
  }, [isOpen, classTitle, messages.length]);

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    const newUserMessage: ChatMessage = { role: 'user', content: userMessage.trim() };
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation context
      const conversationHistory = [...messages, newUserMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages: conversationHistory,
          systemPrompt: `You are Lumina, an AI study assistant helping a student during a live class titled "${classTitle}". ${classDescription ? `The class is about: ${classDescription}.` : ''}

Your role is to:
- Help explain concepts being discussed in the class
- Answer questions about the subject matter
- Provide examples and analogies to aid understanding
- Encourage active learning and critical thinking
- Be concise and clear in your explanations
- If you don't know something specific to the class content, be honest about it

Keep responses focused and helpful. Use bullet points or numbered lists when appropriate for clarity.`
        }
      });

      if (error) throw error;

      // Handle streaming response
      if (data) {
        // If it's a streaming response, handle the text
        let responseText = '';
        
        if (typeof data === 'string') {
          responseText = data;
        } else if (data.choices?.[0]?.message?.content) {
          responseText = data.choices[0].message.content;
        } else if (data.content) {
          responseText = data.content;
        } else {
          responseText = JSON.stringify(data);
        }

        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      }
    } catch (error) {
      console.error('AI Assist error:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed z-50 bg-card border shadow-2xl rounded-xl transition-all duration-300 flex flex-col",
      isExpanded 
        ? "inset-4 md:inset-8" 
        : "bottom-24 right-4 w-80 md:w-[420px] h-[500px] max-h-[70vh]"
    )}>
      {/* Header */}
      <CardHeader className="pb-2 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="font-semibold">AI Study Assistant</span>
              <p className="text-xs text-muted-foreground font-normal">Ask questions about the class</p>
            </div>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 px-4">
          <div ref={scrollRef} className="py-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-2",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "text-sm p-3 rounded-xl max-w-[85%]",
                    msg.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-br-sm" 
                      : "bg-muted rounded-bl-sm"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-muted rounded-xl rounded-bl-sm p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick prompts - show only when few messages */}
        {messages.length <= 2 && !isLoading && (
          <div className="px-4 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((item, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={() => handleQuickPrompt(item.prompt)}
                >
                  <item.icon className="h-3 w-3" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about the class..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </div>
  );
}
