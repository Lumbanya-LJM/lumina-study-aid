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
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");

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
      .select("id, recording_url, recording_id, course_id, host_id, title")
      .eq("id", classId)
      .maybeSingle();

    if (classError || !liveClass) {
      console.error("Class not found:", classError);
      return new Response(JSON.stringify({ error: "Recording not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has access (is host, enrolled in course, or purchased this class)
    const isHost = liveClass.host_id === user.id;
    
    if (!isHost) {
      // Check for course enrollment
      let hasAccess = false;
      
      if (liveClass.course_id) {
        const { data: enrollment } = await supabaseAdmin
          .from("academy_enrollments")
          .select("id")
          .eq("course_id", liveClass.course_id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        
        if (enrollment) hasAccess = true;
      }
      
      // Check for individual class purchase
      if (!hasAccess) {
        const { data: purchase } = await supabaseAdmin
          .from("class_purchases")
          .select("id")
          .eq("class_id", classId)
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (purchase) hasAccess = true;
      }

      if (!hasAccess) {
        return new Response(JSON.stringify({ error: "Access denied - not enrolled or purchased" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!liveClass.recording_url || liveClass.recording_url === "no_recording_available") {
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

    // If we have a recording_id and DAILY_API_KEY, get a fresh access link
    // This ensures the URL doesn't expire during playback
    let recordingUrl = liveClass.recording_url;
    
    if (liveClass.recording_id && DAILY_API_KEY) {
      console.log(`Fetching fresh access link for recording ${liveClass.recording_id}`);
      
      try {
        const accessLinkRes = await fetch(
          `https://api.daily.co/v1/recordings/${liveClass.recording_id}/access-link`,
          {
            headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
          }
        );
        
        if (accessLinkRes.ok) {
          const accessData = await accessLinkRes.json();
          if (accessData.download_link) {
            recordingUrl = accessData.download_link;
            console.log(`Got fresh access link for ${liveClass.recording_id}`);
          }
        } else {
          console.log(`Could not refresh access link: ${accessLinkRes.status}`);
        }
      } catch (accessError) {
        console.error("Error fetching fresh access link:", accessError);
      }
    }

    // Stream the video - proxy the request to hide the actual URL
    console.log("Streaming recording for class:", classId, "user:", user.id);

    const rangeHeader = req.headers.get("range");
    
    const videoResponse = await fetch(recordingUrl, {
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
