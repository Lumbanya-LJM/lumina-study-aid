-- Create table for legal alerts (new cases, laws, statutory instruments)
CREATE TABLE public.legal_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  alert_type TEXT NOT NULL DEFAULT 'case', -- 'case', 'law', 'statutory_instrument'
  source_url TEXT,
  citation TEXT,
  court TEXT,
  published_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);

-- Create user-specific read status table
CREATE TABLE public.user_legal_alert_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_id UUID NOT NULL REFERENCES public.legal_alerts(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, alert_id)
);

-- Enable RLS
ALTER TABLE public.legal_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_legal_alert_reads ENABLE ROW LEVEL SECURITY;

-- Alerts are viewable by everyone
CREATE POLICY "Anyone can view legal alerts" 
ON public.legal_alerts 
FOR SELECT 
USING (true);

-- Only admins can manage alerts
CREATE POLICY "Admins can manage legal alerts" 
ON public.legal_alerts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can manage their own read status
CREATE POLICY "Users can view their read status" 
ON public.user_legal_alert_reads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark alerts as read" 
ON public.user_legal_alert_reads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for legal_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_alerts;