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
  console.log("Getting Zoom access token...");
  
  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_ACCOUNT_ID) {
    throw new Error("Missing Zoom credentials. Please configure ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, and ZOOM_ACCOUNT_ID.");
  }
  
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, topic, startTime, duration, classId, meetingId } = body;
    
    console.log(`Zoom meeting action: ${action}`, { meetingId, classId, topic });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const accessToken = await getZoomAccessToken();

    // CREATE MEETING
    if (action === "create") {
      console.log("Creating Zoom meeting:", topic);
      
      const meetingData: Record<string, unknown> = {
        topic: topic || "Lumina Academy Live Class",
        type: startTime ? 2 : 1, // 2 = scheduled, 1 = instant
        duration: duration || 60,
        timezone: "Africa/Lusaka",
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          waiting_room: false,
          auto_recording: "cloud",
          allow_multiple_devices: true,
          audio: "both",
          meeting_authentication: false,
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

    // GET MEETING DETAILS
    if (action === "get-meeting") {
      if (!meetingId) {
        throw new Error("meetingId is required for get-meeting action");
      }
      
      const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to get meeting:", error);
        throw new Error("Failed to get meeting details");
      }

      const meeting = await response.json();
      return new Response(
        JSON.stringify(meeting),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // END MEETING
    if (action === "end-meeting") {
      if (!meetingId) {
        throw new Error("meetingId is required for end-meeting action");
      }
      
      console.log("Ending meeting:", meetingId);
      
      const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/status`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "end" }),
      });

      // 204 = success, 400 = meeting already ended
      if (!response.ok && response.status !== 400 && response.status !== 404) {
        const error = await response.text();
        throw new Error(`Failed to end meeting: ${error}`);
      }

      console.log("Meeting ended:", meetingId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET RECORDINGS
    if (action === "get-recordings") {
      if (!meetingId) {
        throw new Error("meetingId is required for get-recordings action");
      }
      
      console.log("Fetching recordings for meeting:", meetingId);
      
      const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("No recordings available yet for meeting:", meetingId);
          return new Response(
            JSON.stringify({ 
              recordings: [], 
              status: "pending",
              message: "Recording is being processed. It will be available in a few minutes." 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const error = await response.text();
        console.error("Failed to get recordings:", error);
        throw new Error("Failed to get recordings");
      }

      const data = await response.json();
      const recordingFiles = data.recording_files || [];
      
      console.log(`Found ${recordingFiles.length} recording files for meeting ${meetingId}`);
      
      // Save recording URL to database if classId provided
      if (classId && recordingFiles.length > 0) {
        const videoRecording = recordingFiles.find(
          (r: { file_type: string; recording_type: string }) => 
            r.file_type === "MP4" && r.recording_type === "shared_screen_with_speaker_view"
        ) || recordingFiles.find(
          (r: { file_type: string }) => r.file_type === "MP4"
        );
        
        if (videoRecording && videoRecording.status === "completed") {
          const recordingUrl = videoRecording.play_url || videoRecording.download_url;
          
          const { error: updateError } = await supabase
            .from('live_classes')
            .update({
              recording_url: recordingUrl,
              recording_duration_seconds: data.duration ? data.duration * 60 : null,
            })
            .eq('id', classId);
            
          if (updateError) {
            console.error("Failed to save recording to database:", updateError);
          } else {
            console.log("Recording saved for class:", classId);
          }
        } else {
          console.log("Recording not yet completed, status:", videoRecording?.status);
        }
      }

      return new Response(
        JSON.stringify({ 
          recordings: recordingFiles,
          status: recordingFiles.length > 0 ? "available" : "pending"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CHECK RECORDING STATUS
    if (action === "check-recording-status") {
      if (!classId) {
        throw new Error("classId is required for check-recording-status action");
      }
      
      // Get the class to find the meeting ID
      const { data: liveClass, error: fetchError } = await supabase
        .from('live_classes')
        .select('id, daily_room_name, recording_url, status')
        .eq('id', classId)
        .single();
        
      if (fetchError || !liveClass) {
        throw new Error("Class not found");
      }
      
      if (liveClass.recording_url) {
        return new Response(
          JSON.stringify({ 
            status: "available", 
            recordingUrl: liveClass.recording_url 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (!liveClass.daily_room_name) {
        return new Response(
          JSON.stringify({ status: "no_meeting" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Try to fetch from Zoom
      const response = await fetch(
        `https://api.zoom.us/v2/meetings/${liveClass.daily_room_name}/recordings`,
        {
          headers: { "Authorization": `Bearer ${accessToken}` },
        }
      );
      
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ status: "processing" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.ok) {
        const data = await response.json();
        const videoRecording = (data.recording_files || []).find(
          (r: { file_type: string; status: string }) => 
            r.file_type === "MP4" && r.status === "completed"
        );
        
        if (videoRecording) {
          const recordingUrl = videoRecording.play_url || videoRecording.download_url;
          
          await supabase
            .from('live_classes')
            .update({
              recording_url: recordingUrl,
              recording_duration_seconds: data.duration ? data.duration * 60 : null,
            })
            .eq('id', classId);
            
          return new Response(
            JSON.stringify({ status: "available", recordingUrl }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      return new Response(
        JSON.stringify({ status: "processing" }),
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
