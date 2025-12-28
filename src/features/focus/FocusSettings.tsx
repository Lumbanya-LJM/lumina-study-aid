import React from 'react';
import { useFocusSessionStore } from './useFocusSession';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Settings } from 'lucide-react';
import { AmbientSounds } from '@/components/premium/AmbientSounds';

export const FocusSettings: React.FC = () => {
  const { settings, actions } = useFocusSessionStore(state => ({
    settings: state.settings,
    actions: state.actions,
  }));

  const handleFocusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.updateSettings({ focusDuration: parseInt(e.target.value, 10) * 60 });
  };

  const handleBreakChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.updateSettings({ breakDuration: parseInt(e.target.value, 10) * 60 });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Focus Settings</SheetTitle>
        </SheetHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Timer Settings</h3>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="focus-duration" className="text-right text-sm">
                Focus (min)
              </Label>
              <Input
                id="focus-duration"
                type="number"
                value={settings.focusDuration / 60}
                onChange={handleFocusChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="break-duration" className="text-right text-sm">
                Break (min)
              </Label>
              <Input
                id="break-duration"
                type="number"
                value={settings.breakDuration / 60}
                onChange={handleBreakChange}
                className="col-span-3"
              />
            </div>
          </div>
          
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-foreground mb-4">Ambient Sounds</h3>
            <AmbientSounds />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
