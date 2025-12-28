import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  MessageCircle,
  Calendar,
  BookOpen,
  GraduationCap,
  Focus,
  FileText,
  BarChart3,
  Target,
  Users,
  Upload,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Search,
  Brain,
  Scale,
  Sparkles,
  Play,
  PenLine,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { haptics } from '@/lib/haptics';

interface CommandItem {
  id: string;
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  action: () => void;
  group: string;
}

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Listen for Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
        haptics.light();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleAction = useCallback((action: () => void) => {
    haptics.medium();
    action();
    setOpen(false);
  }, []);

  const commands: CommandItem[] = [
    // Navigation
    { id: 'chat', icon: MessageCircle, label: 'Chat with Lumina', shortcut: '⌘L', action: () => navigate('/chat'), group: 'Navigation' },
    { id: 'planner', icon: Calendar, label: 'Open Planner', shortcut: '⌘P', action: () => navigate('/planner'), group: 'Navigation' },
    { id: 'library', icon: BookOpen, label: 'Browse Library', shortcut: '⌘B', action: () => navigate('/library'), group: 'Navigation' },
    { id: 'academy', icon: GraduationCap, label: 'Lumina Academy', action: () => navigate('/academy'), group: 'Navigation' },
    { id: 'analytics', icon: BarChart3, label: 'View Analytics', action: () => navigate('/analytics'), group: 'Navigation' },
    { id: 'achievements', icon: Target, label: 'Achievements', action: () => navigate('/achievements'), group: 'Navigation' },
    { id: 'community', icon: Users, label: 'Community', action: () => navigate('/community'), group: 'Navigation' },
    
    // Quick Actions
    { id: 'focus', icon: Focus, label: 'Start Focus Session', shortcut: '⌘F', action: () => navigate('/focus'), group: 'Quick Actions' },
    { id: 'quiz', icon: Brain, label: 'Take a Quiz', action: () => navigate('/quiz'), group: 'Quick Actions' },
    { id: 'flashcards', icon: Sparkles, label: 'Study Flashcards', action: () => navigate('/flashcards'), group: 'Quick Actions' },
    { id: 'journal', icon: PenLine, label: 'Write in Journal', action: () => navigate('/journal'), group: 'Quick Actions' },
    { id: 'upload', icon: Upload, label: 'Upload Document', action: () => navigate('/locker'), group: 'Quick Actions' },
    { id: 'recordings', icon: Play, label: 'Class Recordings', action: () => navigate('/recordings'), group: 'Quick Actions' },
    
    // Settings
    { id: 'settings', icon: Settings, label: 'Settings', shortcut: '⌘,', action: () => navigate('/settings'), group: 'Settings' },
    { id: 'theme', icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Light Mode' : 'Dark Mode', shortcut: '⌘D', action: () => setTheme(theme === 'dark' ? 'light' : 'dark'), group: 'Settings' },
    { id: 'support', icon: HelpCircle, label: 'Get Support', action: () => navigate('/support'), group: 'Settings' },
  ];

  const groupedCommands = commands.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(groupedCommands).map(([group, items], index) => (
          <React.Fragment key={group}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleAction(item.action)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {item.shortcut}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

// Hook to open command palette programmatically
export const useCommandPalette = () => {
  const open = useCallback(() => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }, []);

  return { open };
};
