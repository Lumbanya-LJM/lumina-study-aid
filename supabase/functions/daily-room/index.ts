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

    const { action, roomName, classId, title, userName, userId, isOwner, expiresInMinutes = 180 } = await req.json();
    console.log("Daily room action:", action, { roomName, classId, title, userName, isOwner });

    if (action === "create") {
      // Create a new Daily.co room with recording enabled
      const generatedRoomName = roomName || `lumina-${Date.now()}`;
      
      const roomData = {
        name: generatedRoomName,
        privacy: "private", // Private room - requires token to join
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: "cloud", // Enable cloud recording
          enable_transcription_storage: true, // Store transcriptions
          start_video_off: false,
          start_audio_off: false,
          // Note: max_participants removed - uses Daily.co plan default
          exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
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

    if (action === "get-token") {
      // Generate a meeting token for a user to join
      // This authenticates the user without requiring external login
      if (!roomName) {
        throw new Error("roomName is required for get-token");
      }

      const tokenData: any = {
        properties: {
          room_name: roomName,
          user_name: userName || "Student",
          user_id: userId || undefined,
          is_owner: isOwner === true, // Owner can record, mute others, etc.
          enable_recording: isOwner === true ? "cloud" : undefined,
          start_cloud_recording: isOwner === true, // Auto-start recording for host
          exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
        },
      };

      console.log("Generating meeting token:", tokenData);

      const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify(tokenData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Token generation error:", response.status, errorText);
        throw new Error(`Token generation failed: ${response.status}`);
      }

      const { token } = await response.json();
      console.log("Meeting token generated successfully");

      return new Response(
        JSON.stringify({ success: true, token }),
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
      console.log("Stopping recording for room:", roomName);
      
      await fetch(`https://api.daily.co/v1/rooms/${roomName}/recordings`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-recordings") {
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
      return new Response(JSON.stringify({ success: true, recordings: data.data || [] }), {
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
