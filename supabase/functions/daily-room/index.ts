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
          enable_recording: "cloud",
          enable_transcription_storage: true, // Store transcriptions
          enable_advanced_chat: true, // Enable Daily's AI chat features
          enable_live_captions_ui: true, // Enable live captions UI
          start_video_off: false,
          start_audio_off: false,
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
          is_owner: isOwner === true, // Owner can manage the room
          // Recording is plan-dependent; don't request cloud recording in token properties.
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
      console.log("Starting recording for room:", roomName);
      
      // First, check if there's already an active recording
      const checkResponse = await fetch(
        `https://api.daily.co/v1/recordings?room_name=${roomName}&in_progress=true`,
        {
          headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
          },
        }
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.data && checkData.data.length > 0) {
          console.log("Recording already in progress:", checkData.data[0].id);
          return new Response(
            JSON.stringify({ success: true, recording: checkData.data[0], alreadyRecording: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Start new recording
      const response = await fetch("https://api.daily.co/v1/recordings/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          room_name: roomName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to start recording:", response.status, errorText);
        
        let userError = "Failed to start recording";
        if (response.status === 403) {
          userError = "Recording is not enabled for this Daily.co plan. Please upgrade your plan.";
        } else if (response.status === 404) {
          // This typically means no one is in the room yet - but we'll retry after a moment
          console.log("No active session yet - host may still be connecting");
          userError = "Recording will start once the video connection is fully established. Please wait a moment and try again, or the recording will start automatically.";
        } else if (response.status === 400 && errorText.includes("already")) {
          // Recording already in progress
          console.log("Recording appears to already be in progress");
          return new Response(
            JSON.stringify({ success: true, alreadyRecording: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          userError = `Recording error: ${errorText}`;
        }
        
        return new Response(
          JSON.stringify({ success: false, error: userError, retryable: response.status === 404 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const recording = await response.json();
      console.log("Recording started successfully:", recording);

      return new Response(JSON.stringify({ success: true, recording }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "stop-recording") {
      console.log("Stopping recording for room:", roomName);
      
      // Use the correct endpoint to stop recording
      const response = await fetch("https://api.daily.co/v1/recordings/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          room_name: roomName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to stop recording:", response.status, errorText);
        // Still return success since the recording might have already stopped
      }

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
