import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { MarkdownRenderer } from '@/components/lumina/MarkdownRenderer';
import { ConversationSidebar } from '@/components/lumina/ConversationSidebar';
import { ConversationSearch } from '@/components/lumina/ConversationSearch';
import { ZambiaLiiChatSearch } from '@/components/lumina/ZambiaLiiChatSearch';
import { FloatingQuickTip } from '@/components/ui/quick-tip';
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
  Menu,
  Copy,
  Check,
  Loader2,
  Plus,
  Search,
  Globe,
  Scale,
  Paperclip,
  Image,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { haptics } from '@/lib/haptics';

interface Attachment {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'file';
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'lumina';
  timestamp: Date;
  attachments?: { name: string; type: string; url?: string }[];
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const quickPrompts = [
  { icon: FileText, label: 'Summarise a case', action: 'summarise' },
  { icon: Brain, label: 'Create flashcards', action: 'flashcards' },
  { icon: BookOpen, label: 'Quiz me', action: 'quiz' },
  { icon: Scale, label: 'Find a case', action: 'zambialii' },
];

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Conversation management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [isZambiaLiiSearchOpen, setIsZambiaLiiSearchOpen] = useState(false);

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

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (user && currentConversationId) {
      loadChatHistory(currentConversationId);
    } else if (user && currentConversationId === null) {
      setMessages([]);
      setIsLoadingHistory(false);
    }
  }, [user, currentConversationId]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const loadConversations = async () => {
    if (!user) return;
    setIsLoadingConversations(true);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setConversations(data || []);
      
      // If there are conversations and none selected, select the most recent
      if (data && data.length > 0 && !currentConversationId) {
        setCurrentConversationId(data[0].id);
      } else if (!data || data.length === 0) {
        setIsLoadingHistory(false);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadChatHistory = async (conversationId: string) => {
    if (!user) return;
    setIsLoadingHistory(true);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
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
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const createNewConversation = async (title: string = 'New Chat'): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: title.slice(0, 50),
        })
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => [data, ...prev]);
      setCurrentConversationId(data.id);
      setMessages([]);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const updateConversationTitle = async (conversationId: string, title: string) => {
    try {
      await supabase
        .from('conversations')
        .update({ title: title.slice(0, 50), updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, title: title.slice(0, 50) } : c)
      );
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversationId === conversationId) {
        const remaining = conversations.filter(c => c.id !== conversationId);
        if (remaining.length > 0) {
          setCurrentConversationId(remaining[0].id);
        } else {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }

      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed.',
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete conversation.',
      });
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  const saveMessage = async (content: string, role: 'user' | 'assistant', conversationId: string) => {
    if (!user) return;

    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        content,
        role,
        conversation_id: conversationId,
      });
      
      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // File handling functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');
      
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `${file.name} exceeds 10MB limit.`,
        });
        continue;
      }

      const attachment: Attachment = {
        id: Date.now().toString() + i,
        file,
        type: isImage ? 'image' : 'file',
      };

      // Create preview for images
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev => 
            prev.map(a => 
              a.id === attachment.id 
                ? { ...a, preview: e.target?.result as string }
                : a
            )
          );
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    haptics.light();
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
    haptics.light();
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
    if ((!messageText.trim() && attachments.length === 0) || isLoading) return;

    let activeConversationId = currentConversationId;
    
    // Create new conversation if none exists
    if (!activeConversationId) {
      const conversationTitle = messageText.slice(0, 40) || 'New Chat';
      const newId = await createNewConversation(conversationTitle);
      if (!newId) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to create conversation.',
        });
        return;
      }
      activeConversationId = newId;
    } else if (messages.length === 0) {
      // Update title for first message in existing conversation
      await updateConversationTitle(activeConversationId, messageText.slice(0, 40));
    }

    // Prepare attachment info for message
    const messageAttachments = attachments.map(a => ({
      name: a.file.name,
      type: a.file.type,
      url: a.preview,
    }));

    // Build content with attachment context
    let fullMessageContent = messageText;
    if (attachments.length > 0) {
      const attachmentDescriptions = attachments.map(a => 
        `[Attached ${a.type === 'image' ? 'image' : 'file'}: ${a.file.name}]`
      ).join('\n');
      fullMessageContent = `${attachmentDescriptions}\n\n${messageText}`;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'user',
      timestamp: new Date(),
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage('');
    setAttachments([]);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    // Save user message to database
    await saveMessage(fullMessageContent, 'user', activeConversationId);

    try {
      // Prepare messages for API - include image data for vision
      const apiMessages = messages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));
      
      // Build the current message content with images for vision analysis
      let currentMessageContent: any = messageText;
      
      // If we have image attachments, format for multimodal AI
      const imageAttachments = attachments.filter(a => a.type === 'image' && a.preview);
      if (imageAttachments.length > 0) {
        currentMessageContent = [
          { type: 'text', text: messageText || 'Please analyze this image.' },
          ...imageAttachments.map(img => ({
            type: 'image_url',
            image_url: { url: img.preview }
          }))
        ];
      }
      
      apiMessages.push({ role: 'user', content: currentMessageContent });

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
            userId: user?.id,
            enableWebSearch,
            deepSearch: enableWebSearch,
            hasImages: imageAttachments.length > 0,
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
          await saveMessage(assistantContent, 'assistant', activeConversationId);
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
    // Special handling for ZambiaLII search
    if (action === 'zambialii') {
      setIsZambiaLiiSearchOpen(true);
      return;
    }

    const promptMap: Record<string, string> = {
      summarise:
        'Please summarise this Zambian case, focusing on the key facts, issue, holding, and reasoning.',
      flashcards:
        'Create detailed flashcards from my notes that focus on key principles, definitions, and case law.',
      quiz:
        'Generate a practice quiz based on my recent study topics with multiple choice questions.',
    };

    const prompt = promptMap[action] || '';
    if (!prompt) return;

    setMessage(prompt);
    void handleSend(prompt, action);
  };

  const handleZambiaLiiSearch = useCallback((query: string) => {
    // Enable web search for ZambiaLII queries
    setEnableWebSearch(true);
    void handleSend(query, 'zambialii');
  }, []);

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
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        isOpen={isSidebarOpen}
        isLoading={isLoadingConversations}
        onClose={() => setIsSidebarOpen(false)}
        onSelectConversation={setCurrentConversationId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={deleteConversation}
      />

      <ConversationSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectConversation={(id) => {
          setCurrentConversationId(id);
          setIsSearchOpen(false);
        }}
      />

      <ZambiaLiiChatSearch
        isOpen={isZambiaLiiSearchOpen}
        onClose={() => setIsZambiaLiiSearchOpen(false)}
        onSearchWithLumina={handleZambiaLiiSearch}
      />

      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 safe-top border-b border-border/50 bg-background/95 backdrop-blur-sm flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <LuminaAvatar size="sm" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Lumina</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {currentConversationId && conversations.find(c => c.id === currentConversationId)?.title || 'New Chat'}
              </p>
            </div>
          </div>
          
          {/* Web Search Toggle */}
          <button
            onClick={() => {
              setEnableWebSearch(!enableWebSearch);
              haptics.light();
            }}
            className={cn(
              "p-2 rounded-xl transition-colors",
              enableWebSearch 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-secondary text-muted-foreground"
            )}
            title={enableWebSearch ? "Web Search On" : "Web Search Off"}
          >
            <Globe className="w-5 h-5" />
          </button>
          
          {/* ZambiaLII Button */}
          <button
            onClick={() => setIsZambiaLiiSearchOpen(true)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
            title="Search ZambiaLII Cases"
          >
            <Scale className="w-5 h-5 text-muted-foreground" />
          </button>
          
          {/* Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
            title="Search Conversations"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <button
            onClick={handleNewConversation}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
            title="New Chat"
          >
            <Plus className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        </div>
        
        {/* Web Search Indicator */}
        {enableWebSearch && (
          <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium">Deep Search Mode Active</span>
            <span className="text-xs text-muted-foreground">- Lumina will search the web for answers</span>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[55vh] text-center gap-6">
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
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3 animate-fade-in',
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
                        'group relative max-w-[90%]',
                        msg.sender === 'user' ? 'order-1' : ''
                      )}
                    >
                      {/* Attachments preview for user messages */}
                      {msg.sender === 'user' && msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 justify-end">
                          {msg.attachments.map((att, idx) => (
                            <div key={idx} className="relative">
                              {att.url && att.type?.startsWith('image/') ? (
                                <img 
                                  src={att.url} 
                                  alt={att.name}
                                  className="max-w-[120px] max-h-[80px] rounded-lg object-cover border border-border/40"
                                />
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg border border-border/40">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                    {att.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-3 transition-all',
                          msg.sender === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-secondary/50 border border-border/40 rounded-bl-md'
                        )}
                      >
                        {msg.sender === 'lumina' ? (
                          <div className="prose-smooth">
                            <MarkdownRenderer content={msg.content} />
                          </div>
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
                
                {/* Typing indicator - shows when loading but no content yet */}
                {isLoading && messages.length > 0 && messages[messages.length - 1]?.sender === 'user' && (
                  <div className="flex gap-3 animate-fade-in">
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
          <div className="shrink-0 px-4 pb-1">
            <div className="max-w-4xl mx-auto">
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

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="shrink-0 px-4 pb-1">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                {attachments.map((att) => (
                  <div key={att.id} className="relative shrink-0 group">
                    {att.preview ? (
                      <img 
                        src={att.preview} 
                        alt={att.file.name}
                        className="w-16 h-16 rounded-lg object-cover border border-border/40"
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg border border-border/40">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-foreground truncate max-w-[80px]">
                          {att.file.name}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="absolute -top-1.5 -right-1.5 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area - moved closer to bottom */}
        <div className="shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-sm pb-safe">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <div className="flex items-end gap-2 bg-secondary/50 border border-border/40 rounded-2xl p-2 focus-within:border-primary/40 transition-colors">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.md"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Attachment button with vision support */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shrink-0 group relative"
                title="Attach image or file - Lumina can analyze images!"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <textarea
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message Lumina..."
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-[120px] py-2 px-1"
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
                  disabled={(!message.trim() && attachments.length === 0) || isLoading}
                  className={cn(
                    'p-2 rounded-xl transition-all',
                    (message.trim() || attachments.length > 0) && !isLoading
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-1.5">
              Lumina can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>

        {/* Floating Quick Tips */}
        <FloatingQuickTip tipId="chat_voice" anchor="bottom-left" />
        <FloatingQuickTip tipId="chat_zambialii" anchor="bottom-right" />
      </div>
    </MobileLayout>
  );
};

export default ChatPage;