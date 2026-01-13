import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  FileText, 
  CheckSquare, 
  MessageSquare, 
  Send, 
  Loader2,
  X,
  Maximize2,
  Minimize2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MeetingAssistantPanelProps {
  meetingId: string | null;
  isOpen: boolean;
  onClose: () => void;
  transcriptLines: Array<{ speaker_name: string; text: string; ts: string }>;
  onQueryAssistant: (kind: 'summary' | 'action_items' | 'clean_transcript' | 'custom', customQuery?: string) => Promise<{
    ok: boolean;
    cached: boolean;
    answer: string;
    error?: string;
  } | null>;
  isQueryingAssistant: boolean;
}

export function MeetingAssistantPanel({
  meetingId,
  isOpen,
  onClose,
  transcriptLines,
  onQueryAssistant,
  isQueryingAssistant
}: MeetingAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState('transcript');
  const [customQuery, setCustomQuery] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptLines]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleGetSummary = async () => {
    const result = await onQueryAssistant('summary');
    if (result?.ok) {
      setSummary(result.answer);
    }
  };

  const handleGetActionItems = async () => {
    const result = await onQueryAssistant('action_items');
    if (result?.ok) {
      setActionItems(result.answer);
    }
  };

  const handleCustomQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim()) return;

    const userMessage = customQuery.trim();
    setCustomQuery('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    const result = await onQueryAssistant('custom', userMessage);
    if (result?.ok) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: result.answer }]);
    } else {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result?.error || 'Sorry, I could not process that question.' 
      }]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed z-40 bg-card border shadow-2xl rounded-xl transition-all duration-300",
      isExpanded 
        ? "inset-4 md:inset-8" 
        : "bottom-24 right-4 w-80 md:w-96 max-h-[60vh]"
    )}>
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Meeting Assistant
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid grid-cols-4 mx-3 mt-2">
          <TabsTrigger value="transcript" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Live
          </TabsTrigger>
          <TabsTrigger value="summary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">
            <CheckSquare className="h-3 w-3 mr-1" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">
            <MessageSquare className="h-3 w-3 mr-1" />
            Ask
          </TabsTrigger>
        </TabsList>

        <CardContent className="flex-1 p-3 overflow-hidden">
          <TabsContent value="transcript" className="h-full mt-0">
            <ScrollArea className={cn("pr-2", isExpanded ? "h-[calc(100vh-200px)]" : "h-48")}>
              <div ref={scrollRef} className="space-y-2">
                {transcriptLines.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Live transcript will appear here</p>
                    <p className="text-xs mt-1">Make sure transcription is enabled</p>
                  </div>
                ) : (
                  transcriptLines.map((line, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium text-primary">{line.speaker_name}:</span>{' '}
                      <span className="text-foreground">{line.text}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="summary" className="h-full mt-0">
            <div className="space-y-3">
              <Button
                size="sm"
                onClick={handleGetSummary}
                disabled={isQueryingAssistant || transcriptLines.length === 0}
                className="w-full gap-2"
              >
                {isQueryingAssistant ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {summary ? 'Refresh Summary' : 'Generate Summary'}
              </Button>
              
              <ScrollArea className={cn("pr-2", isExpanded ? "h-[calc(100vh-250px)]" : "h-36")}>
                {summary ? (
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    {summary}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Click above to generate a summary</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="h-full mt-0">
            <div className="space-y-3">
              <Button
                size="sm"
                onClick={handleGetActionItems}
                disabled={isQueryingAssistant || transcriptLines.length === 0}
                className="w-full gap-2"
              >
                {isQueryingAssistant ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {actionItems ? 'Refresh Action Items' : 'Extract Action Items'}
              </Button>
              
              <ScrollArea className={cn("pr-2", isExpanded ? "h-[calc(100vh-250px)]" : "h-36")}>
                {actionItems ? (
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {actionItems}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Click above to extract action items</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="h-full mt-0 flex flex-col">
            <ScrollArea className={cn("flex-1 pr-2 mb-2", isExpanded ? "h-[calc(100vh-280px)]" : "h-28")}>
              <div ref={chatScrollRef} className="space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Ask questions about the meeting</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "text-sm p-2 rounded-lg",
                        msg.role === 'user' 
                          ? "bg-primary text-primary-foreground ml-8" 
                          : "bg-muted mr-8"
                      )}
                    >
                      {msg.content}
                    </div>
                  ))
                )}
                {isQueryingAssistant && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Thinking...
                  </div>
                )}
              </div>
            </ScrollArea>

            <form onSubmit={handleCustomQuery} className="flex gap-2 mt-auto">
              <Input
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Ask about the meeting..."
                className="text-sm h-8"
                disabled={isQueryingAssistant || transcriptLines.length === 0}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="h-8 w-8"
                disabled={isQueryingAssistant || !customQuery.trim() || transcriptLines.length === 0}
              >
                <Send className="h-3 w-3" />
              </Button>
            </form>
          </TabsContent>
        </CardContent>
      </Tabs>

      {!meetingId && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <p className="text-sm text-muted-foreground">Waiting for meeting to start...</p>
        </div>
      )}
    </div>
  );
}
