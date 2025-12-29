import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Trash2, AlertTriangle } from 'lucide-react';
import { useStatsHistory } from '@/hooks/useStatsHistory';
import { useToast } from '@/hooks/use-toast';

interface ClearStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardType: 'admin' | 'tutor' | 'student';
  currentStats: Record<string, any>;
  onClear: () => Promise<void>;
  clearableItems?: Array<{ key: string; label: string; checked: boolean }>;
}

export const ClearStatsDialog = ({
  open,
  onOpenChange,
  dashboardType,
  currentStats,
  onClear,
  clearableItems,
}: ClearStatsDialogProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [exportBeforeClear, setExportBeforeClear] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(
    clearableItems?.reduce((acc, item) => ({ ...acc, [item.key]: item.checked }), {}) || {}
  );

  const { saveSnapshot, exportToCSV, exportToPDF } = useStatsHistory({
    dashboardType,
  });

  const handleClear = async () => {
    setIsClearing(true);
    try {
      // Save snapshot before clearing
      await saveSnapshot(currentStats, notes || undefined);

      // Export if requested
      if (exportBeforeClear) {
        exportToCSV(currentStats, `${dashboardType}_stats_backup`);
      }

      // Perform the actual clear
      await onClear();

      toast({
        title: 'Stats Cleared',
        description: 'A snapshot was saved to history before clearing.',
      });

      onOpenChange(false);
      setNotes('');
    } catch (error) {
      console.error('Error clearing stats:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear stats. Please try again.',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const dashboardTitles = {
    admin: 'Admin Dashboard',
    tutor: 'Tutor Dashboard',
    student: 'Student Dashboard',
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Clear {dashboardTitles[dashboardType]} Stats
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will reset the selected stats. A snapshot will be saved to history
            before clearing.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {clearableItems && clearableItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select stats to clear:</Label>
              <div className="space-y-2 border rounded-lg p-3">
                {clearableItems.map((item) => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={item.key}
                      checked={selectedItems[item.key]}
                      onCheckedChange={(checked) =>
                        setSelectedItems((prev) => ({
                          ...prev,
                          [item.key]: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor={item.key} className="text-sm cursor-pointer">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Reason for clearing stats..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="export"
              checked={exportBeforeClear}
              onCheckedChange={(checked) => setExportBeforeClear(!!checked)}
            />
            <Label htmlFor="export" className="text-sm cursor-pointer">
              Export to CSV before clearing
            </Label>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => exportToCSV(currentStats, `${dashboardType}_stats`)}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() =>
                exportToPDF(currentStats, `${dashboardTitles[dashboardType]} Stats`)
              }
            >
              <Download className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClear}
            disabled={isClearing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isClearing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear Stats
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
