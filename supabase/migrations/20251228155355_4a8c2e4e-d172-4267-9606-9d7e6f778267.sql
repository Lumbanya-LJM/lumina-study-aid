-- Enable realtime for live_classes table
ALTER TABLE public.live_classes REPLICA IDENTITY FULL;

-- Add to realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'live_classes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes;
  END IF;
END $$;