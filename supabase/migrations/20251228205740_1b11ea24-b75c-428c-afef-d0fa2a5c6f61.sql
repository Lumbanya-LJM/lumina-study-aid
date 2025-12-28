-- Create stats_history table to store historical snapshots
CREATE TABLE public.stats_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_type text NOT NULL, -- 'admin', 'tutor', 'student'
  user_id uuid, -- NULL for admin stats, user_id for tutor/student stats
  stats_data jsonb NOT NULL,
  snapshot_date timestamp with time zone NOT NULL DEFAULT now(),
  cleared_at timestamp with time zone NOT NULL DEFAULT now(),
  cleared_by uuid,
  notes text
);

-- Enable RLS
ALTER TABLE public.stats_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all stats history"
ON public.stats_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert stats history"
ON public.stats_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own stats history"
ON public.stats_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats history"
ON public.stats_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tutors can view their own stats history"
ON public.stats_history
FOR SELECT
USING (auth.uid() = user_id AND dashboard_type = 'tutor');

CREATE POLICY "Tutors can insert their own stats history"
ON public.stats_history
FOR INSERT
WITH CHECK (auth.uid() = user_id AND dashboard_type = 'tutor');

-- Create index for efficient queries
CREATE INDEX idx_stats_history_dashboard_type ON public.stats_history(dashboard_type);
CREATE INDEX idx_stats_history_user_id ON public.stats_history(user_id);
CREATE INDEX idx_stats_history_snapshot_date ON public.stats_history(snapshot_date DESC);