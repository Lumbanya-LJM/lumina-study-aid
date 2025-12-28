import React from 'react';
import { useFocusSession, useFocusSessionStore } from './useFocusSession';
import { Button } from '@/components/ui/button';
import { Timer, Coffee, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FocusModeDialog } from './FocusModeDialog';

export const FocusStatusBar: React.FC = () => {
  const { isActive, phase, formattedTimeLeft } = useFocusSession();
  const isDialogOpen = useFocusSessionStore((s) => s.isDialogOpen);
  const actions = useFocusSessionStore((s) => s.actions);

  if (!isActive) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2 lg:w-auto lg:rounded-full",
          "bg-primary text-primary-foreground shadow-lg backdrop-blur-md"
        )}
      >
        <div className="container mx-auto px-4 lg:px-6 py-3 lg:py-2 flex items-center justify-between lg:gap-6">
          <div className="flex items-center gap-3">
            {phase === 'focus' ? (
              <Timer className="w-5 h-5" />
            ) : (
              <Coffee className="w-5 h-5" />
            )}
            <span className="font-semibold text-sm capitalize">
              {phase}
            </span>
            <span className="text-lg font-bold tracking-wider">{formattedTimeLeft}</span>
          </div>
          <Button onClick={actions.openDialog} variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-primary-foreground/10">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <FocusModeDialog
        open={isDialogOpen}
        onOpenChange={actions.closeDialog}
        onConfirm={() => actions.endSession('interrupted')}
        title="Exit Focus Mode?"
        description="Are you sure you want to end your focus session?"
        confirmText="Exit"
      />
    </>
  );
};
