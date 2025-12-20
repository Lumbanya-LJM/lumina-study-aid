import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!DAILY_API_KEY) {
      throw new Error("DAILY_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { action, classId, roomName, userId, userName } = await req.json();

    console.log("Daily room action:", action, "classId:", classId);

    if (action === "create") {
      // Create a new Daily.co room
      const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          name: roomName || `class-${Date.now()}`,
          properties: {
            enable_chat: true,
            enable_screenshare: true,
            enable_knocking: false,
            start_video_off: false,
            start_audio_off: false,
            exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
          },
        }),
      });

      if (!roomResponse.ok) {
        const error = await roomResponse.text();
        console.error("Daily API error:", error);
        throw new Error(`Failed to create room: ${error}`);
      }

      const room = await roomResponse.json();
      console.log("Room created:", room.name);

      return new Response(
        JSON.stringify({
          roomName: room.name,
          roomUrl: room.url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-token") {
      // Generate a meeting token for a participant
      const isHost = userId ? true : false;
      
      const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            room_name: roomName,
            user_name: userName || "Participant",
            user_id: userId,
            is_owner: isHost,
            exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
          },
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("Token generation error:", error);
        throw new Error(`Failed to generate token: ${error}`);
      }

      const tokenData = await tokenResponse.json();
      return new Response(
        JSON.stringify({ token: tokenData.token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "start-recording") {
      const recordingResponse = await fetch(
        `https://api.daily.co/v1/rooms/${roomName}/recordings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DAILY_API_KEY}`,
          },
          body: JSON.stringify({
            type: "cloud",
          }),
        }
      );

      if (!recordingResponse.ok) {
        const error = await recordingResponse.text();
        console.error("Recording start error:", error);
        throw new Error(`Failed to start recording: ${error}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Recording started" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "stop-recording") {
      const recordingResponse = await fetch(
        `https://api.daily.co/v1/rooms/${roomName}/recordings`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
          },
        }
      );

      return new Response(
        JSON.stringify({ success: true, message: "Recording stopped" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-recordings") {
      const recordingsResponse = await fetch(
        `https://api.daily.co/v1/recordings?room_name=${roomName}`,
        {
          headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
          },
        }
      );

      if (!recordingsResponse.ok) {
        throw new Error("Failed to fetch recordings");
      }

      const recordings = await recordingsResponse.json();
      
      // If there are recordings and classId is provided, save the first recording URL to the database
      if (recordings.data && recordings.data.length > 0 && classId) {
        const recording = recordings.data[0];
        if (recording.download_link) {
          const { error: updateError } = await supabase
            .from('live_classes')
            .update({
              recording_url: recording.download_link,
              recording_duration_seconds: recording.duration || null,
            })
            .eq('id', classId);
          
          if (updateError) {
            console.error("Failed to save recording URL:", updateError);
          } else {
            console.log("Recording URL saved for class:", classId);
          }
        }
      }
      
      return new Response(
        JSON.stringify(recordings),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete-room") {
      const deleteResponse = await fetch(
        `https://api.daily.co/v1/rooms/${roomName}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
          },
        }
      );

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Daily room error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
