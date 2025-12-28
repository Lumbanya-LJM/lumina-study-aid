import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { StatsSnapshot, useStatsHistory } from '@/hooks/useStatsHistory';

interface StatsHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardType: 'admin' | 'tutor' | 'student';
}

export const StatsHistoryModal = ({
  open,
  onOpenChange,
  dashboardType,
}: StatsHistoryModalProps) => {
  const { history, isLoading, fetchHistory, exportToCSV, exportToPDF } = useStatsHistory({
    dashboardType,
  });

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  const formatLabel = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  };

  const dashboardTitles = {
    admin: 'Admin Dashboard',
    tutor: 'Tutor Dashboard',
    student: 'Student Dashboard',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Stats History - {dashboardTitles[dashboardType]}
          </DialogTitle>
          <DialogDescription>
            View previous stats snapshots that were saved before clearing
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No stats history found</p>
              <p className="text-sm">
                Stats will appear here after you clear dashboard stats
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((snapshot) => (
                <SnapshotCard
                  key={snapshot.id}
                  snapshot={snapshot}
                  onExportCSV={() =>
                    exportToCSV(
                      snapshot.stats_data,
                      `${dashboardType}_stats_${snapshot.id}`
                    )
                  }
                  onExportPDF={() =>
                    exportToPDF(
                      snapshot.stats_data,
                      `${dashboardTitles[dashboardType]} Stats - ${format(
                        new Date(snapshot.snapshot_date),
                        'PPp'
                      )}`
                    )
                  }
                  formatLabel={formatLabel}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

interface SnapshotCardProps {
  snapshot: StatsSnapshot;
  onExportCSV: () => void;
  onExportPDF: () => void;
  formatLabel: (key: string) => string;
}

const SnapshotCard = ({
  snapshot,
  onExportCSV,
  onExportPDF,
  formatLabel,
}: SnapshotCardProps) => {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {format(new Date(snapshot.snapshot_date), 'PPp')}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExportCSV}>
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onExportPDF}>
            <Download className="h-3 w-3 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {snapshot.notes && (
        <p className="text-sm text-muted-foreground mb-3">{snapshot.notes}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(snapshot.stats_data).map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{formatLabel(key)}:</span>
            <Badge variant="secondary">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
