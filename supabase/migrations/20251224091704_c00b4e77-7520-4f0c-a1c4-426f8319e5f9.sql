-- Create research_cache table for storing legal research results
CREATE TABLE public.research_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  research_output TEXT NOT NULL,
  sources TEXT,
  last_verified_date DATE NOT NULL DEFAULT CURRENT_DATE,
  access_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.research_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached research (shared resource)
CREATE POLICY "Anyone can view research cache"
ON public.research_cache
FOR SELECT
USING (true);

-- Allow system/edge functions to insert/update cache (via service role)
CREATE POLICY "Service role can manage cache"
ON public.research_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Create user_research_limits table to track per-user daily limits
CREATE TABLE public.user_research_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query_date DATE NOT NULL DEFAULT CURRENT_DATE,
  query_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, query_date)
);

-- Enable RLS
ALTER TABLE public.user_research_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own limits
CREATE POLICY "Users can view their own limits"
ON public.user_research_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own limit records
CREATE POLICY "Users can insert their own limits"
ON public.user_research_limits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own limit records
CREATE POLICY "Users can update their own limits"
ON public.user_research_limits
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster cache lookups
CREATE INDEX idx_research_cache_key ON public.research_cache(cache_key);
CREATE INDEX idx_research_cache_topic ON public.research_cache(topic);
CREATE INDEX idx_user_research_limits_user_date ON public.user_research_limits(user_id, query_date);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_research_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_research_cache_updated_at
BEFORE UPDATE ON public.research_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_research_cache_updated_at();