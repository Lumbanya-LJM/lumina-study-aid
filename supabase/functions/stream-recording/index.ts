import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is authenticated
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");
    const action = url.searchParams.get("action") || "stream";

    if (!classId) {
      return new Response(JSON.stringify({ error: "classId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to get recording details
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the live class and verify user has access (enrolled in course or is host)
    const { data: liveClass, error: classError } = await supabaseAdmin
      .from("live_classes")
      .select("id, recording_url, course_id, host_id, title")
      .eq("id", classId)
      .maybeSingle();

    if (classError || !liveClass) {
      console.error("Class not found:", classError);
      return new Response(JSON.stringify({ error: "Recording not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has access (is host or enrolled in the course)
    const isHost = liveClass.host_id === user.id;
    
    if (!isHost && liveClass.course_id) {
      const { data: enrollment } = await supabaseAdmin
        .from("academy_enrollments")
        .select("id")
        .eq("course_id", liveClass.course_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!enrollment) {
        return new Response(JSON.stringify({ error: "Access denied - not enrolled" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!liveClass.recording_url) {
      return new Response(JSON.stringify({ error: "Recording not available yet" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For metadata action, return info about the recording
    if (action === "metadata") {
      return new Response(JSON.stringify({
        success: true,
        classId: liveClass.id,
        title: liveClass.title,
        hasRecording: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the video - proxy the request to hide the actual URL
    console.log("Streaming recording for class:", classId, "user:", user.id);

    const rangeHeader = req.headers.get("range");
    
    const videoResponse = await fetch(liveClass.recording_url, {
      headers: rangeHeader ? { Range: rangeHeader } : {},
    });

    if (!videoResponse.ok && videoResponse.status !== 206) {
      console.error("Failed to fetch video:", videoResponse.status);
      return new Response(JSON.stringify({ error: "Failed to stream recording" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward the video stream with appropriate headers
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": videoResponse.headers.get("Content-Type") || "video/mp4",
      "Accept-Ranges": "bytes",
      // Prevent caching and downloading
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
    };

    // Forward range response headers if present
    const contentRange = videoResponse.headers.get("Content-Range");
    const contentLength = videoResponse.headers.get("Content-Length");
    
    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange;
    }
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    return new Response(videoResponse.body, {
      status: videoResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Stream recording error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
