import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { MarkdownRenderer } from '@/components/lumina/MarkdownRenderer';
import { ConversationSidebar } from '@/components/lumina/ConversationSidebar';
import { ConversationSearch } from '@/components/lumina/ConversationSearch';
import { ZambiaLiiChatSearch } from '@/components/lumina/ZambiaLiiChatSearch';
import { ThinkingIndicator } from '@/components/lumina/ThinkingIndicator';
import { ResearchBookmarkButton } from '@/components/lumina/ResearchBookmarkButton';

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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { haptics } from '@/lib/haptics';
import { sounds, isSoundEnabledState } from '@/lib/sounds';
import { useLuminaTaskNotification } from '@/hooks/useLuminaTaskNotification';

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
  streaming?: boolean;
  userQuery?: string; // The user query that triggered this response (for Lumina messages)
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

import type { LucideIcon } from 'lucide-react';

interface QuickPrompt {
  icon: LucideIcon;
  label: string;
  action: string;
}

const quickPrompts: QuickPrompt[] = [
  { icon: FileText, label: 'Summarise a case', action: 'summarise' },
  { icon: Brain, label: 'Create flashcards', action: 'flashcards' },
  { icon: BookOpen, label: 'Quiz me', action: 'quiz' },
  { icon: Scale, label: 'Find a case', action: 'zambialii' },
];

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { notify } = useLuminaTaskNotification();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [currentAction, setCurrentAction] = useState<string | undefined>(undefined);
  
  // Conversation management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Read deep search default from localStorage (true if not set - making deep search the default)
  const [enableWebSearch, setEnableWebSearch] = useState(() => {
    const saved = localStorage.getItem('lumina_deep_search_default');
    // Default to true if no preference is saved (deep search is default)
    return saved !== null ? saved === 'true' : true;
  });
  const [isZambiaLiiSearchOpen, setIsZambiaLiiSearchOpen] = useState(false);
  const [pendingFileId, setPendingFileId] = useState<string | null>(null);
  const [pendingFileLoaded, setPendingFileLoaded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const typingSoundIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle file query parameter from StudyLocker
  useEffect(() => {
    const fileId = searchParams.get('file');
    if (fileId && !pendingFileLoaded && user) {
      setPendingFileId(fileId);
      loadFileForStudy(fileId);
      // Clear the query param
      setSearchParams({});
    }
  }, [searchParams, user, pendingFileLoaded]);

  const loadFileForStudy = async (fileId: string) => {
    try {
      const { data: file, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error || !file) {
        console.error('Error loading file:', error);
        toast({
          variant: 'destructive',
          title: 'File not found',
          description: 'Could not load the selected file.',
        });
        return;
      }

      // Set the message to ask Lumina to create study materials
      const studyPrompt = `Please help me study from my file "${file.file_name}". First, read the content from this file (URL: ${file.file_url}) and then create flashcards and a quiz to help me learn the key concepts.`;
      
      setMessage(studyPrompt);
      setPendingFileLoaded(true);
      
      toast({
        title: 'File loaded',
        description: `Ready to study from "${file.file_name}". Press send to generate study materials.`,
      });
    } catch (error) {
      console.error('Error loading file for study:', error);
    }
  };

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


  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const loadConversations = useCallback(async () => {
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
  }, [user, currentConversationId]);

  const loadChatHistory = useCallback(async (conversationId: string) => {
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
  }, [user]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (user && currentConversationId) {
      loadChatHistory(currentConversationId);
    } else if (user && currentConversationId === null) {
      setMessages([]);
      setIsLoadingHistory(false);
    }
  }, [user]);

  const createNewConversation = useCallback(async (title: string = 'New Chat'): Promise<string | null> => {
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
  }, [user]);

  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
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
  }, []);

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

  const saveMessage = useCallback(async (content: string, role: 'user' | 'assistant', conversationId: string) => {
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
  }, [user]);

  // File handling functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
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
      
      // For PDFs, convert to base64 for AI analysis
      if (isPdf) {
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
        
        toast({
          title: 'PDF uploaded',
          description: 'Lumina will analyze this document for you.',
        });
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

  const handleSend = useCallback(async (customMessage?: string, action?: string) => {
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
    setCurrentAction(action);
    // Save user message to database
    await saveMessage(fullMessageContent, 'user', activeConversationId);

    try {
      // Prepare messages for API - include image data for vision
      const apiMessages = messages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));
      
      // Build the current message content with images/PDFs for vision analysis
      type MessageContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
      let currentMessageContent: MessageContent = messageText;
      
      // If we have attachments with previews (images or PDFs as base64), format for multimodal AI
      const attachmentsWithPreview = attachments.filter(a => a.preview);
      if (attachmentsWithPreview.length > 0) {
        const attachmentParts = attachmentsWithPreview.map(att => {
          // For PDFs, Gemini can process them as document images
          // The base64 data URL works for both images and PDFs
          return {
            type: 'image_url',
            image_url: { url: att.preview! }
          };
        });
        
        const fileDescriptions = attachmentsWithPreview.map(att => 
          att.file.type === 'application/pdf' 
            ? `[PDF Document: ${att.file.name}]` 
            : `[Image: ${att.file.name}]`
        ).join('\n');
        
        currentMessageContent = [
          { type: 'text', text: `${fileDescriptions}\n\n${messageText || 'Please analyze these documents/images.'}` },
          ...attachmentParts
        ];
      }
      
      apiMessages.push({ role: 'user', content: currentMessageContent as string });

      // Get the user's session token for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to use Lumina chat');
      }

      // Create abort controller for cancel functionality
      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            action,
            userId: user?.id,
            enableWebSearch,
            deepSearch: enableWebSearch,
            hasImages: attachmentsWithPreview.length > 0,
          }),
          signal: abortControllerRef.current.signal,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const assistantContent = '';
      let streamedContent = '';

      // Add placeholder for assistant message
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          content: '',
          sender: 'lumina',
          timestamp: new Date(),
          streaming: true,
          userQuery: messageText, // Store the user query for bookmarking
        },
      ]);

      if (reader) {
        let buffer = '';
        let updateScheduled = false;
        
        // Start typing sound effect if sounds are enabled and typing sound is enabled
        const typingSoundEnabled = localStorage.getItem('lumina_typing_sound') !== 'false';
        if (isSoundEnabledState() && typingSoundEnabled) {
          typingSoundIntervalRef.current = setInterval(() => {
            sounds.typing();
          }, 120);
        }
        
        // Use a more frequent update mechanism for smoother streaming
        const scheduleUpdate = () => {
          if (!updateScheduled && streamedContent) {
            updateScheduled = true;
            // Use setTimeout with 0 for immediate but non-blocking updates
            setTimeout(() => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: streamedContent }
                    : msg,
                ),
              );
              updateScheduled = false;
            }, 0);
          }
        };
        
        try {
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
                  streamedContent += content;
                  // Schedule update for each token for smoother appearance
                  scheduleUpdate();
                }
              } catch {
                // Partial JSON, put it back
                buffer = line + '\n' + buffer;
                break;
              }
            }
          }
        } finally {
          // Stop typing sound
          if (typingSoundIntervalRef.current) {
            clearInterval(typingSoundIntervalRef.current);
            typingSoundIntervalRef.current = null;
          }
        }
        
        // Final update to ensure all content is displayed
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: streamedContent }
              : msg,
          ),
        );

        // Save assistant response to database after streaming completes
        if (streamedContent) {
          await saveMessage(streamedContent, 'assistant', activeConversationId);
          
          // Check if Lumina completed a task and notify user
          const lowerContent = streamedContent.toLowerCase();
          if (lowerContent.includes('created') || lowerContent.includes('added') || lowerContent.includes('updated') || lowerContent.includes('done!') || lowerContent.includes('completed')) {
            if (lowerContent.includes('flashcard') || lowerContent.includes('deck')) {
              notify({ taskType: 'flashcards', description: 'Your flashcard deck is ready to review.' });
            } else if (lowerContent.includes('quiz') || lowerContent.includes('questions')) {
              notify({ taskType: 'quiz', description: 'Your practice quiz is ready.' });
            } else if (lowerContent.includes('task') || lowerContent.includes('schedule') || lowerContent.includes('planner')) {
              notify({ taskType: 'task', description: 'Your study planner has been updated.' });
            } else if (lowerContent.includes('journal') || lowerContent.includes('entry')) {
              notify({ taskType: 'journal' });
            } else if (lowerContent.includes('summar')) {
              notify({ taskType: 'summary', description: 'Your summary is ready.' });
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, streaming: false }
            : msg,
        ),
      );
    } catch (error) {
      // Stop typing sound on error
      if (typingSoundIntervalRef.current) {
        clearInterval(typingSoundIntervalRef.current);
        typingSoundIntervalRef.current = null;
      }

      // Don't show error if request was cancelled
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Response cancelled by user');
        return;
      }

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
      setCurrentAction(undefined);
      abortControllerRef.current = null;
    }
  }, [message, attachments, isLoading, currentConversationId, createNewConversation, messages, updateConversationTitle, saveMessage, user, toast, enableWebSearch]);

  // Cancel response handler
  const handleCancelResponse = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (typingSoundIntervalRef.current) {
      clearInterval(typingSoundIntervalRef.current);
      typingSoundIntervalRef.current = null;
    }
    setIsLoading(false);
    setCurrentAction(undefined);
    
    // Mark any streaming message as complete
    setMessages((prev) =>
      prev.map((msg) =>
        msg.streaming ? { ...msg, streaming: false, content: msg.content + ' [cancelled]' } : msg
      )
    );
    
    haptics.light();
  }, []);

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
  }, [handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayName =
    ((user?.user_metadata as Record<string, unknown>)?.full_name as string) || user?.email?.split('@')[0] || 'there';

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
        {/* Clean Header */}
        <header className="shrink-0 safe-top border-b border-border/30 bg-background">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Left - Menu & Avatar */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Open conversations"
              >
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <LuminaAvatar size="sm" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm font-semibold text-foreground">Lumina</h1>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {currentConversationId && conversations.find(c => c.id === currentConversationId)?.title || 'New conversation'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-1">
              {/* Web Search Toggle */}
              <button
                onClick={() => {
                  setEnableWebSearch(!enableWebSearch);
                  haptics.light();
                }}
                className={cn(
                  "p-2 rounded-lg transition-colors flex items-center gap-1.5",
                  enableWebSearch 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-muted text-muted-foreground"
                )}
                title={enableWebSearch ? "Web search enabled" : "Enable web search"}
              >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">
                  {enableWebSearch ? 'On' : 'Search'}
                </span>
              </button>
              
              {/* ZambiaLII */}
              <button
                onClick={() => setIsZambiaLiiSearchOpen(true)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                title="Search legal cases"
              >
                <Scale className="w-4 h-4" />
              </button>
              
              {/* Search Conversations */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                title="Search conversations"
              >
                <Search className="w-4 h-4" />
              </button>
              
              {/* New Chat */}
              <button
                onClick={handleNewConversation}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                title="Start new chat"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Back */}
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors ml-1"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Web Search Banner */}
          {enableWebSearch && (
            <div className="px-4 py-2 bg-primary/5 border-t border-primary/10">
              <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-primary font-medium">Deep Search Active</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">• Lumina will search the web</span>
              </div>
            </div>
          )}
        </header>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading conversation...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              /* Empty State - Welcome Screen */
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 blur-3xl rounded-full scale-150" />
                  <LuminaAvatar size="lg" />
                </div>
                
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Hello, {displayName}!
                </h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  I'm Lumina, your AI study companion for Zambian law. What would you like to learn today?
                </p>
                
                {/* Quick Action Cards */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt.action}
                      onClick={() => handleQuickPrompt(prompt.action)}
                      className="flex flex-col items-start gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all text-left group"
                    >
                      <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <prompt.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {prompt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Conversation Messages */
              <div className="space-y-8">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-4 animate-fade-in',
                      msg.sender === 'user' ? 'flex-row-reverse' : ''
                    )}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 mt-0.5">
                      {msg.sender === 'lumina' ? (
                        <LuminaAvatar size="sm" />
                      ) : null}
                    </div>
                    
                    {/* Message Content */}
                    <div className={cn(
                      'flex-1 max-w-[85%] group',
                      msg.sender === 'user' ? 'flex flex-col items-end' : ''
                    )}>
                      {/* Sender name */}
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        {msg.sender === 'lumina' ? 'Lumina' : 'You'}
                      </p>
                      
                      {/* Attachments */}
                      {msg.sender === 'user' && msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 justify-end">
                          {msg.attachments.map((att, idx) => (
                            <div key={idx} className="relative">
                              {att.url && att.type?.startsWith('image/') ? (
                                <img 
                                  src={att.url} 
                                  alt={att.name}
                                  className="max-w-[140px] max-h-[100px] rounded-lg object-cover border border-border"
                                />
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-xs text-foreground truncate max-w-[100px]">
                                    {att.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Message bubble */}
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-3',
                          msg.sender === 'user'
                            ? ''
                            : ''
                        )}
                      >
                        {msg.sender === 'lumina' ? (
                          <div className="prose-smooth text-foreground">
                            <MarkdownRenderer content={msg.content} streaming={msg.streaming} />
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        )}
                      </div>
                      
                      {/* Actions for Lumina messages */}
                      {msg.sender === 'lumina' && msg.content && !msg.streaming && (
                        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs"
                            title="Copy"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-green-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          {msg.userQuery && (
                            <ResearchBookmarkButton
                              userQuery={msg.userQuery}
                              aiResponse={msg.content}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Thinking indicator with cancel button */}
                {isLoading && messages.length > 0 && messages[messages.length - 1]?.sender === 'user' && (
                  <div className="flex gap-4 animate-fade-in">
                    <div className="shrink-0">
                      <LuminaAvatar size="sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Lumina</p>
                      <div className="flex items-center gap-3">
                        <div className="bg-muted/60 rounded-2xl px-4 py-3 inline-block">
                          <ThinkingIndicator action={currentAction} hasWebSearch={enableWebSearch} />
                        </div>
                        <button
                          onClick={handleCancelResponse}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium"
                          title="Stop generating"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Quick Actions Bar - only when there are messages */}
        {messages.length > 0 && !isLoadingHistory && !isLoading && (
          <div className="shrink-0 border-t border-border/20 bg-background">
            <div className="max-w-3xl mx-auto px-4 py-2">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.action}
                    onClick={() => handleQuickPrompt(prompt.action)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <prompt.icon className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">
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
          <div className="shrink-0 bg-background px-4 py-2">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {attachments.map((att) => (
                  <div key={att.id} className="relative shrink-0 group">
                    {att.type === 'image' && att.preview ? (
                      <img 
                        src={att.preview} 
                        alt={att.file.name}
                        className="w-14 h-14 rounded-lg object-cover border border-border"
                      />
                    ) : att.file.type === 'application/pdf' ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <FileText className="w-4 h-4 text-red-500" />
                        <div className="flex flex-col">
                          <span className="text-xs text-foreground truncate max-w-[80px]">
                            {att.file.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">PDF</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-foreground truncate max-w-[80px]">
                          {att.file.name}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <footer className="shrink-0 border-t border-border/30 bg-background pb-safe">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-end gap-3 bg-muted/50 border border-border rounded-2xl p-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.md"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Attachment button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-background transition-all shrink-0"
                title="Attach file or image"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              {/* Text input */}
              <textarea
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask Lumina anything..."
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-[120px] py-2.5 leading-relaxed"
              />
              
              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {isVoiceSupported && (
                  <button
                    type="button"
                    onClick={handleVoiceToggle}
                    disabled={isLoading}
                    className={cn(
                      'p-2.5 rounded-xl transition-all',
                      isListening
                        ? 'bg-red-500/10 text-red-500'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background'
                    )}
                    title={isListening ? 'Stop recording' : 'Voice input'}
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
                    'p-2.5 rounded-xl transition-all',
                    (message.trim() || attachments.length > 0) && !isLoading
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Lumina can make mistakes. Consider checking important information.
            </p>
          </div>
        </footer>

      </div>
    </MobileLayout>
  );
};

export default ChatPage;