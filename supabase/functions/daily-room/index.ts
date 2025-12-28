import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (!DAILY_API_KEY) {
      throw new Error("DAILY_API_KEY is not configured");
    }

    const { action, roomName, classId, title, expiresInMinutes = 120 } = await req.json();
    console.log("Daily room action:", action, { roomName, classId, title });

    if (action === "create") {
      // Create a new Daily.co room with recording enabled
      const roomData = {
        name: roomName || `lumina-${Date.now()}`,
        privacy: "public", // Anyone with link can join
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: "cloud", // Enable cloud recording
          enable_transcription_storage: true, // Store transcriptions
          start_video_off: false,
          start_audio_off: false,
          max_participants: 100,
          exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60), // Expiry time
          eject_at_room_exp: true,
          enable_prejoin_ui: true,
          enable_network_ui: true,
          enable_knocking: false,
          lang: "en",
        },
      };

      console.log("Creating Daily room:", roomData);

      const response = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify(roomData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Daily API error:", response.status, errorText);
        throw new Error(`Daily API error: ${response.status} - ${errorText}`);
      }

      const room = await response.json();
      console.log("Room created:", room);

      return new Response(
        JSON.stringify({
          success: true,
          roomName: room.name,
          roomUrl: room.url,
          roomId: room.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get") {
      // Get room details
      const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to get room:", response.status, errorText);
        throw new Error(`Failed to get room: ${response.status}`);
      }

      const room = await response.json();
      return new Response(JSON.stringify({ success: true, room }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      // Delete a room
      const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        console.error("Failed to delete room:", response.status, errorText);
        throw new Error(`Failed to delete room: ${response.status}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "start-recording") {
      // Start cloud recording for a room
      console.log("Starting recording for room:", roomName);
      
      const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}/recordings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          type: "cloud",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to start recording:", response.status, errorText);
        // Don't throw - recording might already be in progress
        return new Response(
          JSON.stringify({ success: false, error: errorText }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const recording = await response.json();
      console.log("Recording started:", recording);

      return new Response(JSON.stringify({ success: true, recording }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "stop-recording") {
      // Stop cloud recording for a room
      console.log("Stopping recording for room:", roomName);
      
      const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}/recordings`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
      });

      // Recording stopping is async, so just acknowledge
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-recordings") {
      // Get recordings for a room
      console.log("Getting recordings for room:", roomName);
      
      const response = await fetch(`https://api.daily.co/v1/recordings?room_name=${roomName}`, {
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to get recordings:", response.status, errorText);
        throw new Error(`Failed to get recordings: ${response.status}`);
      }

      const data = await response.json();
      console.log("Recordings found:", data);

      return new Response(JSON.stringify({ success: true, recordings: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-transcription") {
      // Get transcription for a recording
      const { recordingId } = await req.json();
      console.log("Getting transcription for recording:", recordingId);
      
      const response = await fetch(`https://api.daily.co/v1/recordings/${recordingId}/transcript`, {
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
      });

      if (!response.ok) {
        console.log("Transcription not ready yet or not available");
        return new Response(
          JSON.stringify({ success: false, status: "not_ready" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const transcript = await response.json();
      return new Response(JSON.stringify({ success: true, transcript }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Daily room error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
