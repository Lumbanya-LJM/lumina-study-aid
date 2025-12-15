import React, { useState, useEffect, useCallback } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import {
  ArrowLeft,
  Send,
  Mic,
  MicOff,
  Paperclip,
  Sparkles,
  FileText,
  Brain,
  BookOpen,
  Calendar,
  Settings,
  Trash2,
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

  // Update message as user speaks
  useEffect(() => {
    if (transcript) {
      setMessage(transcript);
    }
  }, [transcript]);

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

      const displayName =
        (user.user_metadata as any)?.full_name ||
        user.email?.split('@')[0] ||
        'there';

      if (data && data.length > 0) {
        setMessages(
          data.map((msg) => ({
            id: msg.id,
            content: msg.content,
            sender: msg.role === 'user' ? 'user' : 'lumina',
            timestamp: new Date(msg.created_at),
          })),
        );
      } else {
        // Show welcome message if no history
        setMessages([
          {
            id: 'welcome',
            content:
              `Mwanasheli, ${displayName}! I'm Lumina, your AI study companion. I'm here to help you excel in your law studies. You can ask me to summarise Zambian cases, create flashcards, quiz you on topics, or help manage your study schedule. How can I assist you today?`,
            sender: 'lumina',
            timestamp: new Date(),
          },
        ]);
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

      const displayName =
        (user.user_metadata as any)?.full_name ||
        user.email?.split('@')[0] ||
        'there';

      // Reset to welcome message
      setMessages([
        {
          id: 'welcome',
          content:
            `Mwanasheli, ${displayName}! I'm Lumina, your AI study companion. I'm here to help you excel in your law studies. You can ask me to summarise Zambian cases, create flashcards, quiz you on topics, or help manage your study schedule. How can I assist you today?`,
          sender: 'lumina',
          timestamp: new Date(),
        },
      ]);

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
          // eslint-disable-next-line no-cond-assign
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

  const displayName =
    (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || 'there';

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-5 py-4 safe-top border-b border-border bg-background flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <LuminaAvatar size="sm" />
            <div>
              <p className="text-xs text-muted-foreground">Chatting with</p>
              <p className="text-sm font-semibold text-foreground">Lumina</p>
            </div>
          </div>
          <button className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Loading your chat...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <LuminaAvatar size="lg" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">
                  Mwanasheli, {displayName}!
                </h2>
                <p className="text-sm text-muted-foreground">
                  I'm Lumina, your AI study companion. Ask me to summarise cases, create
                  flashcards, quiz you on topics, or help organise your study schedule.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.action}
                    onClick={() => handleQuickPrompt(prompt.action)}
                    className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition-colors"
                  >
                    <prompt.icon className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">
                      {prompt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex animate-fade-in-up',
                    {
                      'justify-end': msg.sender === 'user',
                      'justify-start': msg.sender === 'lumina',
                    }
                  )}
                  style={{ 
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: 'forwards'
                  }}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3 text-sm transition-all duration-300',
                      {
                        'bg-primary text-primary-foreground rounded-br-sm shadow-lg hover:shadow-xl':
                          msg.sender === 'user',
                        'bg-card text-foreground border border-border/60 rounded-bl-sm shadow-sm hover:shadow-md':
                          msg.sender === 'lumina',
                      }
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions when there is history */}
        {messages.length > 0 && !isLoadingHistory && (
          <div className="px-5 pb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" /> Quick actions
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Clear chat
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear conversation?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your chat history with Lumina. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearChatHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Clear chat
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt.action}
                  onClick={() => handleQuickPrompt(prompt.action)}
                  className="flex items-center gap-2 p-2.5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition-colors"
                >
                  <prompt.icon className="w-4 h-4 text-primary" />
                  <span className="text-[11px] font-medium text-foreground">
                    {prompt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-5 py-4 safe-bottom border-t border-border bg-background">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/upload')}
              className="p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={1}
                placeholder="Ask Lumina anything about your law studies..."
                className="w-full resize-none rounded-2xl bg-card border border-border/60 px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                onClick={() => handleSend()}
                disabled={!message.trim() || isLoading}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors',
                  message.trim() && !isLoading
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed',
                )}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            {isVoiceSupported && (
              <button 
                onClick={isListening ? stopListening : startListening}
                className={cn(
                  'p-3 rounded-xl transition-colors',
                  isListening 
                    ? 'bg-destructive text-destructive-foreground animate-pulse' 
                    : 'bg-secondary hover:bg-secondary/80'
                )}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ChatPage;
