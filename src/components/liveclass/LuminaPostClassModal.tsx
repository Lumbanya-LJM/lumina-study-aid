import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Sparkles, 
  MessageCircle, 
  BookOpen, 
  CheckCircle2,
  Send,
  Loader2,
  Save,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import luminaAvatar from "@/assets/lumina-avatar.png";

interface LuminaPostClassModalProps {
  open: boolean;
  onClose: () => void;
  classTitle: string;
  classId: string;
  summary?: {
    summary: string;
    key_points: string[];
    topics_covered: string[];
    takeaways?: string;
    study_recommendations?: string;
  };
  transcripts: { speaker: string; text: string; timestamp: Date }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const LuminaPostClassModal: React.FC<LuminaPostClassModalProps> = ({
  open,
  onClose,
  classTitle,
  classId,
  summary,
  transcripts,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [view, setView] = useState<"summary" | "chat">("summary");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fullTranscript = transcripts
    .map((t) => `${t.speaker}: ${t.text}`)
    .join("\n");

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage = userInput.trim();
    setUserInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
          ],
          action: "consolidate",
          context: {
            classTitle,
            summary: summary?.summary,
            transcript: fullTranscript.substring(0, 10000),
          },
        },
      });

      if (response.error) throw response.error;

      // Handle streaming response
      const reader = response.data.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setChatMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (updated[lastIdx]?.role === "assistant") {
                    updated[lastIdx].content = assistantMessage;
                  } else {
                    updated.push({ role: "assistant", content: assistantMessage });
                  }
                  return updated;
                });
              }
            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = () => {
    setView("chat");
    setChatMessages([
      {
        role: "assistant",
        content: `Hi! I was in the "${classTitle}" class with you. 🎓\n\nI took notes and I'm ready to help you consolidate what you learned. Ask me anything about the class - I can explain concepts, clarify points, or help you connect ideas to your broader studies.\n\nWhat would you like to discuss?`,
      },
    ]);
  };

  const handleSaveChat = async () => {
    if (chatMessages.length === 0) return;
    
    setIsSaving(true);
    try {
      // Save each message to chat_messages
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const messagesToSave = chatMessages.map(msg => ({
        user_id: user.id,
        role: msg.role,
        content: `[Class: ${classTitle}] ${msg.content}`,
      }));

      const { error } = await supabase
        .from('chat_messages')
        .insert(messagesToSave);

      if (error) throw error;

      toast({
        title: "Chat Saved!",
        description: "Your class discussion with Lumina has been saved to your chat history.",
      });
    } catch (error) {
      console.error("Error saving chat:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save chat. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage src={luminaAvatar} alt="Lumina" />
              <AvatarFallback className="bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">Class Complete! 🎉</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Lumina is here to help you consolidate your learning
              </p>
            </div>
          </div>
        </DialogHeader>

        {view === "summary" ? (
          <div className="p-6 space-y-6">
            {/* Summary Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Class Summary</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {summary?.summary || "Generating summary..."}
                </p>
              </CardContent>
            </Card>

            {/* Key Points */}
            {summary?.key_points && summary.key_points.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Key Points
                </h4>
                <div className="flex flex-wrap gap-2">
                  {summary.key_points.map((point, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {point}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Topics Covered */}
            {summary?.topics_covered && summary.topics_covered.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Topics Covered</h4>
                <div className="flex flex-wrap gap-2">
                  {summary.topics_covered.map((topic, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleStartChat}
                className="flex-1 gap-2"
                size="lg"
              >
                <MessageCircle className="h-4 w-4" />
                Chat with Lumina
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                size="lg"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[500px]">
            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={luminaAvatar} alt="Lumina" />
                        <AvatarFallback>
                          <Sparkles className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={luminaAvatar} alt="Lumina" />
                      <AvatarFallback>
                        <Sparkles className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask about the class..."
                  className="min-h-[44px] max-h-32 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-between mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("summary")}
                >
                  Back to Summary
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSaveChat}
                    disabled={isSaving || chatMessages.length <= 1}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save Chat
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LuminaPostClassModal;
