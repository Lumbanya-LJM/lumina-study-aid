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

// Get OAuth access token using Server-to-Server OAuth
async function getZoomAccessToken(): Promise<string> {
  console.log("Getting Zoom access token...");
  
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
    console.error("Failed to get Zoom token:", error);
    throw new Error(`Failed to get Zoom access token: ${error}`);
  }

  const data = await response.json();
  console.log("Zoom token obtained successfully");
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse body once and extract all possible parameters
    const body = await req.json();
    const { action, topic, startTime, duration, classId, meetingId } = body;
    
    console.log(`Zoom meeting action: ${action}`, { meetingId, classId });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const accessToken = await getZoomAccessToken();

    if (action === "create") {
      // Create a Zoom meeting
      console.log("Creating Zoom meeting:", topic);
      
      const meetingData: any = {
        topic: topic || "Lumina Academy Live Class",
        type: startTime ? 2 : 1, // 2 = scheduled, 1 = instant
        duration: duration || 60,
        timezone: "UTC",
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          waiting_room: false,
          auto_recording: "cloud",
          allow_multiple_devices: true,
        },
      };

      if (startTime) {
        meetingData.start_time = startTime;
      }

      const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(meetingData),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Zoom API error:", error);
        throw new Error(`Failed to create meeting: ${error}`);
      }

      const meeting = await response.json();
      console.log("Zoom meeting created:", meeting.id);

      return new Response(
        JSON.stringify({
          meetingId: meeting.id.toString(),
          joinUrl: meeting.join_url,
          startUrl: meeting.start_url,
          password: meeting.password,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-meeting") {
      // Get meeting details
      if (!meetingId) {
        throw new Error("meetingId is required for get-meeting action");
      }
      
      const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get meeting details");
      }

      const meeting = await response.json();
      return new Response(
        JSON.stringify(meeting),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "end-meeting") {
      // End a meeting
      if (!meetingId) {
        throw new Error("meetingId is required for end-meeting action");
      }
      
      const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/status`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "end" }),
      });

      // 204 = success, 400 = meeting already ended
      if (!response.ok && response.status !== 400) {
        const error = await response.text();
        throw new Error(`Failed to end meeting: ${error}`);
      }

      console.log("Meeting ended:", meetingId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-recordings") {
      // Get cloud recordings for a meeting
      if (!meetingId) {
        throw new Error("meetingId is required for get-recordings action");
      }
      
      const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        // 404 means no recordings yet
        if (response.status === 404) {
          return new Response(
            JSON.stringify({ recordings: [] }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error("Failed to get recordings");
      }

      const data = await response.json();
      
      // Save recording URL to database if classId provided
      if (classId && data.recording_files && data.recording_files.length > 0) {
        const videoRecording = data.recording_files.find((r: any) => r.file_type === "MP4");
        if (videoRecording) {
          await supabase
            .from('live_classes')
            .update({
              recording_url: videoRecording.download_url,
              recording_duration_seconds: data.duration * 60,
            })
            .eq('id', classId);
          console.log("Recording saved for class:", classId);
        }
      }

      return new Response(
        JSON.stringify({ recordings: data.recording_files || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error("Zoom meeting function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
