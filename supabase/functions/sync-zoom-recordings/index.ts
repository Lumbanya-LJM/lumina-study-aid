import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZOOM_CLIENT_ID = Deno.env.get('ZOOM_CLIENT_ID');
const ZOOM_CLIENT_SECRET = Deno.env.get('ZOOM_CLIENT_SECRET');
const ZOOM_ACCOUNT_ID = Deno.env.get('ZOOM_ACCOUNT_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function getZoomAccessToken(): Promise<string> {
  const credentials = btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`);
  
  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Zoom access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting Zoom recordings sync...");
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const accessToken = await getZoomAccessToken();

    // Find all ended classes without recordings
    const { data: classesWithoutRecordings, error: fetchError } = await supabase
      .from('live_classes')
      .select('id, daily_room_name, title, course_id, ended_at')
      .eq('status', 'ended')
      .is('recording_url', null)
      .not('daily_room_name', 'is', null);

    if (fetchError) throw fetchError;

    console.log(`Found ${classesWithoutRecordings?.length || 0} classes without recordings`);

    const results: { classId: string; status: string; recording?: string }[] = [];

    for (const liveClass of classesWithoutRecordings || []) {
      try {
        console.log(`Checking recordings for meeting ${liveClass.daily_room_name}`);

        const response = await fetch(
          `https://api.zoom.us/v2/meetings/${liveClass.daily_room_name}/recordings`,
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
            },
          }
        );

        if (response.status === 404) {
          console.log(`No recordings yet for meeting ${liveClass.daily_room_name}`);
          results.push({ classId: liveClass.id, status: 'no_recording_yet' });
          continue;
        }

        if (!response.ok) {
          const error = await response.text();
          console.error(`Error fetching recordings: ${error}`);
          results.push({ classId: liveClass.id, status: 'error' });
          continue;
        }

        const data = await response.json();
        const recordingFiles = data.recording_files || [];

        // Find the MP4 video recording
        const videoRecording = recordingFiles.find(
          (r: any) => r.file_type === 'MP4' && r.recording_type === 'shared_screen_with_speaker_view'
        ) || recordingFiles.find(
          (r: any) => r.file_type === 'MP4'
        );

        if (videoRecording && videoRecording.status === 'completed') {
          const recordingUrl = videoRecording.play_url || videoRecording.download_url;
          const durationSeconds = data.duration ? data.duration * 60 : null;

          await supabase
            .from('live_classes')
            .update({
              recording_url: recordingUrl,
              recording_duration_seconds: durationSeconds,
            })
            .eq('id', liveClass.id);

          console.log(`Recording saved for class ${liveClass.id}`);
          results.push({ classId: liveClass.id, status: 'synced', recording: recordingUrl });

          // Notify students
          if (liveClass.course_id) {
            const { data: enrollments } = await supabase
              .from('academy_enrollments')
              .select('user_id')
              .eq('course_id', liveClass.course_id)
              .eq('status', 'active');

            if (enrollments && enrollments.length > 0) {
              const userIds = enrollments.map((e: any) => e.user_id);
              await supabase.functions.invoke('send-push-notification', {
                body: {
                  userIds,
                  payload: {
                    title: '📹 Class Recording Available',
                    body: `The recording for "${liveClass.title}" is now available!`,
                    tag: 'recording-available',
                    data: { url: '/recordings' }
                  }
                }
              });
            }
          }
        } else if (videoRecording) {
          console.log(`Recording still processing for meeting ${liveClass.daily_room_name}`);
          results.push({ classId: liveClass.id, status: 'processing' });
        } else {
          results.push({ classId: liveClass.id, status: 'no_video_file' });
        }
      } catch (classError) {
        console.error(`Error processing class ${liveClass.id}:`, classError);
        results.push({ classId: liveClass.id, status: 'error' });
      }
    }

    console.log("Sync completed:", results);

    return new Response(
      JSON.stringify({ success: true, synced: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sync recordings error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
