import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface StatsSnapshot {
  id: string;
  dashboard_type: 'admin' | 'tutor' | 'student';
  user_id: string | null;
  stats_data: Record<string, any>;
  snapshot_date: string;
  cleared_at: string;
  cleared_by: string | null;
  notes: string | null;
}

interface UseStatsHistoryOptions {
  dashboardType: 'admin' | 'tutor' | 'student';
}

export const useStatsHistory = ({ dashboardType }: UseStatsHistoryOptions) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<StatsSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('stats_history')
        .select('*')
        .eq('dashboard_type', dashboardType)
        .order('snapshot_date', { ascending: false })
        .limit(50);

      // For tutor/student dashboards, filter by user_id
      if (dashboardType !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setHistory((data || []) as StatsSnapshot[]);
    } catch (error) {
      console.error('Error fetching stats history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSnapshot = async (
    statsData: Record<string, any>,
    notes?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('stats_history')
        .insert({
          dashboard_type: dashboardType,
          user_id: dashboardType === 'admin' ? null : user.id,
          stats_data: statsData,
          cleared_by: user.id,
          notes: notes || `Stats cleared on ${new Date().toLocaleString()}`,
        });

      if (error) throw error;
      
      toast.success('Stats snapshot saved to history');
      return true;
    } catch (error) {
      console.error('Error saving stats snapshot:', error);
      toast.error('Failed to save stats snapshot');
      return false;
    }
  };

  const exportToCSV = (statsData: Record<string, any>, filename: string) => {
    const rows = Object.entries(statsData).map(([key, value]) => ({
      metric: key,
      value: typeof value === 'object' ? JSON.stringify(value) : value,
    }));

    const headers = ['Metric', 'Value'];
    const csvContent = [
      headers.join(','),
      ...rows.map(row => `"${row.metric}","${row.value}"`),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Stats exported to CSV');
  };

  const exportToPDF = async (statsData: Record<string, any>, title: string) => {
    // Create a simple HTML-based PDF export
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .stat-label { font-weight: bold; }
            .stat-value { color: #666; }
            .footer { margin-top: 40px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          ${Object.entries(statsData)
            .map(
              ([key, value]) => `
            <div class="stat-row">
              <span class="stat-label">${formatLabel(key)}</span>
              <span class="stat-value">${typeof value === 'object' ? JSON.stringify(value) : value}</span>
            </div>
          `
            )
            .join('')}
          <div class="footer">Exported from LMV Academy Dashboard</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast.success('Stats exported to PDF');
  };

  return {
    history,
    isLoading,
    fetchHistory,
    saveSnapshot,
    exportToCSV,
    exportToPDF,
  };
};

// Helper function to format camelCase/snake_case to readable labels
const formatLabel = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
};
