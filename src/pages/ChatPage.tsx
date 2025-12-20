import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { MarkdownRenderer } from '@/components/lumina/MarkdownRenderer';
import {
  ArrowLeft,
  Send,
  Mic,
  MicOff,
  Sparkles,
  FileText,
  Brain,
  BookOpen,
  Calendar,
  RotateCcw,
  Copy,
  Check,
  Loader2,
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
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { haptics } from '@/lib/haptics';

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
  { icon: Calendar, label: 'Update schedule', action: 'schedule' },
];

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Voice input hook
  const handleVoiceResult = useCallback((transcript: string) => {
    setMessage(transcript);
  }, []);

  const handleVoiceError = useCallback((error: string) => {
    toast({
      variant: 'destructive',
      title: 'Voice Error',
      description: error,
    });
  }, [toast]);

  const {
    isListening,
    isSupported: isVoiceSupported,
    transcript,
    startListening,
    stopListening,
  } = useVoiceInput({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  });

  const handleVoiceToggle = () => {
    haptics.medium();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Update message as user speaks
  useEffect(() => {
    if (transcript) {
      setMessage(transcript);
    }
  }, [transcript]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

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
        setMessages(
          data.map((msg) => ({
            id: msg.id,
            content: msg.content,
            sender: msg.role === 'user' ? 'user' : 'lumina',
            timestamp: new Date(msg.created_at),
          })),
        );
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

      setMessages([]);

      toast({
        title: 'Chat cleared',
        description: 'Your conversation history has been deleted.',
      });
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear chat history.',
      });
    }
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
      haptics.light();
    } catch (error) {
      console.error('Failed to copy:', error);
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

    setMessages((prev) => [...prev, newMessage]);
    setMessage('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    // Save user message to database
    await saveMessage(messageText, 'user');

    try {
      // Prepare messages for API
      const apiMessages = messages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));
      apiMessages.push({ role: 'user', content: messageText });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            action,
          }),
        },
      );

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
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          content: '',
          sender: 'lumina',
          timestamp: new Date(),
        },
      ]);

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
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: assistantContent }
                      : msg,
                  ),
                );
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
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to get response from Lumina',
      });

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content:
            "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
          sender: 'lumina',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (action: string) => {
    const promptMap: Record<string, string> = {
      summarise:
        'Please summarise this Zambian case, focusing on the key facts, issue, holding, and reasoning.',
      flashcards:
        'Create detailed flashcards from my notes that focus on key principles, definitions, and case law.',
      quiz:
        'Generate a practice quiz based on my recent study topics with multiple choice questions.',
      schedule:
        'Help me update my study schedule for this week based on my upcoming classes and exams.',
    };

    const prompt = promptMap[action] || '';
    if (!prompt) return;

    setMessage(prompt);
    void handleSend(prompt, action);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayName =
    (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || 'there';

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 safe-top border-b border-border/50 bg-background/95 backdrop-blur-sm flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <LuminaAvatar size="sm" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Lumina</p>
              <p className="text-[11px] text-muted-foreground">AI Study Companion</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-2 rounded-xl hover:bg-secondary transition-colors">
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start new conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear your current chat history. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearChatHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Clear & Start New
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <LuminaAvatar size="lg" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    Hi {displayName}!
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    I'm Lumina, your AI study companion for Zambian law. How can I help you today?
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt.action}
                      onClick={() => handleQuickPrompt(prompt.action)}
                      className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-primary/30 transition-all group"
                    >
                      <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <prompt.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {prompt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.sender === 'lumina' && (
                      <div className="shrink-0 mt-1">
                        <LuminaAvatar size="sm" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'group relative max-w-[85%]',
                        msg.sender === 'user' ? 'order-1' : ''
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-3 transition-all',
                          msg.sender === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-secondary/50 border border-border/40 rounded-bl-md'
                        )}
                      >
                        {msg.sender === 'lumina' ? (
                          <MarkdownRenderer content={msg.content} />
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        )}
                      </div>
                      
                      {/* Message actions for Lumina */}
                      {msg.sender === 'lumina' && msg.content && (
                        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    {msg.sender === 'user' && (
                      <div className="shrink-0 mt-1 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-1">
                      <LuminaAvatar size="sm" />
                    </div>
                    <div className="bg-secondary/50 border border-border/40 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions when there is history */}
        {messages.length > 0 && !isLoadingHistory && !isLoading && (
          <div className="shrink-0 px-4 pb-2">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <span className="shrink-0 text-[11px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                </span>
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.action}
                    onClick={() => handleQuickPrompt(prompt.action)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/40 hover:border-primary/30 transition-colors"
                  >
                    <prompt.icon className="w-3 h-3 text-primary" />
                    <span className="text-[11px] font-medium text-foreground whitespace-nowrap">
                      {prompt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-sm safe-bottom">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-end gap-2 bg-secondary/50 border border-border/40 rounded-2xl p-2 focus-within:border-primary/40 transition-colors">
              <textarea
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message Lumina..."
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-[120px] py-2 px-2"
              />
              <div className="flex items-center gap-1">
                {isVoiceSupported && (
                  <button
                    type="button"
                    onClick={handleVoiceToggle}
                    disabled={isLoading}
                    className={cn(
                      'p-2 rounded-xl transition-all',
                      isListening
                        ? 'bg-red-500/10 text-red-500'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    )}
                  >
                    {isListening ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!message.trim() || isLoading}
                  className={cn(
                    'p-2 rounded-xl transition-all',
                    message.trim() && !isLoading
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Lumina can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ChatPage;
