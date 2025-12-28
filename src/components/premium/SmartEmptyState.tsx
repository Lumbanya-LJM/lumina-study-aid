import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  BookOpen, 
  MessageCircle,
  Target,
  Upload,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Action {
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  path?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

interface SmartEmptyStateProps {
  type: 'tasks' | 'files' | 'notes' | 'flashcards' | 'quizzes' | 'messages' | 'search' | 'generic';
  title?: string;
  description?: string;
  actions?: Action[];
  className?: string;
}

const emptyStateConfig = {
  tasks: {
    icon: Calendar,
    title: 'No tasks yet',
    description: 'Plan your study sessions to stay on track',
    actions: [
      { label: 'Create Task', icon: Plus, path: '/planner' },
      { label: 'Ask Lumina', icon: MessageCircle, path: '/chat', variant: 'outline' as const },
    ],
  },
  files: {
    icon: Upload,
    title: 'No files uploaded',
    description: 'Upload documents to your study vault',
    actions: [
      { label: 'Upload File', icon: Upload, path: '/locker' },
    ],
  },
  notes: {
    icon: FileText,
    title: 'No notes yet',
    description: 'Start taking notes for your courses',
    actions: [
      { label: 'Create Note', icon: Plus },
    ],
  },
  flashcards: {
    icon: Sparkles,
    title: 'No flashcards yet',
    description: 'Create flashcards to master key concepts',
    actions: [
      { label: 'Create Deck', icon: Plus, path: '/flashcards' },
      { label: 'Generate with AI', icon: Sparkles, path: '/chat', variant: 'outline' as const },
    ],
  },
  quizzes: {
    icon: Target,
    title: 'No quizzes available',
    description: 'Test your knowledge with AI-generated quizzes',
    actions: [
      { label: 'Generate Quiz', icon: Sparkles, path: '/quiz' },
    ],
  },
  messages: {
    icon: MessageCircle,
    title: 'No messages yet',
    description: 'Start a conversation with Lumina or your study group',
    actions: [
      { label: 'Chat with Lumina', icon: MessageCircle, path: '/chat' },
    ],
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search terms',
    actions: [],
  },
  generic: {
    icon: BookOpen,
    title: 'Nothing here yet',
    description: 'Get started by exploring the app',
    actions: [
      { label: 'Explore', icon: Sparkles, path: '/home' },
    ],
  },
};

export const SmartEmptyState: React.FC<SmartEmptyStateProps> = ({
  type,
  title,
  description,
  actions,
  className,
}) => {
  const navigate = useNavigate();
  const config = emptyStateConfig[type];
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActions = actions || config.actions;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-6 text-center',
      className
    )}>
      {/* Animated icon container */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center animate-float">
          <Icon className="w-10 h-10 text-muted-foreground" />
        </div>
        {/* Decorative ring */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-muted-foreground/20 animate-spin-slow" 
          style={{ animationDuration: '20s' }} 
        />
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-foreground mb-2">{displayTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">{displayDescription}</p>

      {/* Actions */}
      {displayActions.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {displayActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'default'}
              size="sm"
              onClick={() => {
                if (action.onClick) action.onClick();
                else if (action.path) navigate(action.path);
              }}
              className="gap-2"
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartEmptyState;
