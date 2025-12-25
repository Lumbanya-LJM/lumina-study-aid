import React from 'react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  X,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

function groupConversationsByDate(conversations: Conversation[]) {
  const groups: { label: string; conversations: Conversation[] }[] = [];
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const thisWeek: Conversation[] = [];
  const thisMonth: Conversation[] = [];
  const older: Conversation[] = [];

  conversations.forEach((conv) => {
    const date = new Date(conv.updated_at);
    if (isToday(date)) {
      today.push(conv);
    } else if (isYesterday(date)) {
      yesterday.push(conv);
    } else if (isThisWeek(date)) {
      thisWeek.push(conv);
    } else if (isThisMonth(date)) {
      thisMonth.push(conv);
    } else {
      older.push(conv);
    }
  });

  if (today.length > 0) groups.push({ label: 'Today', conversations: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', conversations: yesterday });
  if (thisWeek.length > 0) groups.push({ label: 'This Week', conversations: thisWeek });
  if (thisMonth.length > 0) groups.push({ label: 'This Month', conversations: thisMonth });
  if (older.length > 0) groups.push({ label: 'Older', conversations: older });

  return groups;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  currentConversationId,
  isOpen,
  isLoading,
  onClose,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) => {
  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[300px] bg-card border-r border-border transform transition-transform duration-200 ease-out flex flex-col shadow-xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Conversation history"
      >
        {/* Header */}
        <header className="p-4 border-b border-border/50 flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* New Chat Button */}
        <div className="p-3 shrink-0">
          <Button
            onClick={() => {
              onNewConversation();
              onClose();
            }}
            className="w-full justify-center gap-2 h-11"
            variant="default"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="px-3 pb-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Loading chats...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground mb-1">No conversations yet</p>
                <p className="text-sm text-muted-foreground">
                  Start a new chat to begin your study session
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {groupedConversations.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.conversations.map((conv) => (
                        <div
                          key={conv.id}
                          className={cn(
                            "group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
                            currentConversationId === conv.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-foreground"
                          )}
                          onClick={() => {
                            onSelectConversation(conv.id);
                            onClose();
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              onSelectConversation(conv.id);
                              onClose();
                            }
                          }}
                        >
                          <MessageSquare className={cn(
                            "w-4 h-4 shrink-0",
                            currentConversationId === conv.id ? "text-primary-foreground" : "text-muted-foreground"
                          )} />
                          <span className="flex-1 text-sm font-medium truncate">
                            {conv.title || 'Untitled Chat'}
                          </span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  "p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
                                  currentConversationId === conv.id
                                    ? "hover:bg-primary-foreground/20 text-primary-foreground"
                                    : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                )}
                                aria-label="Delete conversation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{conv.title || 'Untitled Chat'}" and all its messages. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDeleteConversation(conv.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <div className="p-3 border-t border-border/50 shrink-0">
          <p className="text-xs text-center text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </aside>
    </>
  );
};