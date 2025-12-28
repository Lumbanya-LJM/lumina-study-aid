import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { haptics } from '@/lib/haptics';

interface ShortcutHandler {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const shortcuts: ShortcutHandler[] = [
    // Navigation shortcuts
    { key: 'l', meta: true, action: () => navigate('/chat'), description: 'Open Lumina Chat' },
    { key: 'p', meta: true, shift: true, action: () => navigate('/planner'), description: 'Open Planner' },
    { key: 'b', meta: true, action: () => navigate('/library'), description: 'Open Library' },
    { key: 'f', meta: true, shift: true, action: () => navigate('/focus'), description: 'Start Focus Mode' },
    { key: 'h', meta: true, action: () => navigate('/home'), description: 'Go Home' },
    
    // Actions
    { key: 'd', meta: true, action: () => setTheme(theme === 'dark' ? 'light' : 'dark'), description: 'Toggle Dark Mode' },
    { key: ',', meta: true, action: () => navigate('/settings'), description: 'Open Settings' },
    
    // Escape to go back
    { key: 'Escape', action: () => window.history.back(), description: 'Go Back' },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Only allow Escape in inputs
      if (event.key !== 'Escape') return;
    }

    for (const shortcut of shortcuts) {
      const metaMatch = !shortcut.meta || event.metaKey || event.ctrlKey;
      const ctrlMatch = !shortcut.ctrl || event.ctrlKey;
      const shiftMatch = !shortcut.shift || event.shiftKey;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (keyMatch && metaMatch && ctrlMatch && shiftMatch) {
        // Check if this is a browser default we shouldn't override
        if (shortcut.meta && ['c', 'v', 'x', 'a', 'z', 's'].includes(shortcut.key.toLowerCase())) {
          return;
        }

        event.preventDefault();
        haptics.light();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
};

// Component to display keyboard shortcuts help
export const KeyboardShortcutsHelp: React.FC<{ className?: string }> = ({ className }) => {
  const shortcuts = [
    { keys: ['⌘', 'K'], description: 'Open Command Palette' },
    { keys: ['⌘', 'L'], description: 'Open Lumina Chat' },
    { keys: ['⌘', '⇧', 'P'], description: 'Open Planner' },
    { keys: ['⌘', 'B'], description: 'Open Library' },
    { keys: ['⌘', '⇧', 'F'], description: 'Start Focus Mode' },
    { keys: ['⌘', 'D'], description: 'Toggle Dark Mode' },
    { keys: ['⌘', ','], description: 'Open Settings' },
    { keys: ['Esc'], description: 'Go Back' },
  ];

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-foreground mb-3">Keyboard Shortcuts</h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{shortcut.description}</span>
            <div className="flex gap-1">
              {shortcut.keys.map((key, keyIndex) => (
                <kbd
                  key={keyIndex}
                  className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded border border-border"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
