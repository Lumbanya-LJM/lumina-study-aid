import React, { useState } from 'react';
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
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'lumina';
  timestamp: Date;
}

const quickPrompts = [
  { icon: FileText, label: 'Summarise a case' },
  { icon: Brain, label: 'Create flashcards' },
  { icon: BookOpen, label: 'Quiz me' },
  { icon: Calendar, label: 'Update my schedule' },
];

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm Lumina, your AI study companion. How can I help you excel today? You can ask me to summarise cases, create flashcards, quiz you on topics, or even help manage your study schedule.",
      sender: 'lumina',
      timestamp: new Date(),
    },
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    
    // Simulate Lumina response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'd be happy to help with that! Let me process your request. In the meantime, is there anything specific about your study materials you'd like me to focus on?",
        sender: 'lumina',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, response]);
    }, 1500);
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
              <LuminaAvatar size="sm" isActive />
              <div>
                <h1 className="font-semibold text-foreground">Lumina</h1>
                <p className="text-xs text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-success rounded-full" />
                  Online
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/customize-avatar')}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
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
                    "max-w-[75%] rounded-2xl px-4 py-3",
                    msg.sender === 'user'
                      ? "gradient-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                  )}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
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
                    onClick={() => setMessage(prompt.label)}
                    className="flex items-center gap-2 px-4 py-2 bg-card border border-border/50 rounded-full text-sm text-foreground hover:bg-primary/5 hover:border-primary/30 transition-all"
                  >
                    <prompt.icon className="w-4 h-4 text-primary" />
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
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
                className="w-full px-4 py-3 pr-12 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground text-sm transition-all"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                <Sparkles className="w-4 h-4 text-primary" />
              </button>
            </div>
            <button 
              onClick={handleSend}
              disabled={!message.trim()}
              className={cn(
                "p-3 rounded-xl transition-all",
                message.trim() 
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