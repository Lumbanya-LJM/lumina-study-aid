import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { 
  ArrowLeft, 
  Send, 
  Mic, 
  Paperclip, 
  Sparkles,
  FileText,
  Brain,
  BookOpen,
  Calendar,
  Settings,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'lumina';
  timestamp: Date;
}

const quickPrompts = [
  { icon: FileText, label: 'Summarise a case', action: 'summarise' },
  { icon: Brain, label: 'Create flashcards', action: 'flashcards' },
  { icon: BookOpen, label: 'Quiz me', action: 'quiz' },
  { icon: Calendar, label: 'Update my schedule', action: 'schedule' },
];

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load chat history on mount
  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages(data.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.role === 'user' ? 'user' : 'lumina',
          timestamp: new Date(msg.created_at),
        })));
      } else {
        // Show welcome message if no history
        setMessages([{
          id: 'welcome',
          content: "Mwanasheli! I'm Lumina, your AI study companion. I'm here to help you excel in your law studies. You can ask me to summarise Zambian cases, create flashcards, quiz you on topics, or help manage your study schedule. How can I assist you today?",
          sender: 'lumina',
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveMessage = async (content: string, role: 'user' | 'assistant') => {
    if (!user) return;
    
    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        content,
        role,
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const clearChatHistory = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      // Reset to welcome message
      setMessages([{
        id: 'welcome',
        content: "Mwanasheli! I'm Lumina, your AI study companion. I'm here to help you excel in your law studies. You can ask me to summarise Zambian cases, create flashcards, quiz you on topics, or help manage your study schedule. How can I assist you today?",
        sender: 'lumina',
        timestamp: new Date(),
      }]);

      toast({
        title: "Chat cleared",
        description: "Your conversation history has been deleted.",
      });
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear chat history.",
      });
    }
  };

  const handleSend = async (customMessage?: string, action?: string) => {
    const messageText = customMessage || message;
    if (!messageText.trim() || isLoading) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setIsLoading(true);

    // Save user message to database
    await saveMessage(messageText, 'user');

    try {
      // Prepare messages for API
      const apiMessages = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));
      apiMessages.push({ role: 'user', content: messageText });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          action: action 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      // Add placeholder for assistant message
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        content: '',
        sender: 'lumina',
        timestamp: new Date(),
      }]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Process SSE lines
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: assistantContent }
                    : msg
                ));
              }
            } catch {
              // Partial JSON, put it back
              buffer = line + '\n' + buffer;
              break;
            }
          }
        }

        // Save assistant response to database after streaming completes
        if (assistantContent) {
          await saveMessage(assistantContent, 'assistant');
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response from Lumina",
      });
      
      // Add error message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        sender: 'lumina',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="px-5 py-4 safe-top border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <LuminaAvatar size="sm" isActive={!isLoading} />
              <div>
                <h1 className="font-semibold text-foreground">Lumina</h1>
                <p className={cn(
                  "text-xs flex items-center gap-1",
                  isLoading ? "text-warning" : "text-success"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isLoading ? "bg-warning animate-pulse" : "bg-success"
                  )} />
                  {isLoading ? "Thinking..." : "Online"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="p-2 rounded-xl hover:bg-secondary transition-colors">
                    <Trash2 className="w-5 h-5 text-muted-foreground" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your conversation history with Lumina. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={clearChatHistory}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear History
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <button 
                onClick={() => navigate('/customize-avatar')}
                className="p-2 rounded-xl hover:bg-secondary transition-colors"
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      msg.sender === 'user' && "flex-row-reverse"
                    )}
                  >
                    {msg.sender === 'lumina' && (
                      <LuminaAvatar size="sm" />
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3",
                        msg.sender === 'user'
                          ? "gradient-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-foreground rounded-bl-md"
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className={cn(
                        "text-[10px] mt-2",
                        msg.sender === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Prompts */}
              {messages.length <= 2 && (
                <div className="mt-6">
                  <p className="text-xs text-muted-foreground mb-3">Quick actions</p>
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setMessage(prompt.label);
                          handleSend(prompt.label, prompt.action);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-card border border-border/50 rounded-full text-sm text-foreground hover:bg-primary/5 hover:border-primary/30 transition-all"
                      >
                        <prompt.icon className="w-4 h-4 text-primary" />
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="px-5 py-4 safe-bottom border-t border-border bg-background">
          <div className="flex items-center gap-3">
            <button className="p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Lumina anything..."
                disabled={isLoading}
                className="w-full px-4 py-3 pr-12 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground text-sm transition-all disabled:opacity-50"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                <Sparkles className="w-4 h-4 text-primary" />
              </button>
            </div>
            <button 
              onClick={() => handleSend()}
              disabled={!message.trim() || isLoading}
              className={cn(
                "p-3 rounded-xl transition-all",
                message.trim() && !isLoading
                  ? "gradient-primary shadow-glow" 
                  : "bg-secondary"
              )}
            >
              {message.trim() ? (
                <Send className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Mic className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ChatPage;