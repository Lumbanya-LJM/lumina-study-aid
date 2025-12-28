-- Create table for saved research bookmarks
CREATE TABLE public.research_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.research_bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own bookmarks" 
ON public.research_bookmarks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks" 
ON public.research_bookmarks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks" 
ON public.research_bookmarks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks" 
ON public.research_bookmarks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_research_bookmarks_updated_at
BEFORE UPDATE ON public.research_bookmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();