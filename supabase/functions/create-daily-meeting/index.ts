import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    const { class_id, title, duration_mins = 60, created_by } = body ?? {};

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const exp = Math.floor(Date.now() / 1000) + duration_mins * 60;

    // 1) Create Daily room with transcription enabled
    const dailyRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          exp,
          enable_transcription: true,
          enable_recording: "cloud",
        },
      }),
    });

    if (!dailyRes.ok) {
      const err = await dailyRes.text();
      console.error("Daily API error:", err);
      return new Response(JSON.stringify({ error: `Daily error: ${err}` }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const room = await dailyRes.json();
    console.log("Created Daily room:", room.name);

    // 2) Store meeting in Supabase
    const { data: meeting, error } = await supabase
      .from("meetings")
      .insert({
        class_id: class_id ?? null,
        created_by: created_by ?? null,
        title: title ?? "LMV Daily Class Meeting",
        daily_room_name: room.name,
        daily_room_url: room.url,
        status: "live",
      })
      .select("*")
      .single();

    if (error) {
      console.error("DB error:", error);
      return new Response(JSON.stringify({ error: `DB error: ${error.message}` }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log("Created meeting record:", meeting.id);

    return new Response(JSON.stringify({ meeting, room }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: `Unexpected error: ${String(e)}` }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
