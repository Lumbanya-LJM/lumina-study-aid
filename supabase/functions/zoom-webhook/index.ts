import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ZOOM_WEBHOOK_SECRET = Deno.env.get('ZOOM_WEBHOOK_SECRET');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Zoom webhook received:", JSON.stringify(body, null, 2));

    // Handle Zoom URL validation challenge
    if (body.event === 'endpoint.url_validation') {
      const crypto = await import("https://deno.land/std@0.168.0/crypto/mod.ts");
      const encoder = new TextEncoder();
      const key = await crypto.crypto.subtle.importKey(
        "raw",
        encoder.encode(ZOOM_WEBHOOK_SECRET || ''),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(body.payload.plainToken)
      );
      const hashHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return new Response(
        JSON.stringify({
          plainToken: body.payload.plainToken,
          encryptedToken: hashHex,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Handle recording completed event
    if (body.event === 'recording.completed') {
      const payload = body.payload;
      const meetingId = payload.object.id.toString();
      const recordingFiles = payload.object.recording_files || [];
      
      console.log(`Recording completed for meeting ${meetingId}`);
      console.log(`Found ${recordingFiles.length} recording files`);

      // Find the MP4 video recording
      const videoRecording = recordingFiles.find(
        (r: any) => r.file_type === 'MP4' && r.recording_type === 'shared_screen_with_speaker_view'
      ) || recordingFiles.find(
        (r: any) => r.file_type === 'MP4'
      );

      if (videoRecording) {
        // Find the live_class with this meeting ID
        const { data: liveClass, error: fetchError } = await supabase
          .from('live_classes')
          .select('id, title, course_id, ended_at')
          .eq('daily_room_name', meetingId)
          .single();

        if (fetchError || !liveClass) {
          console.error('Live class not found for meeting:', meetingId, fetchError);
          return new Response(
            JSON.stringify({ success: false, error: 'Class not found' }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calculate duration in seconds
        const durationSeconds = payload.object.duration ? payload.object.duration * 60 : null;

        // Update the live_classes record with recording info
        const { error: updateError } = await supabase
          .from('live_classes')
          .update({
            recording_url: videoRecording.play_url || videoRecording.download_url,
            recording_duration_seconds: durationSeconds,
            status: 'ended',
            ended_at: liveClass.ended_at || new Date().toISOString(),
          })
          .eq('id', liveClass.id);

        if (updateError) {
          console.error('Failed to update live class:', updateError);
          throw updateError;
        }

        console.log(`Recording saved for class ${liveClass.id}: ${videoRecording.play_url}`);

        // Notify enrolled students that recording is available
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

        return new Response(
          JSON.stringify({ success: true, classId: liveClass.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle other events
    console.log(`Unhandled event type: ${body.event}`);
    return new Response(
      JSON.stringify({ success: true, message: 'Event received' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Zoom webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
