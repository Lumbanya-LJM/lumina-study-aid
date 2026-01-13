import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranscriptLine {
  id: string;
  speaker_name: string;
  text: string;
  ts: string;
}

interface AssistantOutput {
  ok: boolean;
  cached: boolean;
  answer: string;
  error?: string;
}

interface UseMeetingAssistantReturn {
  meetingId: string | null;
  transcriptLines: TranscriptLine[];
  isCreatingMeeting: boolean;
  isQueryingAssistant: boolean;
  createMeeting: (classId: string, title: string, createdBy: string, durationMins?: number) => Promise<{ meeting: any; room: any } | null>;
  ingestTranscript: (speakerName: string, text: string) => Promise<boolean>;
  queryAssistant: (kind: 'summary' | 'action_items' | 'clean_transcript' | 'custom', customQuery?: string) => Promise<AssistantOutput | null>;
  endMeeting: () => Promise<boolean>;
}

export function useMeetingAssistant(): UseMeetingAssistantReturn {
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [isQueryingAssistant, setIsQueryingAssistant] = useState(false);
  const subscriptionRef = useRef<any>(null);

  const createMeeting = useCallback(async (
    classId: string, 
    title: string, 
    createdBy: string,
    durationMins = 90
  ) => {
    setIsCreatingMeeting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-daily-meeting', {
        body: { class_id: classId, title, created_by: createdBy, duration_mins: durationMins }
      });

      if (error) {
        console.error('Error creating meeting:', error);
        return null;
      }

      const newMeetingId = data.meeting.id;
      setMeetingId(newMeetingId);

      // Subscribe to realtime transcript updates
      const channel = supabase
        .channel(`transcript-${newMeetingId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transcript_lines',
            filter: `meeting_id=eq.${newMeetingId}`
          },
          (payload) => {
            const newLine = payload.new as TranscriptLine;
            setTranscriptLines(prev => [...prev, newLine]);
          }
        )
        .subscribe();

      subscriptionRef.current = channel;

      return data;
    } catch (e) {
      console.error('Failed to create meeting:', e);
      return null;
    } finally {
      setIsCreatingMeeting(false);
    }
  }, []);

  const ingestTranscript = useCallback(async (speakerName: string, text: string) => {
    if (!meetingId) {
      console.error('No meeting ID set');
      return false;
    }

    try {
      const { error } = await supabase.functions.invoke('ingest-transcript-line', {
        body: { 
          meeting_id: meetingId, 
          speaker_name: speakerName, 
          text,
          ts: new Date().toISOString()
        }
      });

      if (error) {
        console.error('Error ingesting transcript:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Failed to ingest transcript:', e);
      return false;
    }
  }, [meetingId]);

  const queryAssistant = useCallback(async (
    kind: 'summary' | 'action_items' | 'clean_transcript' | 'custom',
    customQuery?: string
  ): Promise<AssistantOutput | null> => {
    if (!meetingId) {
      console.error('No meeting ID set');
      return null;
    }

    setIsQueryingAssistant(true);
    try {
      const { data, error } = await supabase.functions.invoke('query-meeting-assistant', {
        body: { 
          meeting_id: meetingId, 
          kind,
          custom_query: customQuery
        }
      });

      if (error) {
        console.error('Error querying assistant:', error);
        return { ok: false, cached: false, answer: '', error: error.message };
      }

      return data as AssistantOutput;
    } catch (e) {
      console.error('Failed to query assistant:', e);
      return { ok: false, cached: false, answer: '', error: String(e) };
    } finally {
      setIsQueryingAssistant(false);
    }
  }, [meetingId]);

  const endMeeting = useCallback(async () => {
    if (!meetingId) return false;

    try {
      // Update meeting status
      const { error } = await supabase
        .from('meetings')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', meetingId);

      if (error) {
        console.error('Error ending meeting:', error);
        return false;
      }

      // Cleanup subscription
      if (subscriptionRef.current) {
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      setMeetingId(null);
      setTranscriptLines([]);

      return true;
    } catch (e) {
      console.error('Failed to end meeting:', e);
      return false;
    }
  }, [meetingId]);

  return {
    meetingId,
    transcriptLines,
    isCreatingMeeting,
    isQueryingAssistant,
    createMeeting,
    ingestTranscript,
    queryAssistant,
    endMeeting
  };
}
